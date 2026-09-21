require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'store_users' });
  if (error) {
    // alternative: fetch 1 row
    const res = await supabase.from('store_users').select('*').limit(1);
    if (res.error) console.error(res.error);
    else console.log(res.data);
  } else {
    console.log(data);
  }
}
run();
