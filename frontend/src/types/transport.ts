export interface TransportVehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: 'COMPANY' | 'VENDOR';
  ownerName: string;
  driverName?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface TransportVendor {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransportEntry {
  id: string;
  date: string;
  transportType: 'RD_VEHICLE' | 'VENDOR_VEHICLE';
  vehicleId: string;
  vendorId?: string | null;
  driverName?: string | null;
  loads: number;
  transactionType: 'EXPENSE' | 'INCOME';
  expenseAmount: number;
  dieselCost: number;
  otherExpense: number;
  rentPerLoad: number;
  incomeAmount: number;
  notes?: string | null;
  material?: string | null;
  dispatchId?: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: TransportVehicle;
  vendor?: TransportVendor;
}

export interface TransportSummary {
  totalLoads: number;
  totalExpense: number;
  totalIncome: number;
  netCost: number;
}

export interface CreateTransportEntryRequest {
  date: string;
  transportType: 'RD_VEHICLE' | 'VENDOR_VEHICLE';
  vehicleId: string;
  vendorId?: string | null;
  driverName?: string | null;
  loads: number;
  transactionType: 'EXPENSE' | 'INCOME';
  expenseAmount?: number;
  dieselCost?: number;
  otherExpense?: number;
  rentPerLoad?: number;
  incomeAmount?: number;
  notes?: string | null;
  material?: string | null;
  syncToCashBook?: boolean;
}

export interface VehicleEmi {
  id: string;
  vehicleId: string;
  amount: number;
  dueDate: string;
  paidDate?: string | null;
  status: 'PENDING' | 'PAID';
  paymentMode?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: TransportVehicle;
}

export interface CreateVehicleEmiRequest {
  vehicleId: string;
  amount: number;
  dueDate: string;
  notes?: string | null;
}

export interface UpdateVehicleEmiRequest {
  paidDate?: string | null;
  status?: 'PENDING' | 'PAID';
  paymentMode?: string | null;
  notes?: string | null;
  syncToCashBook?: boolean;
}
