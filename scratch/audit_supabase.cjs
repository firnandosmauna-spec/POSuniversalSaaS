/**
 * AUDIT SUPABASE - Verifikasi semua data tersimpan
 * Jalankan dengan: node scratch/audit_supabase.cjs
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

const formatRupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

async function audit() {
  console.log('\n====================================================');
  console.log('   AUDIT DATA SUPABASE - POS Universal SaaS');
  console.log('====================================================\n');

  // 1. TRANSACTIONS
  const { data: txData, error: txErr } = await supabase
    .from('transactions')
    .select('id, tenant_id, invoice_no, customer_name, total_amount, payment_status, job_status, status, created_at')
    .order('created_at', { ascending: false });

  if (txErr) {
    console.error('❌ Error membaca transactions:', txErr.message);
  } else {
    console.log(`📊 TRANSACTIONS: ${txData.length} record ditemukan`);
    if (txData.length > 0) {
      // Group by tenant
      const byTenant = {};
      txData.forEach(t => {
        if (!byTenant[t.tenant_id]) byTenant[t.tenant_id] = [];
        byTenant[t.tenant_id].push(t);
      });
      Object.entries(byTenant).forEach(([tid, txs]) => {
        const total = txs.reduce((s, t) => s + (Number(t.total_amount) || 0), 0);
        console.log(`   Tenant ${tid.substring(0, 12)}... → ${txs.length} transaksi | Total: ${formatRupiah(total)}`);
        txs.slice(0, 3).forEach(t => {
          const date = new Date(t.created_at).toLocaleString('id-ID');
          const inv = t.invoice_no || t.id.substring(0, 8);
          const status = t.job_status || t.status || '-';
          console.log(`      - [${date}] ${inv} | ${t.customer_name || 'Umum'} | ${formatRupiah(t.total_amount)} | ${t.payment_status || status}`);
        });
        if (txs.length > 3) console.log(`      ... dan ${txs.length - 3} transaksi lainnya`);
      });
    } else {
      console.log('   ⚠️  Belum ada transaksi di Supabase');
    }
  }

  // 2. CUSTOMERS
  console.log('');
  const { data: custData, error: custErr } = await supabase
    .from('customers')
    .select('id, tenant_id, name, phone, email, total_spent, total_spk_count, created_at')
    .order('created_at', { ascending: false });

  if (custErr) {
    console.error('❌ Error membaca customers:', custErr.message);
  } else {
    console.log(`👥 CUSTOMERS: ${custData.length} record ditemukan`);
    if (custData.length > 0) {
      custData.forEach(c => {
        const isMock = ['cust_1', 'cust_2', 'cust_3'].includes(c.id) || 
                       ['budi santoso', 'siti rahmawati', 'agus prasetyo'].includes(c.name?.toLowerCase());
        const label = isMock ? ' ⚠️ [MOCK - perlu dihapus]' : '';
        console.log(`   - ${c.name} | ${c.phone || '-'} | ${formatRupiah(c.total_spent)}${label}`);
      });
    } else {
      console.log('   (Kosong - belum ada pelanggan)');
    }
  }

  // 3. PRODUCTS
  console.log('');
  const { data: prodData, error: prodErr } = await supabase
    .from('products')
    .select('id, tenant_id, name, price, category, status, stock')
    .order('name');

  if (prodErr) {
    console.error('❌ Error membaca products:', prodErr.message);
  } else {
    console.log(`📦 PRODUCTS: ${prodData.length} record ditemukan`);
    if (prodData.length > 0) {
      const byStatus = { active: 0, inactive: 0, other: 0 };
      prodData.forEach(p => {
        if (p.status === 'active') byStatus.active++;
        else if (p.status === 'inactive') byStatus.inactive++;
        else byStatus.other++;
        console.log(`   - [${p.status || '?'}] ${p.name} | ${formatRupiah(p.price)} | ${p.category || '-'}`);
      });
      console.log(`   Summary: ${byStatus.active} aktif, ${byStatus.inactive} nonaktif`);
    } else {
      console.log('   (Kosong - belum ada produk di Supabase)');
    }
  }

  // 4. STORE USERS (Staff)
  console.log('');
  const { data: staffData, error: staffErr } = await supabase
    .from('store_users')
    .select('id, tenant_id, name, email, role, status')
    .order('created_at', { ascending: false });

  if (staffErr) {
    console.error('❌ Error membaca store_users:', staffErr.message);
  } else {
    console.log(`👤 STORE USERS (Staff): ${staffData.length} record ditemukan`);
    if (staffData.length > 0) {
      staffData.forEach(s => {
        console.log(`   - [${s.role}] ${s.name} | ${s.email} | ${s.status}`);
      });
    } else {
      console.log('   ⚠️  Belum ada staff di Supabase (tersimpan lokal saja)');
    }
  }

  // 5. EXPENSES
  console.log('');
  const { data: expData, error: expErr } = await supabase
    .from('store_expenses')
    .select('id, tenant_id, category, amount, description, created_at')
    .order('created_at', { ascending: false });

  if (expErr) {
    console.log(`   ℹ️  store_expenses: ${expErr.message}`);
  } else {
    const totalExp = expData.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    console.log(`💸 EXPENSES: ${expData.length} record | Total: ${formatRupiah(totalExp)}`);
    expData.slice(0, 5).forEach(e => {
      const date = new Date(e.created_at).toLocaleString('id-ID');
      console.log(`   - [${date}] ${e.category || '-'} | ${formatRupiah(e.amount)} | ${e.description || '-'}`);
    });
  }

  // 6. Mock customers still in Supabase check
  console.log('');
  const mockNames = ['budi santoso', 'siti rahmawati', 'agus prasetyo'];
  if (custData) {
    const mockInDb = custData.filter(c => mockNames.includes(c.name?.toLowerCase()));
    if (mockInDb.length > 0) {
      console.log(`⚠️  PERHATIAN: ${mockInDb.length} pelanggan MOCK masih ada di Supabase!`);
      console.log('   Jalankan script di bawah untuk menghapusnya:');
      mockInDb.forEach(c => {
        console.log(`   supabase.from('customers').delete().eq('id', '${c.id}')`);
      });
      // Auto-delete mock customers
      console.log('\n   🔧 Menghapus otomatis...');
      for (const mc of mockInDb) {
        const { error: delErr } = await supabase.from('customers').delete().eq('id', mc.id);
        if (!delErr) console.log(`   ✅ Dihapus: ${mc.name}`);
        else console.log(`   ❌ Gagal hapus ${mc.name}: ${delErr.message}`);
      }
    } else {
      console.log('✅ Tidak ada pelanggan mock tersisa di Supabase');
    }
  }

  console.log('\n====================================================');
  console.log('   AUDIT SELESAI');
  console.log('====================================================\n');
}

audit().catch(console.error);
