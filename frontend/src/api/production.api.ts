import apiClient from './apiClient';
import type { ApiResponse, Production, CreateProductionRequest } from '../types/api';

export const productionApi = {
  getAll: async (params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    machineId?: string;
    brickTypeId?: string;
    shift?: string;
    page?: number;
    limit?: number;
  }): Promise<{ productions: Production[]; pagination: any }> => {
    const response = await apiClient.get<any, ApiResponse<Production[]>>('/production', { params });
    return {
      productions: response.data,
      pagination: response.meta,
    };
  },

  getById: async (id: string): Promise<Production> => {
    const response = await apiClient.get<any, ApiResponse<Production>>(`/production/${id}`);
    return response.data;
  },

  create: async (data: CreateProductionRequest): Promise<Production> => {
    const response = await apiClient.post<any, ApiResponse<Production>>('/production', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateProductionRequest>): Promise<Production> => {
    const response = await apiClient.patch<any, ApiResponse<Production>>(`/production/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/production/${id}`);
  },

  getHistory: async (params?: {
    startDate?: string;
    endDate?: string;
    machineId?: string;
    brickTypeId?: string;
  }) => {
    const response = await apiClient.get<any, ApiResponse<any>>('/production/history', { params });
    return response.data;
  },
};
