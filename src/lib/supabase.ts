import { createClient } from '@supabase/supabase-js'

// Fallback to known values if env vars aren't loading (anon key is safe to be public)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://jkwpqvlcovrhnbcspuyy.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprd3Bxdmxjb3ZyaG5iY3NwdXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTAwODIsImV4cCI6MjA5MTE2NjA4Mn0.jIjwlutIcarFpSMvng4B8xiqfxVOJJYsfo-g5_qLb2s'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // supabase-js v2.50+ uses navigator.locks for cross-tab coordination.
    // If another tab holds the lock it never releases, all auth calls hang forever.
    // Replace with a no-op lock so auth always proceeds immediately.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lock: (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
  },
})

// Helper: get signed URL for a private storage file
export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('checkin-photos')
    .createSignedUrl(path, expiresIn)
  if (error) return null
  return data.signedUrl
}

// Helper: compute current week from profile creation date
export function getCurrentWeek(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7))
  return Math.max(1, diffWeeks + 1)
}
