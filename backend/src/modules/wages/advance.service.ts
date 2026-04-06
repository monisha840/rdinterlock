import prisma from '../../config/database';



export class AdvanceService {
  /**
   * Give advance to a worker
   */
  async giveAdvance(workerId: string, amount: number, note?: string, paymentMode?: string) {
    // Validate amount
    if (amount <= 0) {
      throw new Error('Advance amount must be positive');
    }

    // Get worker
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
    });

    if (!worker) {
      throw new Error('Worker not found');
    }

    if (!worker.isActive) {
      throw new Error('Worker is not active');
    }

    // Check if worker role allows advance (Staff roles now allowed per user request)
    // const restrictedRoles = ['MANAGER', 'TELECALLER'];
    // if (restrictedRoles.includes(worker.role.toUpperCase())) {
    //   throw new Error(`${worker.role} cannot receive advance`);
    // }

    // Create advance record and update worker balance in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create advance record
      const advance = await tx.workerAdvance.create({
        data: {
          workerId,
          amount,
          type: 'ADVANCE',
          date: new Date(),
          paymentMode: paymentMode || 'CASH',
          note,
        },
      });

      // Update worker advance balance
      const updatedWorker = await tx.worker.update({
        where: { id: workerId },
        data: {
          advanceBalance: {
            increment: amount,
          },
        },
      });

      // Create cash book entry (cash out)
      await (tx.cashEntry as any).create({
        data: {
          date: new Date(),
          type: 'DEBIT',
          amount,
          description: `Advance given to ${worker.name}`,
          category: 'Worker Advance',
          paymentMode: paymentMode || 'CASH',
          workerId,
        } as any,
      });

      return { advance, updatedWorker };
    });

    return result;
  }

  /**
   * Adjust advance when paying wages
   */
  async adjustAdvance(
    workerId: string,
    amount: number,
    date: Date,
    note?: string
  ) {
    // Create adjustment record and update worker balance
    const result = await prisma.$transaction(async (tx: any) => {
      // Create advance adjustment record
      const advance = await tx.workerAdvance.create({
        data: {
          workerId,
          amount: -amount, // Negative because it's a deduction
          type: 'ADJUSTED',
          date,
          note: note || 'Auto-adjusted from wage payment',
        },
      });

      // Reduce worker advance balance
      const updatedWorker = await tx.worker.update({
        where: { id: workerId },
        data: {
          advanceBalance: {
            decrement: amount,
          },
        },
      });

      return { advance, updatedWorker };
    });

    return result;
  }

  /**
   * Get advance history for a worker
   */
  async getAdvanceHistory(
    workerId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      type?: 'ADVANCE' | 'ADJUSTED';
    }
  ) {
    const where: any = { workerId };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    const advances = await prisma.workerAdvance.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // Calculate running balance
    let runningBalance = 0;
    const advancesWithBalance = advances.reverse().map((advance: any) => {
      if (advance.type === 'ADVANCE') {
        runningBalance += advance.amount;
      } else {
        runningBalance += advance.amount; // Already negative
      }
      return {
        ...advance,
        runningBalance,
      };
    });

    return advancesWithBalance.reverse();
  }

  /**
   * Get current advance balance for a worker
   */
  async getCurrentBalance(workerId: string) {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: {
        id: true,
        name: true,
        advanceBalance: true,
      },
    });

    if (!worker) {
      throw new Error('Worker not found');
    }

    return worker;
  }

  /**
   * Get all workers with pending advances
   */
  async getWorkersWithPendingAdvances() {
    const workers = await prisma.worker.findMany({
      where: {
        advanceBalance: {
          gt: 0,
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        advanceBalance: true,
      },
      orderBy: { advanceBalance: 'desc' },
    });

    return workers;
  }

  /**
   * Get all workers with advances filtered by role
   */
  async getAdvancesByRole(role?: string) {
    const where: any = { isActive: true };
    if (role && role !== 'ALL') {
      where.role = role.toUpperCase();
    }

    const workers = await prisma.worker.findMany({
      where,
      include: {
        advances: {
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
      orderBy: { name: 'asc' },
    });

    return workers
      .filter((w: any) => w.advanceBalance > 0 || w.advances.length > 0)
      .map((w: any) => ({
        workerId: w.id,
        workerName: w.name,
        role: w.role,
        employeeType: w.employeeType,
        advanceBalance: w.advanceBalance,
        advances: w.advances.map((a: any) => ({
          id: a.id,
          amount: a.amount,
          type: a.type,
          date: a.date,
          paymentMode: a.paymentMode,
          note: a.note,
        })),
      }));
  }

  /**
   * Give advances to multiple workers
   */
  async bulkGiveAdvance(
    records: Array<{ workerId: string; amount: number; note?: string }>
  ) {
    const results = await Promise.all(
      records.map((r) => this.giveAdvance(r.workerId, r.amount, r.note))
    );
    return results;
  }
}
