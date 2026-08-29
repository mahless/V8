import React from 'react';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { Modal } from './Modal';
import { Button } from './Button';
import { Printer, Sparkles } from 'lucide-react';
import { formatArabicDate } from '../../lib/utils';

export const ReceiptModal: React.FC = () => {
  const { sales, profiles } = useDataStore();
  const { isReceiptModalOpen, setReceiptModalOpen, activeReceiptSaleId } = useUIStore();

  const selectedSale = sales.find((s) => s.id === activeReceiptSaleId) || sales[0];

  const handlePrint = () => {
    const receipt = document.getElementById('thermal-receipt');
    if (!receipt) return;
    
    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;
    
    // Extract all styles to ensure Tailwind works
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((tag) => tag.outerHTML)
      .join('\n');
      
    // Write the document to the iframe
    iframeDoc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>فاتورة - ${selectedSale?.invoice_number || 'Receipt'}</title>
          ${styles}
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
            @page { margin: 0; }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
              height: max-content !important;
              overflow: visible !important;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #thermal-receipt {
              width: 100% !important;
              max-width: 80mm !important;
              margin: 0 !important;
              padding: 2mm !important;
              box-shadow: none !important;
              border: none !important;
            }
          </style>
        </head>
        <body>
          ${receipt.outerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();
    
    // Wait for styles and fonts to be applied
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      // Cleanup after print dialog closes
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 500);
    }, 500);
  };

  if (!isReceiptModalOpen || !selectedSale) return null;

  return (
    <Modal
      isOpen={isReceiptModalOpen}
      onClose={() => setReceiptModalOpen(false)}
      maxWidth="sm"
    >
      <div className="space-y-4">
        {/* Thermal Receipt Paper Visual */}
        <div
          id="thermal-receipt"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-inner font-sans text-xs text-slate-900 space-y-3.5 select-none"
        >
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white mx-auto flex items-center justify-center font-black shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-slate-900 tracking-wider font-mono">
              V8 STANCE
            </h3>
            <p className="text-[11px] text-slate-800 font-mono font-bold mt-1" dir="ltr">
              01240023011 / 01066821455
            </p>
          </div>

          {/* Details */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">رقم الفاتورة:</span>
              <span className="font-bold font-mono text-slate-900">{selectedSale.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">التاريخ:</span>
              <span className="text-slate-800">{formatArabicDate(selectedSale.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">رقم السيارة:</span>
              <span className="font-bold text-slate-900">{selectedSale.vehicle?.plate_display || 'بدون لوحة'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">العميل:</span>
              <span className="text-slate-800 font-semibold">{selectedSale.vehicle?.driver_name || 'عميل نقدي'}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-2 border-t border-b border-dashed border-slate-300 space-y-1.5">
            <div className="flex justify-between font-bold text-[11px] text-slate-900 pb-1 border-b border-slate-100">
              <span>الخدمة / المنتج</span>
              <span>السعر</span>
            </div>
            {selectedSale.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px] text-slate-800">
                <span>
                  {item.item_name_snapshot} × {item.quantity}
                </span>
                <span className="font-bold font-mono">{item.total} ج.م</span>
              </div>
            ))}
          </div>

          {/* Totals & Payment */}
          <div className="space-y-1 text-xs">
            {selectedSale.discount > 0 && (
              <>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>المجموع قبل الخصم:</span>
                  <span>{selectedSale.subtotal} ج.م</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                  <span>الخصم المطبق:</span>
                  <span>-{selectedSale.discount} ج.م</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
              <span>الإجمالي الصافي المدفوع:</span>
              <span className="text-blue-700 font-mono font-black">{selectedSale.total} ج.م</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 pt-0.5">
              <span>طريقة الدفع:</span>
              <span className="font-semibold">{selectedSale.payment_method === 'CASH' ? 'نقداً' : 'إلكتروني'}</span>
            </div>
          </div>

          {/* Receipt Footer with Address above Thank You */}
          <div className="text-center pt-3 border-t border-dashed border-slate-300 space-y-1.5">
            {/* Address */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 text-[11px] font-bold text-slate-900 leading-snug">
              📍  العنوان: الدخيلة طريق البحر الرئيسي قبل المحكمة بجوار عماره المأذون
            </div>

            {/* Thank you message */}
            <p className="text-[11px] font-bold text-slate-700 pt-0.5">
              شكراً لزيارتكم نتمنى لكم يوماً سعيداً ✨🚗
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={() => setReceiptModalOpen(false)}>
            إغلاق
          </Button>

          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
              طباعة الفاتورة 🖨️
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
