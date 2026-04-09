import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { 
  CreateTransportVehicleInput, UpdateTransportVehicleInput,
  CreateTransportVendorInput, UpdateTransportVendorInput,
  CreateTransportEntryInput, UpdateTransportEntryInput,
  CreateVehicleEmiInput, UpdateVehicleEmiInput
} from './transport.validation';

export class TransportService {
  // --- Vehicles ---
  async createVehicle(data: CreateTransportVehicleInput) {
    return await prisma.transportVehicle.create({ data });
  }

  async getVehicles() {
    return await prisma.transportVehicle.findMany({
      orderBy: { vehicleNumber: 'asc' }
    });
  }

  async getVehicleById(id: string) {
    const vehicle = await prisma.transportVehicle.findUnique({ where: { id } });
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    return vehicle;
  }

  async updateVehicle(id: string, data: UpdateTransportVehicleInput) {
    return await prisma.transportVehicle.update({ where: { id }, data });
  }

  async deleteVehicle(id: string) {
    return await prisma.transportVehicle.delete({ where: { id } });
  }

  // --- Vendors ---
  async createVendor(data: CreateTransportVendorInput) {
    return await prisma.transportVendor.create({ data });
  }

  async getVendors() {
    return await prisma.transportVendor.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async getVendorById(id: string) {
    const vendor = await prisma.transportVendor.findUnique({ where: { id } });
    if (!vendor) throw new AppError('Vendor not found', 404);
    return vendor;
  }

  async updateVendor(id: string, data: UpdateTransportVendorInput) {
    return await prisma.transportVendor.update({ where: { id }, data });
  }

  async deleteVendor(id: string) {
    return await prisma.transportVendor.delete({ where: { id } });
  }

  // --- Entries ---
  async createEntry(data: CreateTransportEntryInput) {
    const { syncToCashBook, ...entryData } = data;

    // Auto-calculate income for vendor vehicles if not provided
    if (data.transportType === 'VENDOR_VEHICLE' && data.rentPerLoad && !data.incomeAmount) {
      entryData.incomeAmount = (data.loads || 0) * (data.rentPerLoad || 0);
    }

    // Auto-calculate expense for RD vehicles if diesel/other provided
    if (data.transportType === 'RD_VEHICLE' && !data.expenseAmount) {
      entryData.expenseAmount = (data.dieselCost || 0) + (data.otherExpense || 0);
    }

    const entry = await (prisma.transportEntry as any).create({
      data: {
        ...entryData,
        date: new Date(entryData.date),
        material: entryData.material || null,
      },
      include: {
        vehicle: true,
        vendor: true,
        brickType: true
      }
    });

    // Optional Sync to Cash Book
    if (syncToCashBook) {
      const amount = entry.transactionType === 'EXPENSE' ? entry.expenseAmount : entry.incomeAmount;
      const type = entry.transactionType === 'EXPENSE' ? 'DEBIT' : 'CREDIT';
      
      if (amount > 0) {
        await (prisma as any).cashEntry.create({
          data: {
            date: entry.date,
            type: type,
            amount: amount,
            description: `Transport ${entry.transactionType}: ${entry.vehicle.vehicleNumber} ${entry.material ? `(${entry.material})` : ''} (TransportID: ${entry.id})`,
            category: 'Transport',
          }
        });
      }
    }

    return entry;
  }

  async getEntries(filters: { startDate?: string; endDate?: string; vehicleId?: string; vendorId?: string; transportType?: string }) {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.vendorId) where.vendorId = filters.vendorId;
    if (filters.transportType) where.transportType = filters.transportType;

    return await (prisma.transportEntry as any).findMany({
      where,
      include: {
        vehicle: true,
        vendor: true,
        brickType: true
      },
      orderBy: { date: 'desc' }
    });
  }

  async updateEntry(id: string, data: any) {
    const entry = await (prisma.transportEntry as any).findUnique({ where: { id } });
    if (!entry) throw new Error('Transport entry not found');

    return await (prisma.transportEntry as any).update({
      where: { id },
      data: {
        ...(data.date && { date: new Date(data.date) }),
        ...(data.transportType && { transportType: data.transportType }),
        ...(data.vehicleId && { vehicleId: data.vehicleId }),
        ...(data.vendorId !== undefined && { vendorId: data.vendorId || null }),
        ...(data.driverName !== undefined && { driverName: data.driverName || null }),
        ...(data.loads !== undefined && { loads: data.loads }),
        ...(data.transactionType && { transactionType: data.transactionType }),
        ...(data.expenseAmount !== undefined && { expenseAmount: data.expenseAmount }),
        ...(data.dieselCost !== undefined && { dieselCost: data.dieselCost }),
        ...(data.otherExpense !== undefined && { otherExpense: data.otherExpense }),
        ...(data.rentPerLoad !== undefined && { rentPerLoad: data.rentPerLoad }),
        ...(data.incomeAmount !== undefined && { incomeAmount: data.incomeAmount }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.material !== undefined && { material: data.material || null }),
        ...(data.brickTypeId !== undefined && { brickTypeId: data.brickTypeId || null }),
        ...(data.quantity !== undefined && { quantity: data.quantity || null }),
        ...(data.location !== undefined && { location: data.location || null }),
      },
      include: { vehicle: true, vendor: true, brickType: true },
    });
  }

  async deleteEntry(id: string) {
    return await prisma.$transaction(async (tx: any) => {
      // Remove related cash entry
      await (tx.cashEntry as any).deleteMany({
        where: {
          description: { contains: `(TransportID: ${id})` }
        } as any
      });

      return await tx.transportEntry.delete({ where: { id } });
    });
  }

  async getSummary(startDate?: string, endDate?: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Default to today if no dates provided
    const queryStart = startDate ? new Date(startDate) : startOfToday;
    const queryEnd = endDate ? new Date(endDate) : new Date();

    const entries = await prisma.transportEntry.findMany({
      where: {
        date: { gte: queryStart, lte: queryEnd }
      }
    });

    const summary = entries.reduce((acc, entry) => {
      acc.totalLoads += entry.loads;
      acc.totalExpense += entry.expenseAmount;
      acc.totalIncome += entry.incomeAmount;
      return acc;
    }, { totalLoads: 0, totalExpense: 0, totalIncome: 0 });

    return {
      ...summary,
      netCost: summary.totalExpense - summary.totalIncome
    };
  }

  // --- EMI Tracking ---
  async createEmi(data: CreateVehicleEmiInput) {
    const emi = await prisma.vehicleEmi.create({
      data: {
        ...data,
        dueDate: new Date(data.dueDate),
      },
      include: { vehicle: true }
    });

    // Auto-create reminder for the dashboard
    await prisma.reminder.create({
      data: {
        title: `Vehicle EMI Payment - ${emi.vehicle.vehicleNumber}`,
        description: `₹${emi.amount.toLocaleString()} due for vehicle ${emi.vehicle.vehicleNumber}${emi.notes ? ` (${emi.notes})` : ''}`,
        dueDate: emi.dueDate,
        status: 'PENDING',
      }
    });

    return emi;
  }

  async getEmis(filters: { vehicleId?: string; status?: string; startDate?: string; endDate?: string }) {
    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.dueDate = {};
      if (filters.startDate) where.dueDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.dueDate.lte = new Date(filters.endDate);
    }

    return await prisma.vehicleEmi.findMany({
      where,
      include: { vehicle: true },
      orderBy: { dueDate: 'asc' }
    });
  }

  async updateEmi(id: string, data: UpdateVehicleEmiInput) {
    const { syncToCashBook, ...updateData } = data;
    
    return await prisma.$transaction(async (tx) => {
      const emi = await tx.vehicleEmi.update({
        where: { id },
        data: {
          ...updateData,
          ...(updateData.dueDate && { dueDate: new Date(updateData.dueDate) }),
          paidDate: updateData.paidDate ? new Date(updateData.paidDate) : undefined,
        },
        include: { vehicle: true }
      });

      if (syncToCashBook && emi.status === 'PAID' && emi.amount > 0) {
        await (tx as any).cashEntry.create({
          data: {
            date: emi.paidDate || new Date(),
            type: 'DEBIT',
            amount: emi.amount,
            description: `Vehicle EMI Paid: ${emi.vehicle.vehicleNumber} (EMI ID: ${emi.id})`,
            category: 'Transport',
            paymentMode: emi.paymentMode || 'BANK',
          }
        });
      }

      return emi;
    });
  }

  async deleteEmi(id: string) {
    return await prisma.$transaction(async (tx) => {
      await (tx as any).cashEntry.deleteMany({
        where: { description: { contains: `(EMI ID: ${id})` } }
      });
      return await tx.vehicleEmi.delete({ where: { id } });
    });
  }
}
