import apiClient from './apiClient';
import type { ApiResponse, Worker, CreateWorkerRequest } from '../types/api';

export const workersApi = {
  getAll: async (activeOnly: boolean = true, employeeType?: string): Promise<Worker[]> => {
    const response = await apiClient.get<any, ApiResponse<Worker[]>>('/workers', {
      params: { activeOnly, employeeType },
    });
    return response.data;
  },

  getById: async (id: string): Promise<Worker> => {
    const response = await apiClient.get<any, ApiResponse<Worker>>(`/workers/${id}`);
    return response.data;
  },

  create: async (data: CreateWorkerRequest): Promise<Worker> => {
    const response = await apiClient.post<any, ApiResponse<Worker>>('/workers', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateWorkerRequest>): Promise<Worker> => {
    const response = await apiClient.patch<any, ApiResponse<Worker>>(`/workers/${id}`, data);
    return response.data;
  },

  delete: async (id: string, force: boolean = false): Promise<void> => {
    await apiClient.delete(`/workers/${id}`, { params: { force } });
  },

  getStats: async (id: string, startDate?: string, endDate?: string) => {
    const response = await apiClient.get<any, ApiResponse<any>>(`/workers/${id}/stats`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getLedger: async (id: string): Promise<any[]> => {
    const response = await apiClient.get<any, ApiResponse<any[]>>(`/workers/${id}/ledger`);
    return response.data;
  },
};
