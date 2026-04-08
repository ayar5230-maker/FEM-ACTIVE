import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import {
  ArrowLeft, User, ClipboardCheck, Dumbbell, Apple,
  Camera, TrendingUp, CreditCard, Plus, Save, Pencil
} from 'lucide-react'
import type { Profile, CheckIn } from '../../lib/types'

interface Measurement {
  id: string
  client_id: string
  recorded_at: string
  weight_kg: number | null
  hip_cm: number | null
  waist_cm: number | null
  chest_cm: number | null
  bicep_left_cm: number | null
  bicep_right_cm: number | null
  thigh_cm: number | null
  note: string | null
}

type Tab = 'overview' | 'checkins' | 'training' | 'nutrition' | 'photos' | 'metrics' | 'payments'

function fmt(v: number | null, unit = '') {
  if (v === null) return '—'
  return `${v}${unit}`
}

function diff(current: number | null, previous: number | null): JSX.Element | null {
  if (current === null || previous === null) return null
  const d = current - previous
  if (d === 0) return null
  const color = d < 0 ? 'text-green-600' : 'text-red-500'
  return <span className={`text-xs font-medium ml-1 ${color}`}>{d > 0 ? '+' : ''}{d.toFixed(1)}</span>
}

function timeAgo(date: string): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  return `Il y a ${days} j`
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',  label: 'Aperçu',       icon: User },
  { id: 'checkins',  label: 'Check-ins',     icon: ClipboardCheck },
  { id: 'training',  label: 'Entraînements', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition',     icon: Apple },
  { id: 'photos',    label: 'Photos',        icon: Camera },
  { id: 'metrics',   label: 'Mesures',       icon: TrendingUp },
  { id: 'payments',  label: 'Paiements',     icon: CreditCard },
]

export function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const { toasts, addToast, removeToast } = useToast()

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [client, setClient] = useState<Profile | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)

  // Edit note
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Add measurement modal
  const [showMeasModal, setShowMeasModal] = useState(false)
  const [measForm, setMeasForm] = useState({
    weight_kg: '', hip_cm: '', waist_cm: '', chest_cm: '',
    bicep_left_cm: '', bicep_right_cm: '', thigh_cm: '', note: ''
  })
  const [savingMeas, setSavingMeas] = useState(false)

  useEffect(() => {
    if (clientId) loadAll()
  }, [clientId])

  async function loadAll() {
    setLoading(true)
    const [profileRes, checkInRes, measRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', clientId!).single(),
      supabase.from('check_ins').select('*').eq('client_id', clientId!).order('created_at', { ascending: false }),
      supabase.from('measurements').select('*').eq('client_id', clientId!).order('recorded_at', { ascending: false }),
    ])
    if (profileRes.data) {
      setClient(profileRes.data)
      setNoteText((profileRes.data as any).coach_note ?? '')
    }
    setCheckIns(checkInRes.data ?? [])
    setMeasurements(measRes.data ?? [])
    setLoading(false)
  }

  async function saveNote() {
    if (!client) return
    setSavingNote(true)
    await supabase.from('profiles').update({ coach_note: noteText } as any).eq('id', client.id)
    setEditingNote(false)
    setSavingNote(false)
    addToast('Note sauvegardée', 'success')
  }

  async function saveMeasurement() {
    if (!clientId) return
    setSavingMeas(true)
    const payload: Partial<Measurement> = {
      client_id: clientId,
      recorded_at: new Date().toISOString(),
      weight_kg: measForm.weight_kg ? Number(measForm.weight_kg) : null,
      hip_cm: measForm.hip_cm ? Number(measForm.hip_cm) : null,
      waist_cm: measForm.waist_cm ? Number(measForm.waist_cm) : null,
      chest_cm: measForm.chest_cm ? Number(measForm.chest_cm) : null,
      bicep_left_cm: measForm.bicep_left_cm ? Number(measForm.bicep_left_cm) : null,
      bicep_right_cm: measForm.bicep_right_cm ? Number(measForm.bicep_right_cm) : null,
      thigh_cm: measForm.thigh_cm ? Number(measForm.thigh_cm) : null,
      note: measForm.note || null,
    }
    const { error } = await supabase.from('measurements').insert(payload as any)
    if (error) {
      addToast('Erreur lors de la sauvegarde', 'error')
    } else {
      addToast('Mesures ajoutées !', 'success')
      setShowMeasModal(false)
      setMeasForm({ weight_kg: '', hip_cm: '', waist_cm: '', chest_cm: '', bicep_left_cm: '', bicep_right_cm: '', thigh_cm: '', note: '' })
      loadAll()
    }
    setSavingMeas(false)
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  }

  if (!client) {
    return (
      <div className="p-8 text-center font-body text-gray-400">
        Cliente introuvable.
        <button onClick={() => navigate('/coach/clients')} className="block mx-auto mt-4 text-brand-violet underline">
          Retour aux clients
        </button>
      </div>
    )
  }

  const latest = measurements[0] ?? null
  const previous = measurements[1] ?? null

  return (
    <div className="p-6 lg:p-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Back + header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/coach/clients')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-brand-deep flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            {(client.full_name ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="font-body text-lg font-semibold text-gray-900">{client.full_name ?? '—'}</h1>
            <p className="font-body text-xs text-gray-400">{client.email}</p>
          </div>
        </div>
        {client.forfait && (
          <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-body text-xs font-medium">
            {client.forfait}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-sm font-medium transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon size={14} strokeWidth={1.8} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Info card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-body text-sm font-semibold text-gray-700 mb-4">Informations</h2>
            <dl className="space-y-3">
              {[
                ['Email', client.email ?? '—'],
                ['Forfait', client.forfait ?? '—'],
                ['Membre depuis', new Date(client.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })],
                ['Check-ins', `${checkIns.length} total`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="font-body text-xs text-gray-400">{label}</dt>
                  <dd className="font-body text-xs font-medium text-gray-700">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Coach note */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-body text-sm font-semibold text-gray-700">Note coach</h2>
              {!editingNote && (
                <button
                  onClick={() => setEditingNote(true)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
            {editingNote ? (
              <div className="space-y-3">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  rows={4}
                  placeholder="Ajoute une note privée sur cette cliente..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-violet/20 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingNote(false)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 font-body text-xs text-gray-500 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <Button size="sm" onClick={saveNote} loading={savingNote}>
                    <Save size={13} /> Sauvegarder
                  </Button>
                </div>
              </div>
            ) : (
              <p className="font-body text-sm text-gray-500 whitespace-pre-wrap min-h-[60px]">
                {noteText || <span className="text-gray-300 italic">Aucune note</span>}
              </p>
            )}
          </div>

          {/* Quick stats */}
          {latest && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 md:col-span-2">
              <h2 className="font-body text-sm font-semibold text-gray-700 mb-4">Dernières mesures</h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {([
                  ['Poids', latest.weight_kg, previous?.weight_kg, 'kg'],
                  ['Hanches', latest.hip_cm, previous?.hip_cm, 'cm'],
                  ['Taille', latest.waist_cm, previous?.waist_cm, 'cm'],
                  ['Poitrine', latest.chest_cm, previous?.chest_cm, 'cm'],
                  ['Bicep G.', latest.bicep_left_cm, previous?.bicep_left_cm, 'cm'],
                  ['Cuisse', latest.thigh_cm, previous?.thigh_cm, 'cm'],
                ] as [string, number | null, number | null, string][]).map(([label, cur, prev, unit]) => (
                  <div key={label} className="text-center">
                    <p className="font-body text-xs text-gray-400 mb-1">{label}</p>
                    <p className="font-body text-lg font-semibold text-gray-800">
                      {fmt(cur, unit)}
                      {diff(cur, prev)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CHECK-INS ── */}
      {activeTab === 'checkins' && (
        <div className="space-y-3">
          {checkIns.length === 0 ? (
            <p className="font-body text-sm text-gray-400 py-12 text-center">Aucun check-in pour cette cliente</p>
          ) : checkIns.map(ci => (
            <div key={ci.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-body text-sm font-semibold text-gray-800">Semaine {ci.week}</p>
                  <p className="font-body text-xs text-gray-400">{new Date(ci.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-body text-xs font-medium
                  ${ci.status === 'reviewed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {ci.status === 'reviewed' ? 'Validé' : 'En attente'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['Poids', `${ci.weight_kg ?? '—'} kg`],
                  ['Énergie', ci.energy ? `${ci.energy}/10` : '—'],
                  ['Sommeil', ci.sleep_hours ? `${ci.sleep_hours}h` : '—'],
                  ['Séances', `${ci.sessions_done}/${ci.sessions_total}`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="font-body text-xs text-gray-400">{label}</p>
                    <p className="font-body text-sm font-semibold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
              {ci.client_note && (
                <p className="mt-3 font-body text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-600">Note : </span>{ci.client_note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── METRICS ── */}
      {activeTab === 'metrics' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-body text-sm font-semibold text-gray-700">Historique des mesures</h2>
            <Button size="sm" onClick={() => setShowMeasModal(true)}>
              <Plus size={14} /> Ajouter
            </Button>
          </div>

          {measurements.length === 0 ? (
            <p className="font-body text-sm text-gray-400 py-12 text-center">Aucune mesure enregistrée</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Date', 'Poids', 'Hanches', 'Taille', 'Poitrine', 'Bicep G.', 'Cuisse'].map(h => (
                      <th key={h} className="text-left font-body text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((m, i) => {
                    const prev = measurements[i + 1] ?? null
                    return (
                      <tr key={m.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3 font-body text-xs text-gray-500">
                          {new Date(m.recorded_at).toLocaleDateString('fr-FR')}
                        </td>
                        {([
                          [m.weight_kg, prev?.weight_kg, 'kg'],
                          [m.hip_cm, prev?.hip_cm, 'cm'],
                          [m.waist_cm, prev?.waist_cm, 'cm'],
                          [m.chest_cm, prev?.chest_cm, 'cm'],
                          [m.bicep_left_cm, prev?.bicep_left_cm, 'cm'],
                          [m.thigh_cm, prev?.thigh_cm, 'cm'],
                        ] as [number | null, number | null, string][]).map(([cur, pv, unit], idx) => (
                          <td key={idx} className="px-4 py-3 font-body text-sm text-gray-700">
                            {fmt(cur, unit)}{diff(cur, pv)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TRAINING ── */}
      {activeTab === 'training' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <Dumbbell size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="font-body text-sm text-gray-400">Les programmes d'entraînement seront disponibles ici.</p>
          <p className="font-body text-xs text-gray-300 mt-1">Va dans la section Entraînements pour créer un programme.</p>
        </div>
      )}

      {/* ── NUTRITION ── */}
      {activeTab === 'nutrition' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <Apple size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="font-body text-sm text-gray-400">Le plan nutritionnel sera affiché ici.</p>
          <p className="font-body text-xs text-gray-300 mt-1">Va dans la section Nutrition pour créer un plan.</p>
        </div>
      )}

      {/* ── PHOTOS ── */}
      {activeTab === 'photos' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <Camera size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="font-body text-sm text-gray-400">Les photos de progression apparaîtront ici après chaque check-in.</p>
        </div>
      )}

      {/* ── PAYMENTS ── */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-body text-sm font-semibold text-gray-700 mb-4">Abonnement</h2>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="font-body text-sm font-medium text-gray-800">{client.forfait ?? 'Aucun forfait actif'}</p>
                <p className="font-body text-xs text-gray-400 mt-0.5">Membre depuis {new Date(client.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full font-body text-xs font-medium
                ${client.forfait ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {client.forfait ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="pt-4">
              <p className="font-body text-xs text-gray-400 text-center">
                L'intégration Stripe permettra de voir les paiements, prochaines factures et historique ici.
              </p>
            </div>
          </div>

          {/* Activity log */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-body text-sm font-semibold text-gray-700 mb-4">Journal d'activité</h2>
            {checkIns.length === 0 ? (
              <p className="font-body text-xs text-gray-300 text-center py-4">Aucune activité</p>
            ) : (
              <div className="space-y-2">
                {checkIns.slice(0, 10).map(ci => (
                  <div key={ci.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-violet flex-shrink-0" />
                    <p className="font-body text-xs text-gray-600 flex-1">Check-in semaine {ci.week}</p>
                    <p className="font-body text-xs text-gray-400">{timeAgo(ci.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD MEASUREMENT MODAL ── */}
      {showMeasModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-heading text-xl font-semibold text-gray-900 mb-5">Ajouter des mesures</h2>
            <div className="grid grid-cols-2 gap-4">
              {([
                ['weight_kg', 'Poids (kg)', '65'],
                ['hip_cm', 'Hanches (cm)', '95'],
                ['waist_cm', 'Taille (cm)', '70'],
                ['chest_cm', 'Poitrine (cm)', '90'],
                ['bicep_left_cm', 'Bicep gauche (cm)', '28'],
                ['bicep_right_cm', 'Bicep droit (cm)', '28'],
                ['thigh_cm', 'Cuisse (cm)', '55'],
              ] as [keyof typeof measForm, string, string][]).map(([field, label, placeholder]) => (
                <div key={field}>
                  <label className="block font-body text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={measForm[field]}
                    onChange={e => setMeasForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block font-body text-xs font-medium text-gray-600 mb-1">Note</label>
                <input
                  type="text"
                  value={measForm.note}
                  onChange={e => setMeasForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMeasModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 font-body text-sm text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <Button onClick={saveMeasurement} loading={savingMeas} className="flex-1">
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
