import { Navigate } from 'react-router-dom'
import { PageLoader } from './ui/Spinner'
import { useAuthContext } from '../contexts/AuthContext'
import type { Role } from '../lib/types'

interface AuthGuardProps {
  role: Role
  children: React.ReactNode
}

export function AuthGuard({ role, children }: AuthGuardProps) {
  const { profile, loading } = useAuthContext()

  if (loading) return <PageLoader />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role !== role) {
    return <Navigate to={profile.role === 'coach' ? '/coach' : '/client'} replace />
  }

  return <>{children}</>
}
