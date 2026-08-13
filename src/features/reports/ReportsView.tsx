import React, { useState } from 'react';
import { useDataStore } from '../../stores/useDataStore';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PriceDisplay } from '../../components/ui/PriceDisplay';
import { BarChart3, TrendingUp, Coins, Wallet, Banknote, Wrench } from 'lucide-react';
import { convertArabicDigitsToEnglish } from '../../lib/utils';

type TimeFilter = 'TODAY' | 'WEEK' | 'MONTH';

export const ReportsView: React.FC = () => {
  const { sales, expenses } = useDataStore();
  const [dateRange, setDateRange] = useState<TimeFilter>('TODAY');

  // 1. Filter Sales and Expenses based on dateRange (TODAY, WEEK, MONTH)
  const filteredSales = sales.filter((sale) => {
    if (sale.status === 'CANCELLED') return false;
    const saleDate = new Date(sale.created_at);
    const now = new Date();
    saleDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    if (dateRange === 'TODAY') {
      return saleDate.getTime() === now.getTime();
    }
    if (dateRange === 'WEEK') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return saleDate >= weekAgo;
    }
    if (dateRange === 'MONTH') {
      return (
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });

  const filteredExpenses = expenses.filter((expense) => {
    const expDate = new Date(expense.created_at);
    const now = new Date();
    expDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    if (dateRange === 'TODAY') {
      return expDate.getTime() === now.getTime();
    }
    if (dateRange === 'WEEK') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return expDate >= weekAgo;
    }
    if (dateRange === 'MONTH') {
      return (
        expDate.getMonth() === now.getMonth() &&
        expDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });

  // Totals calculations
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpensesAmount;

  // Breakdown payment method
  const cashSalesTotal = filteredSales.filter((s) => s.payment_method === 'CASH').reduce((sum, s) => sum + s.total, 0);
  const walletSalesTotal = filteredSales.filter((s) => s.payment_method === 'WALLET').reduce((sum, s) => sum + s.total, 0);

  // 2. Service execution statistics calculation
  const serviceStatsMap: Record<string, { id: string; name: string; count: number; total: number }> = {};

  filteredSales.forEach((sale) => {
    if (sale.items) {
      sale.items.forEach((item) => {
        // Count all executed items (services and products)
        const key = item.service_id || item.product_id || item.item_name_snapshot;
        if (!serviceStatsMap[key]) {
          serviceStatsMap[key] = {
            id: key,
            name: item.item_name_snapshot,
            count: 0,
            total: 0,
          };
        }
        serviceStatsMap[key].count += item.quantity;
        serviceStatsMap[key].total += item.total;
      });
    }
  });

  // Top 10 Services sorted by execution count
  const top10Services = Object.values(serviceStatsMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Maximum count for percentage calculations
  const maxCount = Math.max(...top10Services.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>التقارير والأداء المالي</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            تحليل الإيرادات والمصروفات، أعلى الخدمات إنجازاً، وتوزيع طرق الدفع.
          </p>
        </div>

        {/* Dynamic Period Filter Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setDateRange('TODAY')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              dateRange === 'TODAY' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            اليوم
          </button>
          <button
            onClick={() => setDateRange('WEEK')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              dateRange === 'WEEK' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            هذا الأسبوع
          </button>
          <button
            onClick={() => setDateRange('MONTH')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              dateRange === 'MONTH' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            هذا الشهر
          </button>
        </div>
      </div>

      {/* Overview Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-blue-100 bg-gradient-to-br from-blue-50/40 via-white to-white">
          <span className="text-xs font-bold text-slate-500">إجمالي المبيعات</span>
          <div className="mt-2">
            <PriceDisplay amount={totalRevenue} size="xl" className="text-blue-700 font-black" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">من {filteredSales.length} عمليات</span>
        </Card>

        <Card className="p-5 border-amber-100 bg-gradient-to-br from-amber-50/30 via-white to-white">
          <span className="text-xs font-bold text-slate-500">إجمالي المصروفات</span>
          <div className="mt-2">
            <PriceDisplay amount={totalExpensesAmount} size="xl" className="text-amber-800 font-black" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">تشغيل، مياه، وصيانة</span>
        </Card>

        <Card className="p-5 border-emerald-100 bg-gradient-to-br from-emerald-50/30 via-white to-white">
          <span className="text-xs font-bold text-emerald-800">صافي الأرباح</span>
          <div className="mt-2">
            <PriceDisplay amount={netProfit} size="xl" className="text-emerald-700 font-black" />
          </div>
          <Badge variant="green" size="sm" className="mt-1">
            الأرباح المتبقية
          </Badge>
        </Card>
      </div>

      {/* Top 10 Services (Inventory Gauge Style Bars) */}
      <Card className="p-5 space-y-4">
        <CardHeader className="p-0 border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base font-bold text-slate-900">
                أعلى 10 خدمات تنفيذًا
              </CardTitle>
            </div>
            <Badge variant="blue" size="sm">
              {dateRange === 'TODAY' ? 'اليوم' : dateRange === 'WEEK' ? 'هذا الأسبوع' : 'هذا الشهر'}
            </Badge>
          </div>
        </CardHeader>

        {top10Services.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">
            لا توجد عمليات خدمات مسجلة لهذه الفترة المحددة
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {top10Services.map((service, idx) => {
              const fillPercentage = Math.min(100, Math.max(8, (service.count / maxCount) * 100));

              return (
                <div
                  key={service.id || idx}
                  className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2 hover:border-blue-300 transition-all shadow-2xs"
                >
                  {/* فوق البار: اسم الخدمة وعدد العمليات */}
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-mono font-black flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-slate-900 truncate">{service.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-blue-700 font-bold bg-blue-100/90 px-2 py-0.5 rounded-md text-xs font-mono">
                        {convertArabicDigitsToEnglish(service.count)} عمليات
                      </span>
                    </div>
                  </div>

                  {/* Stock Gauge Progress Bar (شريط المخزن المتفاعل) */}
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${fillPercentage}%`,
                      }}
                    />
                  </div>

                  {/* أسفل البار: الإجمالي المالي */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-0.5">
                    <span>نسبة الأداء مقارنة بالأعلى: %{convertArabicDigitsToEnglish(Math.round((service.count / maxCount) * 100))}</span>
                    <span className="text-slate-700 font-bold">الإجمالي: {service.total} ج.م</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Payment Method Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>توزيع الإيرادات حسب طريقة الدفع</CardTitle>
        </CardHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-900">المحصل نقداً</h4>
                <p className="text-[10px] text-emerald-700 mt-0.5">في الصندوق/الدرج</p>
              </div>
            </div>
            <PriceDisplay amount={cashSalesTotal} size="lg" className="text-emerald-900" />
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-blue-900">المحصل إلكتروني</h4>
                <p className="text-[10px] text-blue-700 mt-0.5">حسابات الدفع الإلكتروني والمحافظ</p>
              </div>
            </div>
            <PriceDisplay amount={walletSalesTotal} size="lg" className="text-blue-900" />
          </div>
        </div>
      </Card>
    </div>
  );
};
