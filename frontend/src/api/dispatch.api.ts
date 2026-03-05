import apiClient from './apiClient';
import type { ApiResponse, Dispatch, Customer, CreateDispatchRequest } from '../types/api';

export const dispatchApi = {
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    customerId?: string;
    brickTypeId?: string;
    paymentStatus?: string;
  }): Promise<Dispatch[]> => {
    const response = await apiClient.get<any, ApiResponse<Dispatch[]>>('/dispatch', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Dispatch> => {
    const response = await apiClient.get<any, ApiResponse<Dispatch>>(`/dispatch/${id}`);
    return response.data;
  },

  create: async (data: CreateDispatchRequest): Promise<Dispatch> => {
    const response = await apiClient.post<any, ApiResponse<Dispatch>>('/dispatch', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateDispatchRequest>): Promise<Dispatch> => {
    const response = await apiClient.patch<any, ApiResponse<Dispatch>>(`/dispatch/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/dispatch/${id}`);
  },
};

export const customersApi = {
  getAll: async (activeOnly: boolean = true): Promise<Customer[]> => {
    const response = await apiClient.get<any, ApiResponse<Customer[]>>('/dispatch/customers', {
      params: { activeOnly },
    });
    return response.data;
  },

  getById: async (id: string): Promise<Customer> => {
    const response = await apiClient.get<any, ApiResponse<Customer>>(`/dispatch/customers/${id}`);
    return response.data;
  },

  create: async (data: { name: string; phone?: string; address?: string }): Promise<Customer> => {
    const response = await apiClient.post<any, ApiResponse<Customer>>('/dispatch/customers', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/dispatch/customers/${id}`);
  },
};
