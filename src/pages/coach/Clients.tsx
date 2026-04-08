import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import type { Profile } from '../../lib/types'

interface ClientRow extends Profile {
  adherence: number
  week: number
}

const statusColors: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  inactive: 'bg-gray-50 text-gray-600 border-gray-200',
}

export function CoachClients() {
  const { profile } = useAuthContext()
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!profile) return
    loadClients()
  }, [profile])

  async function loadClients() {
    if (!profile) return
    setLoading(true)

    const { data: rawClients } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .eq('coach_id', profile.id)
      .order('created_at', { ascending: false })

    if (!rawClients) { setLoading(false); return }

    // Calculate adherence for each client
    const enriched = await Promise.all(rawClients.map(async (c) => {
      const created = new Date(c.created_at)
      const now = new Date()
      const week = Math.max(1, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1)

      const { data: workouts } = await supabase
        .from('workouts')
        .select('id')
        .eq('client_id', c.id)
        .eq('week', week)

      let adherence = 0
      if (workouts && workouts.length > 0) {
        const workoutIds = workouts.map(w => w.id)
        const { data: exercises } = await supabase
          .from('exercises')
          .select('completed')
          .in('workout_id', workoutIds)

        if (exercises && exercises.length > 0) {
          const done = exercises.filter(e => e.completed).length
          adherence = Math.round((done / exercises.length) * 100)
        }
      }

      return { ...c, adherence, week } as ClientRow
    }))

    setClients(enriched)
    setLoading(false)
  }

  function getStatus(client: ClientRow): string {
    if (client.adherence >= 70) return 'active'
    if (client.adherence > 0) return 'pending'
    return 'inactive'
  }

  const filtered = clients.filter(c =>
    (c.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-brand-deep">Clientes</h1>
          <p className="font-body text-brand-deep/50 mt-1">{clients.length} cliente{clients.length > 1 ? 's' : ''} enregistrée{clients.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher une cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-brand-lavender bg-white
            font-body text-sm text-brand-deep placeholder-brand-deep/30
            focus:outline-none focus:ring-2 focus:ring-brand-violet/30 focus:border-brand-violet"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <Card padding="sm">
          {filtered.length === 0 ? (
            <p className="font-body text-sm text-brand-deep/40 text-center py-8">
              {search ? 'Aucun résultat' : 'Aucune cliente pour le moment'}
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-brand-lavender">
                      {['Cliente', 'Forfait', 'Semaine', 'Adhérence', 'Statut', 'Actions'].map(h => (
                        <th key={h} className="text-left font-body text-xs uppercase tracking-wider text-brand-deep/40 px-4 py-3 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(client => {
                      const status = getStatus(client)
                      return (
                        <tr key={client.id} className="border-b border-brand-lavender/50 last:border-0 hover:bg-brand-lavender/20 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-deep flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {(client.full_name ?? '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-body text-sm font-medium text-brand-deep">{client.full_name ?? '—'}</p>
                                <p className="font-body text-xs text-brand-deep/40">{client.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-body text-sm text-brand-deep/70">
                              {client.forfait ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-body text-sm font-medium text-brand-deep">S{client.week}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-brand-lavender rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-violet rounded-full transition-all"
                                  style={{ width: `${client.adherence}%` }}
                                />
                              </div>
                              <span className="font-body text-xs text-brand-deep/60">{client.adherence}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-lg font-body text-xs font-medium border ${statusColors[status]}`}>
                              {status === 'active' ? 'Active' : status === 'pending' ? 'En cours' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => navigate(`/coach/workouts?client=${client.id}`)}
                                className="font-body text-xs text-brand-violet hover:underline"
                              >
                                Programme
                              </button>
                              <button
                                onClick={() => navigate(`/coach/messages?client=${client.id}`)}
                                className="font-body text-xs text-brand-violet hover:underline"
                              >
                                Message
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-2">
                {filtered.map(client => {
                  const status = getStatus(client)
                  return (
                    <div key={client.id} className="bg-brand-lavender/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-deep flex items-center justify-center text-white text-sm font-bold">
                            {(client.full_name ?? '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-body text-sm font-medium text-brand-deep">{client.full_name ?? '—'}</p>
                            <p className="font-body text-xs text-brand-deep/40">{client.forfait ?? 'Sans forfait'}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg font-body text-xs font-medium border ${statusColors[status]}`}>
                          {status === 'active' ? 'Active' : status === 'pending' ? 'En cours' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-body text-xs text-brand-deep/50">S{client.week}</span>
                        <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                          <div className="h-full bg-brand-violet rounded-full" style={{ width: `${client.adherence}%` }} />
                        </div>
                        <span className="font-body text-xs text-brand-deep/60">{client.adherence}%</span>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => navigate(`/coach/workouts?client=${client.id}`)}
                          className="font-body text-xs text-brand-violet font-medium"
                        >
                          Programme →
                        </button>
                        <button
                          onClick={() => navigate(`/coach/messages?client=${client.id}`)}
                          className="font-body text-xs text-brand-violet font-medium"
                        >
                          Message →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
