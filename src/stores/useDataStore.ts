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
  PaymentMethod
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

  fetchInitialData: async () => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase is not configured. Local data is empty.');
      return;
    }

    set({ isLoading: true });
    try {
      // 1. Fetch Categories & Services
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
        { data: expensesData }
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
        supabase.from('expenses').select('*').order('created_at', { ascending: false })
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
        expenses: expensesData || []
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
  createAtomicSale: async (vehicleId, rawItems, paymentMethod, notes, idempotencyKey) => {
    const ik = idempotencyKey || `ik_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('process_pos_sale', {
          p_vehicle_id: vehicleId,
          p_items: rawItems,
          p_payment_method: paymentMethod,
          p_notes: notes || null,
          p_idempotency_key: ik
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

      if (data) {
        await get().fetchInitialData();
      }
    }
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
