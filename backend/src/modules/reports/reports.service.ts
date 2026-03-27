import { format } from 'date-fns';
import prisma from '../../config/database';
import { getTodayRange, getDateRange } from '../../utils/dateUtils';

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

    // Latest production entry today
    const latestProduction = await prisma.production.findFirst({
      where: {
        date: todayRange,
      },
      orderBy: { createdAt: 'desc' },
      include: { machine: true, brickType: true },
    });

    // Recent Activity Feed (Last 5 events)
    const [recentProd, recentDisp, recentCash] = await Promise.all([
      prisma.production.findMany({ 
        take: 5, 
        orderBy: { createdAt: 'desc' },
        include: { machine: true }
      }),
      prisma.dispatch.findMany({ 
        take: 5, 
        orderBy: { date: 'desc' },
        include: { customer: true }
      }),
      (prisma.cashEntry as any).findMany({ 
        take: 5, 
        orderBy: { date: 'desc' }
      }),
    ]);

    const activityFeed: any[] = [
      ...recentProd.map(p => ({
        type: 'PRODUCTION',
        text: `Production: ${p.availableBricks.toLocaleString()} bricks (${p.machine.name}, ${p.shift} Shift)`,
        time: p.createdAt,
      })),
      ...recentDisp.map(d => ({
        type: 'DISPATCH',
        text: `Dispatch: ${d.quantity.toLocaleString()} bricks to ${d.customer.name}`,
        time: d.date,
      })),
      ...recentCash.map((c: any) => ({
        type: 'EXPENSE',
        text: `${c.type === 'CREDIT' ? 'Payment' : 'Expense'}: ₹${c.amount.toLocaleString()} for ${c.category}`,
        time: c.date,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

    // --- PRODUCTION CHART DATA (LAST 7 DAYS) ---
    const last7Days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      last7Days.push(d);
    }

    const startOfRange = last7Days[0];
    const endOfRange = new Date();
    endOfRange.setHours(23, 59, 59, 999);

    const weeklyProductions = await prisma.production.findMany({
      where: {
        date: {
          gte: startOfRange,
          lte: endOfRange,
        },
      },
      select: {
        date: true,
        availableBricks: true,
      },
    });

    const productionChart = last7Days.map(dayDate => {
      const dayName = format(dayDate, 'EEE'); // Standardized 'Mon', 'Tue' etc.
      
      const dayQty = weeklyProductions
        .filter(p => format(new Date(p.date), 'yyyy-MM-dd') === format(dayDate, 'yyyy-MM-dd'))
        .reduce((sum, p) => sum + (p.availableBricks || 0), 0);
      
      return { day: dayName, qty: dayQty };
    });

    return {
      todayProduction: {
        quantity: todayProduction._sum.availableBricks || 0,
        count: todayProduction._count,
        latestTime: (todayProduction._sum.availableBricks || 0) > 0 ? latestProduction?.createdAt : null,
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
      recentActivity: activityFeed,
      productionChart,
    };
  }

  /**
   * Production report
   */
  async getProductionReport(startDate: string, endDate: string) {
    const dateRange = getDateRange(new Date(startDate), new Date(endDate));
    const productions = await prisma.production.findMany({
      where: {
        date: dateRange,
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
    const dateRange = getDateRange(new Date(startDate), new Date(endDate));
    const dispatches = await prisma.dispatch.findMany({
      where: {
        date: dateRange,
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
    const dateRange = getDateRange(new Date(startDate), new Date(endDate));

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
              date: getDateRange(new Date(startDate), new Date(endDate)),
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
      const workerRate = worker.rate > 0 ? worker.rate : null;

      if (worker.paymentType === 'PER_BRICK') {
         earnings = totalQuantity * (workerRate || (worker.role.toUpperCase() === 'MASON' ? 9.00 : 2.50));
      } else {
        earnings = totalDays * (workerRate || 0);
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
    const dateFilter = (startDate && endDate) 
      ? getDateRange(new Date(startDate), new Date(endDate))
      : {};

    const [
      attendance,
      advances,
      settlements,
      cashEntries,
      transportEntries,
      salesOrders,
      dispatches,
      productionWorkers,
      brickReturns,
      settings
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
      }),
      prisma.productionWorker.findMany({
        where: { 
          workerId: personId, 
          production: { date: dateFilter }
        },
        include: { 
          production: {
            include: { brickType: true }
          }
        },
        orderBy: { production: { date: 'desc' } }
      }),
      prisma.brickReturn.findMany({
        where: { clientId: personId, date: dateFilter },
        include: { brickType: true },
        orderBy: { date: 'desc' }
      }),
      prisma.systemSetting.findMany()
    ]);

    // Parse settings
    const settingMap = settings.reduce((acc: any, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    
    const prodDayRate = parseFloat(settingMap['production_day_rate'] || '2.50');
    const prodNightRate = parseFloat(settingMap['production_night_rate'] || '3.00');
    const masonRate = parseFloat(settingMap['mason_rate'] || '9.00');

    const worker = await prisma.worker.findUnique({ where: { id: personId } });

    // Normalize logs
    const logs: any[] = [
      ...attendance.map((a: any) => ({
        id: a.id,
        date: a.date,
        type: 'attendance',
        title: a.present ? 'Present for work' : 'Absent',
        amount: null,
        reference: 'Attendance'
      })),
      ...advances.map((a: any) => ({
        id: a.id,
        date: a.date,
        type: 'payment',
        title: `${a.type} Paid`,
        amount: a.amount,
        reference: a.paymentMode
      })),
      ...settlements.map((s: any) => ({
        id: s.id,
        date: s.paidAt || s.createdAt,
        type: 'payment',
        title: 'Monthly Salary Settlement',
        amount: s.netPaid,
        reference: 'Settlement'
      })),
      ...cashEntries.map((c: any) => ({
        id: c.id,
        date: c.date,
        type: 'expense',
        title: c.description,
        amount: c.amount,
        reference: c.category
      })),
      ...transportEntries.map((t: any) => ({
        id: t.id,
        date: t.date,
        type: 'transport',
        title: `Completed ${t.loads} loads`,
        amount: t.transactionType === 'INCOME' ? t.incomeAmount : t.expenseAmount,
        reference: t.vehicle.vehicleNumber
      })),
      ...salesOrders.map((o: any) => ({
        id: o.id,
        date: o.orderDate,
        type: 'sales',
        title: `Handled order for ${o.client.name}`,
        amount: o.totalAmount,
        reference: 'Sales'
      })),
      ...dispatches.map((d: any) => ({
        id: d.id,
        date: d.date,
        type: 'sales',
        title: `Handled dispatch for ${d.customer.name}`,
        amount: d.totalAmount,
        reference: 'Dispatch'
      })),
      ...brickReturns.map((r: any) => ({
        id: r.id,
        date: r.date,
        type: 'return',
        title: `Returned ${r.returnedQuantity.toLocaleString()} bricks (${r.brickType.size})`,
        amount: r.returnedQuantity * 0, // Need value?
        reference: 'Return'
      })),
      ...productionWorkers.map((pw: any) => {
        let wage = 0;
        const workerRate = worker?.rate && worker.rate > 0 ? worker.rate : null;
        
        if (worker?.role.toUpperCase() === 'MASON') {
          wage = pw.quantity * (workerRate || masonRate);
        } else {
          // If worker has individual rate, use it. Otherwise use shift rate.
          if (workerRate) {
            wage = pw.quantity * workerRate;
          } else {
            const shiftRate = pw.production.shift === 'NIGHT' ? prodNightRate : prodDayRate;
            wage = pw.quantity * shiftRate;
          }
        }
        return {
          id: pw.id,
          date: pw.production.date,
          type: 'production',
          title: `Produced ${pw.quantity.toLocaleString()} bricks (${pw.production.brickType.size})`,
          amount: wage,
          reference: `${pw.production.shift} Shift`
        };
      })
    ];

    // Sort by date DESC
    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Summary Stats
    // Earnings include: sales commission/total (for managers), transport income (drivers), and production wages
    const totalEarned = logs
      .filter(l => l.type === 'sales' || l.type === 'production' || (l.type === 'transport' && l.amount > 0))
      .reduce((sum, l) => sum + (l.amount || 0), 0);
    
    const totalReturned = logs
      .filter(l => l.type === 'return')
      .reduce((sum, l) => sum + (l.amount || 0), 0);
    
    const totalPaid = logs
      .filter(l => l.type === 'payment' || l.type === 'expense')
      .reduce((sum, l) => sum + (l.amount || 0), 0);

    const totalLoads = transportEntries.reduce((sum, t) => sum + t.loads, 0);

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

  /**
   * BI Summary Report
   */
  async getSummary(startDate: string, endDate: string) {
    const dateRange = getDateRange(new Date(startDate), new Date(endDate));

    // 1. Income
    const [dispatchIncome, transportIncome] = await Promise.all([
      prisma.dispatch.aggregate({
        where: { date: dateRange, status: { not: 'Cancelled' } },
        _sum: { totalAmount: true },
      }),
      prisma.transportEntry.aggregate({
        where: { date: dateRange, transactionType: 'INCOME' },
        _sum: { incomeAmount: true },
      })
    ]);

    const sales_income = dispatchIncome._sum.totalAmount || 0;
    const transport_income_val = transportIncome._sum.incomeAmount || 0;
    const total_income = sales_income + transport_income_val;

    // 2. Expenses from Cash Book
    const cashEntries = await (prisma.cashEntry as any).findMany({
      where: { date: dateRange, type: 'DEBIT', isRecordOnly: false } as any
    });

    const expensesByCategory: Record<string, number> = {};
    let labour_expense = 0;
    let material_expense = 0;
    let other_expense = 0;

    cashEntries.forEach((e: any) => {
      const amt = e.amount || 0;
      const catName = e.category || 'Other';
      const cat = catName.toLowerCase();
      
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + amt;

      if (cat.includes('labour') || cat.includes('salary') || cat.includes('wage') || e.workerId) {
        labour_expense += amt;
      } else if (cat.includes('material') || cat.includes('cement') || cat.includes('flyash')) {
        material_expense += amt;
      } else {
        other_expense += amt;
      }
    });

    // 3. Transport Expense
    const transportExpense = await prisma.transportEntry.aggregate({
      where: { date: dateRange, transactionType: 'EXPENSE' },
      _sum: { expenseAmount: true },
    });
    const transport_expense_val = transportExpense._sum.expenseAmount || 0;

    const total_expense = labour_expense + material_expense + transport_expense_val + other_expense;
    const net_profit = total_income - total_expense;

    // 4. Category-wise sorted list
    const category_expenses = Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 5. Staff Summary (Salary vs Paid vs Pending)
    const [dailyWages, weeklySettlements, monthlySettlements, staffPayments] = await Promise.all([
      prisma.dailyWage.aggregate({ where: { date: dateRange }, _sum: { wageAmount: true } }).catch((e: any) => { console.error('Error in dailyWage aggregate:', e); return { _sum: { wageAmount: 0 } } }),
      prisma.weeklySettlement.aggregate({ where: { generatedAt: dateRange }, _sum: { totalAmount: true } }).catch((e: any) => { console.error('Error in weeklySettlement aggregate:', e); return { _sum: { totalAmount: 0 } } }),
      prisma.monthlySettlement.aggregate({ where: { createdAt: dateRange }, _sum: { salary: true } }).catch((e: any) => { console.error('Error in monthlySettlement aggregate:', e); return { _sum: { salary: 0 } } }),
      (prisma as any).staffPayment.aggregate({ where: { date: dateRange }, _sum: { amount: true } }).catch((e: any) => { console.error('Error in staffPayment aggregate:', e); return { _sum: { amount: 0 } } })
    ]);

    const total_salary = (dailyWages._sum.wageAmount || 0) + 
                         (weeklySettlements._sum.totalAmount || 0) + 
                         (monthlySettlements._sum.salary || 0);
    
    const total_paid_val = (staffPayments._sum.amount || 0); // User wants total_paid = SUM(staff_payments)
    const pending_salary = total_salary - total_paid_val;

    // 6. Transport Summary
    const transportStats = await prisma.transportEntry.aggregate({
      where: { date: dateRange },
      _count: true,
      _sum: { loads: true, incomeAmount: true, expenseAmount: true }
    });

    return {
      total_income,
      total_expense,
      net_profit,
      breakdown: {
        sales_income,
        transport_income: transport_income_val,
        labour_expense,
        material_expense,
        transport_expense: transport_expense_val,
        other_expense
      },
      category_expenses,
      salary_summary: {
        total_salary,
        total_paid: total_paid_val,
        pending: Math.max(0, pending_salary)
      },
      transport_summary: {
        total_loads: transportStats._sum.loads || 0,
        total_income: transportStats._sum.incomeAmount || 0,
        total_expense: transportStats._sum.expenseAmount || 0,
        profit: (transportStats._sum.incomeAmount || 0) - (transportStats._sum.expenseAmount || 0)
      }
    };
  }
}
