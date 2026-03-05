import { z } from 'zod';

// --- Clients ---
export const createClientSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
});

export const updateClientSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
});

// --- Client Orders ---
export const createOrderSchema = z.object({
    clientId: z.string().uuid(),
    brickTypeId: z.string().uuid(),
    quantity: z.number().int().positive(),
    rate: z.number().min(0).optional(),
    totalAmount: z.number().min(0).optional(),
    orderDate: z.string(),
    expectedDispatchDate: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
});

export const updateOrderSchema = z.object({
    clientId: z.string().uuid().optional(),
    brickTypeId: z.string().uuid().optional(),
    quantity: z.number().int().positive().optional(),
    rate: z.number().min(0).optional(),
    totalAmount: z.number().min(0).optional(),
    orderDate: z.string().optional(),
    expectedDispatchDate: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
});

// --- Client Payments ---
export const createPaymentSchema = z.object({
    clientId: z.string().uuid(),
    orderId: z.string().uuid().optional(),
    amount: z.number().positive(),
    paymentDate: z.string(),
    paymentMethod: z.string().min(1),
    notes: z.string().optional(),
});

export const updatePaymentSchema = z.object({
    amount: z.number().positive().optional(),
    paymentDate: z.string().optional(),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
});

// --- Dispatch Scheduling ---
export const createScheduleSchema = z.object({
    clientId: z.string().uuid(),
    brickTypeId: z.string().uuid(),
    quantity: z.number().int().positive(),
    location: z.string().optional(),
    dispatchDate: z.string(),
    driverId: z.string().uuid().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
});

export const updateScheduleSchema = z.object({
    clientId: z.string().uuid().optional(),
    brickTypeId: z.string().uuid().optional(),
    quantity: z.number().int().positive().optional(),
    location: z.string().optional(),
    dispatchDate: z.string().optional(),
    driverId: z.string().uuid().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
});
