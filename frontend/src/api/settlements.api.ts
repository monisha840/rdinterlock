import apiClient from "./apiClient";

export interface MonthlySalaryCalculation {
    workerId: string;
    workerName: string;
    role: string;
    presentDays: number;
    dailyRate: number;
    salary: number;
    advanceBalance: number;
    advanceUsed: number;
    netPayable: number;
    totalPaid: number;
    pendingAmount: number;
}

export interface MonthlySettlementResponse {
    month: number;
    year: number;
    salaries: MonthlySalaryCalculation[];
}

export const settlementsApi = {
    calculateMonthly: async (month: number, year: number): Promise<MonthlySettlementResponse> => {
        const response = await apiClient.post('/settlements/monthly/calculate', { month, year });
        return response.data; // apiClient already returns response.data
    },

    saveMonthly: async (month: number, year: number) => {
        const response = await apiClient.post('/settlements/monthly', { month, year });
        return response.data;
    },

    getMonthly: async (filters: { month?: number; year?: number; workerId?: string; isPaid?: boolean }) => {
        const params = new URLSearchParams();
        if (filters.month) params.append('month', filters.month.toString());
        if (filters.year) params.append('year', filters.year.toString());
        if (filters.workerId) params.append('workerId', filters.workerId);
        if (filters.isPaid !== undefined) params.append('isPaid', filters.isPaid.toString());

        const response = await apiClient.get(`/settlements/monthly?${params.toString()}`);
        return response.data;
    },

    payMonthly: async (settlementIds: string[], paymentDate?: string) => {
        const response = await apiClient.post('/settlements/monthly/pay', { settlementIds, paymentDate });
        return response.data;
    },
};
