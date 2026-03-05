import { Request, Response } from 'express';
import { ClientsService } from './clients.service';
import {
    createClientSchema, updateClientSchema,
    createOrderSchema, updateOrderSchema,
    createPaymentSchema, updatePaymentSchema,
    createScheduleSchema, updateScheduleSchema,
} from './clients.validation';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';

const svc = new ClientsService();

export class ClientsController {
    // ─── Clients ───
    createClient = asyncHandler(async (req: Request, res: Response) => {
        const data = createClientSchema.parse(req.body);
        const client = await svc.createClient(data);
        sendSuccess(res, client, 'Client created', 201);
    });

    getAllClients = asyncHandler(async (req: Request, res: Response) => {
        const search = req.query.search as string | undefined;
        const clients = await svc.getAllClients(search);
        sendSuccess(res, clients, 'Clients retrieved');
    });

    getClientById = asyncHandler(async (req: Request, res: Response) => {
        const client = await svc.getClientById(req.params.id);
        sendSuccess(res, client, 'Client retrieved');
    });

    updateClient = asyncHandler(async (req: Request, res: Response) => {
        const data = updateClientSchema.parse(req.body);
        const client = await svc.updateClient(req.params.id, data);
        sendSuccess(res, client, 'Client updated');
    });

    deleteClient = asyncHandler(async (req: Request, res: Response) => {
        const result = await svc.deleteClient(req.params.id);
        sendSuccess(res, result, 'Client deleted');
    });

    // ─── Orders ───
    createOrder = asyncHandler(async (req: Request, res: Response) => {
        const data = createOrderSchema.parse(req.body);
        const order = await svc.createOrder(data);
        sendSuccess(res, order, 'Order created', 201);
    });

    getAllOrders = asyncHandler(async (req: Request, res: Response) => {
        const filters = {
            clientId: req.query.clientId as string | undefined,
            status: req.query.status as string | undefined,
        };
        const orders = await svc.getAllOrders(filters);
        sendSuccess(res, orders, 'Orders retrieved');
    });

    getOrderById = asyncHandler(async (req: Request, res: Response) => {
        const order = await svc.getOrderById(req.params.id);
        sendSuccess(res, order, 'Order retrieved');
    });

    updateOrder = asyncHandler(async (req: Request, res: Response) => {
        const data = updateOrderSchema.parse(req.body);
        const order = await svc.updateOrder(req.params.id, data);
        sendSuccess(res, order, 'Order updated');
    });

    deleteOrder = asyncHandler(async (req: Request, res: Response) => {
        const result = await svc.deleteOrder(req.params.id);
        sendSuccess(res, result, 'Order deleted');
    });

    // ─── Payments ───
    createPayment = asyncHandler(async (req: Request, res: Response) => {
        const data = createPaymentSchema.parse(req.body);
        const payment = await svc.createPayment(data);
        sendSuccess(res, payment, 'Payment recorded', 201);
    });

    getAllPayments = asyncHandler(async (req: Request, res: Response) => {
        const filters = { clientId: req.query.clientId as string | undefined };
        const payments = await svc.getAllPayments(filters);
        sendSuccess(res, payments, 'Payments retrieved');
    });

    updatePayment = asyncHandler(async (req: Request, res: Response) => {
        const data = updatePaymentSchema.parse(req.body);
        const payment = await svc.updatePayment(req.params.id, data);
        sendSuccess(res, payment, 'Payment updated');
    });

    deletePayment = asyncHandler(async (req: Request, res: Response) => {
        const result = await svc.deletePayment(req.params.id);
        sendSuccess(res, result, 'Payment deleted');
    });

    // ─── Dispatch Scheduling ───
    createSchedule = asyncHandler(async (req: Request, res: Response) => {
        const data = createScheduleSchema.parse(req.body);
        const schedule = await svc.createSchedule(data);
        sendSuccess(res, schedule, 'Schedule created', 201);
    });

    getAllSchedules = asyncHandler(async (req: Request, res: Response) => {
        const filters = { status: req.query.status as string | undefined };
        const schedules = await svc.getAllSchedules(filters);
        sendSuccess(res, schedules, 'Schedules retrieved');
    });

    updateSchedule = asyncHandler(async (req: Request, res: Response) => {
        const data = updateScheduleSchema.parse(req.body);
        const schedule = await svc.updateSchedule(req.params.id, data);
        sendSuccess(res, schedule, 'Schedule updated');
    });

    deleteSchedule = asyncHandler(async (req: Request, res: Response) => {
        const result = await svc.deleteSchedule(req.params.id);
        sendSuccess(res, result, 'Schedule deleted');
    });

    // ─── Reminders / Ledger ───
    getUpcomingDispatches = asyncHandler(async (_req: Request, res: Response) => {
        const upcoming = await svc.getUpcomingDispatches();
        sendSuccess(res, upcoming, 'Upcoming dispatches');
    });

    getClientLedger = asyncHandler(async (req: Request, res: Response) => {
        const ledger = await svc.getClientLedger(req.params.id);
        sendSuccess(res, ledger, 'Client ledger retrieved');
    });
}
