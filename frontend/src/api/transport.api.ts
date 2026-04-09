import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { 
  TransportVehicle, TransportVendor, TransportEntry, 
  TransportSummary, CreateTransportEntryRequest,
  VehicleEmi, CreateVehicleEmiRequest, UpdateVehicleEmiRequest
} from '../types/transport';

export const transportApi = {
  // Vehicles
  getVehicles: async (): Promise<TransportVehicle[]> => {
    const response = await apiClient.get<any, ApiResponse<TransportVehicle[]>>('/transport/vehicles');
    return response.data;
  },
  createVehicle: async (data: Partial<TransportVehicle>): Promise<TransportVehicle> => {
    const response = await apiClient.post<any, ApiResponse<TransportVehicle>>('/transport/vehicles', data);
    return response.data;
  },
  updateVehicle: async (id: string, data: Partial<TransportVehicle>): Promise<TransportVehicle> => {
    const response = await apiClient.patch<any, ApiResponse<TransportVehicle>>(`/transport/vehicles/${id}`, data);
    return response.data;
  },
  deleteVehicle: async (id: string): Promise<void> => {
    await apiClient.delete(`/transport/vehicles/${id}`);
  },

  // Vendors
  getVendors: async (): Promise<TransportVendor[]> => {
    const response = await apiClient.get<any, ApiResponse<TransportVendor[]>>('/transport/vendors');
    return response.data;
  },
  createVendor: async (data: Partial<TransportVendor>): Promise<TransportVendor> => {
    const response = await apiClient.post<any, ApiResponse<TransportVendor>>('/transport/vendors', data);
    return response.data;
  },

  // Entries
  getEntries: async (params?: { 
    startDate?: string; 
    endDate?: string; 
    vehicleId?: string; 
    vendorId?: string; 
    transportType?: string 
  }): Promise<TransportEntry[]> => {
    const response = await apiClient.get<any, ApiResponse<TransportEntry[]>>('/transport/entries', { params });
    return response.data;
  },
  createEntry: async (data: CreateTransportEntryRequest): Promise<TransportEntry> => {
    const response = await apiClient.post<any, ApiResponse<TransportEntry>>('/transport/entries', data);
    return response.data;
  },
  updateEntry: async (id: string, data: any): Promise<TransportEntry> => {
    const response = await apiClient.patch<any, ApiResponse<TransportEntry>>(`/transport/entries/${id}`, data);
    return response.data;
  },
  deleteEntry: async (id: string): Promise<void> => {
    await apiClient.delete(`/transport/entries/${id}`);
  },

  // Summary
  getSummary: async (params?: { startDate?: string; endDate?: string }): Promise<TransportSummary> => {
    const response = await apiClient.get<any, ApiResponse<TransportSummary>>('/transport/summary', { params });
    return response.data;
  },
  
  // EMIs
  getEmis: async (params?: { 
    vehicleId?: string; 
    status?: string; 
    startDate?: string; 
    endDate?: string 
  }): Promise<VehicleEmi[]> => {
    const response = await apiClient.get<any, ApiResponse<VehicleEmi[]>>('/transport/emis', { params });
    return response.data;
  },
  createEmi: async (data: CreateVehicleEmiRequest): Promise<VehicleEmi> => {
    const response = await apiClient.post<any, ApiResponse<VehicleEmi>>('/transport/emis', data);
    return response.data;
  },
  updateEmi: async (id: string, data: UpdateVehicleEmiRequest): Promise<VehicleEmi> => {
    const response = await apiClient.patch<any, ApiResponse<VehicleEmi>>(`/transport/emis/${id}`, data);
    return response.data;
  },
  deleteEmi: async (id: string): Promise<void> => {
    await apiClient.delete(`/transport/emis/${id}`);
  },
};
