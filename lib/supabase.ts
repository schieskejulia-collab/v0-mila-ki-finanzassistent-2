import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey
)

export const supabase = createClient(
  supabaseUrl || "https://mila-not-configured.supabase.co",
  supabaseAnonKey || "mila-not-configured"
)
