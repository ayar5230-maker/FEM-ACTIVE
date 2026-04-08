import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, Dumbbell, Apple, ClipboardCheck, MessageSquare, LogOut } from 'lucide-react'
import { signOut } from '../../lib/auth'
import { useUnreadMessages } from '../../hooks/useUnreadMessages'
import { useAuthContext } from '../../contexts/AuthContext'

const navItems = [
  { to: '/client', label: 'Home', icon: Home, end: true },
  { to: '/client/workouts', label: 'Workouts', icon: Dumbbell },
  { to: '/client/nutrition', label: 'Nutrition', icon: Apple },
  { to: '/client/checkin', label: 'Check-in', icon: ClipboardCheck },
  { to: '/client/messages', label: 'Messages', icon: MessageSquare, hasUnread: true },
]

export function ClientLayout() {
  const { profile } = useAuthContext()
  const navigate = useNavigate()
  const unread = useUnreadMessages(profile?.id)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-gray-100 fixed left-0 top-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <h1 className="font-heading text-lg italic font-semibold text-brand-deep">Fem'Active</h1>
          <p className="font-body text-xs text-gray-400 mt-0.5">My Space</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `
                  flex items-center gap-2.5 px-3 py-2 rounded-lg
                  font-body text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-brand-lavender text-brand-deep'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}
                `}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span className="flex-1">{item.label}</span>
                {item.hasUnread && unread > 0 && (
                  <span className="bg-brand-violet text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-full bg-brand-deep flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(profile?.full_name ?? 'C')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-body text-xs font-medium text-gray-800 truncate">{profile?.full_name ?? 'Client'}</p>
              {profile?.forfait && (
                <p className="font-body text-xs text-brand-violet truncate">{profile.forfait}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 font-body text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="flex">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `
                  flex-1 flex flex-col items-center gap-1 py-2.5 relative
                  font-body text-xs transition-colors
                  ${isActive ? 'text-brand-violet' : 'text-gray-400'}
                `}
              >
                <Icon size={18} strokeWidth={1.8} />
                {item.hasUnread && unread > 0 && (
                  <span className="absolute top-1.5 right-1/4 w-2 h-2 bg-brand-violet rounded-full" />
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      <main className="flex-1 md:ml-56 pb-20 md:pb-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
