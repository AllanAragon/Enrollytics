import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

export function createClient() {
  if (!isSupabaseConfigured) {
    return null
  }
  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!)
}
