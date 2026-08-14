import React, { useState } from 'react';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PlateBadge } from '../../components/ui/PlateBadge';
import { PriceDisplay } from '../../components/ui/PriceDisplay';
import {
  TrendingUp,
  Car,
  Receipt,
  PlusCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  PackageCheck,
  ChevronDown,
} from 'lucide-react';
import { formatArabicDate } from '../../lib/utils';

export const DashboardView: React.FC = () => {
  const { sales, vehicles, products, currentRole } = useDataStore();
  const { setActiveTab, setActiveReceiptSaleId, setReceiptModalOpen } = useUIStore();

  // Pagination state for 10 items limit
  const [visibleSalesCount, setVisibleSalesCount] = useState(10);
  const [visibleLowStockCount, setVisibleLowStockCount] = useState(10);

  // Metrics Calculations
  const totalTodayRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalVehiclesCount = vehicles.length;
  const totalSalesCount = sales.length;

  // Low stock products
  const lowStockProducts = products.filter((p) => p.current_stock <= p.minimum_stock);

  const displayedSales = sales.slice(0, visibleSalesCount);
  const displayedLowStock = lowStockProducts.slice(0, visibleLowStockCount);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between gap-4 bg-gradient-to-l from-blue-600 via-blue-700 to-indigo-800 text-white p-5 sm:p-6 rounded-3xl shadow-lg shadow-blue-600/15 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            أهلاً بك في <span className="whitespace-nowrap">V8&nbsp;STANCE</span>
          </h2>
        </div>

        <div className="relative z-10 shrink-0">
          <Button
            size="md"
            onClick={() => setActiveTab('pos')}
            className="bg-white hover:bg-slate-50 text-blue-700 font-bold shadow-md hover:shadow-lg border-0 px-4 sm:px-5"
            icon={<PlusCircle className="w-5 h-5 text-blue-600" />}
          >
            عملية جديدة
          </Button>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1 */}
        <Card className="p-5 border-slate-100 hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">مبيعات اليوم</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <PriceDisplay amount={totalTodayRevenue} size="xl" />
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>متابعة مباشرة للتحصيل اليومي</span>
            </div>
          </div>
        </Card>

        {/* KPI 2 */}
        <Card className="p-5 border-slate-100 hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">السيارات المغسولة</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {totalVehiclesCount}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">إجمالي السيارات المسجلة</p>
          </div>
        </Card>

        {/* KPI 3 */}
        <Card className="p-5 border-slate-100 hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">عدد العمليات اليوم</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {totalSalesCount}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">فواتير مدفوعة بالكامل</p>
          </div>
        </Card>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List (2 columns wide) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <CardTitle>أحدث عمليات اليوم</CardTitle>
              </div>
              <Badge variant="neutral" size="sm">
                عرض {displayedSales.length} من {sales.length}
              </Badge>
            </CardHeader>

            <div className="space-y-3">
              {sales.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  لا توجد عمليات اليوم، ابدأ عملية جديدة الآن!
                </div>
              ) : (
                displayedSales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => {
                      setActiveReceiptSaleId(sale.id);
                      setReceiptModalOpen(true);
                    }}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex flex-col gap-1.5 min-w-0">
                      {/* السطر الأول: رقم السيارة وبجواره رقم التسجيل */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <PlateBadge
                          plateDisplay={sale.vehicle?.plate_display || 'س ب ج 1234'}
                          size="sm"
                        />
                        <Badge variant="neutral" size="sm">
                          {sale.invoice_number}
                        </Badge>
                      </div>

                      {/* السطر الثاني: اسم العميل */}
                      <div className="text-xs font-bold text-slate-900 flex items-center">
                        <span className="text-slate-400 font-normal text-[11px] ml-1">اسم العميل:</span>
                        {sale.vehicle?.driver_name || 'سائق'}
                      </div>

                      {/* السطر الثالث: الخدمات المقدمة */}
                      <div className="text-[11px] text-slate-600 font-medium line-clamp-1">
                        <span className="text-slate-400 font-normal ml-1">الخدمات:</span>
                        {sale.items?.map((i) => `${i.item_name_snapshot} (${i.quantity})`).join(' • ')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <PriceDisplay amount={sale.total} size="sm" />
                        <span className="block text-[10px] text-slate-400 font-medium">
                          {formatArabicDate(sale.created_at)}
                        </span>
                      </div>
                      <Badge
                        variant={sale.payment_method === 'CASH' ? 'green' : 'blue'}
                        size="sm"
                      >
                        {sale.payment_method === 'CASH' ? 'نقداً' : 'إلكتروني'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Show More Button */}
            {sales.length > visibleSalesCount && (
              <div className="text-center pt-4 border-t border-slate-100 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleSalesCount((prev) => prev + 10)}
                  className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto cursor-pointer"
                  icon={<ChevronDown className="w-4 h-4 text-blue-600" />}
                >
                  عرض المزيد ({sales.length - visibleSalesCount} عمليات أخرى)
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar Alerts & Quick Actions (1 column wide) */}
        <div className="space-y-6">
          {/* Inventory Alerts Card */}
          <Card className="border-amber-100 bg-gradient-to-br from-white to-amber-50/30">
            <CardHeader className="border-amber-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-amber-900">تنبيهات المخزون</CardTitle>
              </div>
              <Badge variant="amber" size="sm">
                {lowStockProducts.length} منتجات
              </Badge>
            </CardHeader>

            {lowStockProducts.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200/60 font-semibold">
                <PackageCheck className="w-4 h-4 shrink-0" />
                <span>جميع المنتجات متوفرة بكميات ممتازة!</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayedLowStock.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (currentRole === 'MANAGER') {
                        setActiveTab('inventory');
                      }
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200/80 shadow-2xs transition-colors ${
                      currentRole === 'MANAGER' ? 'hover:bg-amber-50/50 cursor-pointer' : ''
                    }`}
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{p.name}</h5>
                      <span className="text-[10px] text-slate-500 font-medium">
                        الحد الأدنى: {p.minimum_stock} {p.unit}
                      </span>
                    </div>
                    <Badge variant={p.current_stock === 0 ? 'red' : 'amber'} size="sm">
                      {p.current_stock === 0 ? '🔴 نافد' : `🟡 المتاح: ${p.current_stock}`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Show More Button for Low Stock */}
            {lowStockProducts.length > visibleLowStockCount && (
              <div className="text-center pt-3 border-t border-amber-100 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleLowStockCount((prev) => prev + 10)}
                  className="text-xs font-bold text-amber-900 border-amber-200 hover:bg-amber-100/60 w-full cursor-pointer"
                  icon={<ChevronDown className="w-4 h-4 text-amber-700" />}
                >
                  عرض المزيد ({lowStockProducts.length - visibleLowStockCount} منتجات أخرى)
                </Button>
              </div>
            )}

            {currentRole === 'MANAGER' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('inventory')}
                className="w-full mt-4 text-xs font-bold border-amber-200 text-amber-900 hover:bg-amber-100/50 cursor-pointer"
              >
                إدارة وتزويد المخزون
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
