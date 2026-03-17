import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';

export const reportsApi = {
  getDashboardSummary: async () => {
    const response = await apiClient.get<any, ApiResponse<any>>('/reports/dashboard');
    return response.data;
  },

  getProductionReport: async (startDate: string, endDate: string) => {
    const response = await apiClient.get<any, ApiResponse<any>>('/reports/production', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getDispatchReport: async (startDate: string, endDate: string) => {
    const response = await apiClient.get<any, ApiResponse<any>>('/reports/dispatch', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getFinancialReport: async (startDate: string, endDate: string) => {
    const response = await apiClient.get<any, ApiResponse<any>>('/reports/financial', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getWorkerReport: async (startDate: string, endDate: string) => {
    const response = await apiClient.get<any, ApiResponse<any>>('/reports/workers', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getPersonLogs: async (personId: string, startDate?: string, endDate?: string) => {
    const response = await apiClient.get<any, ApiResponse<any>>(`/reports/logs/${personId}`, {
      params: { startDate, endDate },
    });
    return response.data;
  },
};
