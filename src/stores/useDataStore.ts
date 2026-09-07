import { create } from 'zustand';
import { 
  Vehicle, 
  ServiceCategory, 
  Service, 
  ProductCategory, 
  Product, 
  Sale, 
  SaleItem, 
  Payment, 
  InventoryMovement, 
  ExpenseCategory, 
  Expense,
  PaymentMethod,
  Profile,
  UserRole
} from '../types';
import { fetchAllData, sendAction, syncPendingActions } from '../lib/googleSheets';
import { 
  updateLocalTable, 
  getSyncQueueCount, 
  isOnline as checkIsOnline, 
  getLastSyncTime,
  saveDataLocally
} from '../lib/offlineStorage';

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

interface DataStore {
  // Loading State
  isLoading: boolean;

  // Offline State
  pendingSyncCount: number;
  isOffline: boolean;
  lastSyncTime: string | null;
  isSyncing: boolean;

  // Master Collections
  serviceCategories: ServiceCategory[];
  services: Service[];
  productCategories: ProductCategory[];
  products: Product[];
  vehicles: Vehicle[];
  sales: Sale[];
  payments: Payment[];
  inventoryMovements: InventoryMovement[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
  profiles: Profile[];
  currentRole: UserRole;
  currentProfile: Profile | null;

  setCurrentRole: (role: UserRole) => void;
  loginWithPin: (profileId: string, pinCode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  addEmployee: (profileData: { full_name: string; role: UserRole; phone?: string; pin_code?: string }) => Promise<void>;
  updateEmployeeRole: (id: string, role: UserRole) => Promise<void>;
  toggleEmployeeActive: (id: string) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  // Fetch Action
  fetchInitialData: () => Promise<void>;

  // Sync Action
  syncPendingData: () => Promise<{ synced: number; failed: number; remaining: number }>;
  updateOnlineStatus: (online: boolean) => void;
  refreshSyncCount: () => void;

  // Data Actions
  addVehicle: (vehicleData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at' | 'visits_count' | 'total_spent'>) => Promise<Vehicle | null>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<void>;
  
  addService: (serviceData: Omit<Service, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateService: (id: string, data: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  toggleServiceActive: (id: string) => Promise<void>;

  addProduct: (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addStock: (productId: string, quantity: number, purchasePrice: number, notes?: string) => Promise<void>;

  createAtomicSale: (
    vehicleId: string,
    items: Array<{ type: 'SERVICE' | 'PRODUCT'; id: string; quantity: number; name?: string; price?: number }>,
    paymentMethod: PaymentMethod,
    notes?: string,
    idempotencyKey?: string,
    discountPercent?: number
  ) => Promise<{ success: boolean; saleId?: string; invoiceNumber?: string; error?: string }>;

  cancelAtomicSale: (
    saleId: string,
    reason?: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;

  addExpense: (expenseData: Omit<Expense, 'id' | 'created_at'>) => Promise<void>;

  addServiceCategory: (name: string, description?: string) => Promise<void>;
  deleteServiceCategory: (id: string) => Promise<void>;
  addProductCategory: (name: string, description?: string) => Promise<void>;
  deleteProductCategory: (id: string) => Promise<void>;
  addExpenseCategory: (name: string) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<void>;
  claimVipReward: (vehicleId: string) => Promise<void>;

  // Search & Filtering
  searchVehicles: (query: string) => Vehicle[];
  getVehicleById: (id: string) => Vehicle | undefined;
  getVehicleSalesHistory: (vehicleId: string) => Sale[];
}

export const useDataStore = create<DataStore>((set, get) => ({
  isLoading: false,

  // Offline state
  pendingSyncCount: getSyncQueueCount(),
  isOffline: !checkIsOnline(),
  lastSyncTime: getLastSyncTime(),
  isSyncing: false,

  serviceCategories: [],
  services: [],
  productCategories: [],
  products: [],
  vehicles: [],
  sales: [],
  payments: [],
  inventoryMovements: [],
  expenseCategories: [],
  expenses: [],
  profiles: [],
  currentRole: 'MANAGER',
  currentProfile: null,

  setCurrentRole: (role) => set({ currentRole: role }),

  loginWithPin: async (profileId: string, pinCode: string) => {
    const allProfiles = get().profiles;
    const target = allProfiles.find((p) => p.id === profileId);

    if (!target) return { success: false, error: 'الموظف غير موجود في النظام' };
    if (!target.is_active) return { success: false, error: 'هذا الحساب موقوف حالياً، يرجى مراجعة المدير' };

    const validPin = target.pin_code || '1234';
    if (pinCode.trim() !== String(validPin).trim()) return { success: false, error: 'رمز الدخول (PIN) غير صحيح' };

    localStorage.setItem('v8_active_employee_id', target.id);
    set({
      currentProfile: target,
      currentRole: target.role
    });

    return { success: true };
  },

  logout: () => {
    localStorage.removeItem('v8_active_employee_id');
    set({
      currentProfile: null,
      currentRole: 'EMPLOYEE'
    });
  },

  updateOnlineStatus: (online) => set({ isOffline: !online }),

  refreshSyncCount: () => set({ pendingSyncCount: getSyncQueueCount() }),

  syncPendingData: async () => {
    set({ isSyncing: true });
    try {
      const result = await syncPendingActions();
      set({ 
        pendingSyncCount: result.remaining,
        lastSyncTime: result.synced > 0 ? new Date().toISOString() : get().lastSyncTime
      });
      // Re-fetch fresh data from server after successful sync
      if (result.synced > 0 && checkIsOnline()) {
        await get().fetchInitialData();
      }
      return result;
    } finally {
      set({ isSyncing: false });
    }
  },

  fetchInitialData: async () => {
    set({ isLoading: true, isOffline: !checkIsOnline() });
    try {
      const response = await fetchAllData();
      if (!response.success || !response.data) {
        console.warn('Failed to load data — no API and no cache available');
        return;
      }

      const d = response.data;
      
      const sCategories = d.Service_Categories || [];
      const servicesData = d.Services || [];
      const pCategories = d.Product_Categories || [];
      const productsData = d.Products || [];
      const vehiclesData = d.Vehicles || [];
      const salesData = d.Sales || [];
      const saleItemsData = d.Sale_Items || [];
      const paymentsData = d.Payments || [];
      const movementsData = d.Inventory_Movements || [];
      const eCategories = d.Expense_Categories || [];
      const expensesData = d.Expenses || [];
      const profilesData = d.Profiles || [];

      // Parse arrays safely
      const parseBool = (v: any) => v === true || v === 'TRUE' || v === 'true';
      const parseNum = (v: any) => Number(v) || 0;

      const formattedVehicles: Vehicle[] = vehiclesData.map((v: any) => ({
        id: v.id,
        plate_letters: v.plate_letters,
        plate_numbers: v.plate_numbers,
        plate_display: v.plate_display,
        driver_name: v.driver_name,
        phone: String(v.phone || ''),
        notes: v.notes || '',
        visits_count: parseNum(v.visits_count),
        last_rewarded_visit_count: parseNum(v.last_rewarded_visit_count),
        total_spent: parseNum(v.total_spent),
        last_visit_at: v.last_visit_at,
        created_at: v.created_at,
        updated_at: v.updated_at
      }));

      const itemsMap = new Map<string, SaleItem[]>();
      saleItemsData.forEach((item: any) => {
        const list = itemsMap.get(item.sale_id) || [];
        list.push({
          id: item.id,
          sale_id: item.sale_id,
          item_type: item.item_type,
          service_id: item.service_id,
          product_id: item.product_id,
          item_name_snapshot: item.item_name_snapshot,
          quantity: parseNum(item.quantity),
          unit_price: parseNum(item.unit_price),
          total: parseNum(item.total)
        });
        itemsMap.set(item.sale_id, list);
      });

      const paymentsMap = new Map<string, Payment>();
      paymentsData.forEach((p: any) => {
        paymentsMap.set(p.sale_id, {
          id: p.id,
          sale_id: p.sale_id,
          amount: parseNum(p.amount),
          payment_method: p.payment_method,
          created_at: p.created_at,
          created_by: p.created_by
        });
      });

      const formattedSales: Sale[] = salesData.map((s: any) => {
        const vehicleObj = formattedVehicles.find((v) => v.id === s.vehicle_id);
        return {
          id: s.id,
          invoice_number: s.invoice_number,
          idempotency_key: s.idempotency_key,
          vehicle_id: s.vehicle_id,
          vehicle: vehicleObj,
          employee_id: s.employee_id,
          subtotal: parseNum(s.subtotal),
          discount: parseNum(s.discount),
          total: parseNum(s.total),
          payment_method: s.payment_method,
          status: s.status,
          notes: s.notes,
          created_at: s.created_at,
          updated_at: s.updated_at,
          items: itemsMap.get(s.id) || [],
          payment: paymentsMap.get(s.id)
        };
      });

      const savedEmpId = localStorage.getItem('v8_active_employee_id');
      const activeProfile = profilesData.find((p: any) => p.id === savedEmpId && parseBool(p.is_active)) || null;

      set({
        serviceCategories: sCategories,
        services: servicesData,
        productCategories: pCategories,
        products: productsData,
        vehicles: formattedVehicles,
        sales: formattedSales,
        payments: paymentsData,
        inventoryMovements: movementsData,
        expenseCategories: eCategories,
        expenses: expensesData,
        profiles: profilesData,
        currentProfile: activeProfile,
        currentRole: activeProfile ? activeProfile.role : get().currentRole,
        pendingSyncCount: getSyncQueueCount(),
        lastSyncTime: getLastSyncTime(),
      });
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  addVehicle: async (vehicleData) => {
    const newVehicle: Vehicle = {
      id: generateId('veh'),
      plate_letters: vehicleData.plate_letters,
      plate_numbers: vehicleData.plate_numbers,
      plate_display: vehicleData.plate_display,
      driver_name: vehicleData.driver_name,
      phone: vehicleData.phone,
      notes: vehicleData.notes || '',
      visits_count: 0,
      last_rewarded_visit_count: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    // Update local state immediately (optimistic)
    const updatedVehicles = [newVehicle, ...get().vehicles];
    set({ vehicles: updatedVehicles });
    updateLocalTable('Vehicles', updatedVehicles);
    // Send to API (queued if offline)
    await sendAction('INSERT', { table: 'Vehicles', data: newVehicle });
    set({ pendingSyncCount: getSyncQueueCount() });
    return newVehicle;
  },

  updateVehicle: async (id, data) => {
    const updatedData = { ...data, updated_at: new Date().toISOString() };
    const updatedVehicles = get().vehicles.map((v) => (v.id === id ? { ...v, ...updatedData } : v));
    set({ vehicles: updatedVehicles });
    updateLocalTable('Vehicles', updatedVehicles);
    await sendAction('UPDATE', { table: 'Vehicles', id, data: updatedData });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  addService: async (serviceData) => {
    const newService: Service = {
      id: generateId('srv'),
      category_id: serviceData.category_id || '',
      name: serviceData.name,
      description: serviceData.description || '',
      price: serviceData.price,
      is_active: serviceData.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const updatedServices = [...get().services, newService];
    set({ services: updatedServices });
    updateLocalTable('Services', updatedServices);
    await sendAction('INSERT', { table: 'Services', data: newService });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  updateService: async (id, data) => {
    const updatedData = { ...data, updated_at: new Date().toISOString() };
    const updatedServices = get().services.map((s) => (s.id === id ? { ...s, ...updatedData } : s));
    set({ services: updatedServices });
    updateLocalTable('Services', updatedServices);
    await sendAction('UPDATE', { table: 'Services', id, data: updatedData });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  deleteService: async (id) => {
    const updatedServices = get().services.filter((s) => s.id !== id);
    set({ services: updatedServices });
    updateLocalTable('Services', updatedServices);
    await sendAction('DELETE', { table: 'Services', id });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  toggleServiceActive: async (id) => {
    const srv = get().services.find((s) => s.id === id);
    if (!srv) return;
    const newStatus = !srv.is_active;
    const updatedServices = get().services.map((s) => (s.id === id ? { ...s, is_active: newStatus } : s));
    set({ services: updatedServices });
    updateLocalTable('Services', updatedServices);
    await sendAction('UPDATE', { table: 'Services', id, data: { is_active: newStatus } });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  addProduct: async (productData) => {
    const newProduct: Product = {
      id: generateId('prod'),
      category_id: productData.category_id || '',
      name: productData.name,
      sku: productData.sku || '',
      unit: productData.unit || 'قطعة',
      purchase_price: productData.purchase_price || 0,
      selling_price: productData.selling_price,
      current_stock: productData.current_stock || 0,
      minimum_stock: productData.minimum_stock || 5,
      is_active: productData.is_active ?? true,
      notes: productData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const updatedProducts = [...get().products, newProduct];
    set({ products: updatedProducts });
    updateLocalTable('Products', updatedProducts);
    await sendAction('INSERT', { table: 'Products', data: newProduct });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  updateProduct: async (id, data) => {
    const updatedData = { ...data, updated_at: new Date().toISOString() };
    const updatedProducts = get().products.map((p) => (p.id === id ? { ...p, ...updatedData } : p));
    set({ products: updatedProducts });
    updateLocalTable('Products', updatedProducts);
    await sendAction('UPDATE', { table: 'Products', id, data: updatedData });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  deleteProduct: async (id) => {
    const updatedProducts = get().products.filter((p) => p.id !== id);
    set({ products: updatedProducts });
    updateLocalTable('Products', updatedProducts);
    await sendAction('DELETE', { table: 'Products', id });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  addStock: async (productId, quantity, purchasePrice, notes) => {
    const product = get().products.find((p) => p.id === productId);
    if (!product) return;
    const updatedStock = Number(product.current_stock) + quantity;
    const newPrice = purchasePrice > 0 ? purchasePrice : product.purchase_price;
    
    const mv: InventoryMovement = {
      id: generateId('mv'),
      product_id: productId,
      movement_type: 'IN',
      quantity,
      unit_cost: newPrice,
      reference_type: 'PURCHASE',
      notes: notes || 'إضافة شحنة بضاعة للمخزن',
      created_by: get().currentProfile?.id || '',
      created_at: new Date().toISOString()
    };

    // Update local state first
    const updatedProducts = get().products.map((p) => (p.id === productId ? { ...p, current_stock: updatedStock, purchase_price: newPrice } : p));
    const updatedMovements = [mv, ...get().inventoryMovements];
    set({ products: updatedProducts, inventoryMovements: updatedMovements });
    updateLocalTable('Products', updatedProducts);
    updateLocalTable('Inventory_Movements', updatedMovements);

    // Send to API
    await sendAction('UPDATE', { table: 'Products', id: productId, data: { current_stock: updatedStock, purchase_price: newPrice, updated_at: new Date().toISOString() } });
    await sendAction('INSERT', { table: 'Inventory_Movements', data: mv });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  createAtomicSale: async (vehicleId, rawItems, paymentMethod, notes, idempotencyKey, discountPercent = 0) => {
    try {
      const ik = idempotencyKey || generateId('ik');
      const currentProf = get().currentProfile;
      const empPrefix = currentProf ? `[الموظف: ${currentProf.full_name}] ` : '';
      const fullNotes = empPrefix + (notes || '');
      
      const saleId = generateId('sale');
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      
      const newItems: SaleItem[] = [];
      let subtotal = 0;
      const inventoryMovements: InventoryMovement[] = [];
      
      rawItems.forEach(item => {
        let price = item.price || 0;
        let name = item.name || '';
        if (item.type === 'SERVICE') {
          const s = get().services.find(s => s.id === item.id);
          if (s) { price = s.price; name = s.name; }
        } else {
          const p = get().products.find(p => p.id === item.id);
          if (p) { 
            price = p.selling_price; 
            name = p.name;
            inventoryMovements.push({
              id: generateId('mv'),
              product_id: item.id,
              movement_type: 'OUT',
              quantity: item.quantity,
              unit_cost: p.purchase_price,
              reference_type: 'SALE',
              reference_id: saleId,
              notes: 'مبيعات فاتورة ' + invoiceNumber,
              created_by: currentProf?.id || '',
              created_at: new Date().toISOString()
            });
          }
        }
        
        const lineTotal = price * item.quantity;
        subtotal += lineTotal;
        
        newItems.push({
          id: generateId('si'),
          sale_id: saleId,
          item_type: item.type,
          service_id: item.type === 'SERVICE' ? item.id : '',
          product_id: item.type === 'PRODUCT' ? item.id : '',
          item_name_snapshot: name,
          quantity: item.quantity,
          unit_price: price,
          total: lineTotal
        });
      });

      const discount = (subtotal * discountPercent) / 100;
      const total = subtotal - discount;

      const newSale: Sale = {
        id: saleId,
        invoice_number: invoiceNumber,
        idempotency_key: ik,
        vehicle_id: vehicleId,
        employee_id: currentProf?.id || '',
        subtotal,
        discount,
        total,
        payment_method: paymentMethod,
        status: 'COMPLETED',
        notes: fullNotes.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newPayment: Payment = {
        id: generateId('pay'),
        sale_id: saleId,
        amount: total,
        payment_method: paymentMethod,
        created_by: currentProf?.id || '',
        created_at: new Date().toISOString()
      };

      // Update local state immediately (optimistic)
      const updatedSales = [{ ...newSale, items: newItems, payment: newPayment }, ...get().sales];
      const updatedProducts = get().products.map(p => {
        const mv = inventoryMovements.find(m => m.product_id === p.id);
        if (mv) {
          return { ...p, current_stock: Math.max(0, Number(p.current_stock) - mv.quantity) };
        }
        return p;
      });
      const updatedVehicles = get().vehicles.map(v => {
        if (v.id === vehicleId) {
          return {
            ...v,
            visits_count: (v.visits_count || 0) + 1,
            total_spent: (v.total_spent || 0) + total,
            last_visit_at: newSale.created_at,
            updated_at: newSale.created_at
          };
        }
        return v;
      });
      const updatedMovements = [...inventoryMovements, ...get().inventoryMovements];
      const updatedPayments = [newPayment, ...get().payments];

      set({
        sales: updatedSales,
        products: updatedProducts,
        vehicles: updatedVehicles,
        inventoryMovements: updatedMovements,
        payments: updatedPayments,
      });
      updateLocalTable('Sales', updatedSales);
      updateLocalTable('Products', updatedProducts);
      updateLocalTable('Vehicles', updatedVehicles);
      updateLocalTable('Inventory_Movements', updatedMovements);
      updateLocalTable('Payments', updatedPayments);
      updateLocalTable('Sale_Items', [...newItems, ...(get().sales.flatMap(s => s.items || []))]);

      // Send to API (queued if offline)
      await sendAction('RPC_PROCESS_SALE', {
        data: {
          sale: newSale,
          items: newItems,
          payment: newPayment,
          inventoryMovements
        }
      });
      set({ pendingSyncCount: getSyncQueueCount() });

      return { success: true, saleId, invoiceNumber };
    } catch(err: any) {
      return { success: false, error: err.message };
    }
  },

  cancelAtomicSale: async (saleId, reason) => {
    try {
      const currentProf = get().currentProfile;
      const empName = currentProf ? currentProf.full_name : 'المدير العام';
      const fullReason = `[إلغاء بواسطة الموظف: ${empName}] ${reason || 'إلغاء عملية البيع'}`;
      
      // Find sale and items to revert stock
      const sale = get().sales.find(s => s.id === saleId);
      if (!sale) throw new Error("Sale not found");
      
      const inventoryMovements: InventoryMovement[] = [];
      
      sale.items?.forEach(item => {
        if (item.item_type === 'PRODUCT' && item.product_id) {
           const p = get().products.find(p => p.id === item.product_id);
           inventoryMovements.push({
              id: generateId('mv'),
              product_id: item.product_id,
              movement_type: 'RETURN',
              quantity: item.quantity,
              unit_cost: p?.purchase_price || 0,
              reference_type: 'SALE_CANCEL',
              reference_id: saleId,
              notes: fullReason,
              created_by: currentProf?.id || '',
              created_at: new Date().toISOString()
           });
        }
      });

      // Update local state immediately
      const updatedSales = get().sales.map(s => 
        s.id === saleId ? { ...s, status: 'CANCELLED' as const, notes: (s.notes || '') + '\n' + fullReason } : s
      );
      const updatedProducts = get().products.map(p => {
        const mv = inventoryMovements.find(m => m.product_id === p.id);
        if (mv) {
          return { ...p, current_stock: Number(p.current_stock) + mv.quantity };
        }
        return p;
      });
      const updatedVehicles = get().vehicles.map(v => {
        if (v.id === sale.vehicle_id) {
          return {
            ...v,
            visits_count: Math.max(0, (v.visits_count || 0) - 1),
            total_spent: Math.max(0, (v.total_spent || 0) - sale.total),
          };
        }
        return v;
      });
      const updatedMovements = [...inventoryMovements, ...get().inventoryMovements];

      set({
        sales: updatedSales,
        products: updatedProducts,
        vehicles: updatedVehicles,
        inventoryMovements: updatedMovements,
      });
      updateLocalTable('Sales', updatedSales);
      updateLocalTable('Products', updatedProducts);
      updateLocalTable('Vehicles', updatedVehicles);
      updateLocalTable('Inventory_Movements', updatedMovements);

      // Send to API (queued if offline)
      await sendAction('RPC_CANCEL_SALE', {
        data: {
          saleId,
          reason: fullReason,
          inventoryMovements
        }
      });
      set({ pendingSyncCount: getSyncQueueCount() });

      return { success: true, message: 'تم إلغاء الفاتورة واسترجاع المنتجات بنجاح' };
    } catch(err: any) {
      return { success: false, error: err.message };
    }
  },

  addExpense: async (expenseData) => {
    const currentProf = get().currentProfile;
    const empName = currentProf ? currentProf.full_name : 'المدير العام';
    const noteWithUser = `[الموظف: ${empName}] ${expenseData.description}`;
    
    const newExpense: Expense = {
      id: generateId('exp'),
      category_id: expenseData.category_id || '',
      amount: expenseData.amount,
      description: noteWithUser,
      product_id: expenseData.product_id || '',
      quantity: expenseData.quantity || 0,
      created_by: currentProf?.id || '',
      created_at: new Date().toISOString()
    };

    // Update local state first
    const updatedExpenses = [newExpense, ...get().expenses];
    set({ expenses: updatedExpenses });
    updateLocalTable('Expenses', updatedExpenses);
    
    await sendAction('INSERT', { table: 'Expenses', data: newExpense });
    
    if (expenseData.product_id && expenseData.quantity && expenseData.quantity > 0) {
      const prod = get().products.find(p => p.id === expenseData.product_id);
      if (prod) {
        const mv: InventoryMovement = {
          id: generateId('mv'),
          product_id: prod.id,
          movement_type: 'OUT',
          quantity: expenseData.quantity,
          unit_cost: prod.purchase_price,
          reference_type: 'EXPENSE',
          reference_id: newExpense.id,
          notes: noteWithUser,
          created_by: currentProf?.id || '',
          created_at: new Date().toISOString()
        };
        
        const newStock = Math.max(0, Number(prod.current_stock) - expenseData.quantity);
        const updatedProducts = get().products.map(p => p.id === prod.id ? { ...p, current_stock: newStock } : p);
        const updatedMovements = [mv, ...get().inventoryMovements];
        set({ products: updatedProducts, inventoryMovements: updatedMovements });
        updateLocalTable('Products', updatedProducts);
        updateLocalTable('Inventory_Movements', updatedMovements);

        await sendAction('INSERT', { table: 'Inventory_Movements', data: mv });
        await sendAction('UPDATE', { table: 'Products', id: prod.id, data: { current_stock: newStock, updated_at: new Date().toISOString() }});
      }
    }
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  addServiceCategory: async (name, description) => {
    const newCat = { id: generateId('scat'), name, description: description || '', is_active: true, created_at: new Date().toISOString() };
    const updated = [...get().serviceCategories, newCat as any];
    set({ serviceCategories: updated });
    updateLocalTable('Service_Categories', updated);
    await sendAction('INSERT', { table: 'Service_Categories', data: newCat });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  addProductCategory: async (name, description) => {
    const newCat = { id: generateId('pcat'), name, description: description || '', is_active: true };
    const updated = [...get().productCategories, newCat as any];
    set({ productCategories: updated });
    updateLocalTable('Product_Categories', updated);
    await sendAction('INSERT', { table: 'Product_Categories', data: newCat });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  addExpenseCategory: async (name) => {
    const newCat = { id: generateId('ecat'), name, is_active: true };
    const updated = [...get().expenseCategories, newCat as any];
    set({ expenseCategories: updated });
    updateLocalTable('Expense_Categories', updated);
    await sendAction('INSERT', { table: 'Expense_Categories', data: newCat });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  deleteServiceCategory: async (id) => {
    const updated = get().serviceCategories.filter((c) => c.id !== id);
    set({ serviceCategories: updated });
    updateLocalTable('Service_Categories', updated);
    await sendAction('DELETE', { table: 'Service_Categories', id });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  deleteProductCategory: async (id) => {
    const updated = get().productCategories.filter((c) => c.id !== id);
    set({ productCategories: updated });
    updateLocalTable('Product_Categories', updated);
    await sendAction('DELETE', { table: 'Product_Categories', id });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  deleteExpenseCategory: async (id) => {
    const updated = get().expenseCategories.filter((c) => c.id !== id);
    set({ expenseCategories: updated });
    updateLocalTable('Expense_Categories', updated);
    await sendAction('DELETE', { table: 'Expense_Categories', id });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  claimVipReward: async (vehicleId) => {
    const target = get().vehicles.find((v) => v.id === vehicleId);
    if (!target) return;
    const currentVisits = target.visits_count || 0;
    const updatedVehicles = get().vehicles.map((v) =>
      v.id === vehicleId ? { ...v, last_rewarded_visit_count: currentVisits } : v
    );
    set({ vehicles: updatedVehicles });
    updateLocalTable('Vehicles', updatedVehicles);
    await sendAction('UPDATE', { table: 'Vehicles', id: vehicleId, data: { last_rewarded_visit_count: currentVisits } });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  addEmployee: async (profileData) => {
    const newProfile: Profile = {
      id: generateId('prof'),
      full_name: profileData.full_name,
      role: profileData.role,
      phone: profileData.phone || '',
      pin_code: profileData.pin_code || '1234',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const updated = [newProfile, ...get().profiles];
    set({ profiles: updated });
    updateLocalTable('Profiles', updated);
    await sendAction('INSERT', { table: 'Profiles', data: newProfile });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  updateEmployeeRole: async (id, role) => {
    const updated = get().profiles.map((p) => (p.id === id ? { ...p, role } : p));
    set({ profiles: updated });
    updateLocalTable('Profiles', updated);
    await sendAction('UPDATE', { table: 'Profiles', id, data: { role, updated_at: new Date().toISOString() } });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  toggleEmployeeActive: async (id) => {
    const target = get().profiles.find((p) => p.id === id);
    if (!target) return;
    const nextState = !target.is_active;
    const updated = get().profiles.map((p) => (p.id === id ? { ...p, is_active: nextState } : p));
    set({ profiles: updated });
    updateLocalTable('Profiles', updated);
    await sendAction('UPDATE', { table: 'Profiles', id, data: { is_active: nextState, updated_at: new Date().toISOString() } });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  deleteEmployee: async (id) => {
    const updated = get().profiles.filter((p) => p.id !== id);
    set({ profiles: updated });
    updateLocalTable('Profiles', updated);
    await sendAction('DELETE', { table: 'Profiles', id });
    set({ pendingSyncCount: getSyncQueueCount() });
  },

  searchVehicles: (query) => {
    if (!query.trim()) return get().vehicles;
    const q = query.trim().toLowerCase();
    return get().vehicles.filter(
      (v) =>
        String(v.plate_display || '').toLowerCase().includes(q) ||
        String(v.plate_letters || '').toLowerCase().includes(q) ||
        String(v.plate_numbers || '').includes(q) ||
        String(v.phone || '').includes(q) ||
        String(v.driver_name || '').toLowerCase().includes(q)
    );
  },

  getVehicleById: (id) => get().vehicles.find((v) => v.id === id),

  getVehicleSalesHistory: (vehicleId) =>
    get().sales.filter((s) => s.vehicle_id === vehicleId),
}));
