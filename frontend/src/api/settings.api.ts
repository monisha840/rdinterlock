import apiClient from './apiClient';
import type { ApiResponse, Machine, BrickType, FormMetadata } from '../types/api';

export const settingsApi = {
  // Meta
  getFormMetadata: async (): Promise<FormMetadata> => {
    const response = await apiClient.get<any, ApiResponse<FormMetadata>>('/settings/form-metadata');
    return response.data;
  },

  // Machines
  getMachines: async (activeOnly: boolean = true): Promise<Machine[]> => {
    const response = await apiClient.get<any, ApiResponse<Machine[]>>('/settings/machines', {
      params: { activeOnly },
    });
    return response.data;
  },

  createMachine: async (data: { name: string }): Promise<Machine> => {
    const response = await apiClient.post<any, ApiResponse<Machine>>('/settings/machines', data);
    return response.data;
  },

  updateMachine: async (id: string, data: { name?: string; isActive?: boolean }): Promise<Machine> => {
    const response = await apiClient.patch<any, ApiResponse<Machine>>(`/settings/machines/${id}`, data);
    return response.data;
  },

  deleteMachine: async (id: string): Promise<void> => {
    await apiClient.delete(`/settings/machines/${id}`);
  },

  // Brick Types
  getBrickTypes: async (activeOnly: boolean = true): Promise<BrickType[]> => {
    const response = await apiClient.get<any, ApiResponse<BrickType[]>>('/settings/brick-types', {
      params: { activeOnly },
    });
    return response.data;
  },

  createBrickType: async (data: { size: string }): Promise<BrickType> => {
    const response = await apiClient.post<any, ApiResponse<BrickType>>('/settings/brick-types', data);
    return response.data;
  },

  updateBrickType: async (id: string, data: { size?: string; isActive?: boolean }): Promise<BrickType> => {
    const response = await apiClient.patch<any, ApiResponse<BrickType>>(`/settings/brick-types/${id}`, data);
    return response.data;
  },

  deleteBrickType: async (id: string): Promise<void> => {
    await apiClient.delete(`/settings/brick-types/${id}`);
  },
};
