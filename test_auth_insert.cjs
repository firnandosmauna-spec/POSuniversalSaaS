const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
});

const supabaseUrl = env['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Logging in...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'test_1789996301395@example.com',
    password: 'password12345'
  });
  
  if (authErr) {
    console.log("Login failed:", authErr);
    return;
  }
  
  const user = authData.user;
  console.log("Logged in as:", user.id);

  console.log("Testing store_settings insert...");
  const { error: setErr } = await supabase.from('store_settings').upsert({
    tenant_id: user.id,
    store_name: 'Test Store',
    tax_rate: 10,
    enable_dine_in: true
  });
  console.log("Settings Full Upsert:", setErr || 'Success');

  if (setErr) {
    const { error: setErr2 } = await supabase.from('store_settings').upsert({
      tenant_id: user.id,
      tax_rate: 10,
      enable_dine_in: true
    });
    console.log("Settings Fallback Upsert:", setErr2 || 'Success');
  }

  console.log("Testing store_users insert with id = user.id...");
  const { error: usrErr } = await supabase.from('store_users').insert({
    id: user.id,
    tenant_id: user.id,
    name: 'Kasir Test',
    email: 'kasir@test.com',
    pin_code: '1234',
    role: 'Kasir',
    branch_id: 'main',
    branch_name: 'Cabang Utama (Pusat)',
    status: 'ACTIVE'
  });
  console.log("Users Full Insert:", usrErr || 'Success');
}
run();
