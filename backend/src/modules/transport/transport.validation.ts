import { z } from 'zod';

export const createTransportVehicleSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  vehicleType: z.enum(['COMPANY', 'VENDOR']),
  ownerName: z.string().min(1, 'Owner name is required'),
  driverName: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateTransportVehicleSchema = createTransportVehicleSchema.partial();

export const createTransportVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const updateTransportVendorSchema = createTransportVendorSchema.partial();

export const createTransportEntrySchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  transportType: z.enum(['RD_VEHICLE', 'VENDOR_VEHICLE']),
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  vendorId: z.string().uuid('Invalid vendor ID').optional().nullable(),
  driverName: z.string().optional().nullable(),
  loads: z.number().int().positive('Loads must be greater than zero'),
  transactionType: z.enum(['EXPENSE', 'INCOME']),
  expenseAmount: z.number().nonnegative().optional(),
  dieselCost: z.number().nonnegative().optional(),
  otherExpense: z.number().nonnegative().optional(),
  rentPerLoad: z.number().nonnegative().optional(),
  incomeAmount: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  dispatchId: z.string().uuid().optional().nullable(),
  brickTypeId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().nonnegative().optional().nullable(),
  location: z.string().optional().nullable(),
  syncToCashBook: z.boolean().optional(),
});

export const updateTransportEntrySchema = createTransportEntrySchema.partial();

export const createVehicleEmiSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  notes: z.string().optional().nullable(),
});

export const updateVehicleEmiSchema = z.object({
  vehicleId: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  paidDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  status: z.enum(['PENDING', 'PAID']).optional(),
  paymentMode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  syncToCashBook: z.boolean().optional(),
});

export type CreateTransportVehicleInput = z.infer<typeof createTransportVehicleSchema>;
export type UpdateTransportVehicleInput = z.infer<typeof updateTransportVehicleSchema>;
export type CreateTransportVendorInput = z.infer<typeof createTransportVendorSchema>;
export type UpdateTransportVendorInput = z.infer<typeof updateTransportVendorSchema>;
export type CreateTransportEntryInput = z.infer<typeof createTransportEntrySchema>;
export type UpdateTransportEntryInput = z.infer<typeof updateTransportEntrySchema>;
export type CreateVehicleEmiInput = z.infer<typeof createVehicleEmiSchema>;
export type UpdateVehicleEmiInput = z.infer<typeof updateVehicleEmiSchema>;
