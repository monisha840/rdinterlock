import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateProductionInput, GetProductionQuery } from './production.validation';

export class ProductionService {
  async createProduction(data: CreateProductionInput) {
    // Validate machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: data.machineId },
    });

    if (!machine || !machine.isActive) {
      throw new AppError('Machine not found or inactive', 404);
    }

    // Validate brick type exists
    const brickType = await prisma.brickType.findUnique({
      where: { id: data.brickTypeId },
    });

    if (!brickType || !brickType.isActive) {
      throw new AppError('Brick type not found or inactive', 404);
    }

    // If workers are provided, validate their quantities sum up correctly
    if (data.workers && data.workers.length > 0) {
      // Optional: You can enforce that worker quantities match total quantity
      // Uncomment if strict validation is needed:
      // const totalWorkerQuantity = data.workers.reduce((sum: number, w: any) => sum + w.quantity, 0);
      // if (totalWorkerQuantity !== data.quantity) {
      //   throw new AppError('Worker quantities must sum up to total quantity', 400);
      // }

      // Validate all workers exist
      const workerIds = data.workers.map((w: any) => w.workerId);
      const workers = await prisma.worker.findMany({
        where: { id: { in: workerIds } },
      });

      if (workers.length !== workerIds.length) {
        throw new AppError('One or more workers not found', 404);
      }
    }

    const production = await prisma.production.create({
      data: {
        date: new Date(data.date),
        machineId: data.machineId,
        shift: data.shift,
        brickTypeId: data.brickTypeId,
        quantity: data.quantity,
        notes: data.notes,
        workers: data.workers
          ? {
            create: data.workers.map((w: any) => ({
              workerId: w.workerId,
              quantity: w.quantity,
            })),
          }
          : undefined,
      },
      include: {
        machine: true,
        brickType: true,
        workers: {
          include: {
            worker: true,
          },
        },
      },
    });

    // Automatically trigger wage calculation for this date
    try {
      const wageService = new (require('../wages/wage.service').WageService)();
      const calculations = await wageService.calculateDailyWages(new Date(data.date));
      await wageService.saveCalculatedWages(new Date(data.date), calculations);
    } catch (error) {
      console.error('Failed to auto-calculate wages:', error);
      // Don't throw error here to avoid rolling back production entry
    }

    return production;
  }

  async getProductions(query: GetProductionQuery) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.date) {
      const date = new Date(query.date);
      where.date = {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lte: new Date(date.setHours(23, 59, 59, 999)),
      };
    } else if (query.startDate && query.endDate) {
      where.date = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    if (query.machineId) {
      where.machineId = query.machineId;
    }

    if (query.brickTypeId) {
      where.brickTypeId = query.brickTypeId;
    }

    if (query.shift) {
      where.shift = query.shift;
    }

    const [productions, total] = await Promise.all([
      prisma.production.findMany({
        where,
        include: {
          machine: true,
          brickType: true,
          workers: {
            include: {
              worker: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.production.count({ where }),
    ]);

    return {
      productions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductionById(id: string) {
    const production = await prisma.production.findUnique({
      where: { id },
      include: {
        machine: true,
        brickType: true,
        workers: {
          include: {
            worker: true,
          },
        },
      },
    });

    if (!production) {
      throw new AppError('Production not found', 404);
    }

    return production;
  }

  async getProductionHistory(
    startDate?: string,
    endDate?: string,
    machineId?: string,
    brickTypeId?: string
  ) {
    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (machineId) {
      where.machineId = machineId;
    }

    if (brickTypeId) {
      where.brickTypeId = brickTypeId;
    }

    const productions = await prisma.production.findMany({
      where,
      include: {
        machine: {
          select: { id: true, name: true },
        },
        brickType: {
          select: { id: true, size: true },
        },
        workers: {
          include: {
            worker: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const totalQuantity = productions.reduce((sum: number, p: any) => sum + p.quantity, 0);

    // Group by brick type
    const byBrickType: any = {};
    productions.forEach((p: any) => {
      if (!byBrickType[p.brickType.size]) {
        byBrickType[p.brickType.size] = 0;
      }
      byBrickType[p.brickType.size] += p.quantity;
    });

    return {
      productions,
      summary: {
        totalProductions: productions.length,
        totalQuantity,
        byBrickType,
      },
    };
  }

  async deleteProduction(id: string) {
    const production = await prisma.production.findUnique({
      where: { id },
    });

    if (!production) {
      throw new AppError('Production not found', 404);
    }

    await prisma.production.delete({
      where: { id: id },
    });

    // Automatically trigger wage calculation for this date to reflect the deletion
    try {
      const wageService = new (require('../wages/wage.service').WageService)();
      const calculations = await wageService.calculateDailyWages(new Date(production.date));
      // Note: saveCalculatedWages is idempotent and deletes old records first
      await wageService.saveCalculatedWages(new Date(production.date), calculations);
    } catch (error) {
      console.error('Failed to auto-recalculate wages after deletion:', error);
    }

    return { message: 'Production deleted successfully' };
  }
}
