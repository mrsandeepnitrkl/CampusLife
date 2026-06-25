import { createClient } from "@supabase/supabase-js";

let supabaseUrl = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  (import.meta as any).env?.SUPABASE_URL || 
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL || 
  "";

if (supabaseUrl.includes("iyfgjyxxfroifgxvulrp")) {
  supabaseUrl = supabaseUrl.replace("iyfgjyxxfroifgxvulrp", "iyfgjyxxfroifgxvwlrp");
}

const supabaseAnonKey = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  (import.meta as any).env?.SUPABASE_ANON_KEY || 
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || 
  (import.meta as any).env?.SUPABASE_PUBLISHABLE_KEY || 
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  "";

function isValidSupabaseConfig(url: string, key: string): boolean {
  if (!url || !key) return false;
  if (url.includes("placeholder") || url.includes("YOUR_") || url.includes("MY_") || url === "MY_APP_URL") return false;
  const trimmedKey = key.trim();
  if (!trimmedKey.startsWith("eyJ") && !trimmedKey.startsWith("sb_publishable_") && !trimmedKey.startsWith("sb_secret_")) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (e) {
    return false;
  }
}

export const isSupabaseConfigured = isValidSupabaseConfig(supabaseUrl, supabaseAnonKey);

let client = null;
if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl.trim(), supabaseAnonKey.trim());
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
}

export const supabase = client;

