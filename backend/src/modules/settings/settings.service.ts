import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import {
  CreateMachineInput,
  UpdateMachineInput,
  CreateBrickTypeInput,
  UpdateBrickTypeInput,
} from './settings.validation';

export class SettingsService {
  // Machine management
  async createMachine(data: CreateMachineInput) {
    const machine = await prisma.machine.create({
      data,
    });

    return machine;
  }

  async getAllMachines(activeOnly: boolean = false) {
    const machines = await prisma.machine.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });

    return machines;
  }

  async getMachineById(id: string) {
    const machine = await prisma.machine.findUnique({
      where: { id },
    });

    if (!machine) {
      throw new AppError('Machine not found', 404);
    }

    return machine;
  }

  async updateMachine(id: string, data: UpdateMachineInput) {
    const machine = await prisma.machine.findUnique({
      where: { id },
    });

    if (!machine) {
      throw new AppError('Machine not found', 404);
    }

    const updated = await prisma.machine.update({
      where: { id },
      data,
    });

    return updated;
  }

  async deleteMachine(id: string) {
    const machine = await prisma.machine.findUnique({
      where: { id },
    });

    if (!machine) {
      throw new AppError('Machine not found', 404);
    }

    // Soft delete
    await prisma.machine.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Machine deactivated successfully' };
  }

  // Brick Type management
  async createBrickType(data: CreateBrickTypeInput) {
    const existing = await prisma.brickType.findUnique({
      where: { size: data.size },
    });

    if (existing) {
      throw new AppError('Brick type with this size already exists', 400);
    }

    const brickType = await prisma.brickType.create({
      data,
    });

    return brickType;
  }

  async getAllBrickTypes(activeOnly: boolean = false) {
    const brickTypes = await prisma.brickType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { size: 'asc' },
    });

    return brickTypes;
  }

  async getBrickTypeById(id: string) {
    const brickType = await prisma.brickType.findUnique({
      where: { id },
    });

    if (!brickType) {
      throw new AppError('Brick type not found', 404);
    }

    return brickType;
  }

  async updateBrickType(id: string, data: UpdateBrickTypeInput) {
    const brickType = await prisma.brickType.findUnique({
      where: { id },
    });

    if (!brickType) {
      throw new AppError('Brick type not found', 404);
    }

    const updated = await prisma.brickType.update({
      where: { id },
      data,
    });

    return updated;
  }

  async deleteBrickType(id: string) {
    const brickType = await prisma.brickType.findUnique({
      where: { id },
    });

    if (!brickType) {
      throw new AppError('Brick type not found', 404);
    }

    // Soft delete
    await prisma.brickType.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Brick type deactivated successfully' };
  }

  // Raw Material management
  async createRawMaterial(data: { name: string; unit: string }) {
    const existing = await prisma.rawMaterial.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new AppError('Raw material with this name already exists', 400);
    }

    const material = await prisma.rawMaterial.create({
      data: { ...data, isActive: true },
    });

    return material;
  }

  async getAllRawMaterials(activeOnly: boolean = false) {
    const materials = await prisma.rawMaterial.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });

    return materials;
  }

  async deleteRawMaterial(id: string) {
    const material = await prisma.rawMaterial.findUnique({
      where: { id },
    });

    if (!material) {
      throw new AppError('Raw material not found', 404);
    }

    // Soft delete
    await prisma.rawMaterial.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Raw material deactivated successfully' };
  }

  async getFormMetadata() {
    const [machines, brickTypes, workers, rawMaterials] = await Promise.all([
      prisma.machine.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.brickType.findMany({
        where: { isActive: true },
        orderBy: { size: 'asc' },
      }),
      prisma.worker.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.rawMaterial.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      machines,
      brickTypes,
      workers,
      rawMaterials,
    };
  }
}
