import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateProductionInput, UpdateProductionInput, GetProductionQuery } from './production.validation';

// Fire-and-forget wage recalculation. The wage table is a derived view that
// can be rebuilt from production data at any time, so we don't need callers
// to wait on it — the next save / view will surface the fresh numbers.
// Awaiting here used to push create/update past the frontend's 15s timeout
// over Supabase's pooler.
const recalcWagesAsync = (date: Date) => {
  setImmediate(async () => {
    try {
      const { WageService } = require('../wages/wage.service');
      const wageService = new WageService();
      const calculations = await wageService.calculateDailyWages(date);
      await wageService.saveCalculatedWages(date, calculations);
    } catch (error) {
      console.error('[wages] background recalc failed:', error);
    }
  });
};

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
      const workerIds = data.workers.map((w: any) => w.workerId);
      const workers = await prisma.worker.findMany({
        where: { id: { in: workerIds } },
      });

      if (workers.length !== workerIds.length) {
        throw new AppError('One or more workers not found', 404);
      }
    }

    const damagedBricks = data.damagedBricks || 0;
    if (damagedBricks > data.quantity) {
      throw new AppError('Damaged bricks cannot be greater than produced bricks', 400);
    }

    const availableBricks = data.quantity - damagedBricks;
    const wastagePercentage = data.quantity > 0 ? parseFloat(((damagedBricks / data.quantity) * 100).toFixed(2)) : 0;

    const production = await prisma.production.create({
      data: {
        date: new Date(data.date),
        machineId: data.machineId,
        shift: data.shift,
        brickTypeId: data.brickTypeId,
        quantity: data.quantity,
        damagedBricks: damagedBricks,
        availableBricks: availableBricks,
        notes: data.notes,
        siteName: data.siteName,
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

    // Auto-calculate and log material consumption
    let materialConsumption: any = null;
    try {
      const config = await prisma.materialConfig.findUnique({
        where: { brickTypeId: data.brickTypeId },
      });

      if (config) {
        const factor = data.quantity / 1000;
        // Cement is admin-editable: prefer the override if provided, otherwise
        // derive from the recipe.
        const recipeCement = parseFloat((factor * config.cementPer1000).toFixed(3));
        const cementUsed = (data as any).cementUsed != null
          ? parseFloat(Number((data as any).cementUsed).toFixed(3))
          : recipeCement;
        const flyAshUsed = parseFloat((factor * config.flyAshPer1000).toFixed(3));
        const powderUsed = parseFloat((factor * config.powderPer1000).toFixed(3));

        await prisma.materialConsumptionLog.createMany({
          data: [
            { productionId: production.id, materialType: 'cement', quantityUsed: cementUsed, date: new Date(data.date) },
            { productionId: production.id, materialType: 'flyash', quantityUsed: flyAshUsed, date: new Date(data.date) },
            { productionId: production.id, materialType: 'powder', quantityUsed: powderUsed, date: new Date(data.date) },
          ],
        });

        materialConsumption = { cementUsed, flyAshUsed, powderUsed };
      }
    } catch (error) {
      console.error('Failed to auto-log material consumption:', error);
    }

    // Trigger wage recalc in the background — don't block the response.
    recalcWagesAsync(new Date(data.date));

    return {
      ...production,
      wastagePercentage,
      materialConsumption,
    };
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

  async updateProduction(id: string, data: UpdateProductionInput) {
    const production = await prisma.production.findUnique({
      where: { id },
      include: { workers: true },
    });

    if (!production) {
      throw new AppError('Production not found', 404);
    }

    const quantity = data.quantity ?? production.quantity;
    const damagedBricks = data.damagedBricks ?? production.damagedBricks;

    if (damagedBricks > quantity) {
      throw new AppError('Damaged bricks cannot be greater than produced bricks', 400);
    }

    const availableBricks = quantity - damagedBricks;
    const wastagePercentage = quantity > 0 ? parseFloat(((damagedBricks / quantity) * 100).toFixed(2)) : 0;

    // If workers are provided, validate them
    if (data.workers && data.workers.length > 0) {
      const workerIds = data.workers.map((w: any) => w.workerId);
      const workers = await prisma.worker.findMany({
        where: { id: { in: workerIds } },
      });
      if (workers.length !== workerIds.length) {
        throw new AppError('One or more workers not found', 404);
      }
    }

    // Update production and replace workers if provided
    const updated = await prisma.$transaction(async (tx) => {
      if (data.workers) {
        // Delete existing workers and recreate
        await tx.productionWorker.deleteMany({ where: { productionId: id } });
        for (const w of data.workers) {
          await tx.productionWorker.create({
            data: { productionId: id, workerId: w.workerId, quantity: w.quantity },
          });
        }
      }

      return tx.production.update({
        where: { id },
        data: {
          quantity,
          damagedBricks,
          availableBricks,
          notes: data.notes !== undefined ? data.notes : undefined,
        },
        include: {
          machine: true,
          brickType: true,
          workers: { include: { worker: true } },
        },
      });
    });

    // Recalculate wages in background
    recalcWagesAsync(new Date(production.date));

    return { ...updated, wastagePercentage };
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

    // Trigger background recalculation so the next view surfaces the deletion.
    recalcWagesAsync(new Date(production.date));

    return { message: 'Production deleted successfully' };
  }
}
