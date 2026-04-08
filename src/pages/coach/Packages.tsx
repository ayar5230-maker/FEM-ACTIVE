import { useState, useEffect } from 'react'
import { Plus, MoreHorizontal, CreditCard, Pencil, Trash2, X } from 'lucide-react'
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
  duration: string
  active: boolean
  visible: boolean
  created_at: string
}

const DURATIONS = ['Monthly', 'Weekly', 'Yearly', 'One-time']

const emptyForm = {
  name: '',
  description: '',
  price_cad: '',
  duration: 'Monthly',
  active: true,
  visible: true,
}

export function CoachPackages() {
  const { profile } = useAuthContext()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPkg, setEditingPkg] = useState<Package | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { loadPackages() }, [])

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
    setError('')
    setShowModal(true)
  }

  function openEdit(pkg: Package) {
    setEditingPkg(pkg)
    setForm({
      name: pkg.name,
      description: pkg.description ?? '',
      price_cad: String(pkg.price_cad),
      duration: pkg.duration,
      active: pkg.active,
      visible: pkg.visible,
    })
    setError('')
    setShowModal(true)
    setMenuOpen(null)
  }

  async function savePackage() {
    if (!form.name.trim()) { setError('Le nom est requis.'); return }
    if (!form.price_cad || isNaN(Number(form.price_cad))) { setError('Le prix est requis.'); return }
    setSaving(true)
    const payload = {
      coach_id: profile!.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_cad: Number(form.price_cad),
      duration: form.duration,
      active: form.active,
      visible: form.visible,
    }
    if (editingPkg) {
      await supabase.from('packages').update(payload).eq('id', editingPkg.id)
    } else {
      await supabase.from('packages').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    loadPackages()
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

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-body text-xl font-semibold text-gray-900">Forfaits</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 font-body text-sm text-gray-500 hover:bg-gray-50 transition-colors">
            <CreditCard size={14} strokeWidth={1.8} />
            Stripe
          </button>
          <Button onClick={openAdd}>
            <Plus size={14} strokeWidth={2} />
            Ajouter un forfait
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : packages.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <CreditCard size={22} className="text-gray-300" strokeWidth={1.5} />
          </div>
          <p className="font-body text-sm font-medium text-gray-500">Aucun forfait</p>
          <p className="font-body text-xs text-gray-300 mt-1">Crée ton premier forfait pour tes clientes</p>
          <button
            onClick={openAdd}
            className="mt-4 px-4 py-2 rounded-lg bg-brand-violet text-white font-body text-sm font-medium hover:bg-brand-violet/90 transition-colors"
          >
            + Ajouter un forfait
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_100px_130px_80px_80px_48px] items-center px-5 py-3 border-b border-gray-100 bg-gray-50">
            {['Forfait', 'Prix', 'Durée', 'Actif', 'Visible', ''].map(h => (
              <div key={h} className="font-body text-xs font-medium text-gray-400">{h}</div>
            ))}
          </div>

          {/* Rows */}
          {packages.map(pkg => (
            <div
              key={pkg.id}
              className="grid grid-cols-[1fr_100px_130px_80px_80px_48px] items-center px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
            >
              {/* Name */}
              <div>
                <p className="font-body text-sm font-medium text-gray-800">{pkg.name}</p>
                {pkg.description && (
                  <p className="font-body text-xs text-gray-400 mt-0.5 truncate max-w-xs">{pkg.description}</p>
                )}
              </div>

              {/* Price */}
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md bg-green-50 text-green-700 font-body text-sm font-medium">
                  ${pkg.price_cad}
                </span>
              </div>

              {/* Duration */}
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-md border border-gray-200 text-gray-600 font-body text-xs">
                  {pkg.duration === 'Monthly' ? 'Mensuel' :
                   pkg.duration === 'Weekly' ? 'Hebdo' :
                   pkg.duration === 'Yearly' ? 'Annuel' : 'Unique'}
                </span>
              </div>

              {/* Active toggle */}
              <div>
                <button
                  onClick={() => toggleField(pkg, 'active')}
                  className={`relative w-9 h-5 rounded-full transition-colors ${pkg.active ? 'bg-brand-violet' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${pkg.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Visible toggle */}
              <div>
                <button
                  onClick={() => toggleField(pkg, 'visible')}
                  className={`relative w-9 h-5 rounded-full transition-colors ${pkg.visible ? 'bg-brand-violet' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${pkg.visible ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Actions */}
              <div className="relative flex justify-center">
                <button
                  onClick={() => setMenuOpen(menuOpen === pkg.id ? null : pkg.id)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <MoreHorizontal size={16} />
                </button>
                {menuOpen === pkg.id && (
                  <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-36">
                    <button
                      onClick={() => openEdit(pkg)}
                      className="flex items-center gap-2 w-full px-3 py-2 font-body text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil size={13} /> Modifier
                    </button>
                    <button
                      onClick={() => deletePackage(pkg.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 font-body text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={13} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg font-semibold text-gray-900">
                {editingPkg ? 'Modifier le forfait' : 'Nouveau forfait'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Nom du forfait *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ex. VIP Mensuel"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
                />
              </div>

              <div>
                <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ce que comprend ce forfait..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Prix (CAD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price_cad}
                      onChange={e => setForm(f => ({ ...f, price_cad: e.target.value }))}
                      placeholder="150"
                      className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Durée</label>
                  <select
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20 bg-white"
                  >
                    {DURATIONS.map(d => (
                      <option key={d} value={d}>
                        {d === 'Monthly' ? 'Mensuel' : d === 'Weekly' ? 'Hebdo' : d === 'Yearly' ? 'Annuel' : 'Unique'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-6">
                {(['active', 'visible'] as const).map(field => (
                  <label key={field} className="flex items-center gap-2.5 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, [field]: !f[field] }))}
                      className={`relative w-9 h-5 rounded-full transition-colors ${form[field] ? 'bg-brand-violet' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form[field] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="font-body text-sm text-gray-600 capitalize">
                      {field === 'active' ? 'Actif' : 'Visible'}
                    </span>
                  </label>
                ))}
              </div>

              {error && (
                <p className="font-body text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 font-body text-sm text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <Button onClick={savePackage} loading={saving} className="flex-1">
                {editingPkg ? 'Sauvegarder' : 'Créer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
