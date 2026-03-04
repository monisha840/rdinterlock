import { z } from 'zod';

const workerProductionSchema = z.object({
  workerId: z.string().uuid('Invalid worker ID'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const createProductionSchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  machineId: z.string().uuid('Invalid machine ID'),
  shift: z.enum(['MORNING', 'NIGHT'], {
    errorMap: () => ({ message: 'Shift must be MORNING or NIGHT' }),
  }),
  brickTypeId: z.string().uuid('Invalid brick type ID'),
  quantity: z.number().int().positive('Total quantity must be a positive integer'),
  workers: z.array(workerProductionSchema).optional(),
  notes: z.string().optional(),
});

export const getProductionQuerySchema = z.object({
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  machineId: z.string().optional(),
  brickTypeId: z.string().optional(),
  shift: z.enum(['MORNING', 'NIGHT']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateProductionInput = z.infer<typeof createProductionSchema>;
export type GetProductionQuery = z.infer<typeof getProductionQuerySchema>;
