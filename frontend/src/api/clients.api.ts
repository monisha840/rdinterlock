import apiClient from './apiClient';

export const clientsApi = {
    // ─── Clients ───
    getAll: async (search?: string) => {
        const params: any = {};
        if (search) params.search = search;
        const res = await apiClient.get('/clients', { params });
        return (res as any).data;
    },
    getById: async (id: string) => {
        const res = await apiClient.get(`/clients/${id}`);
        return (res as any).data;
    },
    create: async (data: any) => {
        const res = await apiClient.post('/clients', data);
        return (res as any).data;
    },
    update: async (id: string, data: any) => {
        const res = await apiClient.patch(`/clients/${id}`, data);
        return (res as any).data;
    },
    delete: async (id: string) => {
        await apiClient.delete(`/clients/${id}`);
    },
    getLedger: async (id: string) => {
        const res = await apiClient.get(`/clients/${id}/ledger`);
        return (res as any).data;
    },

    // ─── Orders ───
    createOrder: async (data: any) => {
        const res = await apiClient.post('/clients/orders', data);
        return (res as any).data;
    },
    getAllOrders: async (params?: any) => {
        const res = await apiClient.get('/clients/orders/all', { params });
        return (res as any).data;
    },
    getOrder: async (id: string) => {
        const res = await apiClient.get(`/clients/orders/${id}`);
        return (res as any).data;
    },
    updateOrder: async (id: string, data: any) => {
        const res = await apiClient.patch(`/clients/orders/${id}`, data);
        return (res as any).data;
    },
    deleteOrder: async (id: string) => {
        await apiClient.delete(`/clients/orders/${id}`);
    },

    // ─── Payments ───
    createPayment: async (data: any) => {
        const res = await apiClient.post('/clients/payments', data);
        return (res as any).data;
    },
    getAllPayments: async (params?: any) => {
        const res = await apiClient.get('/clients/payments/all', { params });
        return (res as any).data;
    },
    updatePayment: async (id: string, data: any) => {
        const res = await apiClient.patch(`/clients/payments/${id}`, data);
        return (res as any).data;
    },
    deletePayment: async (id: string) => {
        await apiClient.delete(`/clients/payments/${id}`);
    },

    // ─── Dispatch Schedules ───
    createSchedule: async (data: any) => {
        const res = await apiClient.post('/clients/schedules', data);
        return (res as any).data;
    },
    getAllSchedules: async (params?: any) => {
        const res = await apiClient.get('/clients/schedules/all', { params });
        return (res as any).data;
    },
    updateSchedule: async (id: string, data: any) => {
        const res = await apiClient.patch(`/clients/schedules/${id}`, data);
        return (res as any).data;
    },
    deleteSchedule: async (id: string) => {
        await apiClient.delete(`/clients/schedules/${id}`);
    },

    // ─── Reminders ───
    getUpcomingDispatches: async () => {
        const res = await apiClient.get('/clients/upcoming-dispatches');
        return (res as any).data;
    },
};
