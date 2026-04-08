import { createContext, useContext } from 'react'
import type { Profile } from '../lib/types'

interface AuthContextValue {
  profile: Profile | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue>({ profile: null, loading: true })

export function useAuthContext() {
  return useContext(AuthContext)
}
