import apiClient from './apiClient';

export interface MaterialConfig {
  id: string;
  brickTypeId: string;
  cementPer1000: number;
  flyAshPer1000: number;
  powderPer1000: number;
  brickType?: { id: string; size: string };
}

export const materialConfigApi = {
  getAll: async () => {
    const response = await apiClient.get<MaterialConfig[]>('/material-config');
    return response.data;
  },
  
  getByBrickType: async (brickTypeId: string) => {
    const response = await apiClient.get<MaterialConfig>(`/material-config/${brickTypeId}`);
    return response.data;
  },
  
  upsert: async (data: Partial<MaterialConfig>) => {
    const response = await apiClient.post<MaterialConfig>('/material-config', data);
    return response.data;
  },
  
  delete: async (brickTypeId: string) => {
    const response = await apiClient.delete(`/material-config/${brickTypeId}`);
    return response.data;
  }
};
