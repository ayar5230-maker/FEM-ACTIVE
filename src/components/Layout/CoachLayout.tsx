import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { signOut } from '../../lib/auth'
import { useUnreadMessages } from '../../hooks/useUnreadMessages'
import type { Profile } from '../../lib/types'

interface CoachLayoutProps {
  profile: Profile
}

const navItems = [
  { to: '/coach', label: 'Tableau de bord', icon: '◈', end: true },
  { to: '/coach/clients', label: 'Clientes', icon: '◉' },
  { to: '/coach/workouts', label: 'Entraînements', icon: '◎' },
  { to: '/coach/nutrition', label: 'Nutrition', icon: '◌' },
  { to: '/coach/checkins', label: 'Check-ins', icon: '◍' },
  { to: '/coach/messages', label: 'Messages', icon: '◈', hasUnread: true },
]

export function CoachLayout({ profile }: CoachLayoutProps) {
  const navigate = useNavigate()
  const unread = useUnreadMessages(profile.id)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-brand-lavender/30">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-brand-deep text-white fixed left-0 top-0">
        {/* Logo */}
        <div className="px-6 py-7 border-b border-white/10">
          <h1 className="font-heading text-xl italic font-semibold text-white">
            Fem'Active
          </h1>
          <p className="font-body text-xs text-brand-lavender/60 mt-0.5">Espace Coach</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl
                font-body text-sm font-medium transition-all
                ${isActive
                  ? 'bg-brand-violet text-white'
                  : 'text-brand-lavender/70 hover:bg-white/10 hover:text-white'}
              `}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.hasUnread && unread > 0 && (
                <span className="bg-brand-violet text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profile */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-brand-violet flex items-center justify-center text-white text-sm font-bold">
              {(profile.full_name ?? 'C')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-body text-sm text-white truncate">{profile.full_name ?? 'Coach'}</p>
              <p className="font-body text-xs text-brand-lavender/50 truncate">{profile.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left font-body text-xs text-brand-lavender/50 hover:text-white transition-colors px-1 py-1"
          >
            → Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-deep border-t border-white/10 z-40">
        <div className="flex">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `
                flex-1 flex flex-col items-center gap-1 py-2.5
                font-body text-xs transition-colors relative
                ${isActive ? 'text-brand-violet' : 'text-white/50'}
              `}
            >
              <span className="text-lg">{item.icon}</span>
              {item.hasUnread && unread > 0 && (
                <span className="absolute top-1.5 right-1/4 bg-brand-violet text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
