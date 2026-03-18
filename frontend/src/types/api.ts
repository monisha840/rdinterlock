// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: any;
}

// Auth types
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'ADMIN' | 'MANAGER' | 'VIEWER';
}

// Worker types
export interface Worker {
  id: string;
  name: string;
  role: string;
  employeeType: 'Staff' | 'Worker';
  paymentType: 'DAILY' | 'PER_BRICK' | 'MONTHLY'; // Keeping legacy strings for now
  rate: number; // Legacy field
  monthlySalary: number;
  weeklyWage: number;
  perBrickRate: number;
  advanceBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkerRequest {
  name: string;
  role: string;
  employeeType?: 'Staff' | 'Worker';
  paymentType: string;
  monthlySalary?: number;
  weeklyWage?: number;
  perBrickRate?: number;
  rate?: number;
}

// Machine & Brick Type
export interface Machine {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface BrickType {
  id: string;
  size: string;
  isActive: boolean;
  createdAt: string;
}

export interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  isActive: boolean;
  createdAt: string;
}

// Production types
export interface ProductionWorker {
  workerId: string;
  quantity: number;
}

export interface CreateProductionRequest {
  date: string;
  machineId: string;
  shift: 'MORNING' | 'EVENING' | 'NIGHT';
  brickTypeId: string;
  quantity: number;
  damagedBricks?: number;
  workers?: ProductionWorker[];
  notes?: string;
}

export interface Production {
  id: string;
  date: string;
  machineId: string;
  shift: string;
  brickTypeId: string;
  quantity: number;
  damagedBricks: number;
  availableBricks: number;
  wastagePercentage?: number;
  materialConsumption?: {
    cementUsed: number;
    flyAshUsed: number;
    powderUsed: number;
  };
  notes?: string;
  machine: Machine;
  brickType: BrickType;
  workers: Array<{
    id: string;
    workerId: string;
    quantity: number;
    worker: Worker;
  }>;
  createdAt: string;
}

// Customer & Dispatch types
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDispatchRequest {
  date: string;
  customerId: string;
  brickTypeId: string;
  quantity: number;
  distanceKm: number;
  vehicleType: 'OWN' | 'RENT';
  transportCost: number;
  loadingCost: number;
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
  totalAmount?: number;
  paidAmount: number;
  notes?: string;
}

export interface Dispatch {
  id: string;
  date: string;
  customerId: string;
  brickTypeId: string;
  quantity: number;
  distanceKm: number;
  vehicleType: string;
  transportCost: number;
  loadingCost: number;
  paymentStatus: string;
  totalAmount?: number;
  paidAmount: number;
  notes?: string;
  customer: Customer;
  brickType: BrickType;
  createdAt: string;
}

// Expense types
export interface CreateExpenseRequest {
  date: string;
  category: 'FUEL' | 'MAINTENANCE' | 'SALARY' | 'GENERAL' | 'MATERIAL' | 'FOOD' | 'OTHER';
  amount: number;
  notes?: string;
  workerId?: string;
  paymentMode?: 'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'BANK_TRANSFER';
  materialId?: string;
  quantity?: number;
  pricePerUnit?: number;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  notes?: string;
  workerId?: string;
  paymentMode?: string;
  materialId?: string;
  quantity?: number;
  pricePerUnit?: number;
  worker?: {
    id: string;
    name: string;
  };
  material?: {
    id: string;
    name: string;
    unit: string;
  };
  createdAt: string;
}

// Cash Book types
export interface CreateCashEntryRequest {
  date: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  category: string;
  vendorName?: string | null;
  paymentMode?: 'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'BANK_TRANSFER';
  customerId?: string;
  workerId?: string;
  materialId?: string;
  isRecordOnly?: boolean;
}

export interface CashEntry {
  id: string;
  date: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  category: string;
  vendorName?: string | null;
  paymentMode?: string;
  customerId?: string;
  workerId?: string;
  materialId?: string;
  isRecordOnly?: boolean;
  customer?: { id: string; name: string };
  worker?: { id: string; name: string; role: string };
  material?: { id: string; name: string; unit: string };
  createdAt: string;
}

export interface CashBalance {
  totalCredit: number;
  totalDebit: number;
  balance: number;
  todayMoneyIn: number;
  todayMoneyOut: number;
  thisMonthExpenses: number;
  totalEntries: number;
}

// Stock types
export interface StockData {
  brickType: {
    id: string;
    size: string;
  };
  produced: number;
  dispatched: number;
  currentStock: number;
}

export interface RawMaterialStock {
  id: string;
  name: string;
  unit: string;
  stock: number;
}

export interface StockResponse {
  bricks: StockData[];
  materials: RawMaterialStock[];
}

// Dashboard types
export interface DashboardSummary {
  todayProduction: {
    quantity: number;
    count: number;
  };
  todayDispatch: {
    quantity: number;
    count: number;
  };
  todayExpenses: {
    amount: number;
    count: number;
  };
  readyStock: Array<{
    brickType: string;
    stock: number;
  }>;
  cashBalance: number;
  pendingPayments: number;
}

export interface FormMetadata {
  machines: Machine[];
  brickTypes: BrickType[];
  workers: Worker[];
  rawMaterials: RawMaterial[];
}
