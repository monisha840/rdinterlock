import prisma from '../../config/database';
import { AdvanceService } from './advance.service';
import { SystemSettingsService } from '../settings/systemSettings.service';

const advanceService = new AdvanceService();
const systemSettingsService = new SystemSettingsService();

interface WageCalculationResult {
  workerId: string;
  workerName: string;
  role: string;
  paymentType: string;
  rate: number;
  bricksMade: number;
  wageAmount: number;
  advanceBalance: number;
  advanceUsed: number;
  netPayable: number;
}

export class WageService {
  /**
   * Calculate daily wages for all eligible workers on a specific date
   */
  async calculateDailyWages(date: Date): Promise<WageCalculationResult[]> {
    // Fetch global settings
    const settings = await systemSettingsService.getAllSettings();
    const productionActive = settings['production_active'] === 'true';
    const masonActive = settings['mason_active'] === 'true';
    const prodDayRate = parseFloat(settings['production_day_rate'] || '0');
    const prodNightRate = parseFloat(settings['production_night_rate'] || '0');
    const masonRate = parseFloat(settings['mason_rate'] || '0');

    // Get all active workers (Worker type only, exclude Staff)
    const workers = await prisma.worker.findMany({
      where: {
        isActive: true,
        employeeType: 'Worker',
        NOT: {
          paymentType: 'MONTHLY',
        },
      },
      include: {
        productionWorkers: {
          where: {
            production: {
              date: {
                gte: new Date(date.setHours(0, 0, 0, 0)),
                lt: new Date(date.setHours(23, 59, 59, 999)),
              },
            },
          },
          include: {
            production: true,
          },
        },
        attendance: {
          where: {
            date: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            },
          },
        },
      },
    });

    const calculations: WageCalculationResult[] = [];

    for (const worker of workers) {
      let wageAmount = 0;
      let bricksMade = 0;

      if (worker.paymentType === 'PER_BRICK') {
        // Calculate brick-based wage
        bricksMade = worker.productionWorkers.reduce(
          (sum: number, pw: any) => sum + pw.quantity,
          0
        );

        // Apply rules-based rate or worker rate
        let activeRate = worker.rate;
        if (masonActive && worker.role.toUpperCase() === 'MASON') {
          activeRate = masonRate;
        } else if (productionActive && worker.role.toUpperCase() === 'PRODUCTION_WORKER') {
          // For production workers, we need to distinguish shift if possible
          // But since we sum up all bricks, we check each production entry
          wageAmount = worker.productionWorkers.reduce((sum: number, pw: any) => {
            const shiftRate = pw.production.shift === 'NIGHT' ? prodNightRate : prodDayRate;
            return sum + (pw.quantity * shiftRate);
          }, 0);

          calculations.push({
            workerId: worker.id,
            workerName: worker.name,
            role: worker.role,
            paymentType: worker.paymentType,
            rate: prodDayRate, // Show day rate as reference
            bricksMade,
            wageAmount,
            advanceBalance: worker.advanceBalance,
            advanceUsed: Math.min(worker.advanceBalance, wageAmount),
            netPayable: wageAmount - Math.min(worker.advanceBalance, wageAmount),
          });
          continue; // Skip the default calculation below
        }

        wageAmount = bricksMade * activeRate;
      } else if (worker.paymentType === 'DAILY') {
        // Check attendance
        const attendance = worker.attendance[0];
        if (attendance && attendance.present) {
          wageAmount = worker.rate;
        } else {
          wageAmount = 0;
        }
      }

      // Calculate advance adjustment
      const advanceBalance = worker.advanceBalance;
      const advanceUsed = Math.min(advanceBalance, wageAmount);
      const netPayable = wageAmount - advanceUsed;

      calculations.push({
        workerId: worker.id,
        workerName: worker.name,
        role: worker.role,
        paymentType: worker.paymentType,
        rate: worker.rate,
        bricksMade,
        wageAmount,
        advanceBalance,
        advanceUsed,
        netPayable,
      });
    }

    return calculations;
  }

  /**
   * Save calculated wages to database
   */
  async saveCalculatedWages(
    date: Date,
    calculations: WageCalculationResult[]
  ) {
    // Clear existing wages for this date before re-calculating (supports automation/updates)
    await prisma.dailyWage.deleteMany({
      where: {
        date: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
        isPaid: false, // Don't delete already paid wages
      },
    });

    // Create wage records
    const wageRecords = await prisma.$transaction(
      calculations
        .filter((calc) => calc.wageAmount > 0)
        .map((calc) =>
          prisma.dailyWage.create({
            data: {
              workerId: calc.workerId,
              date,
              bricksMade: calc.bricksMade || null,
              wageAmount: calc.wageAmount,
              advanceUsed: calc.advanceUsed,
              netPayable: calc.netPayable,
              isPaid: false,
            },
          })
        )
    );

    return wageRecords;
  }

  /**
   * Get wage records with filters
   */
  async getWages(filters: {
    date?: Date;
    startDate?: Date;
    endDate?: Date;
    workerId?: string;
    isPaid?: boolean;
  }) {
    const where: any = {};

    if (filters.workerId) {
      where.workerId = filters.workerId;
    }

    if (filters.isPaid !== undefined) {
      where.isPaid = filters.isPaid;
    }

    if (filters.date) {
      where.date = {
        gte: new Date(filters.date.setHours(0, 0, 0, 0)),
        lt: new Date(filters.date.setHours(23, 59, 59, 999)),
      };
    } else if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    const wages = await prisma.dailyWage.findMany({
      where,
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            role: true,
            paymentType: true,
            rate: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { worker: { name: 'asc' } }],
    });

    return wages;
  }

  /**
   * Pay wages (mark as paid and create cash entries)
   */
  async payWages(wageIds: string[], paymentDate?: Date) {
    const date = paymentDate || new Date();

    // Get wage records
    const wages = await prisma.dailyWage.findMany({
      where: {
        id: { in: wageIds },
      },
      include: {
        worker: true,
      },
    });

    if (wages.length === 0) {
      throw new Error('No wage records found');
    }

    // Check if already paid
    const alreadyPaid = wages.filter((w: any) => w.isPaid);
    if (alreadyPaid.length > 0) {
      throw new Error(
        `Some wages are already paid: ${alreadyPaid
          .map((w: any) => w.worker.name)
          .join(', ')}`
      );
    }

    // Process payment in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const updatedWages = [];
      const cashEntries = [];

      for (const wage of wages) {
        // Mark wage as paid
        const updated = await tx.dailyWage.update({
          where: { id: wage.id },
          data: { isPaid: true },
        });
        updatedWages.push(updated);

        // Adjust advance if used
        if (wage.advanceUsed > 0) {
          await advanceService.adjustAdvance(
            wage.workerId,
            wage.advanceUsed,
            date,
            `Advance adjusted for wage on ${wage.date.toISOString().split('T')[0]}`
          );
        }

        // Create cash entry for net payable
        if (wage.netPayable > 0) {
          const cashEntry = await (tx.cashEntry as any).create({
            data: {
              date,
              type: 'DEBIT',
              amount: wage.netPayable,
              description: `Wage payment to ${wage.worker.name} for ${wage.date.toISOString().split('T')[0]}`,
              category: wage.worker.employeeType === 'Staff' ? 'Staff Salary' : 'Worker Wages',
              workerId: wage.workerId,
            } as any,
          });
          cashEntries.push(cashEntry);
        }
      }

      return { updatedWages, cashEntries };
    });

    return result;
  }

  /**
   * Get wage summary for a date range
   */
  async getWageSummary(startDate: Date, endDate: Date) {
    const wages = await prisma.dailyWage.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            role: true,
            paymentType: true,
          },
        },
      },
    });

    const totalWages = wages.reduce((sum: number, w: any) => sum + w.wageAmount, 0);
    const totalAdvanceUsed = wages.reduce((sum: number, w: any) => sum + w.advanceUsed, 0);
    const totalNetPayable = wages.reduce((sum: number, w: any) => sum + w.netPayable, 0);
    const totalPaid = wages
      .filter((w: any) => w.isPaid)
      .reduce((sum: number, w: any) => sum + w.netPayable, 0);
    const totalPending = wages
      .filter((w: any) => !w.isPaid)
      .reduce((sum: number, w: any) => sum + w.netPayable, 0);

    return {
      totalWages,
      totalAdvanceUsed,
      totalNetPayable,
      totalPaid,
      totalPending,
      paidCount: wages.filter((w: any) => w.isPaid).length,
      pendingCount: wages.filter((w: any) => !w.isPaid).length,
      totalRecords: wages.length,
    };
  }

  /**
   * Delete wage record (only if not paid)
   */
  async deleteWage(wageId: string) {
    const wage = await prisma.dailyWage.findUnique({
      where: { id: wageId },
    });

    if (!wage) {
      throw new Error('Wage record not found');
    }

    if (wage.isPaid) {
      throw new Error('Cannot delete paid wage record');
    }

    await prisma.dailyWage.delete({
      where: { id: wageId },
    });

    return { message: 'Wage record deleted successfully' };
  }

  /**
   * Get per-worker wage report for a date range (for weekly production workers and masons)
   */
  async getWorkerWageReport(startDate: Date, endDate: Date) {
    // Fetch global settings for rates
    const settings = await systemSettingsService.getAllSettings();
    const prodDayRate = parseFloat(settings['production_day_rate'] || '2.50');
    const prodNightRate = parseFloat(settings['production_night_rate'] || '1.25');
    const masonRate = parseFloat(settings['mason_rate'] || '9.00');

    // Get all non-monthly active workers
    const workers = await prisma.worker.findMany({
      where: {
        isActive: true,
        employeeType: 'Worker',
        NOT: { paymentType: 'MONTHLY' },
      },
    });

    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const report = await Promise.all(
      workers.map(async (worker) => {
        // Get production records for this worker in date range
        const productionWorkers = await prisma.productionWorker.findMany({
          where: {
            workerId: worker.id,
            production: {
              date: { gte: startOfDay, lte: endOfDay },
            },
          },
          include: {
            production: true,
          },
        });

        let dayBricks = 0;
        let nightBricks = 0;

        for (const pw of productionWorkers) {
          const shift = pw.production.shift;
          if (shift === 'NIGHT') {
            nightBricks += pw.quantity;
          } else {
            dayBricks += pw.quantity;
          }
        }

        const totalBricks = dayBricks + nightBricks;

        // Calculate gross wage based on role/type
        let grossWage = 0;
        if (worker.role.toUpperCase() === 'MASON') {
          grossWage = totalBricks * masonRate;
        } else {
          // Production worker - day rate + night premium
          grossWage = (dayBricks * prodDayRate) + (nightBricks * prodNightRate);
        }

        // Get attendance count
        const attendanceCount = await prisma.attendance.count({
          where: {
            workerId: worker.id,
            date: { gte: startOfDay, lte: endOfDay },
            present: true,
          },
        });

        // Fetch advances given to the worker in this specific date range
        const givenAdvances = await prisma.workerAdvance.findMany({
          where: {
            workerId: worker.id,
            type: 'GIVEN',
            date: { gte: startOfDay, lte: endOfDay },
          },
        });

        const totalAdvancePaid = givenAdvances.reduce((sum, adv) => sum + adv.amount, 0);

        // Fetch formal staff payments for this worker in date range
        const formalPayments = await (prisma as any).staffPayment.findMany({
          where: {
            personId: worker.id,
            date: { gte: startOfDay, lte: endOfDay }
          }
        });
        const totalPaid = formalPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const netPayable = Math.max(0, grossWage - totalAdvancePaid);
        const pendingAmount = Math.max(0, netPayable - totalPaid);

        return {
          workerId: worker.id,
          workerName: worker.name,
          role: worker.role,
          paymentType: worker.paymentType,
          rate: worker.rate,
          dayBricks,
          nightBricks,
          totalBricks,
          grossWage,
          advanceBalance: totalAdvancePaid, // Use advanceBalance field to pass the period's advance paid amount to match frontend expectation
          totalPaid,
          pendingAmount,
          daysPresent: attendanceCount,
          advanceDetails: givenAdvances.map(a => ({
            id: a.id,
            amount: a.amount,
            date: a.date,
            // @ts-ignore
            paymentMode: a.paymentMode,
          })),
        };
      })
    );

    return report.filter(r => r.totalBricks > 0 || r.daysPresent > 0);
  }
}
