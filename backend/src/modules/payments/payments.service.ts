import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

interface CreatePaymentDto {
  personId: string;
  role: string;
  amount: number;
  paymentType: string;
  method: string;
  date: string | Date;
  note?: string;
}

export class PaymentsService {
  async createPayment(data: CreatePaymentDto) {
    if (data.amount <= 0) {
      throw new AppError('Payment amount must be greater than zero', 400);
    }

    const worker = await (prisma as any).worker.findUnique({
      where: { id: data.personId }
    });

    if (!worker) {
      throw new AppError('Worker/Staff not found', 404);
    }

    return await (prisma as any).$transaction(async (tx: any) => {
      // 1. Create Staff Payment Record
      const payment = await tx.staffPayment.create({
        data: {
          personId: data.personId,
          role: data.role,
          amount: data.amount,
          paymentType: data.paymentType,
          method: data.method,
          date: new Date(data.date),
          note: data.note,
        }
      });

      // 2. Add entry to Cash Book
      await tx.cashEntry.create({
        data: {
          date: new Date(data.date),
          type: 'DEBIT',
          amount: data.amount,
          description: `Salary Payment (${data.paymentType}) - ${data.note || ''}`,
          category: 'Labour',
          paymentMode: data.method === 'Bank Transfer' ? 'BANK' : data.method.toUpperCase(),
          workerId: data.personId,
          isRecordOnly: false,
        }
      });

      return payment;
    });
  }

  async getPaymentsByPerson(personId: string) {
    return await (prisma as any).staffPayment.findMany({
      where: { personId },
      orderBy: { date: 'desc' }
    });
  }
}
