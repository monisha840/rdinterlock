import { z } from 'zod';

export const createWorkerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.string().min(1, 'Role is required'),
  paymentType: z.string().min(1, 'Payment type is required'),
  rate: z.number().positive('Rate must be a positive number'),
});

export const updateWorkerSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.string().optional(),
  paymentType: z.string().optional(),
  rate: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;
