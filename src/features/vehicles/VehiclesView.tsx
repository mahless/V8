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
  Car,
  Search,
  Plus,
  Phone,
  History,
  Sparkles,
  Award,
  Trash2,
  Gift,
  Star,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import {
  formatArabicDate,
  validatePlateLetters,
  validatePlateNumbers,
  validatePhone,
  buildPlateDisplay,
  formatPlateLettersInput,
} from '../../lib/utils';
import { Vehicle } from '../../types';

export const VehiclesView: React.FC = () => {
  const { vehicles, sales, addVehicle, searchVehicles, claimVipReward } = useDataStore();
  const { setActiveTab, setSelectedVehicle, showToast, showConfirmModal } = useUIStore();

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'vip'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileVehicle, setSelectedProfileVehicle] = useState<Vehicle | null>(vehicles[0] || null);

  const [visibleVehiclesCount, setVisibleVehiclesCount] = useState(10);
  const [visibleVehicleHistoryCount, setVisibleVehicleHistoryCount] = useState(10);

  // New Vehicle Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [letters, setLetters] = useState('');
  const [numbers, setNumbers] = useState('');
  const [driver, setDriver] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // VIP Logic Helper
  const getVipEligibleVisits = (v: Vehicle) => {
    const visits = v.visits_count || 0;
    const lastRewarded = v.last_rewarded_visit_count || 0;
    return Math.max(0, visits - lastRewarded);
  };

  const vipVehicles = vehicles.filter((v) => getVipEligibleVisits(v) >= 10);

  // Base list depending on subTab
  const baseList = activeSubTab === 'vip' ? vipVehicles : vehicles;

  // Filtered by Search
  const filteredVehicles = searchQuery.trim()
    ? baseList.filter((v) =>
        v.plate_display.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        v.driver_name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        v.phone.includes(searchQuery.trim())
      )
    : baseList;

  // History for selected profile
  const vehicleSalesHistory = selectedProfileVehicle
    ? sales.filter((s) => s.vehicle_id === selectedProfileVehicle.id)
    : [];

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!validatePlateLetters(letters)) errs.letters = 'أدخل من 1 إلى 4 حروف صحيحة (مثال: س ب ج)';
    if (!validatePlateNumbers(numbers)) errs.numbers = 'أدخل أرقام صحيحة (مثال: 1234)';
    if (!driver.trim()) errs.driver = 'اسم العميل مطلوب';
    if (!validatePhone(phone)) errs.phone = 'رقم الهاتف 11 رقم (مثال: 01012345678)';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const plateDisplay = buildPlateDisplay(letters, numbers);
    try {
      const created = await addVehicle({
        plate_letters: letters.trim(),
        plate_numbers: numbers.trim(),
        plate_display: plateDisplay,
        driver_name: driver.trim(),
        phone: phone.trim(),
        notes: notes.trim() || undefined,
      });

      if (created) {
        setSelectedProfileVehicle(created);
        showToast('تم التسجيل', `تمت إضافة السيارة ${plateDisplay} بنجاح`, 'success');
      }
    } catch (err) {
      showToast('خطأ في التسجيل', 'تعذر حفظ البيانات في قاعدة البيانات', 'error');
      return;
    }

    setIsNewModalOpen(false);
    setLetters('');
    setNumbers('');
    setDriver('');
    setPhone('');
    setNotes('');
    setErrors({});
  };

  const handleClaimVipDiscount = (vehicle: Vehicle) => {
    const eligibleVisits = getVipEligibleVisits(vehicle);
    showConfirmModal({
      title: 'تقديم خصم العميل المميز ⭐',
      message: `هل قمت بتقديم الخصم/المكافأة للعميل "${vehicle.driver_name}"؟ سيتم حذف العميل من قائمة المميزين مؤقتاً حتى يكمل 10 زيارات جديدة (${eligibleVisits} زيارات مسجلة حالياً).`,
      confirmText: 'نعم، تقديم الخصم وإعادة التعيين',
      cancelText: 'إلغاء',
      type: 'warning',
      onConfirm: async () => {
        try {
          await claimVipReward(vehicle.id);
          showToast(
            'تم تقديم الخصم ⭐',
            `تم استهلاك مكافأة العميل ${vehicle.driver_name} وإزالته لحين إتمام 10 زيارات قادمة`,
            'success'
          );
        } catch (err) {
          showToast('خطأ', 'تعذر تحديث حالة الخصم للعميل', 'error');
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-600" />
            <span>سجل السيارات والعملاء</span>
          </h1>
        </div>

        <Button
          onClick={() => setIsNewModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
          className="shadow-xs"
        >
          إضافة سيارة جديدة
        </Button>
      </div>

      {/* Navigation Sub-Tabs: All Vehicles vs VIP Clients */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('all')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'all'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>جميع العملاء والسيارات</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeSubTab === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {vehicles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('vip')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'vip'
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
              : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
          <span>عميل مميز (خصم 10 زيارات)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeSubTab === 'vip' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
          }`}>
            {vipVehicles.length}
          </span>
        </button>
      </div>

      {/* Main Grid: Vehicle Directory (Left) + Detailed Profile Timeline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Vehicles Directory (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <div className="mb-4">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeSubTab === 'vip' ? 'ابحث في قائمة العملاء المميزين...' : 'ابحث برقم اللوحة، اسم العميل، أو الهاتف...'}
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pl-1">
              {filteredVehicles.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {activeSubTab === 'vip'
                    ? 'لا يوجد عملاء مميزين مستحقين للخصم حالياً (يتطلب 10 زيارات أو أكثر).'
                    : `لا توجد نتائج مطابقة لـ "${searchQuery}"`}
                </div>
              ) : (
                filteredVehicles.slice(0, visibleVehiclesCount).map((v) => {
                  const isSelected = selectedProfileVehicle?.id === v.id;
                  const eligibleVisits = getVipEligibleVisits(v);
                  const isVip = eligibleVisits >= 10;

                  return (
                    <div key={v.id} className="relative group">
                      <VehicleCard
                        vehicle={v}
                        badge={
                          isVip ? (
                            <Badge variant="green" size="sm" className="bg-amber-500 text-white border-amber-600 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-white" />
                              <span>مميز ({eligibleVisits} زيارات)</span>
                            </Badge>
                          ) : (
                            <Badge variant="blue" size="sm">
                              {v.visits_count || 0} زيارة
                            </Badge>
                          )
                        }
                        action={
                          isVip ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClaimVipDiscount(v);
                              }}
                              className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all cursor-pointer shadow-xs border border-rose-200"
                              title="تقديم الخصم وحذف من القائمة حتى 10 زيارات جديدة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : undefined
                        }
                        onClick={() => setSelectedProfileVehicle(v)}
                        className={
                          isSelected
                            ? 'bg-blue-50/90 border-blue-500 shadow-sm ring-1 ring-blue-500/30'
                            : isVip
                            ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                            : 'bg-white border-slate-200/80 hover:border-blue-200 hover:bg-slate-50/50'
                        }
                        size="sm"
                      />
                    </div>
                  );
                })
              )}

              {/* Show More Vehicles Button */}
              {filteredVehicles.length > visibleVehiclesCount && (
                <div className="text-center pt-3 border-t border-slate-100 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleVehiclesCount((prev) => prev + 10)}
                    className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 w-full cursor-pointer"
                    icon={<ChevronDown className="w-4 h-4 text-blue-600" />}
                  >
                    عرض المزيد ({filteredVehicles.length - visibleVehiclesCount} سيارات أخرى)
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Vehicle Detailed Timeline Profile (7 cols) */}
        <div className="lg:col-span-7">
          {selectedProfileVehicle ? (
            <div className="space-y-6">
              {/* Profile Card Summary */}
              <Card className="border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <PlateBadge plateDisplay={selectedProfileVehicle.plate_display} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-slate-900">
                          {selectedProfileVehicle.driver_name}
                        </h2>
                        {getVipEligibleVisits(selectedProfileVehicle) >= 10 && (
                          <Badge variant="green" size="xs" className="bg-amber-500 text-white">
                            ⭐ عميل مميز
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedProfileVehicle.phone}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedVehicle(selectedProfileVehicle);
                      setActiveTab('pos');
                    }}
                    icon={<Sparkles className="w-4 h-4 text-white" />}
                  >
                    بدء عملية جديدة للسيارة
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 pt-2">
                  <div className="p-3 bg-white rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">إجمالي الزيارات</span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {selectedProfileVehicle.visits_count || 0}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">زيارات الدورة الحالية</span>
                    <span className="text-lg font-black text-amber-600 font-mono">
                      {getVipEligibleVisits(selectedProfileVehicle)} / 10
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">إجمالي الإنفاق</span>
                    <PriceDisplay amount={selectedProfileVehicle.total_spent || 0} size="sm" className="text-blue-700" />
                  </div>
                </div>

                {getVipEligibleVisits(selectedProfileVehicle) >= 10 && (
                  <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900 font-bold">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>العميل مستحق لخصم الزيارة العاشرة ⭐</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleClaimVipDiscount(selectedProfileVehicle)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-1.5 h-auto shrink-0"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      تقديم الخصم وإعادة التعيين
                    </Button>
                  </div>
                )}

                {selectedProfileVehicle.notes && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 font-medium">
                    📝 {selectedProfileVehicle.notes}
                  </div>
                )}
              </Card>

              {/* History Timeline */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    <CardTitle>سجل الزيارات والفواتير السابقة</CardTitle>
                  </div>
                  <Badge variant="neutral" size="sm">
                    {vehicleSalesHistory.length} فواتير
                  </Badge>
                </CardHeader>

                <div className="space-y-4">
                  {vehicleSalesHistory.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      لا توجد فواتير سابقة مسجلة لهذه السيارة حتى الآن.
                    </div>
                  ) : (
                    vehicleSalesHistory.slice(0, visibleVehicleHistoryCount).map((s) => (
                      <div key={s.id} className="relative pl-4 border-r-2 border-blue-500 pr-4 py-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{s.invoice_number}</span>
                            <Badge variant={s.payment_method === 'CASH' ? 'green' : 'blue'} size="sm">
                              {s.payment_method === 'CASH' ? 'نقداً' : 'إلكتروني'}
                            </Badge>
                          </div>
                          <PriceDisplay amount={s.total} size="sm" />
                        </div>

                        <div className="mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-700 font-medium">
                            {s.items?.map((i) => i.item_name_snapshot).join(' + ')}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            {formatArabicDate(s.created_at)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Show More Vehicle History Button */}
                  {vehicleSalesHistory.length > visibleVehicleHistoryCount && (
                    <div className="text-center pt-3 border-t border-slate-100 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVisibleVehicleHistoryCount((prev) => prev + 10)}
                        className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 w-full cursor-pointer"
                        icon={<ChevronDown className="w-4 h-4 text-blue-600" />}
                      >
                        عرض المزيد ({vehicleSalesHistory.length - visibleVehicleHistoryCount} فواتير أخرى)
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-12 text-center text-slate-400">
              اختر سيارة من القائمة لعرض السجل والبيانات بالتفصيل.
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Add New Vehicle */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="إضافة سيارة جديدة"
        description="تسجيل بيانات السيارة والسائق للعميل الجديد"
      >
        <form onSubmit={handleCreateVehicle} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="حروف اللوحة (1-4 حروف)"
              placeholder="مثال: س ب ج"
              value={letters}
              onChange={(e) => setLetters(formatPlateLettersInput(e.target.value))}
              error={errors.letters}
            />
            <Input
              label="أرقام اللوحة (1-4 أرقام)"
              placeholder="مثال: 1234"
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              error={errors.numbers}
            />
          </div>

          <Input
            label="اسم السائق / العميل"
            placeholder="مثال: أحمد مصطفى"
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            error={errors.driver}
          />

          <Input
            label="رقم الهاتف"
            placeholder="01012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
          />

          <Input
            label="ملاحظات العميل (اختياري)"
            placeholder="تفضيلات الغسيل..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsNewModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">حفظ السيارة</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
