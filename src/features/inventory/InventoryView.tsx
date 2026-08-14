import React, { useState } from 'react';
import { useDataStore } from '../../stores/useDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { PriceDisplay } from '../../components/ui/PriceDisplay';
import { Modal } from '../../components/ui/Modal';
import {
  Package,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  PackagePlus,
  History,
  AlertTriangle,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { formatArabicDate } from '../../lib/utils';
import { Product } from '../../types';

export const InventoryView: React.FC = () => {
  const { products, productCategories, inventoryMovements, addProduct, addStock } = useDataStore();
  const { showToast, setActiveTab } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const [visibleProductsCount, setVisibleProductsCount] = useState(10);
  const [visibleMovementsCount, setVisibleMovementsCount] = useState(10);

  // Modals
  const [isNewProdModalOpen, setIsNewProdModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<Product | null>(null);

  // Forms
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCategory, setProdCategory] = useState(productCategories[0]?.id || '');
  const [prodUnit, setProdUnit] = useState('قطعة');
  const [prodPurchasePrice, setProdPurchasePrice] = useState(30);
  const [prodSellingPrice, setProdSellingPrice] = useState(50);
  const [prodInitialStock, setProdInitialStock] = useState(10);
  const [prodMinStock, setProdMinStock] = useState(5);

  // Stock Add Form
  const [stockQty, setStockQty] = useState(10);
  const [stockBuyPrice, setStockBuyPrice] = useState(0);
  const [stockNotes, setStockNotes] = useState('');

  // Filter Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === 'ALL' || p.category_id === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showToast('اسم المنتج مطلوب', 'يرجى كتابة اسم المنتج', 'error');
      return;
    }

    const selectedCategory = prodCategory || productCategories[0]?.id;

    try {
      await addProduct({
        name: prodName.trim(),
        sku: prodSku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        category_id: selectedCategory || '',
        unit: prodUnit,
        purchase_price: Number(prodPurchasePrice),
        selling_price: Number(prodSellingPrice),
        current_stock: Number(prodInitialStock),
        minimum_stock: Number(prodMinStock),
        is_active: true,
      });

      setIsNewProdModalOpen(false);
      setProdName('');
      setProdSku('');
      showToast('تمت الإضافة', `تم إضافة المنتج ${prodName} إلى المخزون`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر إضافة المنتج';
      showToast('خطأ في الإضافة', msg, 'error');
    }
  };

  const handleAddStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockProduct) return;
    if (stockQty <= 0) {
      showToast('الكمية غير صحيحة', 'يجب إدخال كمية أكبر من صفر', 'error');
      return;
    }

    addStock(selectedStockProduct.id, Number(stockQty), Number(stockBuyPrice), stockNotes);
    setIsStockModalOpen(false);
    setSelectedStockProduct(null);
    setStockQty(10);
    setStockBuyPrice(0);
    setStockNotes('');
    showToast('تم تزويد البضاعة', 'تم تحديث كمية المخزون وسجل الحركة', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <span>إدارة المخزن والمنتجات</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-48 sm:w-64">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المنتج أو الكود..."
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Button onClick={() => setIsNewProdModalOpen(true)} icon={<Plus className="w-4 h-4" />} className="shrink-0">
            منتج جديد
          </Button>
        </div>
      </div>

      {/* Filter Categories Bar */}
      <div className="flex items-center justify-start gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeCategory === 'ALL'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          الكل ({products.length})
        </button>
        {productCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              activeCategory === c.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Product Cards Grid (Modern SaaS POS Product Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.slice(0, visibleProductsCount).map((p) => {
          let stockStatus: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';
          let statusText = '🟢 متوفر';

          if (p.current_stock === 0) {
            stockStatus = 'RED';
            statusText = '🔴 نافد بالكامل';
          } else if (p.current_stock <= p.minimum_stock) {
            stockStatus = 'AMBER';
            statusText = '🟡 منخفض جداً';
          }

          return (
            <Card key={p.id} className="border-slate-100 hover:border-blue-200 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                  </div>
                  <Badge
                    variant={stockStatus === 'GREEN' ? 'green' : stockStatus === 'AMBER' ? 'amber' : 'red'}
                    size="sm"
                  >
                    {statusText}
                  </Badge>
                </div>

                {/* Stock Gauge Progress Bar */}
                <div className="mt-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">الكمية الحالية:</span>
                    <span className="font-mono text-slate-900">
                      {p.current_stock} {p.unit}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        stockStatus === 'GREEN'
                          ? 'bg-emerald-500'
                          : stockStatus === 'AMBER'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(5, (p.current_stock / (p.minimum_stock * 3)) * 100))}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>الحد الأدنى: {p.minimum_stock}</span>
                    <span>سعر الشراء: {p.purchase_price} ج.م</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">سعر البيع</span>
                  <PriceDisplay amount={p.selling_price} size="sm" className="text-blue-700" />
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedStockProduct(p);
                    setStockBuyPrice(p.purchase_price);
                    setIsStockModalOpen(true);
                  }}
                  icon={<PackagePlus className="w-4 h-4 text-blue-600" />}
                  className="text-xs"
                >
                  تزويد
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Show More Products Button */}
      {filteredProducts.length > visibleProductsCount && (
        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleProductsCount((prev) => prev + 10)}
            className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto cursor-pointer"
            icon={<ChevronDown className="w-4 h-4 text-blue-600" />}
          >
            عرض المزيد ({filteredProducts.length - visibleProductsCount} منتجات أخرى)
          </Button>
        </div>
      )}

      {/* Inventory Movements Log */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <CardTitle>سجل حركات المخزن الأخيرة</CardTitle>
          </div>
          <Badge variant="neutral" size="sm">
            عرض {Math.min(visibleMovementsCount, inventoryMovements.length)} من {inventoryMovements.length}
          </Badge>
        </CardHeader>

        <div className="space-y-2.5">
          {inventoryMovements.slice(0, visibleMovementsCount).map((mov) => (
            <div
              key={mov.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                    mov.movement_type === 'IN'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {mov.movement_type === 'IN' ? (
                    <ArrowDownLeft className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">{mov.product_name}</h5>
                  <p className="text-[10px] text-slate-500 font-medium">{mov.notes || 'حركة مخزون'}</p>
                </div>
              </div>

              <div className="text-left font-mono">
                <span
                  className={`font-bold ${
                    mov.movement_type === 'IN' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {mov.movement_type === 'IN' ? `+${mov.quantity}` : `-${mov.quantity}`}
                </span>
                <span className="block text-[10px] text-slate-400 font-sans">
                  {formatArabicDate(mov.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Show More Inventory Movements Button */}
        {inventoryMovements.length > visibleMovementsCount && (
          <div className="text-center pt-4 border-t border-slate-100 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleMovementsCount((prev) => prev + 10)}
              className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto cursor-pointer"
              icon={<ChevronDown className="w-4 h-4 text-blue-600" />}
            >
              عرض المزيد ({inventoryMovements.length - visibleMovementsCount} حركات أخرى)
            </Button>
          </div>
        )}
      </Card>

      {/* Modal: New Product */}
      <Modal
        isOpen={isNewProdModalOpen}
        onClose={() => setIsNewProdModalOpen(false)}
        title="إضافة منتج جديد للمخزن"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <Input
            label="اسم المنتج *"
            placeholder="مثال: معطر لافندر صالون"
            value={prodName}
            onChange={(e) => setProdName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              قسم المنتج (التصنيف) *
            </label>
            <select
              value={prodCategory}
              onChange={(e) => setProdCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors cursor-pointer"
            >
              {productCategories.length === 0 ? (
                <option value="">-- لا توجد أقسام منشأة (قم بإنشائها من صفحة الإعدادات) --</option>
              ) : (
                productCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="كود المنتج SKU (اختياري)"
              placeholder="PRD-109"
              value={prodSku}
              onChange={(e) => setProdSku(e.target.value)}
            />
            <Input
              label="الوحدة"
              placeholder="قطعة / علبة / طقم"
              value={prodUnit}
              onChange={(e) => setProdUnit(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="سعر الشراء (ج.م)"
              type="number"
              value={prodPurchasePrice}
              onChange={(e) => setProdPurchasePrice(Number(e.target.value))}
            />
            <Input
              label="سعر البيع (ج.م)"
              type="number"
              value={prodSellingPrice}
              onChange={(e) => setProdSellingPrice(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="الكمية الأولى بالمخزن"
              type="number"
              value={prodInitialStock}
              onChange={(e) => setProdInitialStock(Number(e.target.value))}
            />
            <Input
              label="حد التنبيه للكمية"
              type="number"
              value={prodMinStock}
              onChange={(e) => setProdMinStock(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsNewProdModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">حفظ المنتج</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Supply Stock */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`تزويد شحنة: ${selectedStockProduct?.name}`}
      >
        <form onSubmit={handleAddStockSubmit} className="space-y-4">
          <Input
            label="الكمية المضافة"
            type="number"
            value={stockQty}
            onChange={(e) => setStockQty(Number(e.target.value))}
          />

          <Input
            label="سعر الشراء للقطعة (ج.م)"
            type="number"
            value={stockBuyPrice}
            onChange={(e) => setStockBuyPrice(Number(e.target.value))}
          />

          <Input
            label="ملاحظات المورد أو الشحنة"
            placeholder="شراء بضاعة من المورد..."
            value={stockNotes}
            onChange={(e) => setStockNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsStockModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit">تأكيد الإضافة للمخزن</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
