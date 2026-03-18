import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateWorkerInput, UpdateWorkerInput } from './workers.validation';

export class WorkersService {
  async createWorker(data: CreateWorkerInput) {
    const worker = await prisma.worker.create({
      data,
    });

    return worker;
  }

  async getAllWorkers(activeOnly: boolean = true, employeeType?: string) {
    // Check if migration is needed (one-time check can be added or just handle dynamically)
    // For safety, we'll ensure the existing records have the new fields populated if they are accessed

    const workers = await prisma.worker.findMany({
      where: {
        AND: [
          activeOnly ? { isActive: true } : {},
          employeeType ? { employeeType } : {},
        ]
      },
      orderBy: { name: 'asc' },
    });

    // Dynamic migration for records that might be missing data after schema update
    // (Prisma defaults handle some, but we need to map legacy 'rate' to new fields)
    const migratedWorkers = await Promise.all(workers.map(async (worker) => {
      let needsUpdate = false;
      const updateData: any = {};

      // 1. If legacy MONTHLY but not Staff, fix it FIRST
      if (worker.paymentType === 'MONTHLY' && worker.employeeType !== 'Staff') {
        updateData.employeeType = 'Staff';
        updateData.monthlySalary = worker.monthlySalary || worker.rate;
        needsUpdate = true;
      }
      // 2. Map legacy rate to perBrickRate/weeklyWage for Workers
      else if (worker.employeeType === 'Worker' && worker.perBrickRate === 0 && worker.weeklyWage === 0 && worker.rate > 0) {
        if (worker.paymentType === 'PER_BRICK') updateData.perBrickRate = worker.rate;
        else updateData.weeklyWage = worker.rate;
        needsUpdate = true;
      }
      // 3. Map legacy rate to monthlySalary for Staff
      else if (worker.employeeType === 'Staff' && worker.monthlySalary === 0 && worker.rate > 0) {
        updateData.monthlySalary = worker.rate;
        needsUpdate = true;
      }

      if (needsUpdate) {
        return await prisma.worker.update({
          where: { id: worker.id },
          data: updateData
        });
      }
      return worker;
    }));

    return migratedWorkers;
  }

  async getWorkerById(id: string) {
    const worker = await prisma.worker.findUnique({
      where: { id },
      include: {
        productionWorkers: {
          include: {
            production: {
              select: {
                date: true,
                shift: true,
                brickType: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!worker) {
      throw new AppError('Worker not found', 404);
    }

    return worker;
  }

  async updateWorker(id: string, data: UpdateWorkerInput) {
    const worker = await prisma.worker.findUnique({
      where: { id },
    });

    if (!worker) {
      throw new AppError('Worker not found', 404);
    }

    const updatedWorker = await prisma.worker.update({
      where: { id },
      data,
    });

    return updatedWorker;
  }

  async deleteWorker(id: string, forceDelete: boolean = false) {
    const worker = await prisma.worker.findUnique({
      where: { id },
    });

    if (!worker) {
      throw new AppError('Worker not found', 404);
    }

    if (forceDelete) {
      // Cascade delete related records to avoid foreign key constraint errors
      await prisma.$transaction(async (tx) => {
        // 1. Delete relations that depend on Worker
        await tx.attendance.deleteMany({ where: { workerId: id } });
        await tx.dailyWage.deleteMany({ where: { workerId: id } });
        await tx.productionWorker.deleteMany({ where: { workerId: id } });
        await tx.workerAdvance.deleteMany({ where: { workerId: id } });
        await tx.monthlySettlement.deleteMany({ where: { workerId: id } });
        await tx.weeklySettlement.deleteMany({ where: { workerId: id } });

        // 2. Clear foreign keys in other tables (set to null if optional)
        await tx.expense.updateMany({ where: { workerId: id }, data: { workerId: null } });
        await tx.cashEntry.updateMany({ where: { workerId: id }, data: { workerId: null } });
        await tx.dispatchSchedule.updateMany({ where: { driverId: id }, data: { driverId: null } });

        // 3. Final deletion
        await tx.worker.delete({ where: { id } });
      });
      return { message: 'Worker and all related data deleted permanently' };
    }

    // Soft delete
    await prisma.worker.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Worker deactivated successfully' };
  }

  async getWorkerStats(workerId: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = {
      workerId,
    };

    if (startDate && endDate) {
      whereClause.production = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const productions = await prisma.productionWorker.findMany({
      where: whereClause,
      include: {
        production: {
          select: {
            date: true,
            shift: true,
            brickType: true,
          },
        },
        worker: true,
      },
    });

    const totalQuantity = productions.reduce((sum: number, p: any) => sum + p.quantity, 0);
    const totalEarnings = productions.reduce((sum: number, p: any) => {
      const worker = p.worker;
      const rate = worker.employeeType === 'Worker' ?
        (worker.paymentType === 'PER_BRICK' ? worker.perBrickRate : worker.weeklyWage) :
        worker.monthlySalary;

      return sum + (worker.paymentType === 'PER_BRICK' ? p.quantity * rate : rate);
    }, 0);

    return {
      totalProductions: productions.length,
      totalQuantity,
      totalEarnings,
      productions: productions.slice(0, 20),
    };
  }

  async getWorkerLedger(workerId: string) {
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker) throw new AppError('Worker not found', 404);

    // 1. Fetch all relevant activities
    const [productions, attendance, advances, dailyWages, cashEntries] = await Promise.all([
      prisma.productionWorker.findMany({
        where: { workerId },
        include: { production: { include: { brickType: true } } },
      }),
      prisma.attendance.findMany({
        where: { workerId },
        orderBy: { date: 'desc' },
      }),
      prisma.workerAdvance.findMany({
        where: { workerId },
        orderBy: { date: 'desc' },
      }),
      prisma.dailyWage.findMany({
        where: { workerId },
        orderBy: { date: 'desc' },
      }),
      prisma.cashEntry.findMany({
        where: { workerId },
        orderBy: { date: 'desc' },
      })
    ]);

    // 2. Map everything to a unified ledger format
    const ledger: any[] = [];

    // Production Records (Work Done)
    productions.forEach(p => {
      ledger.push({
        id: `prod-${p.id}`,
        idRaw: p.id,
        date: p.production.date,
        type: 'WORK',
        category: 'Production',
        description: `Production: ${p.quantity} pcs (${p.production.brickType.size}) - ${p.production.shift} shift`,
        amount: 0, // No monetary value for production row itself in ledger usually, or calculate piece rate
        quantity: p.quantity,
        reference: 'production',
      });
    });

    // Attendance
    attendance.forEach(a => {
      ledger.push({
        id: `att-${a.id}`,
        idRaw: a.id,
        date: a.date,
        type: 'ATTENDANCE',
        category: 'Attendance',
        description: a.present ? 'Present' : 'Absent',
        amount: 0,
        reference: 'attendance',
      });
    });

    // Advances
    advances.forEach(adv => {
      ledger.push({
        id: `adv-${adv.id}`,
        idRaw: adv.id,
        date: adv.date,
        type: 'CREDIT', // Worker receives money
        category: 'Advance',
        description: `Advance: ${adv.note || 'No note'}`,
        amount: adv.amount,
        paymentMode: adv.paymentMode,
        reference: 'advance',
      });
    });

    // Daily Wages / Settlements
    dailyWages.forEach(dw => {
      ledger.push({
        id: `wage-${dw.id}`,
        idRaw: dw.id,
        date: dw.date,
        type: 'EARNING',
        category: 'Wage Calculation',
        description: `Wage Earned for ${dw.bricksMade || 0} bricks`,
        amount: dw.wageAmount,
        netPayable: dw.netPayable,
        isPaid: dw.isPaid,
        reference: 'dailyWage',
      });
    });

    // Cash Book Entries (Payments/Ad Hoc)
    cashEntries.forEach(ce => {
      // Avoid duplicating advances/wages if they are already recorded in cash book
      // Usually these are the actual payouts
      ledger.push({
        id: `cash-${ce.id}`,
        idRaw: ce.id,
        date: ce.date,
        type: ce.type === 'CREDIT' ? 'DEBIT' : 'CREDIT', // Inverse for worker ledger: Company Credit = Worker Debit
        category: ce.category,
        description: ce.description,
        amount: ce.amount,
        paymentMode: ce.paymentMode,
        reference: 'cashEntry',
      });
    });

    // 3. Sort by date descending
    return ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
