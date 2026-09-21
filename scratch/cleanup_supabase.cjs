/**
 * Cleanup Supabase:
 * 1. Hapus mock customers (tenant_id = "tenant_1789514428981")
 * 2. Hapus produk duplikat (sama nama+harga+tenant)
 * 3. Sync staff ke store_users
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function cleanup() {
  console.log('\n=== CLEANUP SUPABASE ===\n');

  // 1. Hapus mock customers (tenant_id yang bukan UUID = pakai temp ID)
  console.log('1. Menghapus mock customers...');
  const { data: mockCusts } = await supabase
    .from('customers')
    .select('id, name, tenant_id')
    .in('name', ['Budi Santoso', 'Siti Rahmawati', 'Agus Prasetyo']);

  if (mockCusts && mockCusts.length > 0) {
    for (const c of mockCusts) {
      const { error } = await supabase.from('customers').delete().eq('id', c.id);
      if (!error) console.log(`   ✅ Dihapus: ${c.name} (tenant: ${c.tenant_id})`);
      else console.log(`   ❌ Gagal hapus ${c.name}: ${error.message}`);
    }
  } else {
    console.log('   ✅ Tidak ada mock customers ditemukan');
  }

  // 2. Hapus produk duplikat (sama nama+kategori+tenant)
  console.log('\n2. Mencari dan hapus produk duplikat...');
  const { data: allProducts } = await supabase.from('products').select('id, tenant_id, name, category, price');

  if (allProducts) {
    const seen = new Map();
    const toDelete = [];
    allProducts.forEach(p => {
      const key = `${p.tenant_id}|${p.name?.toLowerCase()}|${p.category}`;
      if (seen.has(key)) {
        // Keep the one with real UUID, delete the one with mock ID (or delete older one)
        const existingId = seen.get(key);
        // Keep whichever is "more real" - prefer UUID format
        const isMockId = (id) => id.startsWith('mat_') || id.startsWith('prod_') || !id.includes('-');
        if (isMockId(existingId) || (!isMockId(p.id) && !isMockId(existingId))) {
          // Delete the existing one if it's mock, else delete current
          if (isMockId(existingId)) {
            toDelete.push(existingId);
            seen.set(key, p.id); // Replace with the better one
          } else {
            toDelete.push(p.id);
          }
        } else {
          toDelete.push(existingId.length < p.id.length ? existingId : p.id);
        }
      } else {
        seen.set(key, p.id);
      }
    });

    if (toDelete.length > 0) {
      console.log(`   Ditemukan ${toDelete.length} duplikat, menghapus...`);
      for (const id of toDelete) {
        const prod = allProducts.find(p => p.id === id);
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) console.log(`   ✅ Dihapus duplikat: ${prod?.name} (${id.substring(0, 8)}...)`);
        else console.log(`   ❌ Gagal: ${error.message}`);
      }
    } else {
      console.log('   ✅ Tidak ada produk duplikat');
    }
  }

  // 3. Final count
  console.log('\n=== STATUS AKHIR ===');
  const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  const { count: custCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
  const { count: prodCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  const { count: staffCount } = await supabase.from('store_users').select('*', { count: 'exact', head: true });

  console.log(`   📊 Transactions: ${txCount} record`);
  console.log(`   👥 Customers:    ${custCount} record`);
  console.log(`   📦 Products:     ${prodCount} record`);
  console.log(`   👤 Staff:        ${staffCount} record`);

  console.log('\n=== SELESAI ===\n');
}

cleanup().catch(console.error);
