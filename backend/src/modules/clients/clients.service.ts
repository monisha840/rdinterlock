import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class ClientsService {
    // ═══════════════════════ CLIENTS ═══════════════════════

    async createClient(data: { name: string; phone?: string; address?: string; notes?: string }) {
        return prisma.customer.create({ data });
    }

    async getAllClients(search?: string) {
        const where: any = { isActive: true };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
            ];
        }
        const clients = await prisma.customer.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                _count: { select: { orders: true, payments: true } },
                orders: { select: { totalAmount: true } },
                payments: { select: { type: true, amount: true, paymentMethod: true, paymentDate: true } }
            },
        });

        return clients.map((client: any) => {
            const totalOrderAmount = client.orders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);

            const totalAdvance = client.payments.filter((p: any) => p.type === 'ADVANCE').reduce((sum: number, p: any) => sum + p.amount, 0);
            const advanceUsed = client.payments.filter((p: any) => p.type === 'PAYMENT' && p.paymentMethod === 'ADVANCE_APPLIED').reduce((sum: number, p: any) => sum + p.amount, 0);
            const totalPaid = client.payments.filter((p: any) => p.type === 'PAYMENT').reduce((sum: number, p: any) => sum + p.amount, 0);

            const advanceBalance = totalAdvance - advanceUsed;
            const pendingAmount = totalOrderAmount - (totalPaid + advanceBalance);

            // Latest Activity
            const sortedPayments = [...client.payments].sort((a: any, b: any) =>
                new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
            );
            const latestPayment = sortedPayments[0] || null;

            const { orders, payments, ...clientData } = client;

            return {
                ...clientData,
                totalOrderAmount,
                totalAdvance,
                advanceUsed,
                totalPaid,
                pendingAmount,
                advanceBalance,
                latestPaymentDate: latestPayment?.paymentDate || null,
                latestPaymentMethod: latestPayment?.paymentMethod || 'N/A'
            };
        });
    }

    async getClientById(id: string) {
        const client = await prisma.customer.findUnique({
            where: { id },
            include: {
                orders: {
                    include: { brickType: true, payments: true, driver: true },
                    orderBy: { orderDate: 'desc' },
                },
                payments: { orderBy: { paymentDate: 'desc' } },
                dispatchSchedules: {
                    include: { brickType: true, driver: true },
                    orderBy: { dispatchDate: 'desc' },
                },
                dispatches: {
                    include: { brickType: true },
                    orderBy: { date: 'desc' },
                },
            },
        });
        if (!client) throw new AppError('Client not found', 404);

        const totalAdvance = client.payments.filter(p => p.type === 'ADVANCE').reduce((s, p) => s + p.amount, 0);
        const advanceUsed = client.payments.filter(p => p.type === 'PAYMENT' && p.paymentMethod === 'ADVANCE_APPLIED').reduce((s, p) => s + p.amount, 0);
        const advanceBalance = totalAdvance - advanceUsed;

        return {
            ...client,
            totalAdvance,
            advanceUsed,
            advanceBalance
        };
    }

    async updateClient(id: string, data: any) {
        const client = await prisma.customer.findUnique({ where: { id } });
        if (!client) throw new AppError('Client not found', 404);
        return prisma.customer.update({ where: { id }, data });
    }

    async deleteClient(id: string) {
        const client = await prisma.customer.findUnique({ where: { id } });
        if (!client) throw new AppError('Client not found', 404);

        await prisma.$transaction([
            // Delete related cash entries first
            prisma.cashEntry.deleteMany({ where: { customerId: id } }),
            // Delete related dispatches
            prisma.dispatch.deleteMany({ where: { customerId: id } }),
            // Delete related schedules
            prisma.dispatchSchedule.deleteMany({ where: { clientId: id } }),
            // Delete related payments
            prisma.clientPayment.deleteMany({ where: { clientId: id } }),
            // Delete related orders
            prisma.clientOrder.deleteMany({ where: { clientId: id } }),
            // Finally delete the client
            prisma.customer.delete({ where: { id } }),
        ]);

        return { message: 'Client and all related data deleted permanently' };
    }

    // ═══════════════════════ ORDERS ═══════════════════════

    async createOrder(data: any) {
        return await prisma.$transaction(async (tx: any) => {
            const totalAmount = data.totalAmount || (data.quantity * (data.rate || 0));
            const requestedStatus = data.status || 'PENDING';

            // If creating an order directly as DISPATCHED, validate stock
            if (requestedStatus === 'DISPATCHED') {
                const totalProduction = await tx.production.aggregate({
                    where: { brickTypeId: data.brickTypeId },
                    _sum: { availableBricks: true },
                });

                const totalDispatched = await tx.dispatch.aggregate({
                    where: { brickTypeId: data.brickTypeId },
                    _sum: { quantity: true },
                });

                const totalReturned = await (tx as any).brickReturn.aggregate({
                    where: { brickTypeId: data.brickTypeId },
                    _sum: { returnedQuantity: true },
                });

                const produced = totalProduction._sum.availableBricks || 0;
                const dispatched = totalDispatched._sum.quantity || 0;
                const returned = totalReturned._sum.returnedQuantity || 0;
                const currentStock = produced - dispatched + returned;

                if (data.quantity > currentStock) {
                    throw new AppError(
                        `Insufficient Stock: Only ${currentStock.toLocaleString()} units available, but ${data.quantity.toLocaleString()} requested.`,
                        400
                    );
                }
            }

            const order = await tx.clientOrder.create({
                data: {
                    clientId: data.clientId,
                    brickTypeId: data.brickTypeId,
                    quantity: data.quantity,
                    rate: data.rate || 0,
                    totalAmount,
                    orderDate: new Date(data.orderDate),
                    expectedDispatchDate: data.expectedDispatchDate ? new Date(data.expectedDispatchDate) : null,
                    status: requestedStatus,
                    notes: data.notes,
                    driverId: data.driverId || null,
                },
                include: { client: true, brickType: true, driver: true },
            });

            // If DISPATCHED, create the dispatch entry
            if (requestedStatus === 'DISPATCHED') {
                await tx.dispatch.create({
                    data: {
                        date: data.orderDate ? new Date(data.orderDate) : new Date(),
                        customerId: order.clientId,
                        brickTypeId: order.brickTypeId,
                        orderId: order.id,
                        quantity: order.quantity,
                        totalAmount,
                        paidAmount: 0, // Add Payment is handled separately, or via payload if provided
                        paymentStatus: 'PENDING',
                        driverId: order.driverId,
                        status: 'Completed',
                        vehicleType: 'OWN',
                        notes: order.notes,
                    }
                });
            }

            return order;
        });
    }

    async getAllOrders(filters?: { clientId?: string; status?: string }) {
        const where: any = {};
        if (filters?.clientId) where.clientId = filters.clientId;
        if (filters?.status) where.status = filters.status;

        return prisma.clientOrder.findMany({
            where,
            include: { client: true, brickType: true, payments: true, driver: true },
            orderBy: { orderDate: 'desc' },
        });
    }

    async getOpenOrders() {
        return prisma.clientOrder.findMany({
            where: {
                status: { not: 'COMPLETED' }
            },
            include: { client: true, brickType: true, dispatches: true },
            orderBy: { orderDate: 'desc' },
        });
    }

    async getOrderById(id: string) {
        const order = await prisma.clientOrder.findUnique({
            where: { id },
            include: { client: true, brickType: true, payments: true, driver: true },
        });
        if (!order) throw new AppError('Order not found', 404);
        return order;
    }

    async updateOrder(id: string, data: any) {
        return await prisma.$transaction(async (tx: any) => {
            const order = await tx.clientOrder.findUnique({ 
                where: { id },
                include: { brickType: true, dispatches: true }
            });
            if (!order) throw new AppError('Order not found', 404);

            const updateData: any = { ...data };
            if (data.orderDate) updateData.orderDate = new Date(data.orderDate);
            if (data.expectedDispatchDate) updateData.expectedDispatchDate = new Date(data.expectedDispatchDate);
            
            if (data.quantity || data.rate) {
                const qty = data.quantity || order.quantity;
                const rate = data.rate !== undefined ? data.rate : order.rate;
                updateData.totalAmount = qty * rate;
            }

            // Handling Status Change to DISPATCHED
            if (data.status === 'DISPATCHED' && order.status !== 'DISPATCHED') {
                // 1. Calculate Real-time Stock
                const totalProduction = await tx.production.aggregate({
                    where: { brickTypeId: order.brickTypeId },
                    _sum: { availableBricks: true },
                });

                const totalDispatched = await tx.dispatch.aggregate({
                    where: { brickTypeId: order.brickTypeId },
                    _sum: { quantity: true },
                });

                const totalReturned = await (tx as any).brickReturn.aggregate({
                    where: { brickTypeId: order.brickTypeId },
                    _sum: { returnedQuantity: true },
                });

                const produced = totalProduction._sum.availableBricks || 0;
                const dispatched = totalDispatched._sum.quantity || 0;
                const returned = totalReturned._sum.returnedQuantity || 0;
                const currentStock = produced - dispatched + returned;

                const requestedQty = data.quantity || order.quantity;

                // 2. Validation
                if (requestedQty > currentStock) {
                    throw new AppError(
                        `Insufficient Stock: Only ${currentStock.toLocaleString()} units available, but ${requestedQty.toLocaleString()} requested.`,
                        400
                    );
                }

                // 3. Create Dispatch Entry
                await tx.dispatch.create({
                    data: {
                        date: data.dispatchDate ? new Date(data.dispatchDate) : new Date(),
                        customerId: order.clientId,
                        brickTypeId: order.brickTypeId,
                        orderId: order.id,
                        quantity: requestedQty,
                        totalAmount: updateData.totalAmount || order.totalAmount,
                        paidAmount: data.paidAmount || 0,
                        paymentStatus: data.paymentStatus || 'PENDING',
                        driverId: data.driverId || order.driverId,
                        vehicleNumber: data.vehicleNumber,
                        location: data.location || order.notes,
                        status: 'Completed',
                        vehicleType: 'OWN',
                    }
                });
            }

            return tx.clientOrder.update({
                where: { id },
                data: updateData,
                include: { client: true, brickType: true, driver: true },
            });
        });
    }

    async deleteOrder(id: string) {
        const order = await prisma.clientOrder.findUnique({ where: { id } });
        if (!order) throw new AppError('Order not found', 404);
        await prisma.clientOrder.delete({ where: { id } });
        return { message: 'Order deleted' };
    }

    // ═══════════════════════ PAYMENTS ═══════════════════════

    async createPayment(data: any) {
        const isAdvance = data.type === 'ADVANCE';

        if (isAdvance) {
            const advancePayment = await prisma.clientPayment.create({
                data: {
                    clientId: data.clientId,
                    type: 'ADVANCE',
                    amount: data.amount,
                    paymentDate: new Date(data.paymentDate),
                    paymentMethod: data.paymentMethod,
                    notes: data.notes,
                },
                include: { client: true, order: true },
            });

            await (prisma.cashEntry as any).create({
                data: {
                    date: advancePayment.paymentDate,
                    type: 'CREDIT',
                    amount: advancePayment.amount,
                    description: `Advance received from ${(advancePayment as any).client.name}${advancePayment.notes ? ': ' + advancePayment.notes : ''}`,
                    category: 'Advance Received',
                    paymentMode: advancePayment.paymentMethod,
                    customerId: advancePayment.clientId,
                } as any
            });
            return advancePayment;
        }

        // Regular Payment (or partly regular, partly advance applied)
        let newPayment: any = null;

        if (data.amount > 0) {
            newPayment = await prisma.clientPayment.create({
                data: {
                    clientId: data.clientId,
                    orderId: data.orderId || null,
                    type: 'PAYMENT',
                    amount: data.amount,
                    paymentDate: new Date(data.paymentDate),
                    paymentMethod: data.paymentMethod,
                    notes: data.notes,
                },
                include: { client: true, order: true },
            });

            await (prisma.cashEntry as any).create({
                data: {
                    date: newPayment.paymentDate,
                    type: 'CREDIT',
                    amount: newPayment.amount,
                    description: `Client payment from ${(newPayment as any).client.name}${newPayment.notes ? ': ' + newPayment.notes : ''}`,
                    category: 'Client Payment',
                    paymentMode: newPayment.paymentMethod,
                    customerId: newPayment.clientId,
                } as any
            });
        }

        // Auto-Apply Advance Logic if there is an order
        if (data.orderId) {
            const order = await prisma.clientOrder.findUnique({
                where: { id: data.orderId },
                include: { payments: true }
            });

            if (order) {
                const orderTotalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
                const currentPending = order.totalAmount - orderTotalPaid;

                if (currentPending > 0) {
                    const allClientPayments = await prisma.clientPayment.findMany({
                        where: { clientId: data.clientId }
                    });
                    const totalAdvance = allClientPayments.filter(p => p.type === 'ADVANCE').reduce((s, p) => s + p.amount, 0);
                    const advanceUsed = allClientPayments.filter(p => p.type === 'PAYMENT' && p.paymentMethod === 'ADVANCE_APPLIED').reduce((s, p) => s + p.amount, 0);
                    const advanceBalance = totalAdvance - advanceUsed;

                    if (advanceBalance > 0) {
                        const amountToApply = Math.min(currentPending, advanceBalance);

                        await prisma.clientPayment.create({
                            data: {
                                clientId: data.clientId,
                                orderId: data.orderId,
                                type: 'PAYMENT',
                                amount: amountToApply,
                                paymentDate: new Date(data.paymentDate),
                                paymentMethod: 'ADVANCE_APPLIED',
                                notes: 'System Auto-Applied Advance'
                            }
                        });
                    }
                }
            }
        }

        // Update Order Status
        if (data.orderId) {
            const orderFinal = await prisma.clientOrder.findUnique({
                where: { id: data.orderId },
                include: { payments: true },
            });
            if (orderFinal) {
                const totalPaidFinal = orderFinal.payments.reduce((sum, p) => sum + p.amount, 0);
                if (totalPaidFinal >= orderFinal.totalAmount) {
                    await prisma.clientOrder.update({
                        where: { id: data.orderId },
                        data: { status: 'COMPLETED' },
                    });
                }
            }
        }

        return newPayment || { message: "Advance applied successfully" };
    }

    async getAllPayments(filters?: { clientId?: string }) {
        const where: any = {};
        if (filters?.clientId) where.clientId = filters.clientId;
        return prisma.clientPayment.findMany({
            where,
            include: { client: true, order: { include: { brickType: true } } },
            orderBy: { paymentDate: 'desc' },
        });
    }

    async updatePayment(id: string, data: any) {
        const payment = await prisma.clientPayment.findUnique({ where: { id } });
        if (!payment) throw new AppError('Payment not found', 404);
        const updateData: any = { ...data };
        if (data.paymentDate) updateData.paymentDate = new Date(data.paymentDate);
        return prisma.clientPayment.update({
            where: { id },
            data: updateData,
            include: { client: true, order: true },
        });
    }

    async deletePayment(id: string) {
        const payment = await prisma.clientPayment.findUnique({ where: { id } });
        if (!payment) throw new AppError('Payment not found', 404);

        if (payment.paymentMethod !== 'ADVANCE_APPLIED') {
            await (prisma.cashEntry as any).deleteMany({
                where: {
                    customerId: payment.clientId,
                    amount: payment.amount,
                    date: payment.paymentDate,
                    category: payment.type === 'ADVANCE' ? 'Advance Received' : 'Client Payment'
                } as any
            });
        }

        await prisma.clientPayment.delete({ where: { id } });
        return { message: 'Payment deleted' };
    }

    // ═══════════════════════ DISPATCH SCHEDULING ═══════════════════════
    async createSchedule(data: any) {
        return prisma.dispatchSchedule.create({
            data: {
                clientId: data.clientId,
                brickTypeId: data.brickTypeId,
                quantity: data.quantity,
                location: data.location,
                dispatchDate: new Date(data.dispatchDate),
                driverId: data.driverId || null,
                status: data.status || 'SCHEDULED',
                notes: data.notes,
                orderId: data.orderId || null,
            },
            include: { client: true, brickType: true, driver: true, order: true },
        });
    }

    async getAllSchedules(filters?: { status?: string }) {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        return prisma.dispatchSchedule.findMany({
            where,
            include: { client: true, brickType: true, driver: true, order: true },
            orderBy: { dispatchDate: 'asc' },
        });
    }

    async updateSchedule(id: string, data: any) {
        const schedule = await prisma.dispatchSchedule.findUnique({
            where: { id },
            include: { client: true, brickType: true, driver: true }
        });
        if (!schedule) throw new AppError('Schedule not found', 404);

        const updateData: any = { ...data };
        if (data.dispatchDate) updateData.dispatchDate = new Date(data.dispatchDate);

        // If status is being updated to COMPLETED, create a final Dispatch entry
        if (data.status === 'COMPLETED' || data.status === 'Completed') {
            return await prisma.$transaction(async (tx) => {
                // 1. Create the final Dispatch record
                const dispatch = await tx.dispatch.create({
                    data: {
                        date: schedule.dispatchDate,
                        customerId: schedule.clientId,
                        brickTypeId: schedule.brickTypeId,
                        quantity: schedule.quantity,
                        location: schedule.location,
                        driverId: schedule.driverId,
                        status: 'Completed',
                        paymentStatus: 'PENDING',
                        totalAmount: 0,
                        paidAmount: 0,
                        vehicleType: 'OWN',
                        notes: schedule.notes,
                        orderId: schedule.orderId,
                    }
                });

                // 2. Delete the schedule
                await tx.dispatchSchedule.delete({ where: { id } });

                // 3. Update Order Status if linked
                if (schedule.orderId) {
                    const order = await tx.clientOrder.findUnique({
                        where: { id: schedule.orderId },
                        include: { dispatches: true },
                    });
                    if (order) {
                        const totalDispatched = order.dispatches.reduce((sum: number, d: any) => sum + d.quantity, 0);
                        let newStatus = 'PENDING';
                        if (totalDispatched >= order.quantity) newStatus = 'COMPLETED';
                        else if (totalDispatched > 0) newStatus = 'IN_DISPATCH';

                        await tx.clientOrder.update({
                            where: { id: schedule.orderId },
                            data: { status: newStatus },
                        });
                    }
                }

                return dispatch;
            });
        }

        return prisma.dispatchSchedule.update({
            where: { id },
            data: updateData,
            include: { client: true, brickType: true, driver: true, order: true },
        });
    }

    async deleteSchedule(id: string) {
        const schedule = await prisma.dispatchSchedule.findUnique({ where: { id } });
        if (!schedule) throw new AppError('Schedule not found', 404);
        await prisma.dispatchSchedule.delete({ where: { id } });
        return { message: 'Schedule deleted' };
    }

    // ═══════════════════════ UPCOMING REMINDERS ═══════════════════════

    async getUpcomingDispatches() {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today

        const threeDaysLater = new Date(now);
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);
        threeDaysLater.setHours(23, 59, 59, 999); // End of 3rd day

        return prisma.clientOrder.findMany({
            where: {
                expectedDispatchDate: {
                    gte: now,
                    lte: threeDaysLater,
                },
                status: {
                    notIn: ['COMPLETED', 'DISPATCHED']
                }
            },
            include: {
                client: true,
                brickType: true,
            },
            orderBy: {
                expectedDispatchDate: 'asc',
            },
        });
    }

    // ═══════════════════════ CLIENT LEDGER SUMMARY ═══════════════════════

    async getClientLedger(clientId: string) {
        const orders = await prisma.clientOrder.findMany({
            where: { clientId },
            include: { brickType: true, payments: true },
            orderBy: { orderDate: 'desc' },
        });

        const totalOrderAmount = orders.reduce((s: number, o: any) => s + o.totalAmount, 0);
        const totalPaid = orders.reduce((s: number, o: any) => s + o.payments.reduce((ps: number, p: any) => ps + p.amount, 0), 0);

        const allPayments = await prisma.clientPayment.findMany({
            where: { clientId }
        });
        const totalAdvance = allPayments.filter((p: any) => p.type === 'ADVANCE').reduce((s: number, p: any) => s + p.amount, 0);
        const advanceUsed = allPayments.filter((p: any) => p.type === 'PAYMENT' && p.paymentMethod === 'ADVANCE_APPLIED').reduce((s: number, p: any) => s + p.amount, 0);
        const advanceBalance = totalAdvance - advanceUsed;
        const pendingAmount = totalOrderAmount - (totalPaid + advanceBalance);

        return { orders, totalOrderAmount, totalPaid, pendingAmount, totalAdvance, advanceUsed, advanceBalance };
    }
}
