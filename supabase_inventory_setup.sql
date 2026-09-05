-- 1. جدول الأصناف (دليل المواد)
create table if not exists public.material_items (
  id uuid not null default gen_random_uuid (),
  item_code character varying null,
  item_name character varying not null,
  main_category character varying null,
  default_unit character varying null default 'حبة',
  notes text null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint material_items_pkey primary key (id)
);

-- 2. جدول حركة المستودع (الوارد والمنصرف)
create table if not exists public.inventory_transactions (
  id uuid not null default gen_random_uuid (),
  transaction_number character varying null,
  transaction_date timestamp with time zone not null default timezone ('utc'::text, now()),
  type character varying not null, -- 'in' (وارد) or 'out' (منصرف)
  quantity numeric not null default 0,
  item_id uuid not null references public.material_items (id),
  partner character varying null, -- المورد أو العميل
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint inventory_transactions_pkey primary key (id)
);

-- 3. دالة حساب أرصدة المستودع (RPC)
CREATE OR REPLACE FUNCTION rpc_get_inventory_balances()
RETURNS TABLE (
  item_id uuid,
  item_name character varying,
  available_quantity numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.item_id,
    MAX(m.item_name) as item_name,
    SUM(CASE WHEN t.type = 'in' THEN t.quantity ELSE -t.quantity END) as available_quantity
  FROM inventory_transactions t
  LEFT JOIN material_items m ON t.item_id = m.id
  GROUP BY t.item_id;
END;
$$ LANGUAGE plpgsql;
