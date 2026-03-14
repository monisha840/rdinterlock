import { z } from 'zod';

export const createCashEntrySchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  type: z.enum(['CREDIT', 'DEBIT'], {
    errorMap: () => ({ message: 'Type must be CREDIT or DEBIT' }),
  }),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK', 'CHEQUE', 'BANK_TRANSFER']).optional(),
  vendorName: z.string().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  workerId: z.string().uuid().optional().nullable(),
  materialId: z.string().uuid().optional().nullable(),
  isRecordOnly: z.boolean().optional(),
});

export const updateCashEntrySchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  type: z.enum(['CREDIT', 'DEBIT']).optional(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK', 'CHEQUE', 'BANK_TRANSFER']).optional(),
  vendorName: z.string().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  workerId: z.string().uuid().optional().nullable(),
  materialId: z.string().uuid().optional().nullable(),
  isRecordOnly: z.boolean().optional(),
});

export type CreateCashEntryInput = z.infer<typeof createCashEntrySchema>;
export type UpdateCashEntryInput = z.infer<typeof updateCashEntrySchema>;
