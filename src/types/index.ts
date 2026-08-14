export type UserRole = 'MANAGER' | 'EMPLOYEE';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  phone?: string;
  pin_code?: string;
  created_at?: string;
  updated_at?: string;
}

export type PaymentMethod = 'CASH' | 'WALLET';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface Vehicle {
  id: string;
  plate_letters: string; // e.g. "س ب ج"
  plate_numbers: string; // e.g. "1234"
  plate_display: string; // e.g. "س ب ج 1234"
  driver_name: string;
  phone: string;
  notes?: string;
  visits_count?: number;
  last_rewarded_visit_count?: number;
  total_spent?: number;
  last_visit_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string; // "غسيل", "إكسسوارات", "عفشة"
  icon_name?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  name: string; // "فواحات", "معطرات", "مساحات", "مواد تنظيف", "زيوت", "قطع غيار"
  description?: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  unit: string; // "قطعة", "لتر", "علبة"
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  minimum_stock: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id?: string;
  sale_id?: string;
  item_type: 'SERVICE' | 'PRODUCT';
  service_id?: string;
  product_id?: string;
  item_name_snapshot: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Payment {
  id: string;
  sale_id: string;
  amount: number;
  payment_method: PaymentMethod;
  created_by?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  invoice_number: string;
  idempotency_key?: string;
  vehicle_id: string;
  vehicle?: Vehicle;
  employee_id?: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  status: 'COMPLETED' | 'CANCELLED';
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: SaleItem[];
  payment?: Payment;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  product_name?: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost?: number;
  reference_type?: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'SALE_CANCEL' | 'EXPENSE';
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Expense {
  id: string;
  category_id: string;
  category_name?: string;
  amount: number;
  description: string;
  product_id?: string;
  product_name?: string;
  quantity?: number;
  created_by?: string;
  created_at: string;
}

export interface ServiceProductRequirement {
  service_id: string;
  product_id: string;
  quantity_required: number;
}

export type NavigationTab = 
  | 'dashboard' 
  | 'pos' 
  | 'vehicles' 
  | 'services'
  | 'inventory' 
  | 'sales' 
  | 'reports' 
  | 'expenses'
  | 'settings';
