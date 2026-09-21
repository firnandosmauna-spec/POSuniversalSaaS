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
  const { data, error } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(5);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Keys of latest transaction:", data.length > 0 ? Object.keys(data[0]) : "No data");
    console.log("Latest transaction:", data[0]);
  }
}
test();
