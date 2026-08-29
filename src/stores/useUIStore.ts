import { create } from 'zustand';
import { NavigationTab, Vehicle, Service, Product, PaymentMethod } from '../types';

export interface POSCartItem {
  type: 'SERVICE' | 'PRODUCT';
  id: string; // service_id or product_id
  name: string;
  price: number;
  quantity: number;
  max_stock?: number;
}

export interface OpenTicket {
  id: string;
  vehicle: Vehicle | null;
  cartItems: POSCartItem[];
  paymentMethod: PaymentMethod;
  posNotes: string;
  discountPercent: number;
  createdAt: string;
}

interface UIStore {
  // Navigation
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;

  // POS Flow State (Active Workspace)
  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  cartItems: POSCartItem[];
  addServiceToCart: (service: Service, quantity?: number) => void;
  addProductToCart: (product: Product, quantity?: number) => void;
  updateCartItemQuantity: (id: string, quantity: number) => void;
  removeCartItem: (id: string) => void;
  clearCart: () => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  posNotes: string;
  setPosNotes: (notes: string) => void;
  discountPercent: number;
  setDiscountPercent: (pct: number) => void;

  // POS Tickets Management
  openTickets: OpenTicket[];
  activeTicketId: string | null;
  createNewTicket: () => void;
  saveCurrentTicket: () => void;
  switchTicket: (id: string) => void;
  closeActiveTicket: () => void;

  // Modals & Drawers
  isNewVehicleModalOpen: boolean;
  setNewVehicleModalOpen: (open: boolean) => void;
  isNewProductModalOpen: boolean;
  setNewProductModalOpen: (open: boolean) => void;
  isNewServiceModalOpen: boolean;
  setNewServiceModalOpen: (open: boolean) => void;
  isAddStockModalOpen: boolean;
  setAddStockModalOpen: (open: boolean) => void;
  selectedProductForStock: Product | null;
  setSelectedProductForStock: (product: Product | null) => void;
  isReceiptModalOpen: boolean;
  setReceiptModalOpen: (open: boolean) => void;
  activeReceiptSaleId: string | null;
  setActiveReceiptSaleId: (saleId: string | null) => void;

  // Global Quick Search
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;

  // Notification Toast
  toastMessage: { title: string; message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;

  // Global Confirmation & Alert Modal System (Non-Browser UI)
  confirmModal: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null;
  showConfirmModal: (config: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  showAlertModal: (config: {
    title: string;
    message: string;
    buttonText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    onClose?: () => void;
  }) => void;
  closeConfirmModal: () => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedVehicle: null,
  setSelectedVehicle: (vehicle) => {
    set({ selectedVehicle: vehicle });
    get().saveCurrentTicket();
  },

  cartItems: [],
  addServiceToCart: (service, quantity = 1) => {
    const { cartItems } = get();
    const existingIndex = cartItems.findIndex((item) => item.id === service.id && item.type === 'SERVICE');
    if (existingIndex > -1) {
      const existing = cartItems[existingIndex];
      const newQty = existing.quantity + quantity;
      const updated = [...cartItems];
      updated[existingIndex] = { ...existing, quantity: newQty };
      set({ cartItems: updated });
      get().saveCurrentTicket();
    } else {
      set({
        cartItems: [
          ...cartItems,
          {
            type: 'SERVICE',
            id: service.id,
            name: service.name,
            price: service.price,
            quantity,
          },
        ],
      });
    }
  },

  addProductToCart: (product, quantity = 1) => {
    const { cartItems } = get();
    const existingIndex = cartItems.findIndex((item) => item.id === product.id && item.type === 'PRODUCT');
    if (existingIndex > -1) {
      const existing = cartItems[existingIndex];
      const newQty = existing.quantity + quantity;
      if (newQty > product.current_stock) {
        get().showToast('خطأ في الكمية', `الكمية المتاحة في المخزن فقط ${product.current_stock}`, 'error');
        return;
      }
      const updated = [...cartItems];
      updated[existingIndex] = { ...existing, quantity: newQty };
      set({ cartItems: updated });
      get().saveCurrentTicket();
    } else {
      if (quantity > product.current_stock) {
        get().showToast('خطأ في الكمية', `المنتج غير متوفر بالكمية المطلوبة (${product.current_stock})`, 'error');
        return;
      }
      set({
        cartItems: [
          ...cartItems,
          {
            type: 'PRODUCT',
            id: product.id,
            name: product.name,
            price: product.selling_price,
            quantity,
            max_stock: product.current_stock,
          },
        ],
      });
      get().saveCurrentTicket();
    }
  },

  updateCartItemQuantity: (id, quantity) => {
    const { cartItems } = get();
    if (quantity <= 0) {
      get().removeCartItem(id);
      return;
    }
    const item = cartItems.find((i) => i.id === id);
    if (item && item.type === 'PRODUCT' && item.max_stock && quantity > item.max_stock) {
      get().showToast('تنبيه المخزون', `أقصى كمية متاحة هي ${item.max_stock}`, 'error');
      return;
    }
    set({
      cartItems: cartItems.map((i) => (i.id === id ? { ...i, quantity } : i)),
    });
    get().saveCurrentTicket();
  },

  removeCartItem: (id) => {
    set({ cartItems: get().cartItems.filter((i) => i.id !== id) });
    get().saveCurrentTicket();
  },

  clearCart: () => {
    set({ cartItems: [], selectedVehicle: null, posNotes: '', paymentMethod: 'CASH', discountPercent: 0 });
    get().saveCurrentTicket();
  },

  paymentMethod: 'CASH',
  setPaymentMethod: (method) => {
    set({ paymentMethod: method });
    get().saveCurrentTicket();
  },

  posNotes: '',
  setPosNotes: (notes) => {
    set({ posNotes: notes });
    get().saveCurrentTicket();
  },

  discountPercent: 0,
  setDiscountPercent: (pct) => {
    set({ discountPercent: pct });
    get().saveCurrentTicket();
  },

  openTickets: [],
  activeTicketId: null,

  createNewTicket: () => {
    const { activeTicketId, selectedVehicle, cartItems, paymentMethod, posNotes, discountPercent, openTickets } = get();
    
    let updatedTickets = [...openTickets];

    // If there is no active ticket, but there is data in the workspace, we should implicitly create a ticket for it first
    if (!activeTicketId && (selectedVehicle || cartItems.length > 0)) {
        const implicitId = `ticket_${Date.now()}_imp`;
        updatedTickets.push({
            id: implicitId,
            vehicle: selectedVehicle,
            cartItems,
            paymentMethod,
            posNotes,
            discountPercent,
            createdAt: new Date().toISOString()
        });
    } else if (activeTicketId) {
        // save current ticket normally
        updatedTickets = updatedTickets.map(t => 
          t.id === activeTicketId 
            ? { ...t, vehicle: selectedVehicle, cartItems, paymentMethod, posNotes, discountPercent }
            : t
        );
    }

    const newId = `ticket_${Date.now()}`;
    const newTicket: OpenTicket = {
      id: newId,
      vehicle: null,
      cartItems: [],
      paymentMethod: 'CASH',
      posNotes: '',
      discountPercent: 0,
      createdAt: new Date().toISOString()
    };
    
    updatedTickets.push(newTicket);
    
    set({
      openTickets: updatedTickets,
      activeTicketId: newId,
      selectedVehicle: null,
      cartItems: [],
      paymentMethod: 'CASH',
      posNotes: '',
      discountPercent: 0
    });
  },

  saveCurrentTicket: () => {
    const { activeTicketId, selectedVehicle, cartItems, paymentMethod, posNotes, discountPercent, openTickets } = get();
    if (activeTicketId) {
      const updatedTickets = openTickets.map(t => 
        t.id === activeTicketId 
          ? { ...t, vehicle: selectedVehicle, cartItems, paymentMethod, posNotes, discountPercent }
          : t
      );
      set({ openTickets: updatedTickets });
    }
  },

  switchTicket: (id: string) => {
    get().saveCurrentTicket();
    const target = get().openTickets.find(t => t.id === id);
    if (target) {
      set({
        activeTicketId: id,
        selectedVehicle: target.vehicle,
        cartItems: target.cartItems,
        paymentMethod: target.paymentMethod,
        posNotes: target.posNotes,
        discountPercent: target.discountPercent
      });
    }
  },

  closeActiveTicket: () => {
    const { activeTicketId, openTickets } = get();
    if (!activeTicketId) {
      set({
        selectedVehicle: null,
        cartItems: [],
        paymentMethod: 'CASH',
        posNotes: '',
        discountPercent: 0
      });
      return;
    }
    const remaining = openTickets.filter(t => t.id !== activeTicketId);
    
    if (remaining.length > 0) {
      const next = remaining[0];
      set({
        openTickets: remaining,
        activeTicketId: next.id,
        selectedVehicle: next.vehicle,
        cartItems: next.cartItems,
        paymentMethod: next.paymentMethod,
        posNotes: next.posNotes,
        discountPercent: next.discountPercent
      });
    } else {
      set({
        openTickets: [],
        activeTicketId: null,
        selectedVehicle: null,
        cartItems: [],
        paymentMethod: 'CASH',
        posNotes: '',
        discountPercent: 0
      });
    }
  },

  isNewVehicleModalOpen: false,
  setNewVehicleModalOpen: (open) => set({ isNewVehicleModalOpen: open }),

  isNewProductModalOpen: false,
  setNewProductModalOpen: (open) => set({ isNewProductModalOpen: open }),

  isNewServiceModalOpen: false,
  setNewServiceModalOpen: (open) => set({ isNewServiceModalOpen: open }),

  isAddStockModalOpen: false,
  setAddStockModalOpen: (open) => set({ isAddStockModalOpen: open }),

  selectedProductForStock: null,
  setSelectedProductForStock: (product) => set({ selectedProductForStock: product }),

  isReceiptModalOpen: false,
  setReceiptModalOpen: (open) => set({ isReceiptModalOpen: open }),

  activeReceiptSaleId: null,
  setActiveReceiptSaleId: (saleId) => set({ activeReceiptSaleId: saleId }),

  globalSearchQuery: '',
  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),

  toastMessage: null,
  showToast: (title, message, type = 'success') => {
    set({ toastMessage: { title, message, type } });
    setTimeout(() => {
      set({ toastMessage: null });
    }, 4000);
  },
  clearToast: () => set({ toastMessage: null }),

  confirmModal: null,
  showConfirmModal: ({ title, message, confirmText = 'تأكيد', cancelText = 'إلغاء', type = 'danger', onConfirm, onCancel }) => {
    set({
      confirmModal: {
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm,
        onCancel,
      },
    });
  },
  showAlertModal: ({ title, message, buttonText = 'حسناً فهمت', type = 'info', onClose }) => {
    set({
      confirmModal: {
        isOpen: true,
        title,
        message,
        confirmText: buttonText,
        cancelText: '',
        type,
        onConfirm: () => {
          if (onClose) onClose();
        },
        onCancel: onClose,
      },
    });
  },
  closeConfirmModal: () => set({ confirmModal: null }),
}));
