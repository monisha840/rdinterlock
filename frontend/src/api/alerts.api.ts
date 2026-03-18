import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';

export interface Alert {
  id: string;
  type: 'stock' | 'material' | 'payment' | 'salary';
  message: string;
  severity: 'low' | 'medium' | 'high';
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export const alertsApi = {
  getAlerts: async () => {
    const response = await apiClient.get<any, ApiResponse<Alert[]>>('/alerts');
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.patch<any, ApiResponse<void>>(`/alerts/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.post<any, ApiResponse<void>>('/alerts/read-all');
    return response.data;
  }
};
