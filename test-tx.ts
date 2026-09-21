import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Fetching transactions...");
  const { data, error } = await supabase.from("transactions").select("*");
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Total transactions:", data?.length);
    console.log("Transactions data:", JSON.stringify(data, null, 2));
  }
}

test();
