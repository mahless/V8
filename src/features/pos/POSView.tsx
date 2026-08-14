import React, { useState } from 'react';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { PlateBadge } from '../../components/ui/PlateBadge';
import { VehicleCard } from '../../components/ui/VehicleCard';
import { PriceDisplay } from '../../components/ui/PriceDisplay';
import { Modal } from '../../components/ui/Modal';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Car,
  CheckCircle2,
  Wallet,
  Banknote,
  Sparkles,
  PlusCircle,
  AlertCircle,
  Percent,
} from 'lucide-react';
import {
  validatePlateLetters,
  validatePlateNumbers,
  validatePhone,
  buildPlateDisplay,
  formatPlateLettersInput,
  convertArabicDigitsToEnglish,
} from '../../lib/utils';
import { PaymentMethod, Vehicle } from '../../types';

export const POSView: React.FC = () => {
  const {
    serviceCategories,
    services,
    products,
    addVehicle,
    createAtomicSale,
    searchVehicles,
  } = useDataStore();

  const {
    selectedVehicle,
    setSelectedVehicle,
    cartItems,
    addServiceToCart,
    addProductToCart,
    updateCartItemQuantity,
    removeCartItem,
    clearCart,
    paymentMethod,
    setPaymentMethod,
    posNotes,
    setPosNotes,
    showToast,
    showConfirmModal,
    setActiveReceiptSaleId,
    setReceiptModalOpen,
  } = useUIStore();

  // Local POS State
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(serviceCategories[0]?.id || 'sc-1');
  const [isAddingNewVehicle, setIsAddingNewVehicle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // New Vehicle Modal Form state
  const [newPlateLetters, setNewPlateLetters] = useState('');
  const [newPlateNumbers, setNewPlateNumbers] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered Services for active category
  const activeServices = services.filter((s) => s.category_id === activeCategory && s.is_active);

  // Search Results
  const searchResults = vehicleSearchQuery.trim() ? searchVehicles(vehicleSearchQuery) : [];

  // Totals & Discount
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = Math.round((subtotal * (discountPercent || 0)) / 100);
  const totalAmount = Math.max(0, subtotal - discountAmount);

  // Handle New Vehicle Form Submit
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!validatePlateLetters(newPlateLetters)) {
      errors.letters = 'أدخل من 1 إلى 4 حروف صحيحة (مثال: س ب ج)';
    }
    if (!validatePlateNumbers(newPlateNumbers)) {
      errors.numbers = 'أدخل أرقام صحيحة (مثال: 1234)';
    }
    if (!newDriverName.trim()) {
      errors.driver = 'اسم السائق مطلوب';
    }
    if (!validatePhone(newPhone)) {
      errors.phone = 'رقم الهاتف يجب أن يكون 11 رقم (مثال: 01012345678)';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const plateDisplay = buildPlateDisplay(newPlateLetters, newPlateNumbers);

    // Check duplicate
    const existing = searchVehicles(plateDisplay).find(
      (v) => v.plate_display.replace(/\s+/g, '') === plateDisplay.replace(/\s+/g, '')
    );
    if (existing) {
      showToast('سيارة مكررة', 'رقم اللوحة هذا مسجل بالفعل لسائق آخر', 'error');
      return;
    }

    try {
      const created = await addVehicle({
        plate_letters: newPlateLetters.trim(),
        plate_numbers: newPlateNumbers.trim(),
        plate_display: plateDisplay,
        driver_name: newDriverName.trim(),
        phone: newPhone.trim(),
        notes: newNotes.trim() || undefined,
      });

      if (created) {
        setSelectedVehicle(created);
        showToast('تم حفظ السيارة', `تم تسجيل السيارة ${plateDisplay} بنجاح`, 'success');
      }
    } catch (err) {
      showToast('خطأ في الحفظ', 'تعذر إضافة السيارة إلى قاعدة البيانات', 'error');
      return;
    }

    setIsAddingNewVehicle(false);
    setVehicleSearchQuery('');
    setNewPlateLetters('');
    setNewPlateNumbers('');
    setNewDriverName('');
    setNewPhone('');
    setNewNotes('');
    setFormErrors({});
  };

  // Handle Atomic POS Checkout
  const handleCompletePOS = async () => {
    if (isSubmitting) return; // Guard against double click

    if (!selectedVehicle) {
      showToast('تنبيه هام', 'يرجى اختيار أو تسجيل السيارة أولاً قبل إتمام البيع', 'error');
      return;
    }

    if (cartItems.length === 0) {
      showToast('السلة فارغة', 'يرجى اختيار خدمة واحدة على الأقل أو منتج', 'error');
      return;
    }

    setIsSubmitting(true);

    // Reuse existing idempotency key if retrying the same cart submission, otherwise generate new
    const idempotencyKey = activeIdempotencyKey || `pos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    if (!activeIdempotencyKey) {
      setActiveIdempotencyKey(idempotencyKey);
    }

    const itemsPayload = cartItems.map((item) => ({
      type: item.type,
      id: item.id,
      quantity: item.quantity,
    }));

    try {
      const result = await createAtomicSale(
        selectedVehicle.id,
        itemsPayload,
        paymentMethod,
        posNotes,
        idempotencyKey,
        discountPercent
      );

      if (result.success && result.saleId) {
        showToast('تم الدفع بنجاح 🎉', 'تم حفظ الفاتورة وتحديث المخزون وسجل السيارة', 'success');
        setActiveReceiptSaleId(result.saleId);
        setReceiptModalOpen(true);
        clearCart();
        setDiscountPercent(0);
        setActiveIdempotencyKey(null); // Reset key after successful completion
      } else {
        showToast('تعذر إتمام العملية', result.error || 'حدث خطأ غير متوقع. يمكنك جلب الفاتورة عند توفر الاتصال.', 'error');
      }
    } catch (err: unknown) {
      showToast('تعذر الاتصال بالخادم', 'حدث خطأ في شبكة الاتصال، جاري تعليق الطلب لإعادة المحاولة بأمان.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>بدء عملية جديدة</span>
          </h1>
        </div>

        {cartItems.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              showConfirmModal({
                title: 'تفريغ السلة',
                message: 'هل تريد مسح جميع الخدمات والمنتجات المختارة من السلة وإعادة التعيين؟',
                confirmText: 'نعم، تفريغ السلة',
                cancelText: 'إلغاء',
                type: 'warning',
                onConfirm: () => {
                  clearCart();
                  showToast('تم تفريغ السلة', 'تم مسح محتويات الفاتورة بنجاح', 'info');
                },
              });
            }}
            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            icon={<Trash2 className="w-4 h-4" />}
          >
            مسح السلة
          </Button>
        )}
      </div>

      {/* Main Grid: POS Controls (Left/Center) + Order Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Vehicle Search + Service Selection (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* 1. Vehicle Selection Card */}
          <Card className="border-blue-100 shadow-sm">
            <CardHeader className="pb-3 border-blue-50">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                <CardTitle>1. تحديد السيارة والعميل</CardTitle>
              </div>

              {selectedVehicle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVehicle(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  تغيير السيارة
                </Button>
              )}
            </CardHeader>

            {!selectedVehicle ? (
              <div className="space-y-4">
                {/* Search Input & Dropdown */}
                <div className="relative">
                  <Input
                    value={vehicleSearchQuery}
                    onChange={(e) => setVehicleSearchQuery(e.target.value)}
                    placeholder="ابحث برقم اللوحة (مثال: س ب ج 1234) أو رقم الهاتف..."
                    icon={<Search className="w-4 h-4" />}
                    autoFocus
                  />

                  {/* Dynamic Dropdown Search Results */}
                  {vehicleSearchQuery.trim() && (
                    <div className="absolute top-full right-0 left-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl z-20 max-h-60 overflow-y-auto p-2 divide-y divide-slate-100">
                      {searchResults.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-xs text-slate-500 font-medium">لم يتم العثور على سيارة مسجلة بهذا الرقم</p>
                          <Button
                            size="sm"
                            className="mt-3"
                            onClick={() => setIsAddingNewVehicle(true)}
                            icon={<Plus className="w-4 h-4" />}
                          >
                            تسجيل سيارة جديدة الآن
                          </Button>
                        </div>
                      ) : (
                        searchResults.map((v) => (
                          <VehicleCard
                            key={v.id}
                            vehicle={v}
                            badge={
                              <Badge variant="blue" size="sm">
                                {v.visits_count || 0} زيارة
                              </Badge>
                            }
                            action={
                              <Button variant="ghost" size="xs" className="text-blue-600 font-bold">
                                اختيار
                              </Button>
                            }
                            onClick={() => {
                              setSelectedVehicle(v);
                              setVehicleSearchQuery('');
                            }}
                            size="sm"
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400 font-medium">غير مسجل من قبل؟</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingNewVehicle(true)}
                    icon={<PlusCircle className="w-4 h-4 text-blue-600" />}
                  >
                    إضافة سيارة جديدة
                  </Button>
                </div>
              </div>
            ) : (
              /* Selected Vehicle Banner Card - Standard 3-line layout */
              <VehicleCard
                vehicle={selectedVehicle}
                badge={
                  <Badge variant="blue" size="sm">
                    عدد الزيارات: {selectedVehicle.visits_count || 0}
                  </Badge>
                }
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedVehicle(null)}
                    className="text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 text-xs font-bold"
                  >
                    تغيير السيارة
                  </Button>
                }
                className="bg-gradient-to-br from-blue-50/90 via-indigo-50/30 to-white border-blue-200"
              />
            )}
          </Card>

          {/* 2. Service Category Tabs & Interactive Cards */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <CardTitle>2. اختيار خدمات الغسيل والصيانة</CardTitle>
              </div>
            </CardHeader>

            {/* Horizontal Scrollable Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-slate-100 no-scrollbar">
              {serviceCategories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
              {/* Product Category Tab for Perfumes & Accessories */}
              <button
                key="products-cat"
                onClick={() => setActiveCategory('products-cat')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === 'products-cat'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📦 المعطرات والمنتجات
              </button>
            </div>

            {/* Service & Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {activeCategory === 'products-cat'
                ? products.filter((p) => p.is_active).map((prd) => {
                    const cartItem = cartItems.find((i) => i.id === prd.id && i.type === 'PRODUCT');
                    const quantity = cartItem ? cartItem.quantity : 0;
                    const isSelected = quantity > 0;

                    return (
                      <div
                        key={prd.id}
                        className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-600 shadow-md ring-2 ring-blue-600/20'
                            : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">{prd.name}</h4>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            المخزن: {convertArabicDigitsToEnglish(prd.current_stock)} {prd.unit}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 gap-2">
                          <PriceDisplay amount={prd.selling_price} size="sm" className="text-blue-700" />

                          {isSelected ? (
                            <div className="flex items-center gap-1 bg-blue-100/90 p-1 rounded-xl border border-blue-200 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateCartItemQuantity(prd.id, quantity - 1)}
                                className="w-6 h-6 rounded-lg bg-white text-blue-800 font-bold flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all shadow-2xs cursor-pointer"
                                title="إنقاص العدد"
                              >
                                <Minus className="w-3 h-3" />
                              </button>

                              <span className="px-1.5 font-mono font-black text-xs text-blue-900 min-w-[20px] text-center">
                                {convertArabicDigitsToEnglish(quantity)}
                              </span>

                              <button
                                type="button"
                                onClick={() => addProductToCart(prd, 1)}
                                className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center hover:bg-blue-700 transition-all shadow-2xs cursor-pointer"
                                title="زيادة العدد"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addProductToCart(prd, 1)}
                              className="text-xs py-1 px-3 h-8 border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white transition-all font-bold flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إضافة</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                : activeServices.map((srv) => {
                    const cartItem = cartItems.find((i) => i.id === srv.id && i.type === 'SERVICE');
                    const quantity = cartItem ? cartItem.quantity : 0;
                    const isSelected = quantity > 0;

                    return (
                      <div
                        key={srv.id}
                        className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-600 shadow-md ring-2 ring-blue-600/20'
                            : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">{srv.name}</h4>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                          </div>
                          {srv.description && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{srv.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 gap-2">
                          <PriceDisplay amount={srv.price} size="sm" className="text-blue-700" />

                          {isSelected ? (
                            <div className="flex items-center gap-1 bg-blue-100/90 p-1 rounded-xl border border-blue-200 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateCartItemQuantity(srv.id, quantity - 1)}
                                className="w-6 h-6 rounded-lg bg-white text-blue-800 font-bold flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all shadow-2xs cursor-pointer"
                                title="إنقاص العدد"
                              >
                                <Minus className="w-3 h-3" />
                              </button>

                              <span className="px-1.5 font-mono font-black text-xs text-blue-900 min-w-[20px] text-center">
                                {convertArabicDigitsToEnglish(quantity)}
                              </span>

                              <button
                                type="button"
                                onClick={() => addServiceToCart(srv, 1)}
                                className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center hover:bg-blue-700 transition-all shadow-2xs cursor-pointer"
                                title="زيادة العدد"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addServiceToCart(srv, 1)}
                              className="text-xs py-1 px-3 h-8 border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white transition-all font-bold flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إضافة</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>
          </Card>
        </div>

        {/* Right Column: Order Summary & Payment Sticky Panel (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20 space-y-4">
          <Card className="border-blue-200/80 shadow-md">
            <CardHeader className="bg-slate-50/80 -mx-5 -mt-5 p-5 border-b border-slate-100 rounded-t-2xl">
              <CardTitle className="text-slate-900 flex items-center justify-between w-full">
                <span>ملخص العملية</span>
                <Badge variant="blue" size="sm">
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)} عناصر
                </Badge>
              </CardTitle>
            </CardHeader>

            {/* Cart Items List */}
            <div className="py-2 space-y-2.5 max-h-64 overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  السلة فارغة. قم باختيار الخدمات والمنتجات لإظهار التكلفة.
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                  >
                    {/* السطر الأول: اسم العملية في سطر لوحده */}
                    <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-200/60">
                      <span className="text-xs">{item.type === 'SERVICE' ? '🚿' : '🧴'}</span>
                      <h5 className="text-xs font-bold text-slate-900 leading-tight">
                        {item.name}
                      </h5>
                    </div>

                    {/* السطر الثاني: خيارات السعر والكمية والتكلفة والحذف */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-[11px] text-slate-500 font-mono font-medium">
                        {item.price} ج.م × {convertArabicDigitsToEnglish(item.quantity)}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quantity Selector inside Cart */}
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                            className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer text-xs font-bold"
                            title="إنقاص الكمية"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span className="px-1 font-mono font-black text-xs text-slate-900 min-w-[18px] text-center">
                            {convertArabicDigitsToEnglish(item.quantity)}
                          </span>

                          <button
                            type="button"
                            onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                            className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer text-xs font-bold"
                            title="زيادة الكمية"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <PriceDisplay amount={item.price * item.quantity} size="sm" />
                        <button
                          onClick={() => removeCartItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Notes Input */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ملاحظات الفاتورة (اختياري)
              </label>
              <textarea
                value={posNotes}
                onChange={(e) => setPosNotes(e.target.value)}
                placeholder="أكتب أي ملاحظات خاصة بالغسيل أو العميل..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white resize-none"
                rows={2}
              />
            </div>

            {/* Payment Method Selector */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-800">طريقة الدفع (الدفع الكامل مطلوب)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>نقداً</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('WALLET')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'WALLET'
                      ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <span>إلكتروني</span>
                </button>
              </div>

            </div>

            {/* Invoice Discount (% Percentage) */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-blue-600" />
                  <span>خصم على الفاتورة (نسبة مئوية %)</span>
                </label>
                {discountPercent > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscountPercent(0)}
                    className="text-[11px] text-red-600 font-semibold hover:underline"
                  >
                    إلغاء الخصم
                  </button>
                )}
              </div>

              {/* Discount Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[0, 5, 10, 15, 20, 25].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(pct)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                      discountPercent === pct
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pct === 0 ? 'بدون' : `${pct}%`}
                  </button>
                ))}
              </div>

              {/* Custom Discount Percentage Input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-600 font-medium shrink-0">نسبة مخصصة:</span>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent || ''}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                      setDiscountPercent(val);
                    }}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600 focus:bg-white pl-7"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                </div>
              </div>
            </div>

            {/* Total & Checkout CTA Button */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              {discountPercent > 0 && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>المجموع قبل الخصم:</span>
                    <span>{subtotal} ج.م</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-700 font-bold">
                    <span>قيمة الخصم ({discountPercent}%):</span>
                    <span>-{discountAmount} ج.م</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-800">الإجمالي الصافي:</span>
                <PriceDisplay amount={totalAmount} size="lg" className="text-blue-700" />
              </div>

              <Button
                size="lg"
                onClick={handleCompletePOS}
                isLoading={isSubmitting}
                disabled={isSubmitting || cartItems.length === 0 || !selectedVehicle}
                className="w-full text-base py-3.5 shadow-lg shadow-blue-600/25"
                icon={<CheckCircle2 className="w-5 h-5" />}
              >
                {isSubmitting ? 'جاري معالجة الفاتورة...' : `تأكيد الدفع وطباعة الفاتورة (${totalAmount} ج.م)`}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: Add New Vehicle */}
      <Modal
        isOpen={isAddingNewVehicle}
        onClose={() => setIsAddingNewVehicle(false)}
        title="تسجيل سيارة جديدة"
        description="أدخل بيانات اللوحة وسائق السيارة للتسجيل في النظام"
      >
        <form onSubmit={handleSaveVehicle} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="حروف اللوحة (1-4 حروف)"
              placeholder="مثال: س ب ج"
              value={newPlateLetters}
              onChange={(e) => setNewPlateLetters(formatPlateLettersInput(e.target.value))}
              error={formErrors.letters}
            />
            <Input
              label="أرقام اللوحة (1-4 أرقام)"
              placeholder="مثال: 1234"
              value={newPlateNumbers}
              onChange={(e) => setNewPlateNumbers(e.target.value)}
              error={formErrors.numbers}
            />
          </div>

          <Input
            label="اسم السائق / العميل"
            placeholder="مثال: أحمد محمود"
            value={newDriverName}
            onChange={(e) => setNewDriverName(e.target.value)}
            error={formErrors.driver}
          />

          <Input
            label="رقم الهاتف (11 رقم)"
            placeholder="01012345678"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            error={formErrors.phone}
          />

          <Input
            label="ملاحظات العميل (اختياري)"
            placeholder="نوع السيارة، لونها، أو تفضيل خاص..."
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsAddingNewVehicle(false)}>
              إلغاء
            </Button>
            <Button type="submit">حفظ واختيار السيارة</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
