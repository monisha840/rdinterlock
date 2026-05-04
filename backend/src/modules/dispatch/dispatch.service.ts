import prisma from '../../config/database';
import { TransportService } from '../transport/transport.service';
import { StockService } from '../stock/stock.service';
import { AppError } from '../../middleware/errorHandler';
import { CreateDispatchInput, UpdateDispatchInput, CreateCustomerInput } from './dispatch.validation';

const stockService = new StockService();

export class DispatchService {
  async createDispatch(data: CreateDispatchInput) {
    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Validate brick type exists
    const brickType = await prisma.brickType.findUnique({
      where: { id: data.brickTypeId },
    });

    if (!brickType || !brickType.isActive) {
      throw new AppError('Brick type not found or inactive', 404);
    }

    // Validate stock
    const stockInfo = await stockService.getCurrentStock(data.brickTypeId);
    const availableStock = stockInfo[0]?.currentStock || 0;

    if (data.quantity > availableStock) {
      throw new AppError(`Insufficient stock for ${brickType.size}. Available: ${availableStock}, Requested: ${data.quantity}`, 400);
    }

    // If vehicle type is RENT, transportCost must be provided
    if (data.vehicleType === 'RENT' && (!data.transportCost || data.transportCost === 0)) {
      throw new AppError('Transport cost is required for rented vehicles', 400);
    }

    return await prisma.$transaction(async (tx: any) => {
      const dispatch = await tx.dispatch.create({
        data: {
          date: new Date(data.date),
          customerId: data.customerId,
          brickTypeId: data.brickTypeId,
          quantity: data.quantity,
          distanceKm: data.distanceKm,
          vehicleType: data.vehicleType,
          transportCost: data.transportCost ?? 0,
          loadingCost: data.loadingCost ?? 0,
          paymentStatus: data.paymentStatus,
          totalAmount: data.totalAmount ?? 0,
          paidAmount: data.paidAmount ?? 0,
          status: data.status,
          location: data.location,
          driverId: data.driverId,
          vehicleNumber: data.vehicleNumber,
          tripNumber: data.tripNumber ?? null,
          notes: data.notes,
          orderId: data.orderId,
        },
        include: {
          customer: true,
          brickType: true,
          driver: true,
        },
      });

      // Synchronize with CashBook if money received
      if (data.paidAmount && data.paidAmount > 0) {
        await (tx.cashEntry as any).create({
          data: {
            date: new Date(data.date),
            type: 'CREDIT',
            amount: data.paidAmount,
            description: `Payment from ${(dispatch as any).customer.name} (Dispatch: ${dispatch.id})`,
            category: 'SALES',
          } as any,
        });
      }

      // 3. Create Transport Entry if vehicle is assigned
      if (data.vehicleNumber) {
        // Find or create vehicle record in transport module
        let vehicle = await tx.transportVehicle.findUnique({
          where: { vehicleNumber: data.vehicleNumber }
        });

        if (!vehicle) {
          vehicle = await tx.transportVehicle.create({
            data: {
              vehicleNumber: data.vehicleNumber,
              vehicleType: data.vehicleType === 'OWN' ? 'COMPANY' : 'VENDOR',
              ownerName: data.vehicleType === 'OWN' ? 'RD Interlock' : 'Unknown Vendor',
              driverName: data.driverId ? (dispatch.driver?.name || null) : null,
              status: 'ACTIVE'
            }
          });
        }

        // Create the transport entry
        await tx.transportEntry.create({
          data: {
            date: new Date(data.date),
            transportType: data.vehicleType === 'OWN' ? 'RD_VEHICLE' : 'VENDOR_VEHICLE',
            vehicleId: vehicle.id,
            loads: 1, // Default to 1 load per dispatch
            transactionType: data.vehicleType === 'OWN' ? 'EXPENSE' : 'INCOME',
            notes: `Auto-generated from Dispatch: ${dispatch.id}`,
            dispatchId: dispatch.id
          } as any
        });
      }

      // Update Order Status if linked
      if (data.orderId) {
        await this.updateOrderStatus(data.orderId, tx);
      }

      return dispatch;
    });
  }

  async updateOrderStatus(orderId: string, tx: any = prisma) {
    const order = await tx.clientOrder.findUnique({
      where: { id: orderId },
      include: {
        dispatches: true,
      },
    });

    if (!order) return;

    const totalDispatched = order.dispatches.reduce((sum: number, d: any) => sum + d.quantity, 0);

    let newStatus = 'PENDING';
    if (totalDispatched >= order.quantity) {
      newStatus = 'COMPLETED';
    } else if (totalDispatched > 0) {
      newStatus = 'IN_DISPATCH';
    }

    await tx.clientOrder.update({
      where: { id: orderId },
      data: { status: newStatus },
    });
  }

  async getDispatches(
    startDate?: string,
    endDate?: string,
    customerId?: string,
    brickTypeId?: string,
    paymentStatus?: string,
    status?: string
  ) {
    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (customerId) where.customerId = customerId;
    if (brickTypeId) where.brickTypeId = brickTypeId;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (status) {
      if (status.includes(',')) {
        where.status = { in: status.split(',').map((s: string) => s.trim()) };
      } else {
        where.status = status;
      }
    }

    const dispatches = await prisma.dispatch.findMany({
      where,
      include: {
        customer: true,
        brickType: true,
        driver: true,
      },
      orderBy: { date: 'desc' },
    });

    return dispatches;
  }

  async getDispatchById(id: string) {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id },
      include: {
        customer: true,
        brickType: true,
        driver: true,
      },
    });

    if (!dispatch) {
      throw new AppError('Dispatch not found', 404);
    }

    return dispatch;
  }

  async updateDispatch(id: string, data: UpdateDispatchInput) {
    return await prisma.$transaction(async (tx: any) => {
      const dispatch = await tx.dispatch.findUnique({
        where: { id },
      });

      if (!dispatch) {
        throw new AppError('Dispatch not found', 404);
      }

      const updated = await tx.dispatch.update({
        where: { id },
        data,
        include: {
          customer: true,
          brickType: true,
          driver: true,
        },
      });

      // Sync with CashBook
      // 1. Remove any existing cash entry for this dispatch
      await (tx.cashEntry as any).deleteMany({
        where: {
          description: {
            contains: `(Dispatch: ${id})`,
          },
        } as any,
      });

      // 2. Create new one if there's any paid amount
      if (updated.paidAmount && updated.paidAmount > 0) {
        await (tx.cashEntry as any).create({
          data: {
            date: updated.date,
            type: 'CREDIT',
            amount: updated.paidAmount,
            description: `Payment from ${(updated as any).customer.name} (Dispatch: ${id})`,
            category: 'SALES',
          } as any,
        });
      }

      // Update Order Status if linked
      if (updated.orderId) {
        await this.updateOrderStatus(updated.orderId, tx);
      } else if (dispatch.orderId) { // If it WAS linked but no longer is (though unlikely in current UI)
        await this.updateOrderStatus(dispatch.orderId, tx);
      }

      return updated;
    });
  }

  async deleteDispatch(id: string) {
    return await prisma.$transaction(async (tx: any) => {
      const dispatch = await tx.dispatch.findUnique({
        where: { id },
      });

      if (!dispatch) {
        throw new AppError('Dispatch not found', 404);
      }

      // Remove related cash entry
      await (tx.cashEntry as any).deleteMany({
        where: {
          description: {
            contains: `(Dispatch: ${id})`,
          },
        } as any,
      });

      await tx.dispatch.delete({
        where: { id },
      });

      return { message: 'Dispatch deleted successfully' };
    });
  }

  // Customer management
  async createCustomer(data: CreateCustomerInput) {
    const customer = await prisma.customer.create({
      data,
    });

    return customer;
  }

  async getAllCustomers() {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' },
    });

    return customers;
  }

  async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        dispatches: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    return customer;
  }

  async deleteCustomer(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Since we don't have isActive on Customer yet, we'll just delete for now
    // or we could add isActive to schema. Prisma schema has address but not isActive.
    // I'll just delete it for now as per current schema.
    await prisma.customer.delete({
      where: { id },
    });

    return { message: 'Customer deleted successfully' };
  }
}
