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
  const testColumns = ['tenant_id', 'store_name', 'tax_rate', 'enable_dine_in'];
  
  for (const col of testColumns) {
    const payload = {};
    if (col === 'tenant_id') payload[col] = crypto.randomUUID();
    else payload[col] = col === 'enable_dine_in' ? true : 10;
    
    const { error } = await supabase.from('store_settings').insert([payload]);
    if (error && error.code === 'PGRST204') {
      console.log(`Column MISSING: ${col}`);
    } else {
      console.log(`Column EXISTS: ${col} (Error: ${error?.message || 'none'})`);
    }
  }
}
run();
