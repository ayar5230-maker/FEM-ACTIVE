import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Dumbbell, Apple, ClipboardCheck,
  MessageSquare, LogOut, Bell, Package
} from 'lucide-react'
import { signOut } from '../../lib/auth'
import { useUnreadMessages } from '../../hooks/useUnreadMessages'
import { useAuthContext } from '../../contexts/AuthContext'

const navSections = [
  {
    label: 'Main',
    items: [
      { to: '/coach', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/coach/clients', label: 'Clients', icon: Users },
      { to: '/coach/checkins', label: 'Check-ins', icon: ClipboardCheck },
      { to: '/coach/messages', label: 'Messages', icon: MessageSquare, hasUnread: true },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/coach/packages', label: 'Forfaits', icon: Package },
    ],
  },
  {
    label: 'Library',
    items: [
      { to: '/coach/workouts', label: 'Training', icon: Dumbbell },
      { to: '/coach/nutrition', label: 'Nutrition', icon: Apple },
    ],
  },
]

// flat list for mobile nav (just main items)
const mobileItems = navSections.flatMap(s => s.items).slice(0, 5)

export function CoachLayout() {
  const { profile } = useAuthContext()
  const navigate = useNavigate()
  const unread = useUnreadMessages(profile?.id)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-gray-100 fixed left-0 top-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <h1 className="font-heading text-lg italic font-semibold text-brand-deep">
            Fem'Active
          </h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {navSections.map(section => (
            <div key={section.label}>
              <p className="px-3 mb-1 font-body text-xs font-medium text-gray-400 tracking-wide uppercase">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => {
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
              </div>
            </div>
          ))}
        </nav>

        {/* Profile */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-full bg-brand-deep flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(profile?.full_name ?? 'C')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-body text-xs font-medium text-gray-800 truncate">{profile?.full_name ?? 'Coach'}</p>
              <p className="font-body text-xs text-gray-400 truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 font-body text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <LogOut size={13} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="flex">
          {mobileItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `
                  flex-1 flex flex-col items-center gap-1 py-2.5
                  font-body text-xs transition-colors relative
                  ${isActive ? 'text-brand-violet' : 'text-gray-400'}
                `}
              >
                <Icon size={18} strokeWidth={1.8} />
                {item.hasUnread && unread > 0 && (
                  <span className="absolute top-1.5 right-1/4 bg-brand-violet text-white text-xs rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold text-[9px]">
                    {unread}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Top bar */}
      <div className="md:ml-56 flex-1 flex flex-col min-h-screen">
        <header className="hidden md:flex items-center justify-end gap-3 px-6 py-3 bg-white border-b border-gray-100">
          <button className="relative p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell size={18} strokeWidth={1.8} />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-brand-violet rounded-full" />
            )}
          </button>
          <div className="w-7 h-7 rounded-full bg-brand-deep flex items-center justify-center text-white text-xs font-bold">
            {(profile?.full_name ?? 'C')[0].toUpperCase()}
          </div>
        </header>
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
