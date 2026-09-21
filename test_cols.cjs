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
  const { data, error } = await supabase.from('store_users').insert({
    id: crypto.randomUUID(),
    tenant_id: "d59d9bd6-d6de-471b-8808-dadf1c16c796", 
    name: "test",
    email: "test@test.com",
    role: "Kasir",
    status: "ACTIVE"
  }).select();

  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Success:", data);
  }
}
run();
