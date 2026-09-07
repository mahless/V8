/**
 * Offline Storage Layer for V8 STANCE
 * 
 * Provides localStorage-based persistence for all application data,
 * a sync queue for pending operations when offline, and online/offline detection.
 */

// ── Storage Keys ──────────────────────────────────────────────────
const STORAGE_KEYS = {
  SERVICE_CATEGORIES: 'v8_service_categories',
  SERVICES: 'v8_services',
  PRODUCT_CATEGORIES: 'v8_product_categories',
  PRODUCTS: 'v8_products',
  VEHICLES: 'v8_vehicles',
  SALES: 'v8_sales',
  SALE_ITEMS: 'v8_sale_items',
  PAYMENTS: 'v8_payments',
  INVENTORY_MOVEMENTS: 'v8_inventory_movements',
  EXPENSE_CATEGORIES: 'v8_expense_categories',
  EXPENSES: 'v8_expenses',
  PROFILES: 'v8_profiles',
  SYNC_QUEUE: 'v8_sync_queue',
  LAST_SYNC: 'v8_last_sync_time',
} as const;

// ── Types ─────────────────────────────────────────────────────────
export interface SyncQueueItem {
  id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC_PROCESS_SALE' | 'RPC_CANCEL_SALE';
  payload: any;
  timestamp: string;
  retries: number;
}

export interface LocalDataSnapshot {
  Service_Categories: any[];
  Services: any[];
  Product_Categories: any[];
  Products: any[];
  Vehicles: any[];
  Sales: any[];
  Sale_Items: any[];
  Payments: any[];
  Inventory_Movements: any[];
  Expense_Categories: any[];
  Expenses: any[];
  Profiles: any[];
}

// ── Helpers ───────────────────────────────────────────────────────
function safeGetJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSetJSON(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[OfflineStorage] localStorage write failed:', e);
  }
}

// ── Online/Offline Detection ──────────────────────────────────────
export function isOnline(): boolean {
  return navigator.onLine;
}

// ── Save full API response to localStorage ────────────────────────
export function saveDataLocally(apiData: Record<string, any[]>): void {
  const mapping: Record<string, string> = {
    Service_Categories: STORAGE_KEYS.SERVICE_CATEGORIES,
    Services: STORAGE_KEYS.SERVICES,
    Product_Categories: STORAGE_KEYS.PRODUCT_CATEGORIES,
    Products: STORAGE_KEYS.PRODUCTS,
    Vehicles: STORAGE_KEYS.VEHICLES,
    Sales: STORAGE_KEYS.SALES,
    Sale_Items: STORAGE_KEYS.SALE_ITEMS,
    Payments: STORAGE_KEYS.PAYMENTS,
    Inventory_Movements: STORAGE_KEYS.INVENTORY_MOVEMENTS,
    Expense_Categories: STORAGE_KEYS.EXPENSE_CATEGORIES,
    Expenses: STORAGE_KEYS.EXPENSES,
    Profiles: STORAGE_KEYS.PROFILES,
  };

  for (const [apiKey, storageKey] of Object.entries(mapping)) {
    if (apiData[apiKey]) {
      safeSetJSON(storageKey, apiData[apiKey]);
    }
  }

  safeSetJSON(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
}

// ── Load all data from localStorage ───────────────────────────────
export function loadLocalData(): LocalDataSnapshot | null {
  // Check if we have any cached data at all
  const hasData = localStorage.getItem(STORAGE_KEYS.VEHICLES) !== null
    || localStorage.getItem(STORAGE_KEYS.SERVICES) !== null;

  if (!hasData) return null;

  return {
    Service_Categories: safeGetJSON(STORAGE_KEYS.SERVICE_CATEGORIES, []),
    Services: safeGetJSON(STORAGE_KEYS.SERVICES, []),
    Product_Categories: safeGetJSON(STORAGE_KEYS.PRODUCT_CATEGORIES, []),
    Products: safeGetJSON(STORAGE_KEYS.PRODUCTS, []),
    Vehicles: safeGetJSON(STORAGE_KEYS.VEHICLES, []),
    Sales: safeGetJSON(STORAGE_KEYS.SALES, []),
    Sale_Items: safeGetJSON(STORAGE_KEYS.SALE_ITEMS, []),
    Payments: safeGetJSON(STORAGE_KEYS.PAYMENTS, []),
    Inventory_Movements: safeGetJSON(STORAGE_KEYS.INVENTORY_MOVEMENTS, []),
    Expense_Categories: safeGetJSON(STORAGE_KEYS.EXPENSE_CATEGORIES, []),
    Expenses: safeGetJSON(STORAGE_KEYS.EXPENSES, []),
    Profiles: safeGetJSON(STORAGE_KEYS.PROFILES, []),
  };
}

// ── Update a specific table in localStorage ───────────────────────
export function updateLocalTable(tableName: string, data: any[]): void {
  const mapping: Record<string, string> = {
    Service_Categories: STORAGE_KEYS.SERVICE_CATEGORIES,
    Services: STORAGE_KEYS.SERVICES,
    Product_Categories: STORAGE_KEYS.PRODUCT_CATEGORIES,
    Products: STORAGE_KEYS.PRODUCTS,
    Vehicles: STORAGE_KEYS.VEHICLES,
    Sales: STORAGE_KEYS.SALES,
    Sale_Items: STORAGE_KEYS.SALE_ITEMS,
    Payments: STORAGE_KEYS.PAYMENTS,
    Inventory_Movements: STORAGE_KEYS.INVENTORY_MOVEMENTS,
    Expense_Categories: STORAGE_KEYS.EXPENSE_CATEGORIES,
    Expenses: STORAGE_KEYS.EXPENSES,
    Profiles: STORAGE_KEYS.PROFILES,
  };

  const key = mapping[tableName];
  if (key) {
    safeSetJSON(key, data);
  }
}

// ── Sync Queue Management ─────────────────────────────────────────
export function addToSyncQueue(
  action: SyncQueueItem['action'],
  payload: any
): void {
  const queue = getSyncQueue();
  const item: SyncQueueItem = {
    id: `sq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    action,
    payload,
    timestamp: new Date().toISOString(),
    retries: 0,
  };
  queue.push(item);
  safeSetJSON(STORAGE_KEYS.SYNC_QUEUE, queue);
}

export function getSyncQueue(): SyncQueueItem[] {
  return safeGetJSON<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
}

export function removeSyncQueueItem(id: string): void {
  const queue = getSyncQueue().filter(item => item.id !== id);
  safeSetJSON(STORAGE_KEYS.SYNC_QUEUE, queue);
}

export function updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): void {
  const queue = getSyncQueue().map(item =>
    item.id === id ? { ...item, ...updates } : item
  );
  safeSetJSON(STORAGE_KEYS.SYNC_QUEUE, queue);
}

export function clearSyncQueue(): void {
  safeSetJSON(STORAGE_KEYS.SYNC_QUEUE, []);
}

export function getSyncQueueCount(): number {
  return getSyncQueue().length;
}

// ── Last sync info ────────────────────────────────────────────────
export function getLastSyncTime(): string | null {
  return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
}
