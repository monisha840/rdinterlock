import prisma from '../../config/database';

export class StockService {
  /**
   * Calculate current stock dynamically (Production - Dispatch)
   * No stock table, computed on-the-fly
   */
  async getCurrentStock(brickTypeId?: string) {
    const brickTypes = brickTypeId
      ? await prisma.brickType.findMany({ where: { id: brickTypeId, isActive: true } })
      : await prisma.brickType.findMany({ where: { isActive: true } });

    const stockData = await Promise.all(
      brickTypes.map(async (brickType: any) => {
        // Total production for this brick type — use full produced quantity.
        // Damaged bricks are tracked separately and should NOT reduce stock counts here.
        const totalProduction = await prisma.production.aggregate({
          where: { brickTypeId: brickType.id },
          _sum: { quantity: true, damagedBricks: true },
        });

        // Total dispatched for this brick type
        const totalDispatched = await prisma.dispatch.aggregate({
          where: { brickTypeId: brickType.id },
          _sum: { quantity: true },
        });

        // Total returned for this brick type
        const totalReturned = await (prisma as any).brickReturn.aggregate({
          where: { brickTypeId: brickType.id },
          _sum: { returnedQuantity: true },
        });

        const produced = totalProduction._sum.quantity || 0;
        const damaged = totalProduction._sum.damagedBricks || 0;
        const dispatched = totalDispatched._sum.quantity || 0;
        const returned = totalReturned._sum.returnedQuantity || 0;
        const currentStock = produced - dispatched + returned;

        return {
          brickType: {
            id: brickType.id,
            size: brickType.size,
          },
          produced,
          damaged,
          dispatched,
          returned,
          currentStock,
        };
      })
    );

    return stockData;
  }

  /**
   * Get stock history over a date range
   */
  async getStockHistory(startDate: string, endDate: string, brickTypeId?: string) {
    const where: any = {};

    if (brickTypeId) {
      where.brickTypeId = brickTypeId;
    }

    const dateRange = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };

    const [productions, dispatches] = await Promise.all([
      prisma.production.findMany({
        where: {
          ...where,
          date: dateRange,
        },
        include: {
          brickType: true,
        },
        orderBy: { date: 'asc' },
      }),
      prisma.dispatch.findMany({
        where: {
          ...where,
          date: dateRange,
        },
        include: {
          brickType: true,
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    return {
      productions,
      dispatches,
      summary: {
        totalProduced: productions.reduce((sum: number, p: any) => sum + p.quantity, 0),
        totalDamaged: productions.reduce((sum: number, p: any) => sum + (p.damagedBricks || 0), 0),
        totalDispatched: dispatches.reduce((sum: number, d: any) => sum + d.quantity, 0),
      },
    };
  }

  /**
   * Get ready stock (produced and not dispatched) - alias for current stock
   */
  async getReadyStock() {
    return this.getCurrentStock();
  }

  /**
   * Get comprehensive inventory alerts including brick stock, material stock, and production limits
   */
  async getInventoryAlerts() {
    const stockData = await this.getCurrentStock();
    const brickWarnings: any[] = [];

    // 1. Brick Stock Warnings
    stockData.forEach((s: any) => {
      if (s.currentStock < 0) {
        brickWarnings.push({
          type: 'RED',
          category: 'DEFICIT',
          message: `CRITICAL: ${s.brickType.size} is in deficit (${s.currentStock.toLocaleString()} pcs)`,
          brickTypeId: s.brickType.id,
        });
      } else if (s.currentStock < 1000) {
        brickWarnings.push({
          type: 'YELLOW',
          category: 'LOW_STOCK',
          message: `Low Stock: ${s.brickType.size} is below 1,000 pcs (${s.currentStock.toLocaleString()} available)`,
          brickTypeId: s.brickType.id,
        });
      }
    });

    // 2. Raw Material Stock Calculation (Purchased - Consumed)
    const rawMaterials = await prisma.rawMaterial.findMany({ where: { isActive: true } });
    const materialStatus = await Promise.all(
      rawMaterials.map(async (material: any) => {
        // Total Purchased (via MaterialUsage linked to Expenses)
        const totalPurchased = await prisma.materialUsage.aggregate({
          where: { materialId: material.id },
          _sum: { quantity: true },
        });

        // Total Consumed (via Production logs)
        // Note: Production logs use strings 'cement', 'flyash', 'powder'
        // We need to match material names here.
        const internalKeyMap: Record<string, string> = {
          'cement': 'cement',
          'fly ash': 'flyash',
          'crusher powder': 'powder',
          'powder': 'powder'
        };

        const searchKey = internalKeyMap[material.name.toLowerCase()] || material.name.toLowerCase();
        
        const totalConsumed = await (prisma as any).materialConsumptionLog.aggregate({
          where: { materialType: { equals: searchKey, mode: 'insensitive' } },
          _sum: { quantityUsed: true },
        });

        const purchased = totalPurchased._sum.quantity || 0;
        const consumed = totalConsumed._sum.quantityUsed || 0;
        const currentStock = Math.max(0, purchased - consumed);

        return {
          id: material.id,
          name: material.name,
          unit: material.unit,
          stock: currentStock,
        };
      })
    );

    // 3. Production Limits (How many bricks can we make with available materials)
    const brickTypes = await prisma.brickType.findMany({ 
      where: { isActive: true },
      include: { materialConfig: true } as any
    });

    const productionLimits = brickTypes.map((bt: any) => {
      if (!bt.materialConfig) return { brickType: bt.size, limit: Infinity };

      const config = bt.materialConfig;
      const limits = [];

      // Cement limit
      const cement = materialStatus.find(m => m.name.toLowerCase().includes('cement'));
      if (cement && config.cementPer1000 > 0) {
        limits.push((cement.stock / config.cementPer1000) * 1000);
      }

      // Fly ash limit
      const flyash = materialStatus.find(m => m.name.toLowerCase().includes('fly ash') || m.name.toLowerCase().includes('flyash'));
      if (flyash && config.flyAshPer1000 > 0) {
        limits.push((flyash.stock / config.flyAshPer1000) * 1000);
      }

      // Powder limit
      const powder = materialStatus.find(m => m.name.toLowerCase().includes('powder'));
      if (powder && config.powderPer1000 > 0) {
        limits.push((powder.stock / config.powderPer1000) * 1000);
      }

      const limit = limits.length > 0 ? Math.floor(Math.min(...limits)) : 0;
      return { 
        brickTypeId: bt.id,
        brickType: bt.size, 
        limit 
      };
    });

    // 4. Material Warnings
    const materialWarnings: any[] = [];
    productionLimits.forEach((pl: any) => {
      if (pl.limit < 5000 && pl.limit !== Infinity) {
        materialWarnings.push({
          type: 'ORANGE',
          category: 'LOW_MATERIAL',
          message: `Material Warning: Limited materials for ${pl.brickType}. Only ${pl.limit.toLocaleString()} pcs can be produced.`,
          brickTypeId: pl.brickTypeId,
        });
      }
    });

    return {
      stockData,
      materialStatus,
      productionLimits,
      warnings: [...brickWarnings, ...materialWarnings],
    };
  }
}
