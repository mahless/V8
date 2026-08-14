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
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

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
    items: Array<{ type: 'SERVICE' | 'PRODUCT'; id: string; quantity: number }>,
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

  // Completely emptied local mock data - starts blank until fetched from Supabase
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

    if (!target) {
      return { success: false, error: 'الموظف غير موجود في النظام' };
    }

    if (!target.is_active) {
      return { success: false, error: 'هذا الحساب موقوف حالياً، يرجى مراجعة المدير' };
    }

    const validPin = target.pin_code || '1234';
    if (pinCode.trim() !== validPin.trim()) {
      return { success: false, error: 'رمز الدخول (PIN) غير صحيح' };
    }

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
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase is not configured. Local data is empty.');
      return;
    }

    set({ isLoading: true });
    try {
      // 1. Fetch Categories, Services, Employees & Data
      const [
        { data: sCategories },
        { data: servicesData },
        { data: pCategories },
        { data: productsData },
        { data: vehiclesData },
        { data: salesData },
        { data: saleItemsData },
        { data: paymentsData },
        { data: movementsData },
        { data: eCategories },
        { data: expensesData },
        { data: profilesData }
      ] = await Promise.all([
        supabase.from('service_categories').select('*').order('name'),
        supabase.from('services').select('*').order('name'),
        supabase.from('product_categories').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
        supabase.from('vehicles_with_stats').select('*').order('created_at', { ascending: false }),
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('sale_items').select('*'),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }),
        supabase.from('expense_categories').select('*').order('name'),
        supabase.from('expenses').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false })
      ]);

      const formattedVehicles: Vehicle[] = (vehiclesData || []).map((v) => ({
        id: v.id,
        plate_letters: v.plate_letters,
        plate_numbers: v.plate_numbers,
        plate_display: v.plate_display,
        driver_name: v.driver_name,
        phone: v.phone,
        notes: v.notes || '',
        visits_count: v.visits_count || 0,
        last_rewarded_visit_count: v.last_rewarded_visit_count || 0,
        total_spent: v.total_spent || 0,
        last_visit_at: v.last_visit_at,
        created_at: v.created_at,
        updated_at: v.updated_at
      }));

      const itemsMap = new Map<string, SaleItem[]>();
      (saleItemsData || []).forEach((item) => {
        const list = itemsMap.get(item.sale_id) || [];
        list.push({
          id: item.id,
          sale_id: item.sale_id,
          item_type: item.item_type,
          service_id: item.service_id,
          product_id: item.product_id,
          item_name_snapshot: item.item_name_snapshot,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        });
        itemsMap.set(item.sale_id, list);
      });

      const paymentsMap = new Map<string, Payment>();
      (paymentsData || []).forEach((p) => {
        paymentsMap.set(p.sale_id, {
          id: p.id,
          sale_id: p.sale_id,
          amount: p.amount,
          payment_method: p.payment_method,
          created_at: p.created_at
        });
      });

      const formattedSales: Sale[] = (salesData || []).map((s) => {
        const vehicleObj = formattedVehicles.find((v) => v.id === s.vehicle_id);
        return {
          id: s.id,
          invoice_number: s.invoice_number,
          idempotency_key: s.idempotency_key,
          vehicle_id: s.vehicle_id,
          vehicle: vehicleObj,
          subtotal: s.subtotal,
          discount: s.discount,
          total: s.total,
          payment_method: s.payment_method,
          status: s.status,
          notes: s.notes,
          created_at: s.created_at,
          updated_at: s.updated_at,
          items: itemsMap.get(s.id) || [],
          payment: paymentsMap.get(s.id)
        };
      });

      const loadedProfiles = profilesData || [];
      const savedEmpId = localStorage.getItem('v8_active_employee_id');
      const activeProfile = loadedProfiles.find((p) => p.id === savedEmpId && p.is_active) || null;

      set({
        serviceCategories: sCategories || [],
        services: servicesData || [],
        productCategories: pCategories || [],
        products: productsData || [],
        vehicles: formattedVehicles,
        sales: formattedSales,
        payments: paymentsData || [],
        inventoryMovements: movementsData || [],
        expenseCategories: eCategories || [],
        expenses: expensesData || [],
        profiles: loadedProfiles,
        currentProfile: activeProfile,
        currentRole: activeProfile ? activeProfile.role : get().currentRole
      });
    } catch (err) {
      console.error('Error fetching initial data from Supabase:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  addVehicle: async (vehicleData) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('vehicles')
        .insert([{
          plate_letters: vehicleData.plate_letters,
          plate_numbers: vehicleData.plate_numbers,
          plate_display: vehicleData.plate_display,
          driver_name: vehicleData.driver_name,
          phone: vehicleData.phone,
          notes: vehicleData.notes || null
        }])
        .select('*')
        .single();

      if (error) {
        console.error('Failed to insert vehicle into Supabase:', error);
        throw new Error(error.message);
      }

      const newVehicle: Vehicle = {
        id: data.id,
        plate_letters: data.plate_letters,
        plate_numbers: data.plate_numbers,
        plate_display: data.plate_display,
        driver_name: data.driver_name,
        phone: data.phone,
        notes: data.notes || '',
        visits_count: 0,
        total_spent: 0,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      set({ vehicles: [newVehicle, ...get().vehicles] });
      return newVehicle;
    }
    return null;
  },

  updateVehicle: async (id, data) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('vehicles')
        .update(data)
        .eq('id', id);

      if (error) {
        console.error('Failed to update vehicle in Supabase:', error);
        return;
      }
    }

    set({
      vehicles: get().vehicles.map((v) => (v.id === id ? { ...v, ...data, updated_at: new Date().toISOString() } : v)),
    });
  },

  addService: async (serviceData) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('services')
        .insert([{
          category_id: serviceData.category_id || null,
          name: serviceData.name,
          description: serviceData.description || null,
          price: serviceData.price,
          is_active: serviceData.is_active ?? true
        }])
        .select('*')
        .single();

      if (error) {
        console.error('Failed to add service to Supabase:', error);
        throw new Error(error.message);
      }

      if (data) {
        set({ services: [...get().services, data] });
      }
    }
  },

  updateService: async (id, data) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('services').update(data).eq('id', id);
      if (error) console.error('Error updating service:', error);
    }
    set({
      services: get().services.map((s) => (s.id === id ? { ...s, ...data, updated_at: new Date().toISOString() } : s)),
    });
  },

  deleteService: async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) console.error('Error deleting service:', error);
    }
    set({
      services: get().services.filter((s) => s.id !== id),
    });
  },

  toggleServiceActive: async (id) => {
    const srv = get().services.find((s) => s.id === id);
    if (!srv) return;
    const newStatus = !srv.is_active;

    if (isSupabaseConfigured && supabase) {
      await supabase.from('services').update({ is_active: newStatus }).eq('id', id);
    }
    set({
      services: get().services.map((s) => (s.id === id ? { ...s, is_active: newStatus } : s)),
    });
  },

  addProduct: async (productData) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          category_id: productData.category_id || null,
          name: productData.name,
          sku: productData.sku || null,
          unit: productData.unit || 'قطعة',
          purchase_price: productData.purchase_price || 0,
          selling_price: productData.selling_price,
          current_stock: productData.current_stock || 0,
          minimum_stock: productData.minimum_stock || 5,
          is_active: productData.is_active ?? true,
          notes: productData.notes || null
        }])
        .select('*')
        .single();

      if (error) {
        console.error('Failed to add product to Supabase:', error);
        throw new Error(error.message);
      }

      if (data) {
        set({ products: [...get().products, data] });
      }
    }
  },

  updateProduct: async (id, data) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('products').update(data).eq('id', id);
      if (error) console.error('Error updating product:', error);
    }
    set({
      products: get().products.map((p) => (p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p)),
    });
  },

  deleteProduct: async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) console.error('Error deleting product:', error);
    }
    set({
      products: get().products.filter((p) => p.id !== id),
    });
  },

  addStock: async (productId, quantity, purchasePrice, notes) => {
    const product = get().products.find((p) => p.id === productId);
    if (!product) return;

    if (isSupabaseConfigured && supabase) {
      const updatedStock = product.current_stock + quantity;
      const { error: stockErr } = await supabase
        .from('products')
        .update({
          current_stock: updatedStock,
          purchase_price: purchasePrice > 0 ? purchasePrice : product.purchase_price,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (stockErr) console.error('Error adding stock to Supabase:', stockErr);

      const { data: mvData } = await supabase
        .from('inventory_movements')
        .insert([{
          product_id: productId,
          movement_type: 'IN',
          quantity,
          unit_cost: purchasePrice,
          reference_type: 'PURCHASE',
          notes: notes || 'إضافة شحنة بضاعة للمخزن'
        }])
        .select('*')
        .single();

      if (mvData) {
        set({
          products: get().products.map((p) => (p.id === productId ? { ...p, current_stock: updatedStock, purchase_price: purchasePrice > 0 ? purchasePrice : p.purchase_price } : p)),
          inventoryMovements: [mvData, ...get().inventoryMovements]
        });
        return;
      }
    }
  },

  // POS Sale Execution via Supabase Atomic RPC
  createAtomicSale: async (vehicleId, rawItems, paymentMethod, notes, idempotencyKey, discountPercent = 0) => {
    const ik = idempotencyKey || `ik_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('process_pos_sale', {
          p_vehicle_id: vehicleId,
          p_items: rawItems,
          p_payment_method: paymentMethod,
          p_notes: notes || null,
          p_idempotency_key: ik,
          p_discount_percent: discountPercent || 0
        });

        if (error) {
          console.error('Supabase RPC process_pos_sale Error:', error);
          return { success: false, error: error.message };
        }

        if (data && data.success) {
          // Refresh store data from Supabase to sync vehicle stats, stock, and sales
          await get().fetchInitialData();
          return {
            success: true,
            saleId: data.sale_id,
            invoiceNumber: data.invoice_number
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء تنفيذ عملية البيع';
        return { success: false, error: msg };
      }
    }

    return { success: false, error: 'غير متصل بقاعدة بيانات Supabase' };
  },

  // POS Sale Cancellation via Supabase Atomic RPC
  cancelAtomicSale: async (saleId, reason) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('cancel_pos_sale', {
          p_sale_id: saleId,
          p_reason: reason || 'إلغاء عملية البيع'
        });

        if (error) {
          console.error('Supabase RPC cancel_pos_sale Error:', error);
          return { success: false, error: error.message };
        }

        if (data && data.success) {
          await get().fetchInitialData();
          return {
            success: true,
            message: data.message
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'حدث خطأ عند إلغاء الفاتورة';
        return { success: false, error: msg };
      }
    }

    return { success: false, error: 'غير متصل بقاعدة البيانات' };
  },

  addExpense: async (expenseData) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          category_id: expenseData.category_id || null,
          amount: expenseData.amount,
          description: expenseData.description
        }])
        .select('*')
        .single();

      if (error) {
        console.error('Failed to add expense to Supabase:', error);
        throw new Error(error.message);
      }

      if (expenseData.product_id && expenseData.quantity && expenseData.quantity > 0) {
        const prod = get().products.find((p) => p.id === expenseData.product_id);
        if (prod) {
          const newStock = Math.max(0, prod.current_stock - expenseData.quantity);
          await supabase
            .from('products')
            .update({ current_stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', prod.id);

          await supabase
            .from('inventory_movements')
            .insert([{
              product_id: prod.id,
              movement_type: 'OUT',
              quantity: expenseData.quantity,
              unit_cost: prod.purchase_price,
              reference_type: 'EXPENSE',
              reference_id: data ? data.id : null,
              notes: `استهلاك مصروفات: ${expenseData.description}`
            }]);
        }
      }

      if (data) {
        await get().fetchInitialData();
      }
    }
  },

  addServiceCategory: async (name, description) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('service_categories')
        .insert([{ name, description: description || null, is_active: true }])
        .select('*')
        .single();

      if (error) {
        console.error('Failed to add service category:', error);
        throw new Error(error.message);
      }

      if (data) {
        set({ serviceCategories: [...get().serviceCategories, data] });
      }
    }
  },

  addProductCategory: async (name, description) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('product_categories')
        .insert([{ name, description: description || null, is_active: true }])
        .select('*')
        .single();

      if (error) {
        console.error('Failed to add product category:', error);
        throw new Error(error.message);
      }

      if (data) {
        set({ productCategories: [...get().productCategories, data] });
      }
    }
  },

  addExpenseCategory: async (name) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([{ name, is_active: true }])
        .select('*')
        .single();

      if (error) {
        console.error('Failed to add expense category:', error);
        throw new Error(error.message);
      }

      if (data) {
        set({ expenseCategories: [...get().expenseCategories, data] });
      }
    }
  },

  deleteServiceCategory: async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('service_categories').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete service category:', error);
        throw new Error(error.message);
      }
    }
    set({ serviceCategories: get().serviceCategories.filter((c) => c.id !== id) });
  },

  deleteProductCategory: async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('product_categories').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete product category:', error);
        throw new Error(error.message);
      }
    }
    set({ productCategories: get().productCategories.filter((c) => c.id !== id) });
  },

  deleteExpenseCategory: async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('expense_categories').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete expense category:', error);
        throw new Error(error.message);
      }
    }
    set({ expenseCategories: get().expenseCategories.filter((c) => c.id !== id) });
  },

  claimVipReward: async (vehicleId: string) => {
    const target = get().vehicles.find((v) => v.id === vehicleId);
    if (!target) return;
    const currentVisits = target.visits_count || 0;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('vehicles')
        .update({ last_rewarded_visit_count: currentVisits })
        .eq('id', vehicleId);

      if (error) {
        console.error('Failed to update VIP reward count in Supabase:', error);
        throw new Error(error.message);
      }
    }

    set({
      vehicles: get().vehicles.map((v) =>
        v.id === vehicleId ? { ...v, last_rewarded_visit_count: currentVisits } : v
      ),
    });
  },

  addEmployee: async (profileData) => {
    if (isSupabaseConfigured && supabase) {
      // Attempt insertion with optional phone and pin_code fields
      const insertPayload: Record<string, any> = {
        full_name: profileData.full_name,
        role: profileData.role,
        is_active: true
      };
      if (profileData.phone) insertPayload.phone = profileData.phone;
      if (profileData.pin_code) insertPayload.pin_code = profileData.pin_code;

      let { data, error } = await supabase
        .from('profiles')
        .insert([insertPayload])
        .select('*')
        .single();

      // If remote table lacks phone/pin_code columns, retry with core fields
      if (error && (error.message.includes('column') || error.message.includes('schema cache'))) {
        const corePayload = {
          full_name: profileData.full_name,
          role: profileData.role,
          is_active: true
        };
        const retryResult = await supabase
          .from('profiles')
          .insert([corePayload])
          .select('*')
          .single();
        
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error('Failed to add employee to Supabase:', error);
        throw new Error(error.message);
      }

      if (data) {
        set({ profiles: [data, ...get().profiles] });
        return;
      }
    }

    const mockProfile: Profile = {
      id: `prof_${Date.now()}`,
      full_name: profileData.full_name,
      role: profileData.role,
      phone: profileData.phone,
      pin_code: profileData.pin_code || '1234',
      is_active: true,
      created_at: new Date().toISOString()
    };
    set({ profiles: [mockProfile, ...get().profiles] });
  },

  updateEmployeeRole: async (id, role) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Failed to update employee role in Supabase:', error);
        throw new Error(error.message);
      }
    }
    set({
      profiles: get().profiles.map((p) => (p.id === id ? { ...p, role } : p))
    });
  },

  toggleEmployeeActive: async (id) => {
    const target = get().profiles.find((p) => p.id === id);
    if (!target) return;
    const nextState = !target.is_active;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: nextState, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Failed to toggle employee active state in Supabase:', error);
        throw new Error(error.message);
      }
    }

    set({
      profiles: get().profiles.map((p) => (p.id === id ? { ...p, is_active: nextState } : p))
    });
  },

  deleteEmployee: async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete employee in Supabase:', error);
        throw new Error(error.message);
      }
    }
    set({ profiles: get().profiles.filter((p) => p.id !== id) });
  },

  searchVehicles: (query) => {
    if (!query.trim()) return get().vehicles;
    const q = query.trim().toLowerCase();
    return get().vehicles.filter(
      (v) =>
        v.plate_display.toLowerCase().includes(q) ||
        v.plate_letters.toLowerCase().includes(q) ||
        v.plate_numbers.includes(q) ||
        v.phone.includes(q) ||
        v.driver_name.toLowerCase().includes(q)
    );
  },

  getVehicleById: (id) => get().vehicles.find((v) => v.id === id),

  getVehicleSalesHistory: (vehicleId) =>
    get().sales.filter((s) => s.vehicle_id === vehicleId),
}));
