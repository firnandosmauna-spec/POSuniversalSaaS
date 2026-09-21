const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('transactions').insert([
    {
       tenant_id: "e6c29f39-277e-4de5-8a5c-a067cd7418e9",
       invoice_no: "test",
       total_amount: 100,
       items: []
    }
  ]).select();
  
  if (error) {
     console.error("Insert error:", error);
  } else {
     console.log("Insert success!", data);
  }
}
check();
