import React, { useState, useEffect } from 'react';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { PriceDisplay } from '../../components/ui/PriceDisplay';
import { Modal } from '../../components/ui/Modal';
import { Coins, Plus, Receipt, Package, CheckCircle2, Box, ChevronDown } from 'lucide-react';
import { formatArabicDate } from '../../lib/utils';

export const ExpensesView: React.FC = () => {
  const { expenses, expenseCategories, products, addExpense, currentRole } = useDataStore();
  const { showToast } = useUIStore();

  const [visibleExpensesCount, setVisibleExpensesCount] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id || '');
  const [isStockDeduction, setIsStockDeduction] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');

  const displayedExpenses = expenses.slice(0, visibleExpensesCount);

  const currentCategory = expenseCategories.find((c) => c.id === categoryId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Auto-set product selection when modal opens or products update
  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  // Update amount & description when product or quantity changes in stock deduction mode
  useEffect(() => {
    if (isStockDeduction && selectedProduct) {
      const calculatedAmount = selectedProduct.purchase_price * quantity;
      setAmount(calculatedAmount);
      setDescription(`استهلاك من المخزن: ${selectedProduct.name} (${quantity} ${selectedProduct.unit}) بسعر التكلفة`);
    }
  }, [isStockDeduction, selectedProductId, quantity, selectedProduct]);

  const handleOpenModal = () => {
    setCategoryId(expenseCategories[0]?.id || '');
    setIsStockDeduction(true);
    if (products.length > 0) {
      setSelectedProductId(products[0].id);
      const p = products[0];
      setAmount(p.purchase_price * 1);
      setDescription(`استهلاك من المخزن: ${p.name} (1 ${p.unit}) بسعر التكلفة`);
    } else {
      setAmount(100);
      setDescription('');
    }
    setQuantity(1);
    setIsModalOpen(true);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isStockDeduction) {
      if (!selectedProduct) {
        showToast('يرجى اختيار منتج', 'لا بد من اختيار منتج من المخزن للخصم', 'error');
        return;
      }
      if (quantity <= 0) {
        showToast('الكمية غير صحيحة', 'يرجى إدخال كمية مستهلكة أكبر من صفر', 'error');
        return;
      }
      if (selectedProduct.current_stock < quantity) {
        showToast(
          'المخزون غير كاف',
          `الرصيد المتاح بالمخزن (${selectedProduct.current_stock} ${selectedProduct.unit}) أقل من الكمية المطلوبة (${quantity})`,
          'error'
        );
        return;
      }
    }

    if (!description.trim()) {
      showToast('البيان مطلوب', 'يرجى إدخال سبب المصروف', 'error');
      return;
    }
    if (amount <= 0) {
      showToast('المبلغ غير صحيح', 'المبلغ يجب أن يكون أكبر من صفر', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isStockDeduction && selectedProduct) {
        await addExpense({
          category_id: categoryId || undefined,
          amount: Number(amount),
          description: description.trim(),
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          quantity: Number(quantity),
        });

        showToast(
          'تم تسجيل المصروف والخصم 📦',
          `تمت إضافة ${amount} ج.م بسعر التكلفة وخصم (${quantity} ${selectedProduct.unit}) من مخزن "${selectedProduct.name}" بنجاح`,
          'success'
        );
      } else {
        await addExpense({
          category_id: categoryId || undefined,
          amount: Number(amount),
          description: description.trim(),
        });

        showToast('تم تسجيل المصروف 💸', 'تم حفظ المصروف المالي بنجاح', 'success');
      }

      setIsModalOpen(false);
      setDescription('');
      setAmount(0);
      setQuantity(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تسجيل المصروف';
      showToast('خطأ في العملية', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-600" />
            <span>إدارة المصروفات</span>
          </h1>
        </div>

        <Button onClick={handleOpenModal} icon={<Plus className="w-4 h-4" />}>
          إضافة مصروف جديد
        </Button>
      </div>

      {/* Expense Summary KPI */}
      <Card className="border-amber-100 bg-amber-50/20">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">إجمالي مصروفات المغسلة</span>
            <div className="mt-1">
              <PriceDisplay amount={totalExpenses} size="xl" className="text-amber-800" />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </Card>

      {/* Expenses History List */}
      <Card>
        <CardHeader>
          <CardTitle>سجل المصروفات المسجلة</CardTitle>
          <Badge variant="amber" size="sm">
            عرض {displayedExpenses.length} من {expenses.length}
          </Badge>
        </CardHeader>

        <div className="space-y-2.5">
          {expenses.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">لا توجد مصروفات مسجلة حتى الآن</div>
          ) : (
            displayedExpenses.map((exp) => {
              const empMatch = exp.description.match(/\[الموظف:\s*([^\]]+)\]/);
              const empName = empMatch ? empMatch[1] : null;
              const cleanDescription = exp.description.replace(/\[الموظف:\s*[^\]]+\]\s*/, '');

              return (
                <div
                  key={exp.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{cleanDescription}</span>
                      {currentRole === 'MANAGER' && empName && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          👤 {empName}
                        </span>
                      )}
                      {exp.category_name && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-100 text-amber-900">
                          {exp.category_name}
                        </span>
                      )}
                      {exp.product_name && exp.quantity && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          خصم مخزن ({exp.quantity})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">
                      {formatArabicDate(exp.created_at)}
                    </span>
                  </div>

                  <PriceDisplay amount={exp.amount} size="md" className="text-amber-900 shrink-0" />
                </div>
              );
            })
          )}
        </div>

        {/* Show More Button */}
        {expenses.length > visibleExpensesCount && (
          <div className="text-center pt-4 border-t border-slate-100 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleExpensesCount((prev) => prev + 10)}
              className="text-xs font-bold text-amber-900 border-amber-200 hover:bg-amber-50 w-full sm:w-auto cursor-pointer"
              icon={<ChevronDown className="w-4 h-4 text-amber-700" />}
            >
              عرض المزيد ({expenses.length - visibleExpensesCount} مصروفات أخرى)
            </Button>
          </div>
        )}
      </Card>

      {/* Modal: New Expense */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="تسجيل مصروف جديد"
        description="اختر بند المصروف أو حدد منتجاً من المخزن ليتم خصمه بسعر التكلفة"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">بند / قسم المصروفات</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle for Stock Deduction Mode */}
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="stock_deduct_toggle"
                checked={isStockDeduction}
                onChange={(e) => setIsStockDeduction(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="stock_deduct_toggle" className="text-xs font-black text-blue-900 cursor-pointer select-none flex items-center gap-1.5">
                <Box className="w-4 h-4 text-blue-600" />
                <span>خصم مصروف من منتجات المخزن (حساب التكلفة تلقائياً)</span>
              </label>
            </div>

            {isStockDeduction && (
              <div className="space-y-3 pt-2 border-t border-blue-200/60">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اختر المنتج من المخزن *
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    {products.length === 0 ? (
                      <option value="">-- لا توجد منتجات بالمخزن --</option>
                    ) : (
                      products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — (المتاح: {p.current_stock} {p.unit}) — سعر التكلفة: {p.purchase_price} ج.م
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {selectedProduct && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          الكمية المستهلكة ({selectedProduct.unit}) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, selectedProduct.current_stock)}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div className="flex flex-col justify-end">
                        <div className="bg-white p-2.5 rounded-xl border border-blue-200 text-xs">
                          <div className="flex justify-between items-center text-slate-600">
                            <span>الرصيد المتاح:</span>
                            <span className="font-mono font-bold text-slate-900">
                              {selectedProduct.current_stock} {selectedProduct.unit}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600 mt-1">
                            <span>المتبقي بعد الخصم:</span>
                            <span
                              className={`font-mono font-bold ${
                                selectedProduct.current_stock - quantity < 0
                                  ? 'text-rose-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {Math.max(0, selectedProduct.current_stock - quantity)} {selectedProduct.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-emerald-200 text-xs flex items-center justify-between font-bold text-emerald-800">
                      <span>إجمالي التكلفة المحسوبة ({quantity} × {selectedProduct.purchase_price} ج.م):</span>
                      <PriceDisplay amount={selectedProduct.purchase_price * quantity} size="sm" className="text-emerald-800" />
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-blue-800 flex items-center gap-1.5 bg-blue-100/60 p-2 rounded-lg font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>يتم الخصم بسعر تكلفة الشراء وتحديث كمية المخزن وتسجيل حركة الصرف فوراً.</span>
                </div>
              </div>
            )}
          </div>

          <Input
            label="مبلغ المصروف (ج.م) *"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            readOnly={isStockDeduction}
            className={isStockDeduction ? 'bg-slate-100 font-bold text-slate-700' : ''}
          />

          <Input
            label="البيان / السبب *"
            placeholder="مثال: استهلاك شامبو للمغسلة، فاتورة كهرباء..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isStockDeduction ? 'حفظ المصروف وخصم المخزون' : 'حفظ المصروف'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
