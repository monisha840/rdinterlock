import prisma from '../../config/database';
import { getWeekRange } from './date.utils';



export class WeeklySettlementService {
  /**
   * Calculate weekly settlements for production workers
   */
  async calculateWeeklySettlement(weekStart: Date, weekEnd: Date) {
    // Get all production workers (PER_BRICK or DAILY payment types)
    const workers = await prisma.worker.findMany({
      where: {
        isActive: true,
        paymentType: {
          in: ['PER_BRICK', 'DAILY'],
        },
      },
    });

    // Get all daily wage records in the week range
    const dailyWages = await prisma.dailyWage.findMany({
      where: {
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        worker: true,
      },
    });

    // Group wages by worker
    const workerWages = new Map<string, any[]>();
    for (const wage of dailyWages) {
      if (!workerWages.has(wage.workerId)) {
        workerWages.set(wage.workerId, []);
      }
      workerWages.get(wage.workerId)!.push(wage);
    }

    const settlements = [];

    for (const worker of workers) {
      const wages = workerWages.get(worker.id) || [];

      if (wages.length === 0) {
        // Skip if no wages in this period
        continue;
      }

      // Calculate totals
      const totalWage = wages.reduce(
        (sum: number, w: any) => sum + w.netPayable,
        0
      );

      // Check advance balance
      const advanceUsed = Math.min(worker.advanceBalance, totalWage);
      const netPaid = totalWage - advanceUsed;

      settlements.push({
        workerId: worker.id,
        workerName: worker.name,
        role: worker.role,
        paymentType: worker.paymentType,
        totalWage,
        advanceBalance: worker.advanceBalance,
        advanceUsed,
        netPaid,
        daysWorked: wages.length,
      });
    }

    return settlements;
  }

  /**
   * Save calculated weekly settlements to database
   */
  async saveWeeklySettlement(
    weekStart: Date,
    weekEnd: Date,
    settlements: any[]
  ) {
    // Check if settlement already exists for this period
    const existing = await prisma.weeklySettlement.findMany({
      where: {
        weekStart: {
          gte: weekStart,
          lte: weekStart,
        },
      },
    });

    if (existing.length > 0) {
      throw new Error('Weekly settlement already calculated for this period');
    }

    // Create settlement records
    const records = await prisma.$transaction(
      settlements
        .filter((s) => s.totalWage > 0)
        .map((s) =>
          prisma.weeklySettlement.create({
            data: {
              workerId: s.workerId,
              weekStart,
              weekEnd,
              totalWage: s.totalWage,
              advanceUsed: s.advanceUsed,
              netPaid: s.netPaid,
              isSettled: false,
            },
          })
        )
    );

    return records;
  }

  /**
   * Get weekly settlements with filters
   */
  async getSettlements(filters: {
    weekStart?: Date;
    weekEnd?: Date;
    workerId?: string;
    isSettled?: boolean;
  }) {
    const where: any = {};

    if (filters.workerId) {
      where.workerId = filters.workerId;
    }

    if (filters.isSettled !== undefined) {
      where.isSettled = filters.isSettled;
    }

    if (filters.weekStart) {
      where.weekStart = {
        gte: filters.weekStart,
      };
    }

    if (filters.weekEnd) {
      where.weekEnd = {
        lte: filters.weekEnd,
      };
    }

    const settlements = await prisma.weeklySettlement.findMany({
      where,
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
      orderBy: [{ weekStart: 'desc' }, { worker: { name: 'asc' } }],
    });

    return settlements;
  }

  /**
   * Pay weekly settlements
   */
  async paySettlements(settlementIds: string[], paymentDate?: Date) {
    const date = paymentDate || new Date();

    // Get settlement records
    const settlements = await prisma.weeklySettlement.findMany({
      where: {
        id: { in: settlementIds },
      },
      include: {
        worker: true,
      },
    });

    if (settlements.length === 0) {
      throw new Error('No settlement records found');
    }

    // Check if already settled
    const alreadySettled = settlements.filter((s: any) => s.isSettled);
    if (alreadySettled.length > 0) {
      throw new Error(
        `Some settlements are already paid: ${alreadySettled
          .map((s: any) => s.worker.name)
          .join(', ')}`
      );
    }

    // Process payment in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const updatedSettlements = [];
      const cashEntries = [];

      for (const settlement of settlements) {
        // Mark settlement as paid
        const updated = await tx.weeklySettlement.update({
          where: { id: settlement.id },
          data: {
            isSettled: true,
            settledAt: date,
          },
        });
        updatedSettlements.push(updated);

        // Adjust advance if used
        if (settlement.advanceUsed > 0) {
          await tx.workerAdvance.create({
            data: {
              workerId: settlement.workerId,
              amount: -settlement.advanceUsed,
              type: 'ADJUSTED',
              date,
              note: `Advance adjusted from weekly settlement (${
                settlement.weekStart.toISOString().split('T')[0]
              } to ${settlement.weekEnd.toISOString().split('T')[0]})`,
            },
          });

          await tx.worker.update({
            where: { id: settlement.workerId },
            data: {
              advanceBalance: {
                decrement: settlement.advanceUsed,
              },
            },
          });
        }

        // Create cash entry for net paid
        if (settlement.netPaid > 0) {
          const cashEntry = await tx.cashEntry.create({
            data: {
              date,
              type: 'DEBIT',
              amount: settlement.netPaid,
              description: `Weekly wage settlement - ${settlement.worker.name} (${
                settlement.weekStart.toISOString().split('T')[0]
              } to ${settlement.weekEnd.toISOString().split('T')[0]})`,
              category: 'WAGE',
            },
          });
          cashEntries.push(cashEntry);
        }
      }

      return { updatedSettlements, cashEntries };
    });

    return result;
  }

  /**
   * Get current week settlements
   */
  async getCurrentWeekSettlements() {
    const { weekStart, weekEnd } = getWeekRange(new Date());

    return this.getSettlements({
      weekStart,
      weekEnd,
    });
  }
}
