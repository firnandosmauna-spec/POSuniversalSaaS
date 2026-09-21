-- ============================================================
-- SUPABASE MIGRATION - Tambah kolom yang hilang
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tambah kolom yang dibutuhkan di tabel transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS invoice_no text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_name_custom text,
  ADD COLUMN IF NOT EXISTS dp_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'Lunas',
  ADD COLUMN IF NOT EXISTS job_status text DEFAULT 'Selesai',
  ADD COLUMN IF NOT EXISTS items jsonb,
  ADD COLUMN IF NOT EXISTS cashier_name text,
  ADD COLUMN IF NOT EXISTS branch_id text,
  ADD COLUMN IF NOT EXISTS branch_name text,
  ADD COLUMN IF NOT EXISTS invoice_code text;

-- 2. Tambah kolom yang dibutuhkan di tabel customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS total_spent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spk_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'REGULAR',
  ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'INDIVIDUAL',
  ADD COLUMN IF NOT EXISTS npwp text;

-- 3. Buat tabel store_expenses (pengeluaran toko)
CREATE TABLE IF NOT EXISTS store_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  shift_id uuid,
  category text,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  payment_method text,
  recorded_by text,
  branch_id text,
  branch_name text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS di store_expenses
ALTER TABLE store_expenses ENABLE ROW LEVEL SECURITY;

-- Policy agar tenant hanya bisa lihat datanya sendiri
DROP POLICY IF EXISTS "tenant_expenses_policy" ON store_expenses;
CREATE POLICY "tenant_expenses_policy" ON store_expenses
  FOR ALL USING (tenant_id = auth.uid());

-- 4. Tambah kolom products yang mungkin dibutuhkan
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS finishings_allowed jsonb,
  ADD COLUMN IF NOT EXISTS min_order integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;

-- ============================================================
-- Verifikasi: cek kolom setelah migrasi
-- ============================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Tambah kolom yang dibutuhkan di tabel store_users
ALTER TABLE store_users
  ADD COLUMN IF NOT EXISTS branch_id text,
  ADD COLUMN IF NOT EXISTS branch_name text;
