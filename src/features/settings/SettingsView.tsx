import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { 
  Settings, 
  Plus, 
  FolderPlus, 
  Layers, 
  Package, 
  DollarSign,
  Trash2
} from 'lucide-react';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';

export const SettingsView: React.FC = () => {
  const {
    serviceCategories,
    productCategories,
    expenseCategories,
    addServiceCategory,
    deleteServiceCategory,
    addProductCategory,
    deleteProductCategory,
    addExpenseCategory,
    deleteExpenseCategory,
  } = useDataStore();

  const { showToast, showConfirmModal } = useUIStore();

  // Modals state
  const [activeModal, setActiveModal] = useState<'service_cat' | 'product_cat' | 'expense_cat' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Inputs State
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');

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

  // Delete Handlers with Confirmation
  const handleDeleteServiceCategory = (id: string, name: string) => {
    showConfirmModal({
      title: 'حذف قسم الخدمات',
      message: `هل أنت متأكد من رغبتك في حذف قسم الخدمات "${name}"؟`,
      confirmText: 'نعم، احذف القسم',
      cancelText: 'تراجع',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteServiceCategory(id);
          showToast('تم الحذف 🗑️', `تم حذف قسم الخدمات "${name}" بنجاح`, 'info');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'تعذر حذف القسم';
          showToast('خطأ في الحذف', msg, 'error');
        }
      },
    });
  };

  const handleDeleteProductCategory = (id: string, name: string) => {
    showConfirmModal({
      title: 'حذف قسم المنتجات',
      message: `هل أنت متأكد من رغبتك في حذف قسم المنتجات "${name}"؟`,
      confirmText: 'نعم، احذف القسم',
      cancelText: 'تراجع',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteProductCategory(id);
          showToast('تم الحذف 🗑️', `تم حذف قسم المنتجات "${name}" بنجاح`, 'info');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'تعذر حذف القسم';
          showToast('خطأ في الحذف', msg, 'error');
        }
      },
    });
  };

  const handleDeleteExpenseCategory = (id: string, name: string) => {
    showConfirmModal({
      title: 'حذف بند المصروفات',
      message: `هل أنت متأكد من رغبتك في حذف بند المصروفات "${name}"؟`,
      confirmText: 'نعم، احذف البند',
      cancelText: 'تراجع',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteExpenseCategory(id);
          showToast('تم الحذف 🗑️', `تم حذف بند المصروفات "${name}" بنجاح`, 'info');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'تعذر حذف البند';
          showToast('خطأ في الحذف', msg, 'error');
        }
      },
    });
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
        </div>
      </div>

      {/* Manager Category Management Section */}
      <Card className="border-blue-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>إدارة الأقسام وبنود المصروفات (إعدادات المدير)</CardTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">إنشاء أقسام جديدة للخدمات أو المنتجات أو إضافة بند مصروفات</p>
            </div>
          </div>
        </CardHeader>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setNameInput('');
              setDescInput('');
              setActiveModal('service_cat');
            }}
            className="p-5 h-auto flex flex-col items-center justify-center gap-3 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 group text-center cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900">قسم خدمات جديد</div>
              <div className="text-xs text-slate-500 mt-0.5">مثل: غسيل، تلميع، عفشة</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setNameInput('');
              setDescInput('');
              setActiveModal('product_cat');
            }}
            className="p-5 h-auto flex flex-col items-center justify-center gap-3 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 group text-center cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900">قسم منتجات جديد</div>
              <div className="text-xs text-slate-500 mt-0.5">مثل: أدوات، معطرات، زيوت</div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setNameInput('');
              setActiveModal('expense_cat');
            }}
            className="p-5 h-auto flex flex-col items-center justify-center gap-3 border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 group text-center cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900">قسم مصروفات جديد</div>
              <div className="text-xs text-slate-500 mt-0.5">مثل: كهرباء، عمالة، صيانة</div>
            </div>
          </Button>
        </div>

        {/* Existing Categories Summary with Delete Option */}
        <div className="mt-8 pt-5 border-t border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-700">الأقسام الحالية المتاحة في النظام (اضغط أفقياً للحذف):</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Service Categories List */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>أقسام الخدمات ({serviceCategories.length})</span>
                </span>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {serviceCategories.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-3">لا توجد أقسام خدمات بعد</p>
                ) : (
                  serviceCategories.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-white border border-slate-100 text-xs font-bold text-slate-700 flex items-center justify-between shadow-2xs group hover:border-red-200 transition-colors">
                      <div className="flex items-center gap-2">
                        <Badge variant="blue" size="xs">خدمات</Badge>
                        <span>{c.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteServiceCategory(c.id, c.name)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="حذف هذا القسم"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Product Categories List */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>أقسام المنتجات ({productCategories.length})</span>
                </span>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {productCategories.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-3">لا توجد أقسام منتجات بعد</p>
                ) : (
                  productCategories.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-white border border-slate-100 text-xs font-bold text-slate-700 flex items-center justify-between shadow-2xs group hover:border-red-200 transition-colors">
                      <div className="flex items-center gap-2">
                        <Badge variant="blue" size="xs">منتجات</Badge>
                        <span>{c.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteProductCategory(c.id, c.name)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="حذف هذا القسم"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expense Categories List */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span>بنود المصروفات ({expenseCategories.length})</span>
                </span>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {expenseCategories.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-3">لا توجد بنود مصروفات بعد</p>
                ) : (
                  expenseCategories.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-white border border-slate-100 text-xs font-bold text-slate-700 flex items-center justify-between shadow-2xs group hover:border-red-200 transition-colors">
                      <div className="flex items-center gap-2">
                        <Badge variant="amber" size="xs">مصروفات</Badge>
                        <span>{c.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteExpenseCategory(c.id, c.name)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="حذف هذا البند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
    </div>
  );
};
