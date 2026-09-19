const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qfsaephzwzfcepkydwjw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmc2FlcGh6d3pmY2Vwa3lkd2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMDk4MDAsImV4cCI6MjEwNDg4NTgwMH0.38ovvkZi6YPfUfasIpUxwfXus9D0brhvBw8hPc0m8oE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  console.log("Fetching customers table...");
  const { data, error } = await supabase.from("customers").select("*");
  console.log("Data:", data);
  console.log("Error:", error);
}

inspect();
