import apiClient from './apiClient';
import type { ApiResponse, CashEntry, CashBalance, CreateCashEntryRequest } from '../types/api';

export const cashApi = {
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    type?: 'CREDIT' | 'DEBIT';
    category?: string;
    search?: string;
  }): Promise<CashEntry[]> => {
    const response = await apiClient.get<any, ApiResponse<CashEntry[]>>('/cash', { params });
    return response.data;
  },

  getById: async (id: string): Promise<CashEntry> => {
    const response = await apiClient.get<any, ApiResponse<CashEntry>>(`/cash/${id}`);
    return response.data;
  },

  create: async (data: CreateCashEntryRequest): Promise<CashEntry> => {
    const response = await apiClient.post<any, ApiResponse<CashEntry>>('/cash', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateCashEntryRequest>): Promise<CashEntry> => {
    const response = await apiClient.patch<any, ApiResponse<CashEntry>>(`/cash/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/cash/${id}`);
  },

  getBalance: async (params?: { startDate?: string; endDate?: string }): Promise<CashBalance> => {
    const response = await apiClient.get<any, ApiResponse<CashBalance>>('/cash/balance', { params });
    return response.data;
  },
};
