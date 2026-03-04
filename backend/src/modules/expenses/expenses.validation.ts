import { z } from 'zod';

export const createExpenseSchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  category: z.enum(['FUEL', 'MAINTENANCE', 'SALARY', 'GENERAL', 'MATERIAL', 'FOOD', 'OTHER'], {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
  amount: z.number().positive('Amount must be positive'),
  notes: z.string().optional(),
  workerId: z.string().uuid('Invalid worker ID').optional(),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK']).optional(),
  // Material tracking fields
  materialId: z.string().uuid('Invalid material ID').optional(),
  quantity: z.number().positive('Quantity must be positive').optional(),
  pricePerUnit: z.number().positive('Price per unit must be positive').optional(),
});

export const updateExpenseSchema = z.object({
  category: z.enum(['FUEL', 'MAINTENANCE', 'SALARY', 'GENERAL', 'MATERIAL', 'FOOD', 'OTHER']).optional(),
  amount: z.number().positive().optional(),
  notes: z.string().optional(),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK']).optional(),
  materialId: z.string().uuid().optional(),
  quantity: z.number().positive().optional(),
  pricePerUnit: z.number().positive().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
