import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class MaterialConfigService {
  async getMaterialConfig(brickTypeId: string) {
    const config = await prisma.materialConfig.findUnique({
      where: { brickTypeId },
      include: { brickType: true },
    });
    return config;
  }

  async getAllMaterialConfigs() {
    const configs = await prisma.materialConfig.findMany({
      include: {
        brickType: { select: { id: true, size: true } },
      },
      orderBy: { brickType: { size: 'asc' } },
    });
    return configs;
  }

  async upsertMaterialConfig(data: {
    brickTypeId: string;
    cementPer1000: number;
    flyAshPer1000: number;
    powderPer1000: number;
  }) {
    const brickType = await prisma.brickType.findUnique({
      where: { id: data.brickTypeId },
    });

    if (!brickType) {
      throw new AppError('Brick type not found', 404);
    }

    return prisma.materialConfig.upsert({
      where: { brickTypeId: data.brickTypeId },
      update: {
        cementPer1000: data.cementPer1000,
        flyAshPer1000: data.flyAshPer1000,
        powderPer1000: data.powderPer1000,
      },
      create: {
        brickTypeId: data.brickTypeId,
        cementPer1000: data.cementPer1000,
        flyAshPer1000: data.flyAshPer1000,
        powderPer1000: data.powderPer1000,
      },
      include: { brickType: true },
    });
  }

  async deleteMaterialConfig(brickTypeId: string) {
    const config = await prisma.materialConfig.findUnique({ where: { brickTypeId } });
    if (!config) throw new AppError('Config not found', 404);
    await prisma.materialConfig.delete({ where: { brickTypeId } });
    return { message: 'Material config deleted' };
  }

  /**
   * Calculate material consumption for a given quantity and brick type
   */
  async calculateConsumption(brickTypeId: string, quantity: number) {
    const config = await this.getMaterialConfig(brickTypeId);
    if (!config) return null;

    const factor = quantity / 1000;
    return {
      cementUsed: parseFloat((factor * config.cementPer1000).toFixed(3)),
      flyAshUsed: parseFloat((factor * config.flyAshPer1000).toFixed(3)),
      powderUsed: parseFloat((factor * config.powderPer1000).toFixed(3)),
    };
  }
}
