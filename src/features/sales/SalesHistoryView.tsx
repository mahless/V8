import React, { useState } from 'react';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { PlateBadge } from '../../components/ui/PlateBadge';
import { PriceDisplay } from '../../components/ui/PriceDisplay';
import {
  Receipt,
  Search,
  ChevronDown,
} from 'lucide-react';
import { formatArabicDate } from '../../lib/utils';

export const SalesHistoryView: React.FC = () => {
  const { sales, profiles, currentRole } = useDataStore();
  const {
    setReceiptModalOpen,
    setActiveReceiptSaleId,
  } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [visibleSalesCount, setVisibleSalesCount] = useState(10);

  const filteredSales = sales.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.invoice_number.toLowerCase().includes(q) ||
      s.vehicle?.plate_display.toLowerCase().includes(q) ||
      s.vehicle?.driver_name.toLowerCase().includes(q) ||
      s.vehicle?.phone.includes(q)
    );
  });

  const displayedSales = filteredSales.slice(0, visibleSalesCount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            <span>سجل العمليات والفواتير</span>
          </h1>
        </div>

        <div className="w-full sm:w-72">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الفاتورة، اللوحة، العميل..."
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Sales Transactions List */}
      <Card>
        <div className="space-y-3">
          {filteredSales.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              لا توجد عمليات مطابقة لـ "{searchQuery}"
            </div>
          ) : (
            displayedSales.map((sale) => (
              <div
                key={sale.id}
                onClick={() => {
                  setActiveReceiptSaleId(sale.id);
                  setReceiptModalOpen(true);
                }}
                className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50/60 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  {/* السطر الأول: رقم السيارة وبجواره رقم التسجيل */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <PlateBadge plateDisplay={sale.vehicle?.plate_display} size="sm" />
                    <Badge variant="blue" size="sm">
                      {sale.invoice_number}
                    </Badge>
                  </div>

                  {/* السطر الثاني: اسم العميل والمنفذ (يظهر للمدير فقط) */}
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-3 flex-wrap">
                    <div>
                      <span className="text-slate-400 font-normal text-[11px] ml-1">اسم العميل:</span>
                      {sale.vehicle?.driver_name || 'سائق'}
                    </div>
                    {currentRole === 'MANAGER' && (
                      <div className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/60 font-bold">
                        👤 {
                          profiles.find((p) => p.id === sale.employee_id)?.full_name ||
                          (sale.notes && sale.notes.includes('[الموظف:')
                            ? sale.notes.match(/\[الموظف:\s*([^\]]+)\]/)?.[1]
                            : 'موظف')
                        }
                      </div>
                    )}
                  </div>

                  {/* السطر الثالث: الخدمات المقدمة */}
                  <div className="text-xs text-slate-600 font-medium line-clamp-1">
                    <span className="text-slate-400 font-normal ml-1">الخدمات:</span>
                    {sale.items?.map((i) => `${i.item_name_snapshot} (${i.quantity})`).join(' • ')}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <PriceDisplay amount={sale.total} size="md" className="text-blue-700" />
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {formatArabicDate(sale.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={sale.payment_method === 'CASH' ? 'green' : 'blue'} size="md">
                      {sale.payment_method === 'CASH' ? 'نقداً' : 'إلكتروني'}
                    </Badge>
                    <Button size="sm" variant="outline" className="text-xs py-1 px-2.5">
                      الإيصال 🖨️
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Show More Button */}
        {filteredSales.length > visibleSalesCount && (
          <div className="text-center pt-4 border-t border-slate-100 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleSalesCount((prev) => prev + 10)}
              className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto cursor-pointer"
              icon={<ChevronDown className="w-4 h-4 text-blue-600" />}
            >
              عرض المزيد ({filteredSales.length - visibleSalesCount} عمليات أخرى)
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
