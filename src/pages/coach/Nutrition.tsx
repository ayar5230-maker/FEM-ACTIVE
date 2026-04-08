import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import type { Profile, Nutrition } from '../../lib/types'

export function CoachNutrition() {
  const { profile } = useAuthContext()
  const { toasts, addToast, removeToast } = useToast()
  const [clients, setClients] = useState<Profile[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [nutrition, setNutrition] = useState<Nutrition | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    calories: 2000,
    protein_g: 150,
    carbs_g: 200,
    fat_g: 65,
    coach_note: '',
  })

  useEffect(() => {
    if (!profile) return
    loadClients()
  }, [profile])

  useEffect(() => {
    if (selectedClientId) loadNutrition(selectedClientId)
  }, [selectedClientId])

  async function loadClients() {
    if (!profile) return
    const { data } = await supabase.from('profiles').select('*').eq('role', 'client').eq('coach_id', profile.id)
    setClients(data ?? [])
    if (data && data.length > 0) setSelectedClientId(data[0].id)
  }

  async function loadNutrition(clientId: string) {
    setLoading(true)
    const { data } = await supabase.from('nutrition').select('*').eq('client_id', clientId).single()
    if (data) {
      setNutrition(data)
      setForm({
        calories: data.calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        coach_note: data.coach_note ?? '',
      })
    } else {
      setNutrition(null)
      setForm({ calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65, coach_note: '' })
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!profile || !selectedClientId) return
    setSaving(true)

    const payload = {
      client_id: selectedClientId,
      coach_id: profile.id,
      ...form,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('nutrition')
      .upsert(payload, { onConflict: 'client_id' })

    if (error) {
      addToast('Erreur lors de la sauvegarde', 'error')
    } else {
      addToast('Objectifs nutritionnels enregistrés !', 'success')
      loadNutrition(selectedClientId)
    }
    setSaving(false)
  }

  // Macro % calculations
  const totalCal = form.protein_g * 4 + form.carbs_g * 4 + form.fat_g * 9
  const proteinPct = totalCal > 0 ? Math.round((form.protein_g * 4 / totalCal) * 100) : 0
  const carbsPct = totalCal > 0 ? Math.round((form.carbs_g * 4 / totalCal) * 100) : 0
  const fatPct = totalCal > 0 ? Math.round((form.fat_g * 9 / totalCal) * 100) : 0

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-brand-deep">Nutrition</h1>
        <p className="font-body text-brand-deep/50 mt-1">Définis les objectifs macros de tes clientes</p>
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
        loading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Form */}
            <Card>
              <h2 className="font-heading text-lg font-semibold text-brand-deep mb-5">
                Objectifs nutritionnels
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block font-body text-xs font-medium text-brand-deep/60 mb-1">
                    Calories totales
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={form.calories}
                      onChange={e => setForm(f => ({ ...f, calories: parseInt(e.target.value) || 0 }))}
                      className="flex-1 px-3 py-2 rounded-xl border border-brand-lavender font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                    />
                    <span className="font-body text-sm text-brand-deep/50">kcal</span>
                  </div>
                </div>

                {(['protein_g', 'carbs_g', 'fat_g'] as const).map(macro => (
                  <div key={macro}>
                    <label className="block font-body text-xs font-medium text-brand-deep/60 mb-1">
                      {macro === 'protein_g' ? 'Protéines' : macro === 'carbs_g' ? 'Glucides' : 'Lipides'}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={form[macro]}
                        onChange={e => setForm(f => ({ ...f, [macro]: parseInt(e.target.value) || 0 }))}
                        className="flex-1 px-3 py-2 rounded-xl border border-brand-lavender font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                      />
                      <span className="font-body text-sm text-brand-deep/50">g</span>
                    </div>
                  </div>
                ))}

                <div>
                  <label className="block font-body text-xs font-medium text-brand-deep/60 mb-1">
                    Note coach
                  </label>
                  <textarea
                    value={form.coach_note}
                    onChange={e => setForm(f => ({ ...f, coach_note: e.target.value }))}
                    rows={3}
                    placeholder="Conseils personnalisés, timing des repas..."
                    className="w-full px-3 py-2 rounded-xl border border-brand-lavender font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/30 resize-none"
                  />
                </div>

                {nutrition && (
                  <p className="font-body text-xs text-brand-deep/40">
                    Dernière mise à jour : {new Date(nutrition.updated_at).toLocaleDateString('fr-CA')}
                  </p>
                )}

                <Button onClick={handleSave} loading={saving} className="w-full">
                  {nutrition ? 'Mettre à jour' : 'Enregistrer'}
                </Button>
              </div>
            </Card>

            {/* Visual preview */}
            <Card>
              <h2 className="font-heading text-lg font-semibold text-brand-deep mb-5">Aperçu</h2>

              {/* Calorie display */}
              <div className="text-center mb-6">
                <p className="font-heading text-5xl font-bold text-brand-deep">{form.calories}</p>
                <p className="font-body text-sm text-brand-deep/50 mt-1">kcal / jour</p>
              </div>

              {/* Macro bars */}
              <div className="space-y-4">
                {[
                  { label: 'Protéines', value: form.protein_g, pct: proteinPct, color: 'bg-brand-violet' },
                  { label: 'Glucides', value: form.carbs_g, pct: carbsPct, color: 'bg-brand-violet-light' },
                  { label: 'Lipides', value: form.fat_g, pct: fatPct, color: 'bg-purple-300' },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between font-body text-sm mb-1.5">
                      <span className="text-brand-deep font-medium">{m.label}</span>
                      <span className="text-brand-deep/60">{m.value}g · {m.pct}%</span>
                    </div>
                    <div className="h-2 bg-brand-lavender rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${m.color}`}
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {form.coach_note && (
                <div className="mt-6 bg-brand-lavender/50 rounded-xl p-4">
                  <p className="font-body text-xs font-medium text-brand-deep/60 mb-1">Note coach</p>
                  <p className="font-body text-sm text-brand-deep">{form.coach_note}</p>
                </div>
              )}
            </Card>
          </div>
        )
      )}
    </div>
  )
}
