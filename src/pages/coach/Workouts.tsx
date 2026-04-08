import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Profile, Workout, Exercise } from '../../lib/types'

interface WorkoutWithExercises extends Workout {
  exercises: Exercise[]
}

export function CoachWorkouts() {
  const { profile } = useAuthContext()
  const [searchParams] = useSearchParams()
  const { toasts, addToast, removeToast } = useToast()
  const [clients, setClients] = useState<Profile[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [progressData, setProgressData] = useState<{ week: number; weight: number; name: string }[]>([])
  const [selectedExercise, setSelectedExercise] = useState<string>('')

  // New workout form
  const [form, setForm] = useState({
    week: 1,
    day_label: '',
    title: '',
    coach_note: '',
  })
  const [exercises, setExercises] = useState<Omit<Exercise, 'id' | 'workout_id'>[]>([
    { name: '', sets: 3, reps: '10', weight_kg: null, completed: false, order_index: 0 },
  ])

  useEffect(() => {
    if (!profile) return
    loadClients()
    const clientFromUrl = searchParams.get('client')
    if (clientFromUrl) setSelectedClientId(clientFromUrl)
  }, [profile, searchParams])

  useEffect(() => {
    if (selectedClientId) loadWorkouts(selectedClientId)
  }, [selectedClientId])

  async function loadClients() {
    if (!profile) return
    const { data } = await supabase.from('profiles').select('*').eq('role', 'client').eq('coach_id', profile.id)
    setClients(data ?? [])
    if (data && data.length > 0 && !selectedClientId) {
      setSelectedClientId(data[0].id)
    }
  }

  const loadWorkouts = useCallback(async (clientId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('workouts')
      .select('*, exercises(*)')
      .eq('client_id', clientId)
      .order('week', { ascending: true })
      .order('created_at', { ascending: true })
    setWorkouts((data ?? []) as WorkoutWithExercises[])
    setLoading(false)
  }, [])

  async function handleAddExercise() {
    setExercises(prev => [...prev, { name: '', sets: 3, reps: '10', weight_kg: null, completed: false, order_index: prev.length }])
  }

  async function handleSaveWorkout() {
    if (!profile || !selectedClientId) return
    if (!form.title.trim()) { addToast('Le titre est requis', 'error'); return }
    setSaving(true)

    const { data: workout, error: wErr } = await supabase
      .from('workouts')
      .insert({ ...form, client_id: selectedClientId, coach_id: profile.id })
      .select()
      .single()

    if (wErr || !workout) {
      addToast('Erreur lors de la création du workout', 'error')
      setSaving(false)
      return
    }

    const validExercises = exercises.filter(e => e.name.trim())
    if (validExercises.length > 0) {
      await supabase.from('exercises').insert(
        validExercises.map((e, i) => ({ ...e, workout_id: workout.id, order_index: i }))
      )
    }

    addToast('Programme créé avec succès !', 'success')
    setForm({ week: 1, day_label: '', title: '', coach_note: '' })
    setExercises([{ name: '', sets: 3, reps: '10', weight_kg: null, completed: false, order_index: 0 }])
    loadWorkouts(selectedClientId)
    setSaving(false)
  }

  async function handleDeleteWorkout(id: string) {
    await supabase.from('workouts').delete().eq('id', id)
    addToast('Workout supprimé', 'info')
    loadWorkouts(selectedClientId)
  }

  // Build progression data for selected exercise
  useEffect(() => {
    if (!selectedExercise || workouts.length === 0) { setProgressData([]); return }
    const points: { week: number; weight: number; name: string }[] = []
    workouts.forEach(w => {
      const ex = w.exercises?.find(e => e.name.toLowerCase() === selectedExercise.toLowerCase())
      if (ex && ex.weight_kg) {
        points.push({ week: w.week, weight: ex.weight_kg, name: `S${w.week}` })
      }
    })
    setProgressData(points)
  }, [selectedExercise, workouts])

  const exerciseNames = [...new Set(workouts.flatMap(w => (w.exercises ?? []).map(e => e.name)))]

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-brand-deep">Entraînements</h1>
        <p className="font-body text-brand-deep/50 mt-1">Assigne et suis les programmes</p>
      </div>

      {/* Client selector */}
      <div className="mb-6">
        <label className="block font-body text-sm font-medium text-brand-deep mb-1.5">Cliente</label>
        <select
          value={selectedClientId}
          onChange={e => setSelectedClientId(e.target.value)}
          className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-brand-lavender bg-white
            font-body text-sm text-brand-deep focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
        >
          <option value="">Sélectionner une cliente</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.full_name ?? c.email}</option>
          ))}
        </select>
      </div>

      {selectedClientId && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Add workout form */}
          <Card>
            <h2 className="font-heading text-lg font-semibold text-brand-deep mb-5">
              Nouveau programme
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-body text-xs font-medium text-brand-deep/60 mb-1">Semaine</label>
                  <input
                    type="number"
                    min={1}
                    value={form.week}
                    onChange={e => setForm(f => ({ ...f, week: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 rounded-xl border border-brand-lavender font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                  />
                </div>
                <div>
                  <label className="block font-body text-xs font-medium text-brand-deep/60 mb-1">Jour</label>
                  <input
                    type="text"
                    value={form.day_label}
                    onChange={e => setForm(f => ({ ...f, day_label: e.target.value }))}
                    placeholder="ex: Lundi"
                    className="w-full px-3 py-2 rounded-xl border border-brand-lavender font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                  />
                </div>
              </div>
              <div>
                <label className="block font-body text-xs font-medium text-brand-deep/60 mb-1">Titre *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="ex: Push A — Poitrine & Épaules"
                  className="w-full px-3 py-2 rounded-xl border border-brand-lavender font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                />
              </div>
              <div>
                <label className="block font-body text-xs font-medium text-brand-deep/60 mb-1">Note coach</label>
                <textarea
                  value={form.coach_note}
                  onChange={e => setForm(f => ({ ...f, coach_note: e.target.value }))}
                  rows={2}
                  placeholder="Instructions supplémentaires..."
                  className="w-full px-3 py-2 rounded-xl border border-brand-lavender font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/30 resize-none"
                />
              </div>

              {/* Exercises */}
              <div>
                <label className="block font-body text-xs font-medium text-brand-deep/60 mb-2">Exercices</label>
                <div className="space-y-2">
                  {exercises.map((ex, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={ex.name}
                        onChange={e => {
                          const updated = [...exercises]
                          updated[i] = { ...updated[i], name: e.target.value }
                          setExercises(updated)
                        }}
                        placeholder="Exercice"
                        className="col-span-5 px-3 py-2 rounded-xl border border-brand-lavender font-body text-xs focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                      />
                      <input
                        type="number"
                        value={ex.sets}
                        onChange={e => {
                          const updated = [...exercises]
                          updated[i] = { ...updated[i], sets: parseInt(e.target.value) || 1 }
                          setExercises(updated)
                        }}
                        placeholder="Séries"
                        className="col-span-2 px-2 py-2 rounded-xl border border-brand-lavender font-body text-xs text-center focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                      />
                      <input
                        type="text"
                        value={ex.reps}
                        onChange={e => {
                          const updated = [...exercises]
                          updated[i] = { ...updated[i], reps: e.target.value }
                          setExercises(updated)
                        }}
                        placeholder="Reps"
                        className="col-span-2 px-2 py-2 rounded-xl border border-brand-lavender font-body text-xs text-center focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                      />
                      <input
                        type="number"
                        value={ex.weight_kg ?? ''}
                        onChange={e => {
                          const updated = [...exercises]
                          updated[i] = { ...updated[i], weight_kg: e.target.value ? parseFloat(e.target.value) : null }
                          setExercises(updated)
                        }}
                        placeholder="kg"
                        className="col-span-2 px-2 py-2 rounded-xl border border-brand-lavender font-body text-xs text-center focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                      />
                      <button
                        onClick={() => setExercises(exercises.filter((_, j) => j !== i))}
                        className="col-span-1 text-red-400 hover:text-red-600 text-sm"
                      >✕</button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddExercise}
                  className="mt-2 font-body text-xs text-brand-violet hover:underline"
                >
                  + Ajouter un exercice
                </button>
              </div>

              <Button
                onClick={handleSaveWorkout}
                loading={saving}
                className="w-full"
              >
                Enregistrer le programme
              </Button>
            </div>
          </Card>

          {/* Existing workouts + progression */}
          <div className="space-y-6">
            {/* Progression chart */}
            {exerciseNames.length > 0 && (
              <Card>
                <h2 className="font-heading text-lg font-semibold text-brand-deep mb-4">Progression</h2>
                <div className="mb-4">
                  <select
                    value={selectedExercise}
                    onChange={e => setSelectedExercise(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-lavender font-body text-sm focus:outline-none"
                  >
                    <option value="">Choisir un exercice</option>
                    {exerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {progressData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f0ff" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'Outfit' }} />
                      <YAxis tick={{ fontSize: 12, fontFamily: 'Outfit' }} unit=" kg" />
                      <Tooltip
                        contentStyle={{ fontFamily: 'Outfit', fontSize: 12, borderRadius: 12 }}
                        formatter={(v: number) => [`${v} kg`, 'Poids']}
                      />
                      <Bar dataKey="weight" fill="#a855f7" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="font-body text-xs text-brand-deep/40 text-center py-4">
                    Sélectionne un exercice pour voir la progression
                  </p>
                )}
              </Card>
            )}

            {/* Workouts list */}
            <Card>
              <h2 className="font-heading text-lg font-semibold text-brand-deep mb-4">Programmes assignés</h2>
              {loading ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : workouts.length === 0 ? (
                <p className="font-body text-sm text-brand-deep/40 text-center py-4">Aucun programme assigné</p>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {workouts.map(w => (
                    <div key={w.id} className="bg-brand-lavender/30 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-body text-xs text-brand-violet font-medium">
                            Semaine {w.week}{w.day_label ? ` · ${w.day_label}` : ''}
                          </p>
                          <p className="font-body text-sm font-semibold text-brand-deep mt-0.5">{w.title}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteWorkout(w.id)}
                          className="text-red-300 hover:text-red-500 text-xs font-body"
                        >
                          Suppr.
                        </button>
                      </div>
                      {w.exercises && w.exercises.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {w.exercises.map(ex => (
                            <div key={ex.id} className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${ex.completed ? 'bg-green-400' : 'bg-brand-lavender border border-brand-violet/30'}`} />
                              <span className="font-body text-xs text-brand-deep/70">
                                {ex.name} · {ex.sets}×{ex.reps}{ex.weight_kg ? ` · ${ex.weight_kg}kg` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
