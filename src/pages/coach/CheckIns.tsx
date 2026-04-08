import { useState, useEffect } from 'react'
import { supabase, getSignedUrl } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { CheckIn, Profile, CheckInPhoto } from '../../lib/types'

interface EnrichedCheckIn extends CheckIn {
  profile?: Profile
  photos?: CheckInPhoto[]
  photoUrls?: Record<string, string>
}

export function CoachCheckIns() {
  const { profile } = useAuthContext()
  const { toasts, addToast, removeToast } = useToast()
  const [checkIns, setCheckIns] = useState<EnrichedCheckIn[]>([])
  const [selected, setSelected] = useState<EnrichedCheckIn | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending')
  const [weightData, setWeightData] = useState<{ week: number; weight: number }[]>([])

  useEffect(() => {
    if (profile) loadCheckIns()
  }, [profile])

  async function loadCheckIns() {
    setLoading(true)
    const { data } = await supabase
      .from('check_ins')
      .select('*, profile:profiles(*), photos:check_in_photos(*)')
      .order('created_at', { ascending: false })

    setCheckIns((data ?? []) as EnrichedCheckIn[])
    setLoading(false)
  }

  async function handleSelect(ci: EnrichedCheckIn) {
    setFeedback(ci.coach_feedback ?? '')

    // Load signed URLs for photos
    const photoUrls: Record<string, string> = {}
    if (ci.photos) {
      await Promise.all(ci.photos.map(async (p) => {
        const url = await getSignedUrl(p.storage_path)
        if (url) photoUrls[p.angle] = url
      }))
    }

    setSelected({ ...ci, photoUrls })

    // Load weight progression for this client
    const { data } = await supabase
      .from('check_ins')
      .select('week, weight_kg')
      .eq('client_id', ci.client_id)
      .order('week', { ascending: true })

    const points = (data ?? [])
      .filter(c => c.weight_kg)
      .map(c => ({ week: c.week, weight: c.weight_kg as number }))
    setWeightData(points)
  }

  async function handleApprove() {
    if (!selected) return
    setSaving(true)

    const { error } = await supabase
      .from('check_ins')
      .update({ coach_feedback: feedback, status: 'reviewed' })
      .eq('id', selected.id)

    if (error) {
      addToast('Error saving', 'error')
    } else {
      addToast('Check-in approved!', 'success')
      loadCheckIns()
      setSelected(null)
    }
    setSaving(false)
  }

  const filtered = checkIns.filter(ci => filter === 'all' || ci.status === filter)

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-brand-deep">Check-ins</h1>
        <p className="font-body text-brand-deep/50 mt-1">Review weekly check-ins</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['pending', 'reviewed', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-body text-sm font-medium transition-all ${
              filter === f
                ? 'bg-brand-violet text-white'
                : 'bg-brand-lavender/50 text-brand-deep/60 hover:bg-brand-lavender'
            }`}
          >
            {f === 'pending' ? 'Pending' : f === 'reviewed' ? 'Reviewed' : 'All'}
            {f !== 'all' && (
              <span className="ml-2 text-xs opacity-70">
                {checkIns.filter(ci => ci.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Check-ins list */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner size="lg" /></div>
          ) : filtered.length === 0 ? (
            <Card>
              <p className="font-body text-sm text-brand-deep/40 text-center py-6">
                No {filter === 'pending' ? 'pending' : filter === 'reviewed' ? 'reviewed' : ''} check-ins
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(ci => (
                <button
                  key={ci.id}
                  onClick={() => handleSelect(ci)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selected?.id === ci.id
                      ? 'bg-brand-deep text-white border-brand-deep'
                      : 'bg-white border-brand-lavender hover:border-brand-violet/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className={`font-body text-sm font-medium ${selected?.id === ci.id ? 'text-white' : 'text-brand-deep'}`}>
                      {(ci.profile as Profile | undefined)?.full_name ?? 'Client'}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full font-body text-xs font-medium ${
                      ci.status === 'pending'
                        ? selected?.id === ci.id ? 'bg-amber-300 text-amber-900' : 'bg-amber-50 text-amber-700'
                        : selected?.id === ci.id ? 'bg-green-300 text-green-900' : 'bg-green-50 text-green-700'
                    }`}>
                      {ci.status === 'pending' ? 'Pending' : 'Reviewed'}
                    </span>
                  </div>
                  <p className={`font-body text-xs ${selected?.id === ci.id ? 'text-white/60' : 'text-brand-deep/50'}`}>
                    Week {ci.week} · {ci.weight_kg ? `${ci.weight_kg} kg` : '—'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail view */}
        <div className="lg:col-span-3">
          {!selected ? (
            <Card>
              <div className="text-center py-12">
                <p className="font-body text-brand-deep/30">Select a check-in to review</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Client info + metrics */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading text-xl font-semibold text-brand-deep">
                      {(selected.profile as Profile | undefined)?.full_name ?? 'Client'}
                    </h3>
                    <p className="font-body text-sm text-brand-deep/50">Week {selected.week}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full font-body text-sm font-medium ${
                    selected.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {selected.status === 'pending' ? 'Pending' : 'Reviewed'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'Weight', value: selected.weight_kg ? `${selected.weight_kg} kg` : '—' },
                    { label: 'Energy', value: selected.energy ? `${selected.energy}/10` : '—' },
                    { label: 'Sleep', value: selected.sleep_hours ? `${selected.sleep_hours}h` : '—' },
                    { label: 'Sessions', value: `${selected.sessions_done}/${selected.sessions_total}` },
                  ].map(s => (
                    <div key={s.label} className="bg-brand-lavender/40 rounded-xl p-3 text-center">
                      <p className="font-body text-xs text-brand-deep/50">{s.label}</p>
                      <p className="font-body text-lg font-bold text-brand-deep mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>

                {selected.client_note && (
                  <div className="bg-brand-lavender/30 rounded-xl p-3 mb-4">
                    <p className="font-body text-xs font-medium text-brand-deep/60 mb-1">Client note</p>
                    <p className="font-body text-sm text-brand-deep">{selected.client_note}</p>
                  </div>
                )}
              </Card>

              {/* Photos */}
              {selected.photoUrls && Object.keys(selected.photoUrls).length > 0 && (
                <Card>
                  <h3 className="font-heading text-base font-semibold text-brand-deep mb-3">Progress photos</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(['front', 'side', 'back'] as const).map(angle => (
                      <div key={angle} className="aspect-[3/4] rounded-xl overflow-hidden bg-brand-lavender/40 flex items-center justify-center">
                        {selected.photoUrls?.[angle] ? (
                          <img
                            src={selected.photoUrls[angle]}
                            alt={angle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-body text-xs text-brand-deep/30">
                            {angle === 'front' ? 'Front' : angle === 'side' ? 'Side' : 'Back'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Weight progression */}
              {weightData.length > 1 && (
                <Card>
                  <h3 className="font-heading text-base font-semibold text-brand-deep mb-3">Weight progression</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f0ff" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fontFamily: 'Outfit' }} tickFormatter={v => `S${v}`} />
                      <YAxis tick={{ fontSize: 11, fontFamily: 'Outfit' }} domain={['dataMin - 1', 'dataMax + 1']} unit=" kg" />
                      <Tooltip
                        contentStyle={{ fontFamily: 'Outfit', fontSize: 12, borderRadius: 12 }}
                        formatter={(v: number) => [`${v} kg`, 'Weight']}
                        labelFormatter={v => `Week ${v}`}
                      />
                      <Line type="monotone" dataKey="weight" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Feedback */}
              <Card>
                <h3 className="font-heading text-base font-semibold text-brand-deep mb-3">Coach feedback</h3>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={4}
                  placeholder="Great work this week! Here are my observations..."
                  disabled={selected.status === 'reviewed'}
                  className="w-full px-4 py-3 rounded-xl border border-brand-lavender font-body text-sm text-brand-deep
                    focus:outline-none focus:ring-2 focus:ring-brand-violet/30 resize-none
                    disabled:bg-brand-lavender/30 disabled:text-brand-deep/50"
                />
                {selected.status === 'pending' && (
                  <Button
                    onClick={handleApprove}
                    loading={saving}
                    className="w-full mt-3"
                  >
                    Approve check-in
                  </Button>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
