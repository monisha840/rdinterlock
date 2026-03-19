import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';

export interface StaffPayment {
  id: string;
  personId: string;
  role: string;
  amount: number;
  paymentType: string;
  method: string;
  date: string;
  note?: string;
  createdAt: string;
}

export interface CreatePaymentDto {
  personId: string;
  role: string;
  amount: number;
  paymentType: string;
  method: string;
  date: string;
  note?: string;
}

export const paymentsApi = {
  createStaffPayment: async (data: CreatePaymentDto) => {
    const response = await apiClient.post<any, ApiResponse<StaffPayment>>('/payments/staff', data);
    return response.data;
  },

  getStaffPayments: async (personId: string) => {
    const response = await apiClient.get<any, ApiResponse<StaffPayment[]>>(`/payments/staff/${personId}`);
    return response.data;
  }
};
