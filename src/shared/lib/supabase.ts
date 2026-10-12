import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://qfsaephzwzfcepkydwjw.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmc2FlcGh6d3pmY2Vwa3lkd2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMDk4MDAsImV4cCI6MjEwNDg4NTgwMH0.38ovvkZi6YPfUfasIpUxwfXus9D0brhvBw8hPc0m8oE";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

