import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { AuthGuard } from './components/AuthGuard'
import { CoachLayout } from './components/Layout/CoachLayout'
import { ClientLayout } from './components/Layout/ClientLayout'
import { LoginPage } from './pages/Login'
import { CoachDashboard } from './pages/coach/Dashboard'
import { CoachClients } from './pages/coach/Clients'
import { CoachWorkouts } from './pages/coach/Workouts'
import { CoachNutrition } from './pages/coach/Nutrition'
import { CoachCheckIns } from './pages/coach/CheckIns'
import { CoachMessages } from './pages/coach/Messages'
import { ClientHome } from './pages/client/Home'
import { ClientWorkouts } from './pages/client/MyWorkouts'
import { ClientNutrition } from './pages/client/Nutrition'
import { ClientCheckIn } from './pages/client/CheckIn'
import { ClientMessages } from './pages/client/Messages'
import { useAuthContext } from './contexts/AuthContext'
import { PageLoader } from './components/ui/Spinner'

function CoachPortal() {
  const { profile } = useAuthContext()
  if (!profile) return <PageLoader />
  return <CoachLayout profile={profile} />
}

function ClientPortal() {
  const { profile } = useAuthContext()
  if (!profile) return <PageLoader />
  return <ClientLayout profile={profile} />
}

export default function App() {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Coach */}
          <Route
            path="/coach"
            element={
              <AuthGuard role="coach">
                <CoachPortal />
              </AuthGuard>
            }
          >
            <Route index element={<CoachDashboard />} />
            <Route path="clients" element={<CoachClients />} />
            <Route path="workouts" element={<CoachWorkouts />} />
            <Route path="nutrition" element={<CoachNutrition />} />
            <Route path="checkins" element={<CoachCheckIns />} />
            <Route path="messages" element={<CoachMessages />} />
          </Route>

          {/* Client */}
          <Route
            path="/client"
            element={
              <AuthGuard role="client">
                <ClientPortal />
              </AuthGuard>
            }
          >
            <Route index element={<ClientHome />} />
            <Route path="workouts" element={<ClientWorkouts />} />
            <Route path="nutrition" element={<ClientNutrition />} />
            <Route path="checkin" element={<ClientCheckIn />} />
            <Route path="messages" element={<ClientMessages />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
