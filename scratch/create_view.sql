ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES partners(id);
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS payment_term varchar(50) DEFAULT 'نقدي';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS job_order_id uuid REFERENCES job_orders(id);

ALTER TABLE receipt_vouchers ADD COLUMN IF NOT EXISTS job_order_id uuid REFERENCES job_orders(id);
