import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

interface AuthState {
  profile: Profile | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Safety timeout — never block the UI forever
    const timeout = setTimeout(() => {
      if (mounted) { setProfile(null); setLoading(false) }
    }, 4000)

    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          clearTimeout(timeout)
          if (mounted) { setProfile(null); setLoading(false) }
          return
        }

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        clearTimeout(timeout)
        if (mounted) { setProfile(data ?? null); setLoading(false) }
      } catch {
        clearTimeout(timeout)
        if (mounted) { setProfile(null); setLoading(false) }
      }
    }

    loadProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session?.user) {
          if (mounted) setProfile(null)
          return
        }
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (mounted) setProfile(data ?? null)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { profile, loading }
}
