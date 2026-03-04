import prisma from '../../config/database';
import { AdvanceService } from './advance.service';


const advanceService = new AdvanceService();

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
    // Get all active workers (exclude Monthly payment type and restricted roles)
    const workers = await prisma.worker.findMany({
      where: {
        isActive: true,
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
        wageAmount = bricksMade * worker.rate;
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
          const cashEntry = await tx.cashEntry.create({
            data: {
              date,
              type: 'DEBIT',
              amount: wage.netPayable,
              description: `Wage payment to ${wage.worker.name} for ${wage.date.toISOString().split('T')[0]
                }`,
              category: 'WAGE',
            },
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
}
