/**
 * Schema Inspector - cek kolom aktual setiap tabel di Supabase
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

async function inspectSchema() {
  const tables = ['transactions', 'customers', 'products', 'store_users', 'store_expenses', 'cashier_shifts', 'transaction_items', 'tables'];
  
  console.log('\n=== SCHEMA INSPECTOR ===\n');
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`✅ ${table} → Kolom: ${Object.keys(data[0]).join(', ')}`);
      } else {
        // Try with empty to get column list via error
        const { data: d2 } = await supabase.from(table).select('*').limit(0);
        console.log(`✅ ${table} → (kosong, tapi tabel ada)`);
      }
    } catch (e) {
      console.log(`❌ ${table}: ${e.message}`);
    }
  }
  
  // Get actual transactions
  console.log('\n=== TRANSACTIONS ===');
  const { data: txs, error: txErr } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(10);
  if (txErr) {
    console.log('Error:', txErr.message);
  } else {
    console.log(`${txs.length} transaksi terbaru:`);
    txs.forEach(t => {
      console.log('\n  TX:', JSON.stringify(t, null, 4));
    });
  }
  
  // Get actual customers
  console.log('\n=== CUSTOMERS ===');
  const { data: custs, error: custErr } = await supabase.from('customers').select('*').limit(20);
  if (custErr) {
    console.log('Error:', custErr.message);
  } else {
    console.log(`${custs.length} customers:`);
    custs.forEach(c => {
      console.log('  CUST:', JSON.stringify(c));
    });
  }
}

inspectSchema().catch(console.error);
