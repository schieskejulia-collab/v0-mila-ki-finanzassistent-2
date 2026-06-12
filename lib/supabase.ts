import { createClient } from '@supabase/supabase-js'

// Holt sich die Keys – egal ob mit oder ohne NEXT_PUBLIC_ Präfix
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// Falls die Keys komplett fehlen, loggen wir das lesbar in Vercel, statt hart abzustürzen
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ KRITISCHER FEHLER: Supabase URL oder Anon Key fehlt in den Umgebungsvariablen!")
}

export const supabase = createClient(
  supabaseUrl || 'https://missing-url.supabase.co', 
  supabaseAnonKey || 'missing-key'
)
