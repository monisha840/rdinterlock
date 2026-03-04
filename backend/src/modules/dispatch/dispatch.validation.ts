import { z } from 'zod';

export const createDispatchSchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  customerId: z.string().uuid('Invalid customer ID'),
  brickTypeId: z.string().uuid('Invalid brick type ID'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  distanceKm: z.number().min(0, 'Distance cannot be negative').default(0),
  vehicleType: z.enum(['OWN', 'RENT'], {
    errorMap: () => ({ message: 'Vehicle type must be OWN or RENT' }),
  }),
  transportCost: z.number().min(0, 'Transport cost cannot be negative').default(0),
  loadingCost: z.number().min(0, 'Loading cost cannot be negative').default(0),
  paymentStatus: z.enum(['PAID', 'PENDING', 'PARTIAL'], {
    errorMap: () => ({ message: 'Payment status must be PAID, PENDING, or PARTIAL' }),
  }),
  totalAmount: z.number().positive('Total amount must be positive').optional(),
  paidAmount: z.number().min(0, 'Paid amount cannot be negative').default(0),
  notes: z.string().optional(),
});

export const updateDispatchSchema = z.object({
  paymentStatus: z.enum(['PAID', 'PENDING', 'PARTIAL']).optional(),
  paidAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type CreateDispatchInput = z.infer<typeof createDispatchSchema>;
export type UpdateDispatchInput = z.infer<typeof updateDispatchSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
