import React, { useState, useEffect } from 'react';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PriceDisplay } from '../../components/ui/PriceDisplay';
import { Modal } from '../../components/ui/Modal';
import { Coins, Plus, Receipt, Package, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatArabicDate } from '../../lib/utils';

export const ExpensesView: React.FC = () => {
  const { expenses, expenseCategories, products, productCategories, addExpense } = useDataStore();
  const { showToast } = useUIStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [amount, setAmount] = useState<number>(100);
  const [description, setDescription] = useState('');

  // Find products associated with washing tools
  const washProductCategory = productCategories.find(
    (c) => c.name.includes('غسيل') || c.id === 'pc-1'
  );
  
  const washingToolsProducts = products.filter(
    (p) =>
      (washProductCategory && p.category_id === washProductCategory.id) ||
      p.category_id === 'pc-1' ||
      p.name.includes('غسيل') ||
      p.name.includes('شامبو') ||
      p.name.includes('منظف')
  );

  const availableWashProducts = washingToolsProducts.length > 0 ? washingToolsProducts : products;

  const currentCategory = expenseCategories.find((c) => c.id === categoryId);
  const isWashToolsCategory =
    currentCategory?.name.includes('غسيل') || currentCategory?.id === 'ec-wash-tools';

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Initialize or update product selection when category switches to washing tools
  useEffect(() => {
    if (isWashToolsCategory) {
      if (!selectedProductId && availableWashProducts.length > 0) {
        setSelectedProductId(availableWashProducts[0].id);
      }
    }
  }, [isWashToolsCategory, availableWashProducts, selectedProductId]);

  // Update amount & description suggestion when product or quantity changes for washing tools
  useEffect(() => {
    if (isWashToolsCategory && selectedProduct) {
      const calculatedAmount = selectedProduct.purchase_price * quantity;
      setAmount(calculatedAmount);
      setDescription(`استهلاك: ${selectedProduct.name} (${quantity} ${selectedProduct.unit})`);
    }
  }, [isWashToolsCategory, selectedProductId, quantity, selectedProduct]);

  const handleOpenModal = () => {
    const defaultCat = expenseCategories.find(c => c.id === 'ec-wash-tools') || expenseCategories[0];
    setCategoryId(defaultCat?.id || '');
    if (availableWashProducts.length > 0) {
      setSelectedProductId(availableWashProducts[0].id);
    }
    setQuantity(1);
    setIsModalOpen(true);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('البيان مطلوب', 'يرجى إدخال سبب المصروف', 'error');
      return;
    }
    if (amount <= 0) {
      showToast('المبلغ غير صحيح', 'المبلغ يجب أن يكون أكبر من صفر', 'error');
      return;
    }

    if (isWashToolsCategory && selectedProduct) {
      if (quantity <= 0) {
        showToast('الكمية غير صحيحة', 'يرجى تحديد كمية مستهلكة صحيحة', 'error');
        return;
      }
      if (selectedProduct.current_stock < quantity) {
        showToast(
          'تنبيه الرصيد',
          `الرصيد المتاح بالمخزن (${selectedProduct.current_stock} ${selectedProduct.unit}) أقل من الكمية المطلوبة`,
          'info'
        );
      }

      addExpense({
        category_id: categoryId,
        amount: Number(amount),
        description: description.trim(),
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: Number(quantity),
      });

      showToast(
        'تم تسجيل المصروف والخصم',
        `تم تسجيل المصروف وخصم (${quantity} ${selectedProduct.unit}) من مخزن "${selectedProduct.name}" بنجاح`,
        'success'
      );
    } else {
      addExpense({
        category_id: categoryId,
        amount: Number(amount),
        description: description.trim(),
      });
      showToast('تم تسجيل المصروف', 'تم حفظ بند المصروفات بنجاح', 'success');
    }

    setIsModalOpen(false);
    setDescription('');
    setAmount(100);
    setQuantity(1);
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
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            تسجيل مصروفات التشغيل، أدوات الغسيل المستهلكة من المخزن، وفواتير الصيانة.
          </p>
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
        </CardHeader>

        <div className="space-y-2.5">
          {expenses.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">لا توجد مصروفات مسجلة حتى الآن</div>
          ) : (
            expenses.map((exp) => (
              <div
                key={exp.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">{exp.description}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        exp.category_name?.includes('غسيل')
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {exp.category_name}
                    </span>
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
            ))
          )}
        </div>
      </Card>

      {/* Modal: New Expense */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="تسجيل مصروف جديد"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">قسم المصروفات</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Washing Tools Inventory Selection */}
          {isWashToolsCategory && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-xs">
                <Package className="w-4 h-4 text-blue-600" />
                <span>اختيار أداة الغسيل من المخزن للخصم المباشر</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  أداة الغسيل المتوفرة في المخزن
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-white border border-blue-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {availableWashProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — (المتاح: {p.current_stock} {p.unit}) — تكلفة الوحدة: {p.purchase_price} ج.م
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      الكمية المستهلكة ({selectedProduct.unit})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, selectedProduct.current_stock)}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-blue-200 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>الرصيد المتاح:</span>
                        <span className="font-bold text-slate-900">
                          {selectedProduct.current_stock} {selectedProduct.unit}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 mt-1">
                        <span>المتبقي بعد الخصم:</span>
                        <span
                          className={`font-bold ${
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
              )}

              <div className="text-[11px] text-blue-700 flex items-center gap-1.5 bg-blue-100/60 p-2 rounded-lg font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>سيتم خصم الكمية تلقائياً من مخزن المنتجات وتسجيل حركة صرف للمغسلة.</span>
              </div>
            </div>
          )}

          <Input
            label="مبلغ المصروف / التكلفة (ج.م)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />

          <Input
            label="البيان / السبب"
            placeholder="مثال: استهلاك شامبو للمغسلة أو فاتورة مياه..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">
              {isWashToolsCategory ? 'حفظ المصروف وخصم المخزون' : 'حفظ المصروف'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

