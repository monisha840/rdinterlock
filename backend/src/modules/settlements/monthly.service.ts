import prisma from '../../config/database';
import { SystemSettingsService } from '../settings/systemSettings.service';

const systemSettingsService = new SystemSettingsService();

export class MonthlySettlementService {
  /**
   * Calculate monthly salaries for salary staff
   */
  async calculateMonthlySalary(month: number, year: number) {
    // Fetch global settings
    const settings = await systemSettingsService.getAllSettings();
    const driverActive = settings['driver_active'] === 'true';
    const driverRate = parseFloat(settings['driver_rate'] || '0');

    // Get all salary staff (MONTHLY payment type)
    // Roles: Manager, Driver, Telecaller
    const workers = await prisma.worker.findMany({
      where: {
        isActive: true,
        paymentType: 'MONTHLY',
      },
    });

    // Filter by role case-insensitively
    const staffRoles = ['MANAGER', 'DRIVER', 'TELECALLER'];
    const filteredWorkers = workers.filter(w => 
      staffRoles.includes(w.role.toUpperCase())
    );

    const salaries = [];

    // Calculate start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    for (const worker of filteredWorkers) {
      // Get attendance records for this month
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          workerId: worker.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
          present: true,
        },
      });

      const presentDays = attendanceRecords.length;

      // Salary = (Present days * daily rate)
      // Apply global driver rate if active and role matches
      let activeRate = worker.rate;
      if (driverActive && worker.role.toUpperCase() === 'DRIVER') {
        activeRate = driverRate;
      }

      const salary = presentDays * activeRate;

      // Fetch given advances for this worker in this month
      const givenAdvances = await prisma.workerAdvance.findMany({
        where: {
          workerId: worker.id,
          type: 'ADVANCE',
          date: { gte: startDate, lte: endDate },
        },
      });

      const totalAdvancePaid = givenAdvances.reduce((sum, adv) => sum + adv.amount, 0);

      // Fetch formal staff payments for this month
      const formalPayments = await (prisma as any).staffPayment.findMany({
        where: {
          personId: worker.id,
          date: { gte: startDate, lte: endDate }
        }
      });
      const totalPaid = formalPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

      // Check advance balance (we use the sum of advances given in this period as per user requirements)
      const advanceUsed = totalAdvancePaid; // Or Math.min(totalAdvancePaid, salary) if we only deduct up to salary
      const netPayable = Math.max(0, salary - advanceUsed);
      const pendingAmount = Math.max(0, netPayable - totalPaid);

      salaries.push({
        workerId: worker.id,
        workerName: worker.name,
        role: worker.role,
        presentDays,
        dailyRate: worker.rate,
        salary,
        advanceBalance: worker.advanceBalance, // Still pass the running balance if needed elsewhere
        advanceUsed,
        netPayable,
        totalPaid,
        pendingAmount,
        advanceDetails: givenAdvances.map(a => ({
          id: a.id,
          amount: a.amount,
          date: a.date,
          // @ts-ignore
          paymentMode: a.paymentMode,
        })),
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
          const cashEntry = await (tx.cashEntry as any).create({
            data: {
              date,
              type: 'DEBIT',
              amount: settlement.netPaid,
              description: `Monthly salary - ${settlement.worker.name} (${settlement.month}/${settlement.year})`,
              category: 'Staff Salary',
              workerId: settlement.workerId,
            } as any,
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
