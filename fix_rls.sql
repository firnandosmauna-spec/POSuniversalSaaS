-- 1. Pastikan RLS aktif di tabel store_users
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;

-- 2. Hapus policy lama (jika ada) agar tidak bentrok
DROP POLICY IF EXISTS "Enable read access for all users" ON store_users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON store_users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON store_users;
DROP POLICY IF EXISTS "Users can view their own tenant staff" ON store_users;
DROP POLICY IF EXISTS "Users can insert staff for their tenant" ON store_users;
DROP POLICY IF EXISTS "Users can update staff for their tenant" ON store_users;
DROP POLICY IF EXISTS "Users can delete staff for their tenant" ON store_users;

-- 3. Buat Policy Baru yang BENAR untuk sistem Multi-Tenant POS
CREATE POLICY "Users can view their own tenant staff" 
ON store_users FOR SELECT 
TO authenticated 
USING (tenant_id = auth.uid()::text);

CREATE POLICY "Users can insert staff for their tenant" 
ON store_users FOR INSERT 
TO authenticated 
WITH CHECK (tenant_id = auth.uid()::text);

CREATE POLICY "Users can update staff for their tenant" 
ON store_users FOR UPDATE 
TO authenticated 
USING (tenant_id = auth.uid()::text);

CREATE POLICY "Users can delete staff for their tenant" 
ON store_users FOR DELETE 
TO authenticated 
USING (tenant_id = auth.uid()::text);
