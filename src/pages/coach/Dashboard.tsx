import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { StatCard } from '../../components/ui/StatCard'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import type { CheckIn, Profile } from '../../lib/types'

interface DashboardStats {
  activeClients: number
  pendingCheckIns: number
  unreadMessages: number
  weeklyAdherence: number
}

interface RecentActivity {
  id: string
  type: 'checkin' | 'message' | 'workout'
  client: string
  description: string
  time: string
}

export function CoachDashboard() {
  const { profile } = useAuthContext()
  const [stats, setStats] = useState<DashboardStats>({ activeClients: 0, pendingCheckIns: 0, unreadMessages: 0, weeklyAdherence: 0 })
  const [pendingCheckIns, setPendingCheckIns] = useState<(CheckIn & { profile?: Profile })[]>([])
  const [activity, setActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadDashboard()
  }, [profile])

  async function loadDashboard() {
    if (!profile) return
    setLoading(true)

    const [clientsRes, checkInsRes, messagesRes, _exercisesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'client').eq('coach_id', profile.id),
      supabase.from('check_ins').select('*, profile:profiles(*)').eq('status', 'pending'),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', profile.id).eq('read', false),
      supabase.from('exercises').select('completed').eq('completed', true),
    ])

    const clients = clientsRes.data ?? []
    const pending = (checkInsRes.data ?? []) as (CheckIn & { profile?: Profile })[]

    // Adherence: completed exercises / total exercises this week
    const allExercises = await supabase.from('exercises').select('completed')
    const total = allExercises.data?.length ?? 0
    const done = allExercises.data?.filter(e => e.completed).length ?? 0
    const adherence = total > 0 ? Math.round((done / total) * 100) : 0

    setStats({
      activeClients: clients.length,
      pendingCheckIns: pending.length,
      unreadMessages: messagesRes.count ?? 0,
      weeklyAdherence: adherence,
    })
    setPendingCheckIns(pending.slice(0, 5))

    // Build activity feed from recent check-ins
    const recentActivity: RecentActivity[] = pending.slice(0, 6).map(ci => ({
      id: ci.id,
      type: 'checkin',
      client: (ci.profile as Profile | undefined)?.full_name ?? 'Client',
      description: `Week ${ci.week} check-in submitted`,
      time: new Date(ci.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    }))
    setActivity(recentActivity)
    setLoading(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-brand-deep">
          {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'Coach'} 👋
        </h1>
        <p className="font-body text-brand-deep/50 mt-1">
          {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Active clients"
              value={stats.activeClients}
              icon="◉"
              accent
            />
            <StatCard
              label="Pending check-ins"
              value={stats.pendingCheckIns}
              icon="◍"
            />
            <StatCard
              label="Unread messages"
              value={stats.unreadMessages}
              icon="◈"
            />
            <StatCard
              label="Weekly adherence"
              value={`${stats.weeklyAdherence}%`}
              sub="exercises completed"
              icon="◎"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pending check-ins */}
            <Card>
              <h2 className="font-heading text-lg font-semibold text-brand-deep mb-4">
                Pending check-ins
              </h2>
              {pendingCheckIns.length === 0 ? (
                <p className="font-body text-sm text-brand-deep/40 text-center py-6">
                  No pending check-ins ✓
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingCheckIns.map(ci => (
                    <div
                      key={ci.id}
                      className="flex items-center justify-between py-2.5 border-b border-brand-lavender last:border-0"
                    >
                      <div>
                        <p className="font-body text-sm font-medium text-brand-deep">
                          {(ci.profile as Profile | undefined)?.full_name ?? 'Client'}
                        </p>
                        <p className="font-body text-xs text-brand-deep/50">
                          Week {ci.week} · {new Date(ci.created_at).toLocaleDateString('en-CA')}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg font-body text-xs font-medium border border-amber-200">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Activity feed */}
            <Card>
              <h2 className="font-heading text-lg font-semibold text-brand-deep mb-4">
                Recent activity
              </h2>
              {activity.length === 0 ? (
                <p className="font-body text-sm text-brand-deep/40 text-center py-6">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-3">
                  {activity.map(a => (
                    <div key={a.id} className="flex gap-3 py-2 border-b border-brand-lavender last:border-0">
                      <div className="w-8 h-8 rounded-full bg-brand-lavender flex items-center justify-center flex-shrink-0">
                        <span className="text-sm text-brand-violet">
                          {a.type === 'checkin' ? '◍' : a.type === 'message' ? '◈' : '◎'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm text-brand-deep">
                          <span className="font-medium">{a.client}</span>{' '}
                          <span className="text-brand-deep/60">{a.description}</span>
                        </p>
                        <p className="font-body text-xs text-brand-deep/40 mt-0.5">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
