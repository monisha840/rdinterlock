import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'PENDING' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export const remindersApi = {
  create: async (data: { title: string; description?: string; dueDate: string }) => {
    const response = await apiClient.post<any, ApiResponse<Reminder>>('/reminders', data);
    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get<any, ApiResponse<Reminder[]>>('/reminders');
    return response.data;
  },

  getToday: async () => {
    const response = await apiClient.get<any, ApiResponse<Reminder[]>>('/reminders/today');
    return response.data;
  },

  update: async (id: string, data: Partial<Reminder>) => {
    const response = await apiClient.patch<any, ApiResponse<Reminder>>(`/reminders/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<any, ApiResponse<void>>(`/reminders/${id}`);
    return response.data;
  }
};
