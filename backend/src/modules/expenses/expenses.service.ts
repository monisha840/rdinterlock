import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateExpenseInput, UpdateExpenseInput } from './expenses.validation';

export class ExpensesService {
  async createExpense(data: CreateExpenseInput) {
    // If workerId is provided, validate worker exists
    if (data.workerId) {
      const worker = await prisma.worker.findUnique({
        where: { id: data.workerId },
      });

      if (!worker) {
        throw new AppError('Worker not found', 404);
      }
    } else if (data.category === 'STAFF ADVANCE' || data.category === 'WORKER ADVANCE') {
      throw new AppError('Worker or Staff must be selected for an advance', 400);
    }

    // If materialId is provided, validate material exists
    if (data.materialId) {
      const material = await prisma.rawMaterial.findUnique({
        where: { id: data.materialId },
      });

      if (!material) {
        throw new AppError('Material not found', 404);
      }

      if (!material.isActive) {
        throw new AppError('Material is not active', 400);
      }

      // Optional: Log material details if provided
    }

    // Unified transaction for all expense types to ensure CashBook synchronization
    return await prisma.$transaction(async (tx: any) => {
      const expense = await tx.expense.create({
        data: {
          date: new Date(data.date),
          category: data.category,
          amount: data.amount,
          notes: data.notes,
          workerId: data.workerId,
          paymentMode: data.paymentMode,
          materialId: data.materialId,
        },
        include: {
          worker: data.workerId ? { select: { id: true, name: true } } : false,
          material: data.materialId ? { select: { id: true, name: true, unit: true } } : false,
        },
      });

      // 1. Create material usage if applicable
      if (data.category === 'MATERIAL' && data.materialId && data.quantity && data.pricePerUnit) {
        await tx.materialUsage.create({
          data: {
            materialId: data.materialId,
            expenseId: expense.id,
            quantity: data.quantity!,
            pricePerUnit: data.pricePerUnit!,
            totalCost: data.quantity! * data.pricePerUnit!,
            date: new Date(data.date),
          },
        });
      }

      // 2. Create CashEntry if payment mode is CASH
      if (data.paymentMode === 'CASH') {
        const description = data.notes
          ? `${data.category}: ${data.notes} (Exp: ${expense.id})`
          : `${data.category} Expense (Exp: ${expense.id})`;

        await tx.cashEntry.create({
          data: {
            date: new Date(data.date),
            type: 'DEBIT',
            amount: data.amount,
            description: description,
            category: 'OTHER', // General category for expenses in cashbook
          },
        });
      }

      // 3. Create Worker Advance if applicable
      if ((data.category === 'STAFF ADVANCE' || data.category === 'WORKER ADVANCE') && data.workerId) {
        await tx.workerAdvance.create({
          data: {
            workerId: data.workerId,
            amount: data.amount,
            type: 'ADVANCE',
            date: new Date(data.date),
            paymentMode: data.paymentMode || 'CASH',
            note: data.notes ? `${data.notes} (Exp: ${expense.id})` : `Advance via Expenses (Exp: ${expense.id})`,
          },
        });

        // Update Worker's advance balance
        await tx.worker.update({
          where: { id: data.workerId },
          data: {
            advanceBalance: { increment: data.amount },
          },
        });
      }

      return expense;
    });
  }

  async getExpenses(
    startDate?: string,
    endDate?: string,
    category?: string,
    workerId?: string
  ) {
    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (category) {
      where.category = category;
    }

    if (workerId) {
      where.workerId = workerId;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
        material: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
        materials: true,
      },
      orderBy: { date: 'desc' },
    });

    return expenses;
  }

  async getExpenseById(id: string) {
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
        material: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
        materials: true,
      },
    });

    if (!expense) {
      throw new AppError('Expense not found', 404);
    }

    return expense;
  }

  async updateExpense(id: string, data: UpdateExpenseInput) {
    return await prisma.$transaction(async (tx: any) => {
      const expense = await tx.expense.findUnique({
        where: { id },
      });

      if (!expense) {
        throw new AppError('Expense not found', 404);
      }

      const updated = await tx.expense.update({
        where: { id },
        data,
        include: {
          worker: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Sync MaterialUsage
      // 1. Delete existing usage for this expense
      await tx.materialUsage.deleteMany({
        where: { expenseId: id },
      });

      // 2. Create new usage if category is MATERIAL and we have all data
      // Use data from updated object to ensure we have the latest
      if (updated.category === 'MATERIAL' && data.materialId && data.quantity && data.pricePerUnit) {
        await tx.materialUsage.create({
          data: {
            materialId: data.materialId,
            expenseId: id,
            quantity: data.quantity,
            pricePerUnit: data.pricePerUnit,
            totalCost: data.quantity * data.pricePerUnit,
            date: updated.date,
          },
        });
      }

      // Sync CashEntry
      // 1. Always clear existing related cash entry if it was/is CASH
      await tx.cashEntry.deleteMany({
        where: {
          description: {
            contains: `(Exp: ${id})`,
          },
        },
      });

      // 2. Create new one if paymentMode is NOW CASH
      if (updated.paymentMode === 'CASH') {
        const description = updated.notes
          ? `${updated.category}: ${updated.notes} (Exp: ${id})`
          : `${updated.category} Expense (Exp: ${id})`;

        await tx.cashEntry.create({
          data: {
            date: updated.date,
            type: 'DEBIT',
            amount: updated.amount,
            description: description,
            category: 'OTHER',
          },
        });
      }

      // Sync Worker Advances
      // 1. Clear existing advances related to this expense
      const existingAdvances = await tx.workerAdvance.findMany({
        where: { note: { contains: `(Exp: ${id})` } },
      });
      for (const adv of existingAdvances) {
        await tx.worker.update({
          where: { id: adv.workerId },
          data: { advanceBalance: { decrement: adv.amount } },
        });
        await tx.workerAdvance.delete({ where: { id: adv.id } });
      }

      // 2. Create new advance if category is an advance
      if ((updated.category === 'STAFF ADVANCE' || updated.category === 'WORKER ADVANCE') && updated.workerId) {
        await tx.workerAdvance.create({
          data: {
            workerId: updated.workerId,
            amount: updated.amount,
            type: 'ADVANCE',
            date: updated.date,
            paymentMode: updated.paymentMode || 'CASH',
            note: updated.notes ? `${updated.notes} (Exp: ${updated.id})` : `Advance via Expenses (Exp: ${updated.id})`,
          },
        });

        await tx.worker.update({
          where: { id: updated.workerId },
          data: { advanceBalance: { increment: updated.amount } },
        });
      }

      return updated;
    });
  }

  async deleteExpense(id: string) {
    return await prisma.$transaction(async (tx: any) => {
      const expense = await tx.expense.findUnique({
        where: { id },
      });

      if (!expense) {
        throw new AppError('Expense not found', 404);
      }

      // Delete related material usage
      await tx.materialUsage.deleteMany({
        where: { expenseId: id },
      });

      // Delete related cash entry
      await tx.cashEntry.deleteMany({
        where: {
          description: {
            contains: `(Exp: ${id})`,
          },
        },
      });

      // Delete related worker advances
      const existingAdvances = await tx.workerAdvance.findMany({
        where: { note: { contains: `(Exp: ${id})` } },
      });
      for (const adv of existingAdvances) {
        await tx.worker.update({
          where: { id: adv.workerId },
          data: { advanceBalance: { decrement: adv.amount } },
        });
        await tx.workerAdvance.delete({ where: { id: adv.id } });
      }

      // Delete the expense
      await tx.expense.delete({
        where: { id },
      });

      return { message: 'Expense deleted successfully' };
    });
  }

  async getExpensesSummary(startDate?: string, endDate?: string) {
    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
    });

    const totalAmount = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

    // Group by category
    const byCategory: any = {};
    expenses.forEach((e: any) => {
      if (!byCategory[e.category]) {
        byCategory[e.category] = 0;
      }
      byCategory[e.category] += e.amount;
    });

    return {
      totalExpenses: expenses.length,
      totalAmount,
      byCategory,
    };
  }
}
