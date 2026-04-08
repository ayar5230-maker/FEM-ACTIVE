import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { Search, Plus, SlidersHorizontal, MoreHorizontal } from 'lucide-react'
import type { Profile } from '../../lib/types'

interface ClientRow extends Profile {
  lastCheckIn: string | null
  lastActive: string | null
  tag: 'online' | 'not_paying' | 'inactive'
}

function timeAgo(date: string | null): string {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  return `Il y a ${days} jours`
}

export function CoachClients() {
  const { profile } = useAuthContext()
  const navigate = useNavigate()
  const { toasts, addToast, removeToast } = useToast()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ full_name: '', email: '', forfait: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (profile) loadClients()
  }, [profile])

  async function loadClients() {
    if (!profile) return
    setLoading(true)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .eq('coach_id', profile.id)
      .order('created_at', { ascending: false })

    const enriched = await Promise.all((data ?? []).map(async (c) => {
      const { data: ci } = await supabase
        .from('check_ins')
        .select('created_at')
        .eq('client_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const tag: ClientRow['tag'] = c.forfait ? 'online' : 'not_paying'
      return {
        ...c,
        lastCheckIn: ci?.created_at ?? null,
        lastActive: c.created_at,
        tag,
      } as ClientRow
    }))

    setClients(enriched)
    setLoading(false)
  }

  async function handleAddClient() {
    if (!profile || !addForm.email.trim()) return
    setAdding(true)

    // Create invite / placeholder profile
    const tempId = crypto.randomUUID()
    const { error } = await supabase.from('profiles').insert({
      id: tempId,
      email: addForm.email.trim(),
      full_name: addForm.full_name.trim() || addForm.email.split('@')[0],
      role: 'client',
      coach_id: profile.id,
      forfait: addForm.forfait || null,
    })

    if (error) {
      addToast('Erreur — cet email existe peut-être déjà', 'error')
    } else {
      addToast('Cliente ajoutée !', 'success')
      setShowAddModal(false)
      setAddForm({ full_name: '', email: '', forfait: '' })
      loadClients()
    }
    setAdding(false)
  }

  const filtered = clients.filter(c =>
    (c.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const tagStyles = {
    online: 'bg-purple-50 text-purple-700 border border-purple-200',
    not_paying: 'bg-gray-100 text-gray-500 border border-gray-200',
    inactive: 'bg-gray-100 text-gray-400 border border-gray-200',
  }

  const tagLabels = {
    online: 'Online',
    not_paying: 'Not paying',
    inactive: 'Inactive',
  }

  return (
    <div className="p-6 lg:p-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-body text-xl font-semibold text-gray-900">Clients</h1>
        <Button onClick={() => setShowAddModal(true)} size="sm">
          <Plus size={15} />
          Add Client
        </Button>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-white
              font-body text-sm text-gray-800 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet/40"
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white font-body text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <SlidersHorizontal size={14} />
          {clients.length} Clients
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-body text-xs text-gray-400 font-medium px-5 py-3">Client</th>
                <th className="text-left font-body text-xs text-gray-400 font-medium px-4 py-3">Tag</th>
                <th className="text-left font-body text-xs text-gray-400 font-medium px-4 py-3">Last Check-In</th>
                <th className="text-left font-body text-xs text-gray-400 font-medium px-4 py-3">Last Active</th>
                <th className="text-left font-body text-xs text-gray-400 font-medium px-4 py-3">Forfait</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center font-body text-sm text-gray-400 py-12">
                    {search ? 'No results' : 'No clients yet — click Add Client to get started'}
                  </td>
                </tr>
              ) : (
                filtered.map(client => (
                  <tr
                    key={client.id}
                    onClick={() => navigate(`/coach/clients/${client.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors last:border-0"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-deep flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(client.full_name ?? '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-body text-sm font-medium text-gray-800">{client.full_name ?? '—'}</p>
                          <p className="font-body text-xs text-gray-400">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full font-body text-xs font-medium ${tagStyles[client.tag]}`}>
                        {tagLabels[client.tag]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-body text-sm text-gray-500">
                      {timeAgo(client.lastCheckIn)}
                    </td>
                    <td className="px-4 py-3.5 font-body text-sm text-gray-500">
                      {timeAgo(client.lastActive)}
                    </td>
                    <td className="px-4 py-3.5 font-body text-sm text-gray-500">
                      {client.forfait ?? '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={e => e.stopPropagation()}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-5">Add Client</h2>
            <div className="space-y-4">
              <div>
                <label className="block font-body text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={addForm.full_name}
                  onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Sophie Martin"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
                />
              </div>
              <div>
                <label className="block font-body text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="sophie@exemple.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
                />
              </div>
              <div>
                <label className="block font-body text-sm font-medium text-gray-700 mb-1">Forfait</label>
                <input
                  type="text"
                  value={addForm.forfait}
                  onChange={e => setAddForm(f => ({ ...f, forfait: e.target.value }))}
                  placeholder="Premium 3 mois"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 font-body text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <Button onClick={handleAddClient} loading={adding} className="flex-1">
                Add Client
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
