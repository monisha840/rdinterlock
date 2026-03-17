import prisma from '../../config/database';
import { getTodayRange } from '../../utils/dateUtils';

export class ReportsService {
  /**
   * Dashboard summary - Today's production, ready stock, expenses, cash balance
   */
  async getDashboardSummary() {
    const todayRange = getTodayRange();

    // Today's production (using availableBricks for net good bricks)
    const todayProduction = await prisma.production.aggregate({
      where: {
        date: todayRange,
      },
      _sum: { availableBricks: true },
      _count: true,
    });

    // Today's dispatch — count from BOTH:
    //  1. Dispatch table (status: Completed — schedule was moved here when completed)
    //  2. DispatchSchedule table (status: DISPATCHED — not yet marked completed)
    const todayDispatch = await prisma.dispatch.aggregate({
      where: {
        date: todayRange,
      },
      _sum: { quantity: true },
      _count: true,
    });

    const todayDispatchedSchedules = await prisma.dispatchSchedule.aggregate({
      where: {
        dispatchDate: todayRange,
        status: 'DISPATCHED',
      },
      _sum: { quantity: true },
      _count: true,
    });

    const combinedTodayDispatch = {
      quantity: (todayDispatch._sum.quantity || 0) + (todayDispatchedSchedules._sum.quantity || 0),
      count: (todayDispatch._count || 0) + (todayDispatchedSchedules._count || 0),
    };

    // Today's expenses (from Cash Book)
    const todayExpenses = await (prisma.cashEntry as any).aggregate({
      where: {
        date: todayRange,
        type: 'DEBIT',
        isRecordOnly: false,
      } as any,
      _sum: { amount: true },
      _count: true,
    });

    // Ready stock (all brick types)
    const brickTypes = await prisma.brickType.findMany({
      where: { isActive: true },
    });

    const readyStock = await Promise.all(
      brickTypes.map(async (bt: any) => {
        const produced = await prisma.production.aggregate({
          where: { brickTypeId: bt.id },
          _sum: { availableBricks: true },
        });

        const dispatched = await prisma.dispatch.aggregate({
          where: { brickTypeId: bt.id },
          _sum: { quantity: true },
        });

        return {
          brickType: bt.size,
          stock: (produced._sum.availableBricks || 0) - (dispatched._sum.quantity || 0),
        };
      })
    );

    // Cash balance
    const cashEntries = await (prisma.cashEntry as any).findMany();
    let cashBalance = 0;
    cashEntries.forEach((entry: any) => {
      if (entry.isRecordOnly) return;
      if (entry.type === 'CREDIT') {
        cashBalance += entry.amount;
      } else {
        cashBalance -= entry.amount;
      }
    });

    // Pending payments
    const pendingPayments = await prisma.dispatch.aggregate({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
      _sum: { totalAmount: true, paidAmount: true },
    });

    const pendingAmount =
      (pendingPayments._sum.totalAmount || 0) - (pendingPayments._sum.paidAmount || 0);

    return {
      todayProduction: {
        quantity: todayProduction._sum.availableBricks || 0,
        count: todayProduction._count,
      },
      todayDispatch: {
        quantity: combinedTodayDispatch.quantity,
        count: combinedTodayDispatch.count,
      },
      todayExpenses: {
        amount: todayExpenses._sum.amount || 0,
        count: todayExpenses._count,
      },
      readyStock,
      cashBalance,
      pendingPayments: pendingAmount,
    };
  }

  /**
   * Production report
   */
  async getProductionReport(startDate: string, endDate: string) {
    const productions = await prisma.production.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        machine: true,
        brickType: true,
        workers: {
          include: {
            worker: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const totalQuantity = productions.reduce((sum: number, p: any) => sum + p.availableBricks, 0);

    // Group by brick type
    const byBrickType: any = {};
    productions.forEach((p: any) => {
      if (!byBrickType[p.brickType.size]) {
        byBrickType[p.brickType.size] = {
          quantity: 0,
          count: 0,
        };
      }
      byBrickType[p.brickType.size].quantity += p.availableBricks;
      byBrickType[p.brickType.size].count += 1;
    });

    // Group by machine
    const byMachine: any = {};
    productions.forEach((p: any) => {
      if (!byMachine[p.machine.name]) {
        byMachine[p.machine.name] = {
          quantity: 0,
          count: 0,
        };
      }
      byMachine[p.machine.name].quantity += p.availableBricks;
      byMachine[p.machine.name].count += 1;
    });

    return {
      productions,
      summary: {
        totalProductions: productions.length,
        totalQuantity,
        byBrickType,
        byMachine,
      },
    };
  }

  /**
   * Dispatch report
   */
  async getDispatchReport(startDate: string, endDate: string) {
    const dispatches = await prisma.dispatch.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        customer: true,
        brickType: true,
      },
      orderBy: { date: 'desc' },
    });

    const totalQuantity = dispatches.reduce((sum: number, d: any) => sum + d.quantity, 0);
    const totalRevenue = dispatches.reduce((sum: number, d: any) => sum + (d.totalAmount || 0), 0);
    const totalTransportCost = dispatches.reduce((sum: number, d: any) => sum + d.transportCost, 0);
    const totalLoadingCost = dispatches.reduce((sum: number, d: any) => sum + d.loadingCost, 0);

    // Group by customer
    const byCustomer: any = {};
    dispatches.forEach((d: any) => {
      if (!byCustomer[d.customer.name]) {
        byCustomer[d.customer.name] = {
          quantity: 0,
          revenue: 0,
          count: 0,
        };
      }
      byCustomer[d.customer.name].quantity += d.quantity;
      byCustomer[d.customer.name].revenue += d.totalAmount || 0;
      byCustomer[d.customer.name].count += 1;
    });

    // Group by payment status
    const byPaymentStatus: any = {};
    dispatches.forEach((d: any) => {
      if (!byPaymentStatus[d.paymentStatus]) {
        byPaymentStatus[d.paymentStatus] = {
          count: 0,
          totalAmount: 0,
        };
      }
      byPaymentStatus[d.paymentStatus].count += 1;
      byPaymentStatus[d.paymentStatus].totalAmount += d.totalAmount || 0;
    });

    return {
      dispatches,
      summary: {
        totalDispatches: dispatches.length,
        totalQuantity,
        totalRevenue,
        totalTransportCost,
        totalLoadingCost,
        byCustomer,
        byPaymentStatus,
      },
    };
  }

  /**
   * Financial report
   */
  async getFinancialReport(startDate: string, endDate: string) {
    const dateRange = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };

    // Revenue from dispatches
    const dispatches = await prisma.dispatch.aggregate({
      where: { date: dateRange },
      _sum: { totalAmount: true, transportCost: true, loadingCost: true },
    });

    // Expenses (from Cash Book)
    const expenses = await (prisma.cashEntry as any).findMany({
      where: {
        date: dateRange,
        type: 'DEBIT',
        isRecordOnly: false,
      } as any,
      include: {
        worker: {
          select: { name: true },
        },
      },
    });

    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

    // Group expenses by category
    const expensesByCategory: any = {};
    expenses.forEach((e: any) => {
      if (!expensesByCategory[e.category]) {
        expensesByCategory[e.category] = 0;
      }
      expensesByCategory[e.category] += e.amount;
    });

    // Cash entries
    const cashEntries = await (prisma.cashEntry as any).findMany({
      where: { date: dateRange } as any,
    });

    let cashCredit = 0;
    let cashDebit = 0;
    cashEntries.forEach((entry: any) => {
      if (entry.isRecordOnly) return;
      if (entry.type === 'CREDIT') {
        cashCredit += entry.amount;
      } else {
        cashDebit += entry.amount;
      }
    });

    const revenue = dispatches._sum.totalAmount || 0;
    const profit = revenue - totalExpenses;

    return {
      revenue,
      expenses: totalExpenses,
      profit,
      expensesByCategory,
      transportCost: dispatches._sum.transportCost || 0,
      loadingCost: dispatches._sum.loadingCost || 0,
      cashFlow: {
        credit: cashCredit,
        debit: cashDebit,
        net: cashCredit - cashDebit,
      },
    };
  }

  /**
   * Worker performance report
   */
  async getWorkerReport(startDate: string, endDate: string) {
    const workers = await prisma.worker.findMany({
      where: { isActive: true },
      include: {
        productionWorkers: {
          where: {
            production: {
              date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            },
          },
          include: {
            production: {
              select: {
                date: true,
                shift: true,
                brickType: true,
              },
            },
          },
        },
      },
    });

    const workerStats = workers.map((worker: any) => {
      const totalQuantity = worker.productionWorkers.reduce((sum: number, pw: any) => sum + pw.quantity, 0);
      const totalDays = worker.productionWorkers.length;

      let earnings = 0;
      if (worker.paymentType === 'PER_BRICK') {
        earnings = totalQuantity * worker.rate;
      } else {
        earnings = totalDays * worker.rate;
      }

      return {
        worker: {
          id: worker.id,
          name: worker.name,
          role: worker.role,
          paymentType: worker.paymentType,
          rate: worker.rate,
        },
        totalProductions: totalDays,
        totalQuantity,
        earnings,
      };
    });

    return workerStats;
  }

  /**
   * Person-wise unified logs
   */
  async getPersonLogs(personId: string, startDate?: string, endDate?: string) {
    const dateFilter: any = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    };

    const [
      attendance,
      advances,
      settlements,
      cashEntries,
      transportEntries,
      salesOrders,
      dispatches
    ] = await Promise.all([
      prisma.attendance.findMany({
        where: { workerId: personId, date: dateFilter },
        orderBy: { date: 'desc' }
      }),
      prisma.workerAdvance.findMany({
        where: { workerId: personId, date: dateFilter },
        orderBy: { date: 'desc' }
      }),
      prisma.monthlySettlement.findMany({
        where: { workerId: personId, createdAt: dateFilter },
        orderBy: { createdAt: 'desc' }
      }),
      (prisma.cashEntry as any).findMany({
        where: { workerId: personId, date: dateFilter },
        orderBy: { date: 'desc' }
      }),
      prisma.transportEntry.findMany({
        where: { driverId: personId, date: dateFilter },
        orderBy: { date: 'desc' },
        include: { vehicle: true }
      }),
      prisma.clientOrder.findMany({
        where: { handledById: personId, orderDate: dateFilter },
        orderBy: { orderDate: 'desc' },
        include: { client: true }
      }),
      prisma.dispatch.findMany({
        where: { handledById: personId, date: dateFilter },
        orderBy: { date: 'desc' },
        include: { customer: true }
      })
    ]);

    // Normalize logs
    const logs: any[] = [
      ...attendance.map(a => ({
        id: a.id,
        date: a.date,
        type: 'attendance',
        title: a.present ? 'Present for work' : 'Absent',
        amount: null,
        reference: 'Attendance'
      })),
      ...advances.map(a => ({
        id: a.id,
        date: a.date,
        type: 'payment',
        title: `${a.type} Paid`,
        amount: a.amount,
        reference: a.paymentMode
      })),
      ...settlements.map(s => ({
        id: s.id,
        date: s.paidAt || s.createdAt,
        type: 'payment',
        title: 'Monthly Salary Settlement',
        amount: s.netPaid,
        reference: 'Settlement'
      })),
      ...cashEntries.map(c => ({
        id: c.id,
        date: c.date,
        type: 'expense',
        title: c.description,
        amount: c.amount,
        reference: c.category
      })),
      ...transportEntries.map(t => ({
        id: t.id,
        date: t.date,
        type: 'transport',
        title: `Completed ${t.loads} loads`,
        amount: t.transactionType === 'INCOME' ? t.incomeAmount : t.expenseAmount,
        reference: t.vehicle.vehicleNumber
      })),
      ...salesOrders.map(o => ({
        id: o.id,
        date: o.orderDate,
        type: 'sales',
        title: `Handled order for ${o.client.name}`,
        amount: o.totalAmount,
        reference: 'Sales'
      })),
      ...dispatches.map(d => ({
        id: d.id,
        date: d.date,
        type: 'sales',
        title: `Handled dispatch for ${d.customer.name}`,
        amount: d.totalAmount,
        reference: 'Dispatch'
      }))
    ];

    // Sort by date DESC
    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Summary Stats
    const totalEarned = logs
      .filter(l => l.type === 'sales' || (l.type === 'transport' && l.amount > 0))
      .reduce((sum, l) => sum + (l.amount || 0), 0);
    
    const totalPaid = logs
      .filter(l => l.type === 'payment' || l.type === 'expense')
      .reduce((sum, l) => sum + (l.amount || 0), 0);

    const totalLoads = transportEntries.reduce((sum, t) => sum + t.loads, 0);

    const worker = await prisma.worker.findUnique({ where: { id: personId } });

    return {
      logs,
      summary: {
        totalEarned,
        totalPaid,
        pendingAmount: (worker?.advanceBalance || 0),
        totalLoads
      }
    };
  }
}
