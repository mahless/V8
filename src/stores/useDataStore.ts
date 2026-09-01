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
import { fetchAllData, sendAction } from '../lib/googleSheets';

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

interface DataStore {
  // Loading State
  isLoading: boolean;

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

  fetchInitialData: async () => {
    set({ isLoading: true });
    try {
      const response = await fetchAllData();
      if (!response.success || !response.data) throw new Error("Failed to load data from Sheets");

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
        currentRole: activeProfile ? activeProfile.role : get().currentRole
      });
    } catch (err) {
      console.error('Error fetching initial data from Google Sheets:', err);
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
    try {
      await sendAction('INSERT', { table: 'Vehicles', data: newVehicle });
      set({ vehicles: [newVehicle, ...get().vehicles] });
      return newVehicle;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  updateVehicle: async (id, data) => {
    const updatedData = { ...data, updated_at: new Date().toISOString() };
    await sendAction('UPDATE', { table: 'Vehicles', id, data: updatedData }).catch(console.error);
    set({
      vehicles: get().vehicles.map((v) => (v.id === id ? { ...v, ...updatedData } : v)),
    });
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
    await sendAction('INSERT', { table: 'Services', data: newService }).catch(console.error);
    set({ services: [...get().services, newService] });
  },

  updateService: async (id, data) => {
    const updatedData = { ...data, updated_at: new Date().toISOString() };
    await sendAction('UPDATE', { table: 'Services', id, data: updatedData }).catch(console.error);
    set({
      services: get().services.map((s) => (s.id === id ? { ...s, ...updatedData } : s)),
    });
  },

  deleteService: async (id) => {
    await sendAction('DELETE', { table: 'Services', id }).catch(console.error);
    set({ services: get().services.filter((s) => s.id !== id) });
  },

  toggleServiceActive: async (id) => {
    const srv = get().services.find((s) => s.id === id);
    if (!srv) return;
    const newStatus = !srv.is_active;
    await sendAction('UPDATE', { table: 'Services', id, data: { is_active: newStatus } }).catch(console.error);
    set({
      services: get().services.map((s) => (s.id === id ? { ...s, is_active: newStatus } : s)),
    });
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
    await sendAction('INSERT', { table: 'Products', data: newProduct }).catch(console.error);
    set({ products: [...get().products, newProduct] });
  },

  updateProduct: async (id, data) => {
    const updatedData = { ...data, updated_at: new Date().toISOString() };
    await sendAction('UPDATE', { table: 'Products', id, data: updatedData }).catch(console.error);
    set({
      products: get().products.map((p) => (p.id === id ? { ...p, ...updatedData } : p)),
    });
  },

  deleteProduct: async (id) => {
    await sendAction('DELETE', { table: 'Products', id }).catch(console.error);
    set({ products: get().products.filter((p) => p.id !== id) });
  },

  addStock: async (productId, quantity, purchasePrice, notes) => {
    const product = get().products.find((p) => p.id === productId);
    if (!product) return;
    const updatedStock = Number(product.current_stock) + quantity;
    const newPrice = purchasePrice > 0 ? purchasePrice : product.purchase_price;

    await sendAction('UPDATE', { table: 'Products', id: productId, data: { current_stock: updatedStock, purchase_price: newPrice, updated_at: new Date().toISOString() } });
    
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
    await sendAction('INSERT', { table: 'Inventory_Movements', data: mv });
    
    set({
      products: get().products.map((p) => (p.id === productId ? { ...p, current_stock: updatedStock, purchase_price: newPrice } : p)),
      inventoryMovements: [mv, ...get().inventoryMovements]
    });
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

      const res = await sendAction('RPC_PROCESS_SALE', {
        data: {
          sale: newSale,
          items: newItems,
          payment: newPayment,
          inventoryMovements
        }
      });

      if (!res.success) throw new Error(res.error);

      await get().fetchInitialData();
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

      const res = await sendAction('RPC_CANCEL_SALE', {
        data: {
          saleId,
          reason: fullReason,
          inventoryMovements
        }
      });
      
      if (!res.success) throw new Error(res.error);

      await get().fetchInitialData();
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
        await sendAction('INSERT', { table: 'Inventory_Movements', data: mv });
        
        const newStock = Math.max(0, Number(prod.current_stock) - expenseData.quantity);
        await sendAction('UPDATE', { table: 'Products', id: prod.id, data: { current_stock: newStock, updated_at: new Date().toISOString() }});
      }
    }
    
    await get().fetchInitialData();
  },

  addServiceCategory: async (name, description) => {
    const newCat = { id: generateId('scat'), name, description: description || '', is_active: true, created_at: new Date().toISOString() };
    await sendAction('INSERT', { table: 'Service_Categories', data: newCat });
    set({ serviceCategories: [...get().serviceCategories, newCat as any] });
  },

  addProductCategory: async (name, description) => {
    const newCat = { id: generateId('pcat'), name, description: description || '', is_active: true };
    await sendAction('INSERT', { table: 'Product_Categories', data: newCat });
    set({ productCategories: [...get().productCategories, newCat as any] });
  },

  addExpenseCategory: async (name) => {
    const newCat = { id: generateId('ecat'), name, is_active: true };
    await sendAction('INSERT', { table: 'Expense_Categories', data: newCat });
    set({ expenseCategories: [...get().expenseCategories, newCat as any] });
  },

  deleteServiceCategory: async (id) => {
    await sendAction('DELETE', { table: 'Service_Categories', id });
    set({ serviceCategories: get().serviceCategories.filter((c) => c.id !== id) });
  },

  deleteProductCategory: async (id) => {
    await sendAction('DELETE', { table: 'Product_Categories', id });
    set({ productCategories: get().productCategories.filter((c) => c.id !== id) });
  },

  deleteExpenseCategory: async (id) => {
    await sendAction('DELETE', { table: 'Expense_Categories', id });
    set({ expenseCategories: get().expenseCategories.filter((c) => c.id !== id) });
  },

  claimVipReward: async (vehicleId) => {
    const target = get().vehicles.find((v) => v.id === vehicleId);
    if (!target) return;
    const currentVisits = target.visits_count || 0;
    await sendAction('UPDATE', { table: 'Vehicles', id: vehicleId, data: { last_rewarded_visit_count: currentVisits } });
    set({
      vehicles: get().vehicles.map((v) =>
        v.id === vehicleId ? { ...v, last_rewarded_visit_count: currentVisits } : v
      ),
    });
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
    await sendAction('INSERT', { table: 'Profiles', data: newProfile });
    set({ profiles: [newProfile, ...get().profiles] });
  },

  updateEmployeeRole: async (id, role) => {
    await sendAction('UPDATE', { table: 'Profiles', id, data: { role, updated_at: new Date().toISOString() } });
    set({
      profiles: get().profiles.map((p) => (p.id === id ? { ...p, role } : p))
    });
  },

  toggleEmployeeActive: async (id) => {
    const target = get().profiles.find((p) => p.id === id);
    if (!target) return;
    const nextState = !target.is_active;
    await sendAction('UPDATE', { table: 'Profiles', id, data: { is_active: nextState, updated_at: new Date().toISOString() } });
    set({
      profiles: get().profiles.map((p) => (p.id === id ? { ...p, is_active: nextState } : p))
    });
  },

  deleteEmployee: async (id) => {
    await sendAction('DELETE', { table: 'Profiles', id });
    set({ profiles: get().profiles.filter((p) => p.id !== id) });
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
