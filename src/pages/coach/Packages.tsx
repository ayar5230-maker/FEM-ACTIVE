import { useState, useEffect } from 'react'
import { Plus, MoreHorizontal, CreditCard, Pencil, Trash2, X, Link, Eye, Check, Info } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'

interface Package {
  id: string
  coach_id: string
  name: string
  description: string | null
  price_cad: number
  currency: string
  plan_type: string
  duration_length: string
  duration: string
  free_trial: boolean
  initial_fee: boolean
  instant_access: boolean
  benefits: string[]
  active: boolean
  visible: boolean
  created_at: string
}

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP']
const PLAN_TYPES = ['Monthly', 'Weekly', 'Yearly', 'One-time']
const DURATION_LENGTHS = ['Until Cancelled', '1 month', '3 months', '6 months', '12 months']

const emptyForm = {
  // Step 1
  name: '', description: '',
  currency: 'CAD', plan_type: 'Monthly', duration_length: 'Until Cancelled',
  price_cad: '',
  free_trial: false, initial_fee: false, instant_access: true,
  // Step 3
  benefits: [''],
  // visibility
  active: true, visible: true,
}

const STEPS = ['Setup', 'Automations', 'Benefits']

export function CoachPackages() {
  const { profile } = useAuthContext()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState(1)
  const [editingPkg, setEditingPkg] = useState<Package | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [previewPkg, setPreviewPkg] = useState<Package | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { loadPackages() }, [profile])

  async function loadPackages() {
    if (!profile) return
    const { data } = await supabase
      .from('packages')
      .select('*')
      .eq('coach_id', profile.id)
      .order('created_at', { ascending: false })
    setPackages((data as Package[]) ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditingPkg(null)
    setForm(emptyForm)
    setStep(1)
    setError('')
    setShowModal(true)
  }

  function openEdit(pkg: Package) {
    setEditingPkg(pkg)
    setForm({
      name: pkg.name,
      description: pkg.description ?? '',
      currency: pkg.currency ?? 'CAD',
      plan_type: pkg.plan_type ?? 'Monthly',
      duration_length: pkg.duration_length ?? 'Until Cancelled',
      price_cad: String(pkg.price_cad),
      free_trial: pkg.free_trial ?? false,
      initial_fee: pkg.initial_fee ?? false,
      instant_access: pkg.instant_access ?? true,
      benefits: pkg.benefits?.length ? pkg.benefits : [''],
      active: pkg.active,
      visible: pkg.visible,
    })
    setStep(1)
    setError('')
    setShowModal(true)
    setMenuOpen(null)
  }

  function nextStep() {
    if (step === 1) {
      if (!form.name.trim()) { setError('Le nom du forfait est requis.'); return }
      if (!form.description.trim()) { setError('La description est requise.'); return }
      if (!form.price_cad || isNaN(Number(form.price_cad))) { setError('Le prix est requis.'); return }
    }
    setError('')
    setStep(s => Math.min(s + 1, 3))
  }

  function prevStep() { setError(''); setStep(s => Math.max(s - 1, 1)) }

  async function savePackage() {
    if (!profile) { setError('Profil introuvable, reconnecte-toi.'); return }
    setSaving(true)
    setError('')
    try {
      // Verify session is alive
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[save] session uid:', session?.user?.id ?? 'NONE')
      if (!session) { setError('Session expirée — reconnecte-toi.'); setSaving(false); return }

      const payload = {
        coach_id: profile.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_cad: Number(form.price_cad),
        currency: form.currency,
        plan_type: form.plan_type,
        duration_length: form.duration_length,
        duration: form.plan_type,
        free_trial: form.free_trial,
        initial_fee: form.initial_fee,
        instant_access: form.instant_access,
        benefits: form.benefits.filter(b => b.trim()),
        active: form.active,
        visible: form.visible,
      }

      console.log('[save] inserting payload:', payload)

      // Race against 10s timeout
      const op = editingPkg
        ? supabase.from('packages').update(payload).eq('id', editingPkg.id)
        : supabase.from('packages').insert(payload)

      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('Timeout — Supabase ne répond pas.')), 10000))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbErr } = await Promise.race([op, timeout]) as any

      console.log('[save] result error:', dbErr)
      if (dbErr) { setError(`Erreur DB : ${dbErr.message}`); setSaving(false); return }
      setShowModal(false)
      loadPackages()
    } catch (ex) {
      setError(`Erreur : ${ex instanceof Error ? ex.message : String(ex)}`)
    }
    setSaving(false)
  }

  async function copyLink(pkg: Package) {
    await navigator.clipboard.writeText(`${window.location.origin}/packages/${pkg.id}`)
    setCopied(pkg.id)
    setMenuOpen(null)
    setTimeout(() => setCopied(null), 2000)
  }

  async function deletePackage(id: string) {
    await supabase.from('packages').delete().eq('id', id)
    setMenuOpen(null)
    loadPackages()
  }

  async function toggleField(pkg: Package, field: 'active' | 'visible') {
    await supabase.from('packages').update({ [field]: !pkg[field] }).eq('id', pkg.id)
    setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, [field]: !p[field] } : p))
  }

  function setBenefit(idx: number, val: string) {
    setForm(f => {
      const b = [...f.benefits]
      b[idx] = val
      return { ...f, benefits: b }
    })
  }

  function addBenefit() { setForm(f => ({ ...f, benefits: [...f.benefits, ''] })) }
  function removeBenefit(idx: number) {
    setForm(f => ({ ...f, benefits: f.benefits.filter((_, i) => i !== idx) }))
  }

  const recurringLabel = form.plan_type === 'Monthly' ? '/mois' :
    form.plan_type === 'Weekly' ? '/sem' :
    form.plan_type === 'Yearly' ? '/an' : ''

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-body text-xl font-semibold text-gray-900">Forfaits</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 font-body text-sm text-gray-500 hover:bg-gray-50 transition-colors">
            <CreditCard size={14} strokeWidth={1.8} /> Stripe
          </button>
          <Button onClick={openAdd}>
            <Plus size={14} strokeWidth={2} /> Ajouter un forfait
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : packages.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <CreditCard size={28} className="mx-auto text-gray-200 mb-3" strokeWidth={1.5} />
          <p className="font-body text-sm font-medium text-gray-500">Aucun forfait</p>
          <p className="font-body text-xs text-gray-300 mt-1">Crée ton premier forfait pour tes clientes</p>
          <button onClick={openAdd} className="mt-4 px-4 py-2 rounded-lg bg-brand-violet text-white font-body text-sm font-medium hover:bg-brand-violet/90">
            + Ajouter un forfait
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_130px_80px_80px_48px] items-center px-5 py-3 border-b border-gray-100 bg-gray-50">
            {['Forfait', 'Prix', 'Durée', 'Actif', 'Visible', ''].map(h => (
              <div key={h} className="font-body text-xs font-medium text-gray-400">{h}</div>
            ))}
          </div>
          {packages.map(pkg => (
            <div key={pkg.id} className="grid grid-cols-[1fr_100px_130px_80px_80px_48px] items-center px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <div>
                <p className="font-body text-sm font-medium text-gray-800">{pkg.name}</p>
                {pkg.description && <p className="font-body text-xs text-gray-400 mt-0.5 truncate max-w-xs">{pkg.description}</p>}
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 font-body text-sm font-medium">
                  ${pkg.price_cad}
                </span>
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-md border border-gray-200 text-gray-600 font-body text-xs">
                  {pkg.plan_type ?? pkg.duration}
                </span>
              </div>
              {(['active', 'visible'] as const).map(field => (
                <div key={field}>
                  <button onClick={() => toggleField(pkg, field)}
                    className={`relative w-9 h-5 rounded-full transition-colors overflow-hidden ${pkg[field] ? 'bg-brand-violet' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${pkg[field] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
              <div className="relative flex justify-center">
                <button onClick={() => setMenuOpen(menuOpen === pkg.id ? null : pkg.id)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <MoreHorizontal size={16} />
                </button>
                {menuOpen === pkg.id && (
                  <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-44">
                    <button onClick={() => copyLink(pkg)} className="flex items-center gap-2 w-full px-3 py-2 font-body text-sm text-gray-700 hover:bg-gray-50">
                      <Link size={13} /> Copier le lien
                    </button>
                    <button onClick={() => { setPreviewPkg(pkg); setMenuOpen(null) }} className="flex items-center gap-2 w-full px-3 py-2 font-body text-sm text-gray-700 hover:bg-gray-50">
                      <Eye size={13} /> Aperçu
                    </button>
                    <button onClick={() => openEdit(pkg)} className="flex items-center gap-2 w-full px-3 py-2 font-body text-sm text-gray-700 hover:bg-gray-50">
                      <Pencil size={13} /> Modifier
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button onClick={() => deletePackage(pkg.id)} className="flex items-center gap-2 w-full px-3 py-2 font-body text-sm text-red-600 hover:bg-red-50">
                      <Trash2 size={13} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}

      {/* Copied toast */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg font-body text-sm">
          <Check size={14} className="text-green-400" /> Lien copié !
        </div>
      )}

      {/* Preview Modal */}
      {previewPkg && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg font-semibold text-gray-900">Aperçu</h2>
              <button onClick={() => setPreviewPkg(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
            </div>
            <div className="border border-gray-200 rounded-xl p-5 bg-gradient-to-br from-brand-lavender/30 to-white">
              <p className="font-heading text-xl font-semibold text-brand-deep mb-1">{previewPkg.name}</p>
              {previewPkg.description && <p className="font-body text-sm text-gray-500 mb-4">{previewPkg.description}</p>}
              {previewPkg.benefits?.filter(b => b).length > 0 && (
                <ul className="space-y-1 mb-4">
                  {previewPkg.benefits.filter(b => b).map((b, i) => (
                    <li key={i} className="flex items-start gap-2 font-body text-sm text-gray-600">
                      <Check size={13} className="text-brand-violet mt-0.5 flex-shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-end gap-1 mb-4">
                <span className="font-heading text-3xl font-bold text-brand-deep">${previewPkg.price_cad}</span>
                <span className="font-body text-sm text-gray-400 mb-1">{recurringLabel}</span>
              </div>
              <button className="w-full py-2.5 rounded-xl bg-brand-violet text-white font-body text-sm font-medium">S'inscrire</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT WIZARD MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-8 pt-7 pb-0">
              <h2 className="font-heading text-xl font-semibold text-gray-900">
                {editingPkg ? 'Modifier le forfait' : 'Créer un nouveau forfait'} 💳
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-0 px-8 py-6">
              {STEPS.map((label, i) => {
                const n = i + 1
                const active = n === step
                const done = n < step
                return (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-body text-sm font-semibold
                        ${active ? 'bg-brand-violet text-white' : done ? 'bg-brand-violet/20 text-brand-violet' : 'bg-gray-100 text-gray-400'}`}>
                        {n}
                      </div>
                      <span className={`font-body text-sm ${active ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{label}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-3" />}
                  </div>
                )
              })}
            </div>

            {/* Step content */}
            <div className="px-8 pb-6 space-y-5">

              {/* ── STEP 1: Setup ── */}
              {step === 1 && (
                <>
                  <div>
                    <label className="block font-body text-sm font-semibold text-gray-800 mb-2">
                      Nom du forfait <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="ex. VIP avec nutrition"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
                    />
                  </div>

                  <div>
                    <label className="block font-body text-sm font-semibold text-gray-800 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Décris ce que comprend ce forfait..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet resize-none"
                    />
                  </div>

                  {/* Currency / Plan type / Duration / Price row */}
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block font-body text-xs font-semibold text-gray-700 mb-1.5">
                        Devise <span className="text-red-500">*</span>
                      </label>
                      <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 font-body text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20">
                        {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-body text-xs font-semibold text-gray-700 mb-1.5">
                        Type de plan <span className="text-red-500">*</span>
                      </label>
                      <select value={form.plan_type} onChange={e => setForm(f => ({ ...f, plan_type: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 font-body text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20">
                        {PLAN_TYPES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-body text-xs font-semibold text-gray-700 mb-1.5">
                        Pour combien de temps ? <span className="text-red-500">*</span>
                      </label>
                      <select value={form.duration_length} onChange={e => setForm(f => ({ ...f, duration_length: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 font-body text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20">
                        {DURATION_LENGTHS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-body text-xs font-semibold text-gray-700 mb-1.5">
                        Prix <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-300 bg-white">
                        <span className="font-body text-sm text-gray-400">$</span>
                        <input type="number" min="0" step="0.01" value={form.price_cad}
                          onChange={e => setForm(f => ({ ...f, price_cad: e.target.value }))}
                          placeholder="0"
                          className="flex-1 min-w-0 font-body text-sm focus:outline-none w-12" />
                        <span className="font-body text-xs text-gray-400 whitespace-nowrap">
                          {form.plan_type === 'Monthly' ? 'par mois' : form.plan_type === 'Weekly' ? 'par sem.' : form.plan_type === 'Yearly' ? 'par an' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    {([
                      ['free_trial', 'Inclure un essai gratuit'],
                      ['initial_fee', 'Inclure des frais initiaux'],
                      ['instant_access', "Donner accès instantané à l'achat ?"],
                    ] as [keyof typeof form, string][]).map(([field, label]) => (
                      <label key={field} className="flex items-center gap-3 cursor-pointer group">
                        <div
                          onClick={() => setForm(f => ({ ...f, [field]: !f[field] }))}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                            ${form[field] ? 'bg-brand-violet border-brand-violet' : 'border-gray-300 group-hover:border-brand-violet/50'}`}
                        >
                          {form[field] && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className="font-body text-sm text-gray-700">{label}</span>
                        <Info size={14} className="text-gray-300" />
                      </label>
                    ))}
                  </div>

                  {/* Recurring payment */}
                  {form.price_cad && Number(form.price_cad) > 0 && form.plan_type !== 'One-time' && (
                    <div className="flex justify-end">
                      <p className="font-body text-sm text-gray-500">
                        Paiement récurrent : <span className="text-brand-violet font-semibold">${form.price_cad}</span>
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 2: Automations ── */}
              {step === 2 && (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <p className="font-body text-sm font-medium text-gray-700 mb-1">Automations</p>
                  <p className="font-body text-xs text-gray-400">
                    Les automations (emails de bienvenue, rappels de paiement) seront disponibles avec l'intégration Stripe.
                  </p>
                </div>
              )}

              {/* ── STEP 3: Benefits ── */}
              {step === 3 && (
                <div>
                  <label className="block font-body text-sm font-semibold text-gray-800 mb-3">
                    Ce qui est inclus dans ce forfait
                  </label>
                  <div className="space-y-2">
                    {form.benefits.map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check size={14} className="text-brand-violet flex-shrink-0" />
                        <input
                          type="text"
                          value={b}
                          onChange={e => setBenefit(i, e.target.value)}
                          placeholder={`Avantage ${i + 1}...`}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
                        />
                        {form.benefits.length > 1 && (
                          <button onClick={() => removeBenefit(i)} className="p-1 text-gray-300 hover:text-red-400">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={addBenefit}
                    className="mt-3 flex items-center gap-1.5 font-body text-sm text-brand-violet hover:text-brand-violet/80">
                    <Plus size={14} /> Ajouter un avantage
                  </button>

                  {/* Visibility toggles */}
                  <div className="mt-6 flex gap-6">
                    {(['active', 'visible'] as const).map(field => (
                      <label key={field} className="flex items-center gap-2.5 cursor-pointer">
                        <button type="button" onClick={() => setForm(f => ({ ...f, [field]: !f[field] }))}
                          className={`relative w-9 h-5 rounded-full transition-colors overflow-hidden ${form[field] ? 'bg-brand-violet' : 'bg-gray-200'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form[field] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                        <span className="font-body text-sm text-gray-600">{field === 'active' ? 'Actif' : 'Visible'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="font-body text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between px-8 py-5 border-t border-gray-100">
              <button onClick={step === 1 ? () => setShowModal(false) : prevStep}
                className="px-6 py-2.5 rounded-xl border border-gray-200 font-body text-sm font-semibold text-gray-700 hover:bg-gray-50">
                {step === 1 ? 'Annuler' : 'Retour'}
              </button>
              {step < 3 ? (
                <Button onClick={nextStep}>Suivant</Button>
              ) : (
                <Button onClick={savePackage} loading={saving}>
                  {editingPkg ? 'Sauvegarder' : 'Créer le forfait'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
