import apiClient from './apiClient';

export interface BrickReturn {
  id: string;
  dispatchId: string;
  clientId: string;
  brickTypeId: string;
  returnedQuantity: number;
  reason?: string;
  date: string;
  dispatch?: any;
  client?: { id: string; name: string };
  brickType?: { id: string; size: string };
}

export const returnsApi = {
  create: async (data: any) => {
    const response = await apiClient.post<BrickReturn>('/returns', data);
    return response.data;
  },
  
  getAll: async (filters: any = {}) => {
    const response = await apiClient.get<BrickReturn[]>('/returns', { params: filters });
    return response.data;
  },
  
  getByDispatch: async (dispatchId: string) => {
    const response = await apiClient.get<any>(`/returns/dispatch/${dispatchId}`);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/returns/${id}`);
    return response.data;
  }
};
