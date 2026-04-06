import { z } from 'zod';

export const markAttendanceSchema = z.object({
  workerId: z.string().uuid(),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  present: z.boolean().default(true),
  notes: z.string().optional(),
});

export const getAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  workerId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const giveAdvanceSchema = z.object({
  amount: z.number().positive({ message: 'Amount must be positive' }),
  note: z.string().optional(),
  paymentMode: z.string().optional().default('CASH'),
});

export const calculateWagesSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }),
});

export const getWagesSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  workerId: z.string().uuid().optional(),
  isPaid: z.enum(['true', 'false']).optional(),
});

export const payWagesSchema = z.object({
  wageIds: z.array(z.string().uuid()).min(1, { message: 'At least one wage ID is required' }),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type GetAttendanceInput = z.infer<typeof getAttendanceSchema>;
export type GiveAdvanceInput = z.infer<typeof giveAdvanceSchema>;
export type CalculateWagesInput = z.infer<typeof calculateWagesSchema>;
export type GetWagesInput = z.infer<typeof getWagesSchema>;
export type PayWagesInput = z.infer<typeof payWagesSchema>;
