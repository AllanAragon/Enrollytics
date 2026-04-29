import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

export async function createClient() {
  if (!isSupabaseConfigured) {
    return null
  }
  const cookieStore = await cookies()
  return createServerClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Silently ignored: cookies().set() throws when called from a Server Component
            // during static rendering. This is expected behavior — the middleware will
            // handle refreshing the session cookie instead.
          }
        },
      },
    }
  )
}
