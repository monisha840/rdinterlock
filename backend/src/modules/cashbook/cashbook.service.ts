import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateCashEntryInput, UpdateCashEntryInput } from './cashbook.validation';

export class CashbookService {
  async createCashEntry(data: CreateCashEntryInput) {
    const cashEntry = await (prisma.cashEntry as any).create({
      data: {
        date: new Date(data.date),
        type: data.type,
        amount: data.amount,
        description: data.description,
        category: data.category,
        paymentMode: data.paymentMode || 'CASH',
        vendorName: data.vendorName || null,
        customerId: data.customerId || null,
        workerId: data.workerId || null,
        materialId: data.materialId || null,
        isRecordOnly: data.isRecordOnly || false,
      } as any,
    });

    // Create corresponding advance record if category applies
    if ((data.category === 'Worker Advance' || data.category === 'Staff Advance') && data.workerId) {
      // @ts-ignore
      await prisma.workerAdvance.create({
        data: {
          workerId: data.workerId,
          amount: data.amount,
          type: 'GIVEN',
          date: new Date(data.date),
          // @ts-ignore
          paymentMode: data.paymentMode || 'CASH',
          note: data.description ? `${data.description} (CashBook: ${cashEntry.id})` : `Advance via CashBook (ID: ${cashEntry.id})`,
        }
      });

      await prisma.worker.update({
        where: { id: data.workerId },
        data: { advanceBalance: { increment: data.amount } }
      });
    }

    return cashEntry;
  }

  async getCashEntries(
    startDate?: string,
    endDate?: string,
    type?: string,
    category?: string,
    search?: string
  ) {
    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = {
        equals: category,
        mode: 'insensitive',
      };
    }

    if (search) {
      const searchLower = search.toLowerCase();
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];

      // Try searching by amount if the search query is a number
      const searchAmount = parseFloat(search);
      if (!isNaN(searchAmount)) {
        where.OR.push({ amount: { equals: searchAmount } });
      }
    }

    const entries = await (prisma.cashEntry as any).findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
        worker: { select: { id: true, name: true, role: true } },
        material: { select: { id: true, name: true, unit: true } },
      }
    });

    return entries;
  }

  async getCashEntryById(id: string) {
    const entry = await prisma.cashEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new AppError('Cash entry not found', 404);
    }

    return entry;
  }

  async updateCashEntry(id: string, data: UpdateCashEntryInput) {
    const entry = await prisma.cashEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new AppError('Cash entry not found', 404);
    }

    const updated = await (prisma.cashEntry as any).update({
      where: { id },
      data: {
        ...data,
      } as any,
    });

    // Sync Worker Advances
    // 1. Delete existing advance linked to this cash entry
    const existingAdvances = await prisma.workerAdvance.findMany({
      where: { note: { contains: `(CashBook: ${id})` } },
    });
    for (const adv of existingAdvances) {
      await prisma.worker.update({
        where: { id: adv.workerId },
        data: { advanceBalance: { decrement: adv.amount } }
      });
      await prisma.workerAdvance.delete({ where: { id: adv.id } });
    }

    // 2. Create new advance if updated category is an advance
    if ((updated.category === 'Worker Advance' || updated.category === 'Staff Advance') && updated.workerId) {
      // @ts-ignore
      await prisma.workerAdvance.create({
        data: {
          workerId: updated.workerId,
          amount: updated.amount,
          type: 'GIVEN',
          date: updated.date,
          // @ts-ignore
          paymentMode: updated.paymentMode || 'CASH',
          note: updated.description ? `${updated.description} (CashBook: ${updated.id})` : `Advance via CashBook (ID: ${updated.id})`,
        }
      });
      await prisma.worker.update({
        where: { id: updated.workerId },
        data: { advanceBalance: { increment: updated.amount } }
      });
    }

    return updated;
  }

  async deleteCashEntry(id: string) {
    const entry = await prisma.cashEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new AppError('Cash entry not found', 404);
    }

    // Delete existing advance linked to this cash entry if it exists
    const existingAdvances = await prisma.workerAdvance.findMany({
      where: { note: { contains: `(CashBook: ${id})` } },
    });
    for (const adv of existingAdvances) {
      await prisma.worker.update({
        where: { id: adv.workerId },
        data: { advanceBalance: { decrement: adv.amount } }
      });
      await prisma.workerAdvance.delete({ where: { id: adv.id } });
    }

    await prisma.cashEntry.delete({
      where: { id },
    });

    return { message: 'Cash entry deleted successfully' };
  }

  async getCashBalance(startDate?: string, endDate?: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all entries for balance calculation
    const allEntries = await (prisma.cashEntry as any).findMany();

    // Get entries for specific summary cards
    const todayEntries = await (prisma.cashEntry as any).findMany({
      where: {
        date: { gte: startOfToday }
      }
    });

    const monthEntries = await (prisma.cashEntry as any).findMany({
      where: {
        date: { gte: startOfMonth }
      }
    });

    let totalCredit = 0;
    let totalDebit = 0;
    allEntries.forEach((entry: any) => {
      if (entry.isRecordOnly) return;
      if (entry.type === 'CREDIT') totalCredit += entry.amount;
      else totalDebit += entry.amount;
    });

    let todayMoneyIn = 0;
    let todayMoneyOut = 0;
    todayEntries.forEach((entry: any) => {
      if (entry.isRecordOnly) return;
      if (entry.type === 'CREDIT') todayMoneyIn += entry.amount;
      else todayMoneyOut += entry.amount;
    });

    let thisMonthExpenses = 0;
    monthEntries.forEach((entry: any) => {
      if (entry.isRecordOnly) return;
      if (entry.type === 'DEBIT') thisMonthExpenses += entry.amount;
    });

    return {
      totalCredit,
      totalDebit,
      balance: totalCredit - totalDebit,
      todayMoneyIn,
      todayMoneyOut,
      thisMonthExpenses,
      totalEntries: allEntries.length,
    };
  }

  async importCashEntries(entries: any[]) {
    const results = {
      added: 0,
      duplicates: 0,
      errors: 0,
      details: [] as string[],
    };

    for (const entry of entries) {
      try {
        // 1. Basic Validation
        if (!entry.Date || !entry.Amount || !entry.Type || !entry['Client Name']) {
          results.errors++;
          results.details.push(`Row missing required fields: ${entry['Client Name'] || 'Unknown'}`);
          continue;
        }

        const date = new Date(entry.Date);
        const amount = parseFloat(entry.Amount);
        const type = entry.Type.toUpperCase() === 'MONEY IN' ? 'CREDIT' : 'DEBIT';
        const category = entry.Category || 'OTHER';
        const description = entry.Notes || entry.Category || 'Imported Entry';
        const paymentMode = (entry['Payment Method'] || 'CASH').toUpperCase();

        if (isNaN(date.getTime()) || isNaN(amount)) {
          results.errors++;
          results.details.push(`Invalid date or amount for client: ${entry['Client Name']}`);
          continue;
        }

        // 2. Client Handling
        let client = await prisma.customer.findFirst({
          where: { name: { equals: entry['Client Name'], mode: 'insensitive' } },
        });

        if (!client) {
          client = await prisma.customer.create({
            data: {
              name: entry['Client Name'],
              phone: entry.Phone ? String(entry.Phone) : null,
              address: entry.Location || null,
            },
          });
        }

        // 3. Duplicate Prevention
        const existing = await (prisma.cashEntry as any).findFirst({
          where: {
            date: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lte: new Date(date.setHours(23, 59, 59, 999)),
            },
            customerId: client.id,
            amount: amount,
            category: { equals: category, mode: 'insensitive' },
          },
        });

        if (existing) {
          results.duplicates++;
          continue;
        }

        // 4. Create Entry
        await (prisma.cashEntry as any).create({
          data: {
            date: new Date(entry.Date),
            type,
            amount,
            description,
            category,
            paymentMode,
            customerId: client.id,
            isRecordOnly: false,
          },
        });

        results.added++;
      } catch (error: any) {
        results.errors++;
        results.details.push(`Error processing ${entry['Client Name']}: ${error.message}`);
      }
    }

    return results;
  }
}
