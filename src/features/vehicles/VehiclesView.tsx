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
  User,
  History,
  Calendar,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import {
  formatArabicDate,
  validatePlateLetters,
  validatePlateNumbers,
  validatePhone,
  buildPlateDisplay,
  formatPlateLettersInput,
  convertArabicDigitsToEnglish,
} from '../../lib/utils';
import { Vehicle } from '../../types';

export const VehiclesView: React.FC = () => {
  const { vehicles, sales, addVehicle, searchVehicles } = useDataStore();
  const { setActiveTab, setSelectedVehicle, showToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileVehicle, setSelectedProfileVehicle] = useState<Vehicle | null>(vehicles[0] || null);

  // New Vehicle Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [letters, setLetters] = useState('');
  const [numbers, setNumbers] = useState('');
  const [driver, setDriver] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredVehicles = searchQuery.trim() ? searchVehicles(searchQuery) : vehicles;

  // History for selected profile
  const vehicleSalesHistory = selectedProfileVehicle
    ? sales.filter((s) => s.vehicle_id === selectedProfileVehicle.id)
    : [];

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!validatePlateLetters(letters)) errs.letters = 'أدخل من 1 إلى 4 حروف صحيحة (مثال: س ب ج)';
    if (!validatePlateNumbers(numbers)) errs.numbers = 'أدخل أرقام صحيحة (مثال: 1234)';
    if (!driver.trim()) errs.driver = 'اسم السائق مطلوب';
    if (!validatePhone(phone)) errs.phone = 'رقم الهاتف 11 رقم (مثال: 01012345678)';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const plateDisplay = buildPlateDisplay(letters, numbers);
    const created = addVehicle({
      plate_letters: letters.trim(),
      plate_numbers: numbers.trim(),
      plate_display: plateDisplay,
      driver_name: driver.trim(),
      phone: phone.trim(),
      notes: notes.trim() || undefined,
    });

    setSelectedProfileVehicle(created);
    setIsNewModalOpen(false);
    setLetters('');
    setNumbers('');
    setDriver('');
    setPhone('');
    setNotes('');
    setErrors({});
    showToast('تم التسجيل', `تمت إضافة السيارة ${plateDisplay} بنجاح`, 'success');
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
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            البحث في قاعدة بيانات السيارات، معرفة عدد الزيارات، والسجل الزمني الكامل للغسيل والصيانة.
          </p>
        </div>

        <Button
          onClick={() => setIsNewModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
          className="shadow-xs"
        >
          إضافة سيارة جديدة
        </Button>
      </div>

      {/* Main Grid: Vehicle List (Left) + Detailed Profile Timeline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Vehicles Directory (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <div className="mb-4">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم اللوحة، اسم العميل، أو الهاتف..."
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pl-1">
              {filteredVehicles.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  لا توجد نتائج مطابقة لـ "{searchQuery}"
                </div>
              ) : (
                filteredVehicles.map((v) => {
                  const isSelected = selectedProfileVehicle?.id === v.id;
                  return (
                    <VehicleCard
                      key={v.id}
                      vehicle={v}
                      badge={
                        <Badge variant="blue" size="sm">
                          {v.visits_count || 0} زيارة
                        </Badge>
                      }
                      onClick={() => setSelectedProfileVehicle(v)}
                      className={
                        isSelected
                          ? 'bg-blue-50/90 border-blue-500 shadow-sm ring-1 ring-blue-500/30'
                          : 'bg-white border-slate-200/80 hover:border-blue-200 hover:bg-slate-50/50'
                      }
                      size="sm"
                    />
                  );
                })
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
                      <h2 className="text-base sm:text-lg font-black text-slate-900">
                        {selectedProfileVehicle.driver_name}
                      </h2>
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
                    <span className="text-[10px] text-slate-400 font-bold block">إجمالي الإنفاق</span>
                    <PriceDisplay amount={selectedProfileVehicle.total_spent || 0} size="sm" className="text-blue-700" />
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">آخر زيارة</span>
                    <span className="text-xs font-semibold text-slate-800 block mt-1">
                      {selectedProfileVehicle.last_visit_at
                        ? formatArabicDate(selectedProfileVehicle.last_visit_at)
                        : 'حديثة'}
                    </span>
                  </div>
                </div>

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
                    vehicleSalesHistory.map((s, idx) => (
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
