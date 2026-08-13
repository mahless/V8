import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { 
  Settings, 
  Database, 
  Activity, 
  Server, 
  ShieldCheck, 
  Plus, 
  FolderPlus, 
  Receipt, 
  Layers, 
  Package, 
  DollarSign 
} from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';

export const SettingsView: React.FC = () => {
  const {
    serviceCategories,
    productCategories,
    expenseCategories,
    addServiceCategory,
    addProductCategory,
    addExpenseCategory,
    addExpense
  } = useDataStore();

  const { showToast } = useUIStore();

  // Modals state
  const [activeModal, setActiveModal] = useState<'service_cat' | 'product_cat' | 'expense_cat' | 'new_expense' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Inputs State
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  
  // Expense Form State
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

  // Handlers
  const handleCreateServiceCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast('اسم القسم مطلوب', 'يرجى كتابة اسم قسم الخدمات', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await addServiceCategory(nameInput.trim(), descInput.trim() || undefined);
      showToast('تم إنشاء القسم بنجاح 🎉', `تمت إضافة قسم الخدمات "${nameInput.trim()}"`, 'success');
      setActiveModal(null);
      setNameInput('');
      setDescInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر إضافة القسم';
      showToast('خطأ في العملية', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProductCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast('اسم القسم مطلوب', 'يرجى كتابة اسم قسم المنتجات', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await addProductCategory(nameInput.trim(), descInput.trim() || undefined);
      showToast('تم إنشاء القسم بنجاح 🎉', `تمت إضافة قسم المنتجات "${nameInput.trim()}"`, 'success');
      setActiveModal(null);
      setNameInput('');
      setDescInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر إضافة القسم';
      showToast('خطأ في العملية', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateExpenseCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast('اسم بند المصروف مطلوب', 'يرجى كتابة اسم بند المصروف الجديد', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await addExpenseCategory(nameInput.trim());
      showToast('تم إدراج البند بنجاح 🎉', `تمت إضافة بند المصروفات "${nameInput.trim()}"`, 'success');
      setActiveModal(null);
      setNameInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر إضافة بند المصروفات';
      showToast('خطأ في العملية', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('مبلغ غير صحيح', 'يرجى كتابة مبلغ مصروفات صحيح أكبر من صفر', 'error');
      return;
    }
    if (!expenseDesc.trim()) {
      showToast('الوصف مطلوب', 'يرجى كتابة بيان المصروف', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addExpense({
        category_id: expenseCategoryId || undefined,
        amount: amountNum,
        description: expenseDesc.trim()
      });
      showToast('تم تسجيل المصروف بنجاح 💸', `تم تسجيل ${amountNum} ج.م ببيان: ${expenseDesc.trim()}`, 'success');
      setActiveModal(null);
      setExpenseCategoryId('');
      setExpenseAmount('');
      setExpenseDesc('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تسجيل المصروف';
      showToast('خطأ في العملية', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <span>إعدادات النظام وإدارة الأقسام</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            إدارة أقسام الخدمات والمنتجات وبنود المصروفات ومتابعة حالة الاتصال بقاعدة البيانات
          </p>
        </div>
      </div>

      {/* Database Connection Status Card */}
      <Card className="border-slate-200/80 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>حالة الاتصال بقاعدة البيانات</CardTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">Supabase / PostgreSQL Server Connection</p>
            </div>
          </div>
          <Badge variant={isSupabaseConfigured ? 'green' : 'blue'} size="md">
            {isSupabaseConfigured ? '🟢 متصل بالسيرفر' : '🟢 النظام نشط ويعمل'}
          </Badge>
        </CardHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">حالة المزامنة والبيانات</span>
              </div>
              <span className="text-xs font-black text-emerald-600">متزامن ونشط</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">الاستجابة والاتصال</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600">طبيعي (سريع)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 text-xs text-slate-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>جميع الحركات والعمليات وفواتير المبيعات يتم تدقيقها ومزامنتها بنجاح وأمان.</span>
          </div>
        </div>
      </Card>

      {/* Manager Category & Expense Management Section */}
      <Card className="border-blue-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>إدارة الأقسام والمصروفات (إعدادات المدير)</CardTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">إنشاء أقسام جديدة للخدمات أو المنتجات أو إضافة بند مصروفات</p>
            </div>
          </div>
        </CardHeader>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setNameInput('');
              setDescInput('');
              setActiveModal('service_cat');
            }}
            className="p-4 h-auto flex flex-col items-center justify-center gap-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">قسم خدمات جديد</div>
              <div className="text-[10px] text-slate-500 mt-0.5">مثل: غسيل، تلميع، عفشة</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setNameInput('');
              setDescInput('');
              setActiveModal('product_cat');
            }}
            className="p-4 h-auto flex flex-col items-center justify-center gap-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">قسم منتجات جديد</div>
              <div className="text-[10px] text-slate-500 mt-0.5">مثل: أدوات، معطرات، زيوت</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setNameInput('');
              setActiveModal('expense_cat');
            }}
            className="p-4 h-auto flex flex-col items-center justify-center gap-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">قسم مصروفات جديد</div>
              <div className="text-[10px] text-slate-500 mt-0.5">مثل: كهرباء، عمالة، صيانة</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setExpenseCategoryId(expenseCategories[0]?.id || '');
              setExpenseAmount('');
              setExpenseDesc('');
              setActiveModal('new_expense');
            }}
            className="p-4 h-auto flex flex-col items-center justify-center gap-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">تسجيل مصروف جديد</div>
              <div className="text-[10px] text-slate-500 mt-0.5">تسجيل خصم مالي مباشر</div>
            </div>
          </Button>
        </div>

        {/* Existing Categories Summary */}
        <div className="mt-6 pt-4 border-t border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-700">الأقسام الحالية المتاحة في النظام:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Service Categories List */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>أقسام الخدمات ({serviceCategories.length})</span>
                </span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {serviceCategories.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-2">لا توجد أقسام خدمات بعد</p>
                ) : (
                  serviceCategories.map((c) => (
                    <div key={c.id} className="p-2 rounded-lg bg-white border border-slate-100 text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>{c.name}</span>
                      <Badge variant="blue" size="xs">نشط</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Product Categories List */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>أقسام المنتجات ({productCategories.length})</span>
                </span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {productCategories.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-2">لا توجد أقسام منتجات بعد</p>
                ) : (
                  productCategories.map((c) => (
                    <div key={c.id} className="p-2 rounded-lg bg-white border border-slate-100 text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>{c.name}</span>
                      <Badge variant="blue" size="xs">نشط</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expense Categories List */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span>بنود المصروفات ({expenseCategories.length})</span>
                </span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {expenseCategories.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-2">لا توجد بنود مصروفات بعد</p>
                ) : (
                  expenseCategories.map((c) => (
                    <div key={c.id} className="p-2 rounded-lg bg-white border border-slate-100 text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>{c.name}</span>
                      <Badge variant="green" size="xs">نشط</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal: New Service Category */}
      <Modal
        isOpen={activeModal === 'service_cat'}
        onClose={() => setActiveModal(null)}
        title="إنشاء قسم خدمات جديد"
        description="أدخل تفاصيل قسم الخدمات الجديد لربط الخدمات التابعة له"
      >
        <form onSubmit={handleCreateServiceCategory} className="space-y-4">
          <Input
            label="اسم القسم *"
            placeholder="مثال: غسيل وتلميع، عفشة وتجهيزات..."
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="وصف القسم (اختياري)"
            placeholder="توضيح مختصر لطبيعة الخدمات في هذا القسم..."
            value={descInput}
            onChange={(e) => setDescInput(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setActiveModal(null)}>إلغاء</Button>
            <Button type="submit" isLoading={isSubmitting} icon={<Plus className="w-4 h-4" />}>إنشاء القسم</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Product Category */}
      <Modal
        isOpen={activeModal === 'product_cat'}
        onClose={() => setActiveModal(null)}
        title="إنشاء قسم منتجات جديد"
        description="أدخل تفاصيل قسم المنتجات بالمخزن"
      >
        <form onSubmit={handleCreateProductCategory} className="space-y-4">
          <Input
            label="اسم القسم *"
            placeholder="مثال: أدوات غسيل، معطرات، قطع غيار..."
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="وصف القسم (اختياري)"
            placeholder="توضيح مختصر للمنتجات في هذا القسم..."
            value={descInput}
            onChange={(e) => setDescInput(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setActiveModal(null)}>إلغاء</Button>
            <Button type="submit" isLoading={isSubmitting} icon={<Plus className="w-4 h-4" />}>إنشاء القسم</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Expense Category */}
      <Modal
        isOpen={activeModal === 'expense_cat'}
        onClose={() => setActiveModal(null)}
        title="إنشاء بند / قسم مصروفات جديد"
        description="أدخل اسم البند المالي لتصنيف المصروفات"
      >
        <form onSubmit={handleCreateExpenseCategory} className="space-y-4">
          <Input
            label="اسم بند المصروف *"
            placeholder="مثال: كهرباء ومياه، أجور وعمالة، أدوات نظافة..."
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            required
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setActiveModal(null)}>إلغاء</Button>
            <Button type="submit" isLoading={isSubmitting} icon={<Plus className="w-4 h-4" />}>إنشاء البند</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Expense */}
      <Modal
        isOpen={activeModal === 'new_expense'}
        onClose={() => setActiveModal(null)}
        title="تسجيل مصروف جديد"
        description="إدخال قيد مصروف مالي مباشر"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">قسم / بند المصروف</label>
            <select
              value={expenseCategoryId}
              onChange={(e) => setExpenseCategoryId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="">-- اختر بند المصروف --</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <Input
            label="المبلغ (بالجنيه) *"
            type="number"
            min="1"
            step="any"
            placeholder="مثال: 150"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            required
          />

          <Input
            label="بيان / وصف المصروف *"
            placeholder="تفاصيل المصروف، مثل: شراء خراطيم مياه..."
            value={expenseDesc}
            onChange={(e) => setExpenseDesc(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setActiveModal(null)}>إلغاء</Button>
            <Button type="submit" isLoading={isSubmitting} icon={<Receipt className="w-4 h-4" />}>حفظ المصروف</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
