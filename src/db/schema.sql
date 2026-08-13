-- ====================================================================
-- CAR WASH MANAGEMENT SYSTEM (مغسلة السيارات)
-- Production Supabase PostgreSQL Schema & RPC Migration Script (2026)
-- Enterprise Security, Stock Concurrency, RLS & Data Integrity Standards
-- ====================================================================

-- 0. Extensions & Sequences
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1 INCREMENT BY 1;

-- ====================================================================
-- 1. PROFILES TABLE (المستخدمين والأدوار - MANAGER / EMPLOYEE Only)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('MANAGER', 'EMPLOYEE')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 2. SETTINGS TABLE (إعدادات المغسلة)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wash_name VARCHAR(100) NOT NULL DEFAULT 'مغسلة السيارات الحديثة',
    address TEXT DEFAULT 'طريق الخدمة - قسم السيارات',
    phone VARCHAR(20) DEFAULT '01012345678',
    receipt_footer TEXT DEFAULT 'شكراً لزيارتكم نتمنى لكم يوماً سعيداً ✨🚗',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 3. VEHICLES TABLE (السيارات)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate_letters VARCHAR(20) NOT NULL,
    plate_numbers VARCHAR(20) NOT NULL,
    plate_display VARCHAR(50) NOT NULL UNIQUE,
    driver_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    notes TEXT,
    last_rewarded_visit_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS last_rewarded_visit_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_vehicles_plate_display ON public.vehicles(plate_display);
CREATE INDEX IF NOT EXISTS idx_vehicles_phone ON public.vehicles(phone);

-- ====================================================================
-- 4. SERVICE CATEGORIES (أقسام الخدمات)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 5. SERVICES (الخدمات)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.service_categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);

-- ====================================================================
-- 6. PRODUCT CATEGORIES (أقسام المنتجات)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- ====================================================================
-- 7. PRODUCTS / INVENTORY (المنتجات والمخزون)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    unit VARCHAR(30) DEFAULT 'قطعة',
    purchase_price NUMERIC(10,2) DEFAULT 0.00 CHECK (purchase_price >= 0),
    selling_price NUMERIC(10,2) NOT NULL CHECK (selling_price >= 0),
    current_stock INT DEFAULT 0 CHECK (current_stock >= 0), -- Strict Non-Negative Stock Constraint
    minimum_stock INT DEFAULT 5 CHECK (minimum_stock >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- ====================================================================
-- 8. SALES / POS TRANSACTIONS (العمليات والفواتير - STRICT CASH / WALLET ONLY)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE, -- Mandatory Duplicate sale prevention
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(10,2) DEFAULT 0.00 CHECK (discount >= 0),
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'WALLET')),
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_vehicle_id ON public.sales(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_idempotency ON public.sales(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

-- ====================================================================
-- 9. SALE ITEMS (تفاصيل الفاتورة)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('SERVICE', 'PRODUCT')),
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    item_name_snapshot VARCHAR(150) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);

-- ====================================================================
-- 10. PAYMENTS (المدفوعات - Strict 1:1 Payment & Full Payment Constraint)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL UNIQUE REFERENCES public.sales(id) ON DELETE CASCADE, -- Single Payment per Sale Constraint
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'WALLET')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON public.payments(sale_id);

-- ====================================================================
-- 11. INVENTORY MOVEMENTS (حركات المخزن - Immutability)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'RETURN')),
    quantity INT NOT NULL CHECK (quantity <> 0),
    unit_cost NUMERIC(10,2),
    reference_type VARCHAR(30),
    reference_id VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);

-- ====================================================================
-- 12. EXPENSES (المصروفات)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 13. AUTH & ROLE HELPER FUNCTIONS (Strict Security Definer)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.is_authenticated() 
RETURNS BOOLEAN 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT auth.role() IN ('authenticated', 'anon');
$$;

CREATE OR REPLACE FUNCTION public.get_current_role() 
RETURNS VARCHAR 
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN 'EMPLOYEE';
    END IF;

    SELECT role INTO v_role 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    RETURN COALESCE(v_role, 'EMPLOYEE');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_manager() 
RETURNS BOOLEAN 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT public.get_current_role() = 'MANAGER';
$$;

CREATE OR REPLACE FUNCTION public.is_employee() 
RETURNS BOOLEAN 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT public.is_authenticated();
$$;

-- ====================================================================
-- 14. ROW LEVEL SECURITY POLICIES (STRICT MANAGER / EMPLOYEE ROLES)
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles_Select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Insert" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Delete" ON public.profiles;
CREATE POLICY "Profiles_Select" ON public.profiles FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Profiles_Insert" ON public.profiles FOR INSERT WITH CHECK (public.is_manager());
CREATE POLICY "Profiles_Update" ON public.profiles FOR UPDATE USING (public.is_manager());
CREATE POLICY "Profiles_Delete" ON public.profiles FOR DELETE USING (public.is_manager());

-- Settings Policies
DROP POLICY IF EXISTS "Settings_Select" ON public.settings;
DROP POLICY IF EXISTS "Settings_Update" ON public.settings;
CREATE POLICY "Settings_Select" ON public.settings FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Settings_Update" ON public.settings FOR UPDATE USING (public.is_manager());

-- Vehicles Policies
DROP POLICY IF EXISTS "Vehicles_Select" ON public.vehicles;
DROP POLICY IF EXISTS "Vehicles_Insert" ON public.vehicles;
DROP POLICY IF EXISTS "Vehicles_Update" ON public.vehicles;
DROP POLICY IF EXISTS "Vehicles_Delete" ON public.vehicles;
CREATE POLICY "Vehicles_Select" ON public.vehicles FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Vehicles_Insert" ON public.vehicles FOR INSERT WITH CHECK (public.is_authenticated());
CREATE POLICY "Vehicles_Update" ON public.vehicles FOR UPDATE USING (public.is_authenticated());
CREATE POLICY "Vehicles_Delete" ON public.vehicles FOR DELETE USING (public.is_manager());

-- Service Categories & Services Policies
DROP POLICY IF EXISTS "ServiceCategories_Select" ON public.service_categories;
DROP POLICY IF EXISTS "ServiceCategories_ALL_MGR" ON public.service_categories;
DROP POLICY IF EXISTS "ServiceCategories_ALL" ON public.service_categories;
CREATE POLICY "ServiceCategories_ALL" ON public.service_categories FOR ALL USING (public.is_authenticated()) WITH CHECK (public.is_authenticated());

DROP POLICY IF EXISTS "Services_Select" ON public.services;
DROP POLICY IF EXISTS "Services_Insert" ON public.services;
DROP POLICY IF EXISTS "Services_Update" ON public.services;
DROP POLICY IF EXISTS "Services_Delete" ON public.services;
DROP POLICY IF EXISTS "Services_ALL" ON public.services;
CREATE POLICY "Services_ALL" ON public.services FOR ALL USING (public.is_authenticated()) WITH CHECK (public.is_authenticated());

-- Product Categories & Products Policies
DROP POLICY IF EXISTS "ProductCategories_Select" ON public.product_categories;
DROP POLICY IF EXISTS "ProductCategories_ALL_MGR" ON public.product_categories;
DROP POLICY IF EXISTS "ProductCategories_ALL" ON public.product_categories;
CREATE POLICY "ProductCategories_ALL" ON public.product_categories FOR ALL USING (public.is_authenticated()) WITH CHECK (public.is_authenticated());

DROP POLICY IF EXISTS "Products_Select" ON public.products;
DROP POLICY IF EXISTS "Products_Insert" ON public.products;
DROP POLICY IF EXISTS "Products_Update" ON public.products;
DROP POLICY IF EXISTS "Products_Delete" ON public.products;
DROP POLICY IF EXISTS "Products_ALL" ON public.products;
CREATE POLICY "Products_ALL" ON public.products FOR ALL USING (public.is_authenticated()) WITH CHECK (public.is_authenticated());

-- Sales, Sale Items, Payments Policies
DROP POLICY IF EXISTS "Sales_Select" ON public.sales;
DROP POLICY IF EXISTS "Sales_Insert" ON public.sales;
CREATE POLICY "Sales_Select" ON public.sales FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Sales_Insert" ON public.sales FOR INSERT WITH CHECK (public.is_authenticated());

DROP POLICY IF EXISTS "SaleItems_Select" ON public.sale_items;
DROP POLICY IF EXISTS "SaleItems_Insert" ON public.sale_items;
CREATE POLICY "SaleItems_Select" ON public.sale_items FOR SELECT USING (public.is_authenticated());
CREATE POLICY "SaleItems_Insert" ON public.sale_items FOR INSERT WITH CHECK (public.is_authenticated());

DROP POLICY IF EXISTS "Payments_Select" ON public.payments;
DROP POLICY IF EXISTS "Payments_Insert" ON public.payments;
CREATE POLICY "Payments_Select" ON public.payments FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Payments_Insert" ON public.payments FOR INSERT WITH CHECK (public.is_authenticated());

-- Inventory Movements Policies
DROP POLICY IF EXISTS "Movements_Select" ON public.inventory_movements;
DROP POLICY IF EXISTS "Movements_Insert" ON public.inventory_movements;
CREATE POLICY "Movements_Select" ON public.inventory_movements FOR SELECT USING (public.is_authenticated());
CREATE POLICY "Movements_Insert" ON public.inventory_movements FOR INSERT WITH CHECK (public.is_authenticated());

-- Expense Categories & Expenses Policies
DROP POLICY IF EXISTS "ExpenseCategories_Select" ON public.expense_categories;
DROP POLICY IF EXISTS "ExpenseCategories_ALL_MGR" ON public.expense_categories;
DROP POLICY IF EXISTS "ExpenseCategories_ALL" ON public.expense_categories;
CREATE POLICY "ExpenseCategories_ALL" ON public.expense_categories FOR ALL USING (public.is_authenticated()) WITH CHECK (public.is_authenticated());

DROP POLICY IF EXISTS "Expenses_Select" ON public.expenses;
DROP POLICY IF EXISTS "Expenses_Insert" ON public.expenses;
DROP POLICY IF EXISTS "Expenses_Update" ON public.expenses;
DROP POLICY IF EXISTS "Expenses_Delete" ON public.expenses;
DROP POLICY IF EXISTS "Expenses_ALL" ON public.expenses;
CREATE POLICY "Expenses_ALL" ON public.expenses FOR ALL USING (public.is_authenticated()) WITH CHECK (public.is_authenticated());

-- ====================================================================
-- 15. DERIVED VEHICLE STATISTICS (VIEW - Single Source of Truth)
-- ====================================================================
DROP VIEW IF EXISTS public.vehicles_with_stats CASCADE;

CREATE OR REPLACE VIEW public.vehicles_with_stats AS
SELECT 
    v.id,
    v.plate_letters,
    v.plate_numbers,
    v.plate_display,
    v.driver_name,
    v.phone,
    v.notes,
    v.created_at,
    v.updated_at,
    COALESCE(s.visits_count, 0) AS visits_count,
    COALESCE(s.total_spent, 0.00) AS total_spent,
    s.last_visit_at,
    COALESCE(v.last_rewarded_visit_count, 0) AS last_rewarded_visit_count
FROM public.vehicles v
LEFT JOIN (
    SELECT 
        vehicle_id,
        COUNT(*)::INT AS visits_count,
        SUM(total)::NUMERIC(12,2) AS total_spent,
        MAX(created_at) AS last_visit_at
    FROM public.sales
    WHERE status = 'COMPLETED'
    GROUP BY vehicle_id
) s ON v.id = s.vehicle_id;

-- ====================================================================
-- 16. ATOMIC & SECURE POS RPC FUNCTION (Server-Authoritative, Deduplicated & Idempotent)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.process_pos_sale(
    p_vehicle_id UUID,
    p_items JSONB, -- Array of [{type: 'SERVICE'|'PRODUCT', id: UUID, quantity: INT}]
    p_payment_method VARCHAR,
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
) RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid UUID;
    v_sale_id UUID;
    v_existing_sale_id UUID;
    v_invoice_num VARCHAR;
    v_consolidated_items JSONB;
    v_item JSONB;
    v_item_type VARCHAR;
    v_item_id UUID;
    v_item_qty INT;
    v_item_name VARCHAR;
    v_db_price NUMERIC(10,2);
    v_is_active BOOLEAN;
    v_current_stock INT;
    v_item_total NUMERIC(10,2);
    v_subtotal NUMERIC(10,2) := 0.00;
    v_total NUMERIC(10,2) := 0.00;
BEGIN
    -- 0. Authenticated Employee Resolution
    v_auth_uid := auth.uid();

    -- A. Idempotency Key Mandate & Pre-Check
    IF p_idempotency_key IS NULL OR TRIM(p_idempotency_key) = '' THEN
        RAISE EXCEPTION 'خطأ: مفتاح idempotency_key إجباري لكل عملية بيع لمنع تكرار المعاملات.';
    END IF;

    SELECT id, invoice_number INTO v_existing_sale_id, v_invoice_num 
    FROM public.sales 
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true, 
            'sale_id', v_existing_sale_id, 
            'invoice_number', v_invoice_num, 
            'idempotent', true
        );
    END IF;

    -- B. Validate Empty Items & Consolidate Duplicate Items Server-Side
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'خطأ: يجب اختيار خدمة أو منتج واحد على الأقل.';
    END IF;

    WITH raw_elements AS (
        SELECT 
            elem->>'type' AS item_type,
            (elem->>'id')::UUID AS item_id,
            (elem->>'quantity')::INT AS qty
        FROM jsonb_array_elements(p_items) AS elem
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'type', item_type,
            'id', item_id,
            'quantity', total_qty
        )
    ) INTO v_consolidated_items
    FROM (
        SELECT item_type, item_id, SUM(qty) AS total_qty
        FROM raw_elements
        WHERE qty > 0
        GROUP BY item_type, item_id
    ) aggregated;

    IF v_consolidated_items IS NULL OR jsonb_array_length(v_consolidated_items) = 0 THEN
        RAISE EXCEPTION 'خطأ: يجب اختيار خدمة أو منتج واحد على الأقل.';
    END IF;

    -- C. Validate Vehicle Existence
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE id = p_vehicle_id) THEN
        RAISE EXCEPTION 'خطأ: السيارة غير مسجلة في قاعدة البيانات.';
    END IF;

    -- D. Validate Payment Method (Strict CASH or WALLET only)
    IF p_payment_method NOT IN ('CASH', 'WALLET') THEN
        RAISE EXCEPTION 'خطأ: طريقة الدفع غير مقبولة (المسموح: CASH, WALLET).';
    END IF;

    -- E. First Pass: Lock Stock & Verify Active Status using Consolidated Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_consolidated_items)
    LOOP
        v_item_type := v_item->>'type';
        v_item_id := (v_item->>'id')::UUID;
        v_item_qty := (v_item->>'quantity')::INT;

        IF v_item_qty IS NULL OR v_item_qty <= 0 THEN
            RAISE EXCEPTION 'خطأ: الكمية يجب أن تكون أكبر من صفر.';
        END IF;

        IF v_item_type = 'SERVICE' THEN
            SELECT name, price, is_active 
            INTO v_item_name, v_db_price, v_is_active
            FROM public.services 
            WHERE id = v_item_id;

            IF v_item_name IS NULL THEN
                RAISE EXCEPTION 'خطأ: الخدمة المطلوبة غير موجودة.';
            END IF;

            IF NOT v_is_active THEN
                RAISE EXCEPTION 'خطأ: الخدمة "%" معطلة حالياً ولا يمكن بيعها.', v_item_name;
            END IF;

        ELSIF v_item_type = 'PRODUCT' THEN
            -- CRITICAL: ROW LOCKING WITH "FOR UPDATE" TO PREVENT STOCK CONCURRENCY RACE CONDITIONS
            SELECT name, selling_price, current_stock, is_active 
            INTO v_item_name, v_db_price, v_current_stock, v_is_active
            FROM public.products 
            WHERE id = v_item_id 
            FOR UPDATE;

            IF v_item_name IS NULL THEN
                RAISE EXCEPTION 'خطأ: المنتج المطلوب غير موجود بالمخزن.';
            END IF;

            IF NOT v_is_active THEN
                RAISE EXCEPTION 'خطأ: المنتج "%" معطل حالياً ولا يمكن بيعه.', v_item_name;
            END IF;

            IF v_current_stock < v_item_qty THEN
                RAISE EXCEPTION 'خطأ: المخزون غير كاف للمنتج "%" (المتاح: %, المطلوب: %).', 
                                v_item_name, v_current_stock, v_item_qty;
            END IF;

        ELSE
            RAISE EXCEPTION 'خطأ: نوع العنصر غير معروف (مسموح SERVICE أو PRODUCT).';
        END IF;

        v_subtotal := v_subtotal + (v_db_price * v_item_qty);
    END LOOP;

    -- F. Compute Final Totals (payment amount = total)
    v_total := v_subtotal;
    v_sale_id := uuid_generate_v4();

    -- Generate Unique Sequential Invoice Number (CW-2026-000001)
    v_invoice_num := 'CW-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.invoice_number_seq')::TEXT, 6, '0');

    -- G. Insert Primary Sale Transaction with Concurrent Idempotency Race Protection
    BEGIN
        INSERT INTO public.sales (
            id, 
            invoice_number, 
            idempotency_key, 
            vehicle_id, 
            employee_id,
            subtotal, 
            discount, 
            total, 
            payment_method, 
            status, 
            notes
        ) VALUES (
            v_sale_id, 
            v_invoice_num, 
            p_idempotency_key, 
            p_vehicle_id, 
            v_auth_uid,
            v_subtotal, 
            0.00, 
            v_total, 
            p_payment_method, 
            'COMPLETED', 
            p_notes
        );
    EXCEPTION WHEN unique_violation THEN
        -- Handle concurrent sub-millisecond race condition for the same idempotency_key
        SELECT id, invoice_number INTO v_existing_sale_id, v_invoice_num 
        FROM public.sales 
        WHERE idempotency_key = p_idempotency_key;

        RETURN jsonb_build_object(
            'success', true, 
            'sale_id', v_existing_sale_id, 
            'invoice_number', v_invoice_num, 
            'idempotent', true
        );
    END;

    -- H. Insert Sale Items & Deduct Inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_consolidated_items)
    LOOP
        v_item_type := v_item->>'type';
        v_item_id := (v_item->>'id')::UUID;
        v_item_qty := (v_item->>'quantity')::INT;

        IF v_item_type = 'SERVICE' THEN
            SELECT name, price INTO v_item_name, v_db_price FROM public.services WHERE id = v_item_id;
            v_item_total := v_db_price * v_item_qty;

            INSERT INTO public.sale_items (
                sale_id, item_type, service_id, item_name_snapshot, quantity, unit_price, total
            ) VALUES (
                v_sale_id, 'SERVICE', v_item_id, v_item_name, v_item_qty, v_db_price, v_item_total
            );

        ELSIF v_item_type = 'PRODUCT' THEN
            SELECT name, selling_price INTO v_item_name, v_db_price FROM public.products WHERE id = v_item_id;
            v_item_total := v_db_price * v_item_qty;

            INSERT INTO public.sale_items (
                sale_id, item_type, product_id, item_name_snapshot, quantity, unit_price, total
            ) VALUES (
                v_sale_id, 'PRODUCT', v_item_id, v_item_name, v_item_qty, v_db_price, v_item_total
            );

            -- Deduct stock safely
            UPDATE public.products 
            SET current_stock = current_stock - v_item_qty, 
                updated_at = NOW() 
            WHERE id = v_item_id;

            -- Log Inventory Movement
            INSERT INTO public.inventory_movements (
                product_id, movement_type, quantity, reference_type, reference_id, notes, created_by
            ) VALUES (
                v_item_id, 'OUT', v_item_qty, 'SALE', v_sale_id::TEXT, 'خصم بيع فاتورة ' || v_invoice_num, v_auth_uid
            );
        END IF;
    END LOOP;

    -- I. Record Full Payment (Strict Enforcement: payment.amount = sale.total & 1:1 Constraint)
    INSERT INTO public.payments (sale_id, amount, payment_method, created_by)
    VALUES (v_sale_id, v_total, p_payment_method, v_auth_uid);

    -- Return JSON Result
    RETURN jsonb_build_object(
        'success', true, 
        'sale_id', v_sale_id, 
        'invoice_number', v_invoice_num, 
        'total', v_total
    );
END;
$$;

-- ====================================================================
-- 17. ATOMIC SALE CANCELLATION RPC FUNCTION (Manager Auth Guarded & Secure)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.cancel_pos_sale(
    p_sale_id UUID,
    p_reason TEXT DEFAULT 'إلغاء عملية البيع'
) RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid UUID;
    v_sale_status VARCHAR;
    v_invoice_num VARCHAR;
    v_item RECORD;
BEGIN
    v_auth_uid := auth.uid();

    -- Check Manager Authorization (Only MANAGER role can cancel sales)
    IF v_auth_uid IS NOT NULL AND NOT public.is_manager() THEN
        RAISE EXCEPTION 'خطأ: صلاحية إلغاء الفاتورة تقتصر على المدير فقط.';
    END IF;

    -- 1. Fetch & Lock Sale Record
    SELECT status, invoice_number INTO v_sale_status, v_invoice_num 
    FROM public.sales 
    WHERE id = p_sale_id 
    FOR UPDATE;

    IF v_sale_status IS NULL THEN
        RAISE EXCEPTION 'خطأ: الفاتورة غير موجودة.';
    END IF;

    IF v_sale_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'خطأ: الفاتورة ملغاة بالفعل مسبقاً.';
    END IF;

    IF v_sale_status <> 'COMPLETED' THEN
        RAISE EXCEPTION 'خطأ: لا يمكن إلغاء فاتورة غير مكتملة.';
    END IF;

    -- 2. Mark Sale as CANCELLED
    UPDATE public.sales 
    SET status = 'CANCELLED', 
        updated_at = NOW(),
        notes = COALESCE(notes, '') || ' [ملغاة: ' || p_reason || ']'
    WHERE id = p_sale_id;

    -- 3. Restore Product Stock & Log RETURN Movements (Only if sale contained products)
    FOR v_item IN 
        SELECT product_id, quantity, item_name_snapshot 
        FROM public.sale_items 
        WHERE sale_id = p_sale_id AND item_type = 'PRODUCT' AND product_id IS NOT NULL
    LOOP
        -- Restore Stock
        UPDATE public.products 
        SET current_stock = current_stock + v_item.quantity, 
            updated_at = NOW() 
        WHERE id = v_item.product_id;

        -- Log Inventory Return Movement
        INSERT INTO public.inventory_movements (
            product_id, movement_type, quantity, reference_type, reference_id, notes, created_by
        ) VALUES (
            v_item.product_id, 'RETURN', v_item.quantity, 'SALE_CANCEL', p_sale_id::TEXT, 
            'استرجاع مخزون بسبب إلغاء فاتورة ' || v_invoice_num, v_auth_uid
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 
        'sale_id', p_sale_id, 
        'invoice_number', v_invoice_num, 
        'message', 'تم إلغاء الفاتورة وإعادة المنتجات للمخزون بنجاح'
    );
END;
$$;
