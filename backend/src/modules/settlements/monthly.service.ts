import prisma from '../../config/database';



export class MonthlySettlementService {
  /**
   * Calculate monthly salaries for salary staff
   */
  async calculateMonthlySalary(_month: number, _year: number) {
    // Get all salary staff (MONTHLY payment type)
    // Roles: Manager, Driver, Telecaller
    const workers = await prisma.worker.findMany({
      where: {
        isActive: true,
        paymentType: 'MONTHLY',
        role: {
          in: ['MANAGER', 'DRIVER', 'TELECALLER'],
        },
      },
    });

    const salaries = [];

    for (const worker of workers) {
      // Salary is the rate field for monthly workers
      const salary = worker.rate;

      // Check advance balance
      const advanceUsed = Math.min(worker.advanceBalance, salary);
      const netPaid = salary - advanceUsed;

      salaries.push({
        workerId: worker.id,
        workerName: worker.name,
        role: worker.role,
        salary,
        advanceBalance: worker.advanceBalance,
        advanceUsed,
        netPaid,
      });
    }

    return salaries;
  }

  /**
   * Save calculated monthly salaries to database
   */
  async saveMonthlySalary(month: number, year: number, salaries: any[]) {
    // Check if salary already calculated for this period
    const existing = await prisma.monthlySettlement.findMany({
      where: {
        month,
        year,
      },
    });

    if (existing.length > 0) {
      throw new Error('Monthly salary already calculated for this period');
    }

    // Create salary records
    const records = await prisma.$transaction(
      salaries.map((s) =>
        prisma.monthlySettlement.create({
          data: {
            workerId: s.workerId,
            month,
            year,
            salary: s.salary,
            advanceUsed: s.advanceUsed,
            netPaid: s.netPaid,
            isPaid: false,
          },
        })
      )
    );

    return records;
  }

  /**
   * Get monthly settlements with filters
   */
  async getSettlements(filters: {
    month?: number;
    year?: number;
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

    if (filters.month) {
      where.month = filters.month;
    }

    if (filters.year) {
      where.year = filters.year;
    }

    const settlements = await prisma.monthlySettlement.findMany({
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
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { worker: { name: 'asc' } },
      ],
    });

    return settlements;
  }

  /**
   * Pay monthly salaries
   */
  async paySalaries(settlementIds: string[], paymentDate?: Date) {
    const date = paymentDate || new Date();

    // Get settlement records
    const settlements = await prisma.monthlySettlement.findMany({
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

    // Check if already paid
    const alreadyPaid = settlements.filter((s: any) => s.isPaid);
    if (alreadyPaid.length > 0) {
      throw new Error(
        `Some salaries are already paid: ${alreadyPaid
          .map((s: any) => s.worker.name)
          .join(', ')}`
      );
    }

    // Process payment in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const updatedSettlements = [];
      const cashEntries = [];

      for (const settlement of settlements) {
        // Mark salary as paid
        const updated = await tx.monthlySettlement.update({
          where: { id: settlement.id },
          data: {
            isPaid: true,
            paidAt: date,
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
              note: `Advance adjusted from monthly salary (${settlement.month}/${settlement.year})`,
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
              description: `Monthly salary - ${settlement.worker.name} (${settlement.month}/${settlement.year})`,
              category: 'SALARY',
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
   * Get current month salaries
   */
  async getCurrentMonthSalaries() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    return this.getSettlements({
      month,
      year,
    });
  }
}
