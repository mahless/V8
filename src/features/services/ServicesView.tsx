import React, { useState } from 'react';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { Service } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PriceDisplay } from '../../components/ui/PriceDisplay';
import { Modal } from '../../components/ui/Modal';
import { convertArabicDigitsToEnglish } from '../../lib/utils';
import {
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  Tag,
  DollarSign,
  AlignLeft,
  Power,
} from 'lucide-react';

export const ServicesView: React.FC = () => {
  const { services, serviceCategories, addService, updateService, deleteService, toggleServiceActive } = useDataStore();
  const { showToast, showConfirmModal } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category_id: serviceCategories[0]?.id || 'sc-1',
    price: '',
    description: '',
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filter Services
  const filteredServices = services.filter((s) => {
    const matchesCategory = selectedCategoryId === 'ALL' || s.category_id === selectedCategoryId;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q));
    return matchesCategory && matchesQuery;
  });

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      category_id: serviceCategories[0]?.id || 'sc-1',
      price: '',
      description: '',
      is_active: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category_id: service.category_id,
      price: String(service.price),
      description: service.description || '',
      is_active: service.is_active,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'يرجى إدخال اسم الخدمة';
    const numPrice = Number(convertArabicDigitsToEnglish(formData.price));
    if (isNaN(numPrice) || numPrice <= 0) errors.price = 'يرجى إدخال سعر صحيح أكبر من صفر';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingService) {
      updateService(editingService.id, {
        name: formData.name.trim(),
        category_id: formData.category_id,
        price: numPrice,
        description: formData.description.trim(),
        is_active: formData.is_active,
      });
      showToast('تم التحديث', `تم تعديل خدمة "${formData.name}" بنجاح`, 'success');
    } else {
      addService({
        name: formData.name.trim(),
        category_id: formData.category_id,
        price: numPrice,
        description: formData.description.trim(),
        is_active: formData.is_active,
      });
      showToast('تمت الإضافة', `تمت إضافة خدمة "${formData.name}" بنجاح`, 'success');
    }

    setIsModalOpen(false);
  };

  const handleDeleteService = (service: Service) => {
    showConfirmModal({
      title: 'حذف الخدمة',
      message: `هل أنت متأكد من رغبتك في حذف خدمة "${service.name}"؟ لن تظهر هذه الخدمة في نقطة البيع بعد الآن.`,
      confirmText: 'نعم، احذف الخدمة',
      cancelText: 'تراجع',
      type: 'danger',
      onConfirm: () => {
        deleteService(service.id);
        showToast('تم الحذف', `تم حذف خدمة "${service.name}" بنجاح`, 'info');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-600" />
            <span>دليل الخدمات والصيانة</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            إدارة جميع الخدمات المقدمة وتحديد أسعارها وإضافتها لنقطة البيع
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-48 sm:w-64">
            <Input
              placeholder="ابحث باسم الخدمة..."
              icon={<Search className="w-4 h-4 text-slate-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            onClick={handleOpenAddModal}
            icon={<Plus className="w-4 h-4" />}
            className="shadow-sm shadow-blue-600/20 shrink-0"
          >
            إضافة خدمة جديدة
          </Button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center justify-start gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedCategoryId('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            selectedCategoryId === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          كل الخدمات ({services.length})
        </button>
        {serviceCategories.map((cat) => {
          const count = services.filter((s) => s.category_id === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategoryId === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Wrench className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">لا توجد خدمات مطابقة</h3>
          <p className="text-xs text-slate-500 mt-1">جرب تغيير الفئة أو البحث عن اسم آخر</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => {
            const category = serviceCategories.find((c) => c.id === service.category_id);
            return (
              <div
                key={service.id}
                className={`bg-white rounded-2xl border p-5 transition-all flex flex-col justify-between gap-4 group hover:shadow-md ${
                  service.is_active ? 'border-slate-200/80' : 'border-slate-200/60 opacity-60 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant={service.is_active ? 'blue' : 'neutral'} size="sm">
                      {category ? category.name : 'خدمة العامة'}
                    </Badge>

                    <button
                      onClick={() => toggleServiceActive(service.id)}
                      title={service.is_active ? 'تعطيل الخدمة' : 'تفعيل الخدمة'}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        service.is_active
                          ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {service.name}
                  </h3>

                  {service.description && (
                    <p className="text-xs text-slate-500 font-medium mt-1.5 line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">سعر الخدمة</span>
                    <PriceDisplay amount={service.price} size="lg" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(service)}
                      className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="تعديل الخدمة والسعر"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="حذف الخدمة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'تعديل الخدمة والسعر' : 'إضافة خدمة جديدة'}
      >
        <form onSubmit={handleSaveService} className="space-y-4 pt-2">
          <Input
            label="اسم الخدمة"
            placeholder="مثال: غسيل خارجي + صالون"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            icon={<Tag className="w-4 h-4" />}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">قسم الخدمة</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all font-sans"
            >
              {serviceCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="سعر الخدمة (بالجنيه)"
            type="text"
            placeholder="مثال: 80"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: convertArabicDigitsToEnglish(e.target.value) })}
            error={formErrors.price}
            icon={<DollarSign className="w-4 h-4" />}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">وصف الخدمة (اختياري)</label>
            <textarea
              rows={3}
              placeholder="اكتب تفاصيل أو مميزات هذه الخدمة..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all font-sans"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="is_active_checkbox" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
              الخدمة متاحة للبيع في قائمة POS
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">
              {editingService ? 'حفظ التعديلات' : 'إضافة الخدمة'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
