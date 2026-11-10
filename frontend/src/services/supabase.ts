import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isPlaceholder = (value: string | undefined) =>
  !value || /^(?:your[-_]|your-project|placeholder|change[-_]?me)/i.test(value.trim());

export const isSupabaseConfigured = !isPlaceholder(url) && !isPlaceholder(anonKey);
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  : null;
