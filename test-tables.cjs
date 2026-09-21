const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'] || '';
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'] || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const tablesToCheck = ['printing_transactions', 'job_orders', 'printing_jobs', 'spk', 'spk_orders'];
  
  for (const table of tablesToCheck) {
     const { data, error } = await supabase.from(table).select("*").limit(1);
     if (error) {
        console.log(`Table ${table} error:`, error.message);
     } else {
        console.log(`Table ${table} EXISTS! Data:`, data);
     }
  }
}
test();
