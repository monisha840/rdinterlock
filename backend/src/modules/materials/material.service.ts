import prisma from '../../config/database';



export class MaterialService {
  /**
   * Get all materials
   */
  async getAllMaterials(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true };

    return prisma.rawMaterial.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Get material by ID
   */
  async getMaterialById(id: string) {
    const material = await prisma.rawMaterial.findUnique({
      where: { id },
      include: {
        materialUsages: {
          include: {
            expense: true,
          },
          orderBy: {
            date: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!material) {
      throw new Error('Material not found');
    }

    return material;
  }

  /**
   * Create a new material
   */
  async createMaterial(data: {
    name: string;
    unit: string;
    description?: string;
  }) {
    // Check if material with same name exists
    const existing = await prisma.rawMaterial.findFirst({
      where: {
        name: {
          equals: data.name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new Error('Material with this name already exists');
    }

    return prisma.rawMaterial.create({
      data,
    });
  }

  /**
   * Update material
   */
  async updateMaterial(
    id: string,
    data: {
      name?: string;
      unit?: string;
      description?: string;
    }
  ) {
    // Check if material exists
    const material = await prisma.rawMaterial.findUnique({
      where: { id },
    });

    if (!material) {
      throw new Error('Material not found');
    }

    // If name is being updated, check for duplicates
    if (data.name) {
      const existing = await prisma.rawMaterial.findFirst({
        where: {
          name: {
            equals: data.name,
            mode: 'insensitive',
          },
          id: {
            not: id,
          },
        },
      });

      if (existing) {
        throw new Error('Material with this name already exists');
      }
    }

    return prisma.rawMaterial.update({
      where: { id },
      data,
    });
  }

  /**
   * Toggle material active status
   */
  async toggleMaterialStatus(id: string) {
    const material = await prisma.rawMaterial.findUnique({
      where: { id },
    });

    if (!material) {
      throw new Error('Material not found');
    }

    return prisma.rawMaterial.update({
      where: { id },
      data: {
        isActive: !material.isActive,
      },
    });
  }

  /**
   * Get material usage history
   */
  async getMaterialUsage(filters: {
    materialId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters.materialId) {
      where.materialId = filters.materialId;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    return prisma.materialUsage.findMany({
      where,
      include: {
        material: true,
        expense: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  /**
   * Get material usage summary
   */
  async getMaterialUsageSummary(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }

    const usages = await prisma.materialUsage.findMany({
      where,
      include: {
        material: true,
      },
    });

    // Group by material
    const summary = usages.reduce((acc: any, usage: any) => {
      const materialId = usage.materialId;
      if (!acc[materialId]) {
        acc[materialId] = {
          materialId,
          materialName: usage.material.name,
          unit: usage.material.unit,
          totalQuantity: 0,
          totalCost: 0,
          usageCount: 0,
        };
      }
      acc[materialId].totalQuantity += usage.quantity;
      acc[materialId].totalCost += usage.totalCost;
      acc[materialId].usageCount += 1;
      return acc;
    }, {});

    return Object.values(summary);
  }

  /**
   * Seed default materials
   */
  async seedDefaultMaterials() {
    const defaultMaterials = [
      {
        name: 'Crusher Powder',
        unit: 'Ton',
        description: 'Fine aggregate for interlock brick production',
      },
      {
        name: 'Fly Ash',
        unit: 'Ton',
        description: 'Pozzolanic material for strength',
      },
      {
        name: 'Cement',
        unit: 'Bag (50kg)',
        description: 'Portland cement for binding',
      },
      {
        name: 'Add Mixture',
        unit: 'Liter',
        description: 'Chemical admixture for workability',
      },
    ];

    const created = [];

    for (const material of defaultMaterials) {
      // Check if already exists
      const existing = await prisma.rawMaterial.findFirst({
        where: {
          name: {
            equals: material.name,
            mode: 'insensitive',
          },
        },
      });

      if (!existing) {
        const created_material = await prisma.rawMaterial.create({
          data: material,
        });
        created.push(created_material);
      }
    }

    return created;
  }
}
