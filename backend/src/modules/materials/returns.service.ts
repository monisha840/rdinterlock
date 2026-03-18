import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class ReturnsService {
  async createReturn(data: {
    dispatchId: string;
    returnedQuantity: number;
    reason?: string;
    date: string;
  }) {
    // Validate dispatch exists
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: data.dispatchId },
      include: { customer: true, brickType: true },
    });

    if (!dispatch) {
      throw new AppError('Dispatch not found', 404);
    }

    // Validate returned quantity doesn't exceed dispatched quantity
    if (data.returnedQuantity <= 0) {
      throw new AppError('Returned quantity must be greater than 0', 400);
    }

    if (data.returnedQuantity > dispatch.quantity) {
      throw new AppError(
        `Returned quantity (${data.returnedQuantity}) cannot exceed dispatched quantity (${dispatch.quantity})`,
        400
      );
    }

    // Check total previously returned for this dispatch
    const previousReturns = await prisma.brickReturn.aggregate({
      where: { dispatchId: data.dispatchId },
      _sum: { returnedQuantity: true },
    });

    const previousTotal = previousReturns._sum.returnedQuantity || 0;
    const newTotal = previousTotal + data.returnedQuantity;

    if (newTotal > dispatch.quantity) {
      const remaining = dispatch.quantity - previousTotal;
      throw new AppError(
        `Total returned (${newTotal}) would exceed dispatched quantity (${dispatch.quantity}). Maximum remaining returnable: ${remaining}`,
        400
      );
    }

    // Create the return
    const brickReturn = await prisma.brickReturn.create({
      data: {
        dispatchId: data.dispatchId,
        clientId: dispatch.customerId,
        brickTypeId: dispatch.brickTypeId,
        returnedQuantity: data.returnedQuantity,
        reason: data.reason,
        date: new Date(data.date),
      },
      include: {
        dispatch: {
          include: { customer: true, brickType: true },
        },
        client: true,
        brickType: true,
      },
    });

    return brickReturn;
  }

  async getReturns(filters: {
    startDate?: string;
    endDate?: string;
    clientId?: string;
    brickTypeId?: string;
    dispatchId?: string;
  }) {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.brickTypeId) where.brickTypeId = filters.brickTypeId;
    if (filters.dispatchId) where.dispatchId = filters.dispatchId;

    const returns = await prisma.brickReturn.findMany({
      where,
      include: {
        dispatch: { include: { customer: true } },
        client: true,
        brickType: true,
      },
      orderBy: { date: 'desc' },
    });

    return returns;
  }

  async getReturnsByDispatch(dispatchId: string) {
    const dispatch = await prisma.dispatch.findUnique({ where: { id: dispatchId } });
    if (!dispatch) throw new AppError('Dispatch not found', 404);

    const returns = await prisma.brickReturn.findMany({
      where: { dispatchId },
      include: { client: true, brickType: true },
      orderBy: { date: 'desc' },
    });

    const totalReturned = returns.reduce((sum, r) => sum + r.returnedQuantity, 0);

    return {
      dispatch,
      returns,
      totalReturned,
      netDispatched: dispatch.quantity - totalReturned,
    };
  }

  async deleteReturn(id: string) {
    const ret = await prisma.brickReturn.findUnique({ where: { id } });
    if (!ret) throw new AppError('Return not found', 404);

    await prisma.brickReturn.delete({ where: { id } });
    return { message: 'Return deleted successfully' };
  }
}
