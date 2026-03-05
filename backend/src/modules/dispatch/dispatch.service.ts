import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateDispatchInput, UpdateDispatchInput, CreateCustomerInput } from './dispatch.validation';

export class DispatchService {
  async createDispatch(data: CreateDispatchInput) {
    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Validate brick type exists
    const brickType = await prisma.brickType.findUnique({
      where: { id: data.brickTypeId },
    });

    if (!brickType || !brickType.isActive) {
      throw new AppError('Brick type not found or inactive', 404);
    }

    // If vehicle type is RENT, transportCost must be provided
    if (data.vehicleType === 'RENT' && (!data.transportCost || data.transportCost === 0)) {
      throw new AppError('Transport cost is required for rented vehicles', 400);
    }

    return await prisma.$transaction(async (tx: any) => {
      const dispatch = await tx.dispatch.create({
        data: {
          date: new Date(data.date),
          customerId: data.customerId,
          brickTypeId: data.brickTypeId,
          quantity: data.quantity,
          distanceKm: data.distanceKm,
          vehicleType: data.vehicleType,
          transportCost: data.transportCost ?? 0,
          loadingCost: data.loadingCost ?? 0,
          paymentStatus: data.paymentStatus,
          totalAmount: data.totalAmount ?? 0,
          paidAmount: data.paidAmount ?? 0,
          notes: data.notes,
        },
        include: {
          customer: true,
          brickType: true,
        },
      });

      // Synchronize with CashBook if money received
      if (data.paidAmount && data.paidAmount > 0) {
        await tx.cashEntry.create({
          data: {
            date: new Date(data.date),
            type: 'CREDIT',
            amount: data.paidAmount,
            description: `Payment from ${(dispatch as any).customer.name} (Dispatch: ${dispatch.id})`,
            category: 'SALES',
          },
        });
      }

      return dispatch;
    });
  }

  async getDispatches(
    startDate?: string,
    endDate?: string,
    customerId?: string,
    brickTypeId?: string,
    paymentStatus?: string
  ) {
    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (brickTypeId) {
      where.brickTypeId = brickTypeId;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    const dispatches = await prisma.dispatch.findMany({
      where,
      include: {
        customer: true,
        brickType: true,
      },
      orderBy: { date: 'desc' },
    });

    return dispatches;
  }

  async getDispatchById(id: string) {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id },
      include: {
        customer: true,
        brickType: true,
      },
    });

    if (!dispatch) {
      throw new AppError('Dispatch not found', 404);
    }

    return dispatch;
  }

  async updateDispatch(id: string, data: UpdateDispatchInput) {
    return await prisma.$transaction(async (tx: any) => {
      const dispatch = await tx.dispatch.findUnique({
        where: { id },
      });

      if (!dispatch) {
        throw new AppError('Dispatch not found', 404);
      }

      const updated = await tx.dispatch.update({
        where: { id },
        data,
        include: {
          customer: true,
          brickType: true,
        },
      });

      // Sync with CashBook
      // 1. Remove any existing cash entry for this dispatch
      await tx.cashEntry.deleteMany({
        where: {
          description: {
            contains: `(Dispatch: ${id})`,
          },
        },
      });

      // 2. Create new one if there's any paid amount
      if (updated.paidAmount && updated.paidAmount > 0) {
        await tx.cashEntry.create({
          data: {
            date: updated.date,
            type: 'CREDIT',
            amount: updated.paidAmount,
            description: `Payment from ${updated.customer.name} (Dispatch: ${id})`,
            category: 'SALES',
          },
        });
      }

      return updated;
    });
  }

  async deleteDispatch(id: string) {
    return await prisma.$transaction(async (tx: any) => {
      const dispatch = await tx.dispatch.findUnique({
        where: { id },
      });

      if (!dispatch) {
        throw new AppError('Dispatch not found', 404);
      }

      // Remove related cash entry
      await tx.cashEntry.deleteMany({
        where: {
          description: {
            contains: `(Dispatch: ${id})`,
          },
        },
      });

      await tx.dispatch.delete({
        where: { id },
      });

      return { message: 'Dispatch deleted successfully' };
    });
  }

  // Customer management
  async createCustomer(data: CreateCustomerInput) {
    const customer = await prisma.customer.create({
      data,
    });

    return customer;
  }

  async getAllCustomers() {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' },
    });

    return customers;
  }

  async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        dispatches: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    return customer;
  }

  async deleteCustomer(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Since we don't have isActive on Customer yet, we'll just delete for now
    // or we could add isActive to schema. Prisma schema has address but not isActive.
    // I'll just delete it for now as per current schema.
    await prisma.customer.delete({
      where: { id },
    });

    return { message: 'Customer deleted successfully' };
  }
}
