import { createContext, useContext } from 'react'
import type { Profile } from '../lib/types'

interface AuthContextValue {
  profile: Profile | null
  loading: boolean
  setProfile: (p: Profile | null) => void
}

export const AuthContext = createContext<AuthContextValue>({
  profile: null,
  loading: true,
  setProfile: () => {},
})

export function useAuthContext() {
  return useContext(AuthContext)
}
