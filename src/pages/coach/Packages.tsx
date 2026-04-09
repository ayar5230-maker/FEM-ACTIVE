import { useState, useEffect } from 'react'
import { Plus, MoreHorizontal, CreditCard, Pencil, Trash2, X, Check, Tag, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'

/* ── Types ── */
interface Coupon {
  id: string
  coach_id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  expiry_date: string | null
  max_uses: number | null
  uses_count: number
  active: boolean
  created_at: string
}

interface CatalogPackage {
  id: string
  slug: string
  name: string
  tagline: string | null
  price_cad: number
  price_note: string | null
  features: Array<{ title: string; desc: string }>
  unique_advantage: string | null
  recommended: boolean
  display_order: number
  founding_price_cad: number | null
  founding_total_spots: number | null
  founding_spot_group: string | null
  active: boolean
}

interface ClientOption {
  id: string
  full_name: string | null
  forfait: string | null
  is_founding: boolean
}

/* ── Empty forms ── */
const emptyCouponForm = {
  code: '', discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '', expiry_date: '', max_uses: '', active: true,
}

const emptyCatalogForm = {
  name: '', tagline: '', price_cad: '', price_note: '',
  features: [{ title: '', desc: '' }] as { title: string; desc: string }[],
  unique_advantage: '', recommended: false,
  founding_price_cad: '', founding_total_spots: '', founding_spot_group: '',
  active: true,
}

/* ══════════════════════════════════════════════ */
export function CoachPackages() {
  const { profile } = useAuthContext()
  const [activeTab, setActiveTab] = useState<'packages' | 'coupons'>('packages')

  /* ── Package catalog state ── */
  const [catalog, setCatalog] = useState<CatalogPackage[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [pkgMenuOpen, setPkgMenuOpen] = useState<string | null>(null)
  const [showPkgModal, setShowPkgModal] = useState(false)
  const [editingCatalogPkg, setEditingCatalogPkg] = useState<CatalogPackage | null>(null)
  const [catalogForm, setCatalogForm] = useState(emptyCatalogForm)
  const [savingCatalog, setSavingCatalog] = useState(false)
  const [catalogError, setCatalogError] = useState('')

  /* ── Assign state ── */
  const [clients, setClients] = useState<ClientOption[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningPkg, setAssigningPkg] = useState<CatalogPackage | null>(null)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [assignAsFounding, setAssignAsFounding] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [assignToast, setAssignToast] = useState('')

  /* ── Coupon state ── */
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [couponsLoading, setCouponsLoading] = useState(true)
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [couponForm, setCouponForm] = useState(emptyCouponForm)
  const [savingCoupon, setSavingCoupon] = useState(false)
  const [couponError, setCouponError] = useState('')

  useEffect(() => { loadCatalog(); loadClients(); loadCoupons() }, [profile])

  /* ── Loaders ── */
  async function loadCatalog() {
    const { data } = await supabase
      .from('packages').select('*').is('coach_id', null)
      .eq('active', true).order('display_order')
    setCatalog((data as CatalogPackage[]) ?? [])
    setCatalogLoading(false)
  }

  async function loadClients() {
    if (!profile) return
    const { data } = await supabase
      .from('profiles').select('id, full_name, forfait, is_founding')
      .eq('coach_id', profile.id).eq('role', 'client')
    setClients((data as ClientOption[]) ?? [])
  }

  async function loadCoupons() {
    if (!profile) return
    const { data } = await supabase
      .from('coupons').select('*').eq('coach_id', profile.id)
      .order('created_at', { ascending: false })
    setCoupons((data as Coupon[]) ?? [])
    setCouponsLoading(false)
  }

  /* ── Founding helpers ── */
  function foundingSpotsFor(group: string | null): { taken: number; total: number } {
    if (!group) return { taken: 0, total: 0 }
    const slugs = catalog.filter(p => p.founding_spot_group === group).map(p => p.slug)
    const taken = clients.filter(c => c.is_founding && slugs.includes(c.forfait ?? '')).length
    const total = catalog.find(p => p.founding_spot_group === group)?.founding_total_spots ?? 0
    return { taken, total }
  }

  /* ── Package CRUD ── */
  function openCreatePkg() {
    setEditingCatalogPkg(null)
    setCatalogForm(emptyCatalogForm)
    setCatalogError('')
    setShowPkgModal(true)
  }

  function openEditPkg(pkg: CatalogPackage) {
    setEditingCatalogPkg(pkg)
    setCatalogForm({
      name: pkg.name,
      tagline: pkg.tagline ?? '',
      price_cad: String(pkg.price_cad),
      price_note: pkg.price_note ?? '',
      features: pkg.features.length ? [...pkg.features] : [{ title: '', desc: '' }],
      unique_advantage: pkg.unique_advantage ?? '',
      recommended: pkg.recommended,
      founding_price_cad: pkg.founding_price_cad != null ? String(pkg.founding_price_cad) : '',
      founding_total_spots: pkg.founding_total_spots != null ? String(pkg.founding_total_spots) : '',
      founding_spot_group: pkg.founding_spot_group ?? '',
      active: pkg.active,
    })
    setCatalogError('')
    setPkgMenuOpen(null)
    setShowPkgModal(true)
  }

  async function saveCatalogPkg() {
    if (!catalogForm.name.trim()) { setCatalogError('Name is required.'); return }
    if (!catalogForm.price_cad || isNaN(Number(catalogForm.price_cad))) { setCatalogError('Price is required.'); return }
    setSavingCatalog(true)
    setCatalogError('')
    try {
      const slug = editingCatalogPkg?.slug ??
        catalogForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const payload = {
        coach_id: null,
        slug,
        name: catalogForm.name.trim(),
        tagline: catalogForm.tagline.trim() || null,
        price_cad: Number(catalogForm.price_cad),
        price_note: catalogForm.price_note.trim() || null,
        features: catalogForm.features.filter(f => f.title.trim()),
        unique_advantage: catalogForm.unique_advantage.trim() || null,
        recommended: catalogForm.recommended,
        founding_price_cad: catalogForm.founding_price_cad ? Number(catalogForm.founding_price_cad) : null,
        founding_total_spots: catalogForm.founding_total_spots ? Number(catalogForm.founding_total_spots) : null,
        founding_spot_group: catalogForm.founding_spot_group.trim() || null,
        active: catalogForm.active,
        visible: true, currency: 'CAD', plan_type: 'Monthly',
        duration_length: 'Until Cancelled', duration: 'Monthly',
      }
      const { error: dbErr } = editingCatalogPkg
        ? await supabase.from('packages').update(payload).eq('id', editingCatalogPkg.id)
        : await supabase.from('packages').insert(payload)
      if (dbErr) { setCatalogError(`Error: ${dbErr.message}`); setSavingCatalog(false); return }
      setShowPkgModal(false)
      loadCatalog()
    } catch (ex) {
      setCatalogError(`Error: ${ex instanceof Error ? ex.message : String(ex)}`)
    }
    setSavingCatalog(false)
  }

  async function deleteCatalogPkg(id: string) {
    await supabase.from('packages').delete().eq('id', id)
    setPkgMenuOpen(null)
    loadCatalog()
  }

  function setFeature(idx: number, field: 'title' | 'desc', val: string) {
    setCatalogForm(f => {
      const features = [...f.features]
      features[idx] = { ...features[idx], [field]: val }
      return { ...f, features }
    })
  }

  /* ── Assign ── */
  function openAssign(pkg: CatalogPackage) {
    setAssigningPkg(pkg); setSelectedClientId(''); setAssignAsFounding(false)
    setAssignError(''); setShowAssignModal(true)
  }

  async function doAssign() {
    if (!selectedClientId || !assigningPkg) { setAssignError('Please select a client.'); return }
    if (assignAsFounding) {
      const spots = foundingSpotsFor(assigningPkg.founding_spot_group)
      if (spots.taken >= spots.total) { setAssignError('No founding spots remaining for this group.'); return }
    }
    setAssigning(true); setAssignError('')
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ forfait: assigningPkg.slug, is_founding: assignAsFounding })
      .eq('id', selectedClientId)
    if (dbErr) { setAssignError(`Error: ${dbErr.message}`); setAssigning(false); return }
    await loadClients()
    setShowAssignModal(false); setAssigning(false)
    const name = clients.find(c => c.id === selectedClientId)?.full_name ?? 'client'
    setAssignToast(`${assigningPkg.name} assigned to ${name} ✓`)
    setTimeout(() => setAssignToast(''), 3000)
  }

  /* ── Coupons ── */
  function openAddCoupon() {
    setEditingCoupon(null); setCouponForm(emptyCouponForm); setCouponError(''); setShowCouponModal(true)
  }
  function openEditCoupon(c: Coupon) {
    setEditingCoupon(c)
    setCouponForm({ code: c.code, discount_type: c.discount_type, discount_value: String(c.discount_value),
      expiry_date: c.expiry_date ?? '', max_uses: c.max_uses != null ? String(c.max_uses) : '', active: c.active })
    setCouponError(''); setShowCouponModal(true)
  }
  async function saveCoupon() {
    if (!profile) return
    if (!couponForm.code.trim()) { setCouponError('Code required.'); return }
    if (!couponForm.discount_value || isNaN(Number(couponForm.discount_value))) { setCouponError('Value required.'); return }
    setSavingCoupon(true); setCouponError('')
    try {
      const payload = { coach_id: profile.id, code: couponForm.code.trim().toUpperCase(),
        discount_type: couponForm.discount_type, discount_value: Number(couponForm.discount_value),
        expiry_date: couponForm.expiry_date || null,
        max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : null, active: couponForm.active }
      const { error: dbErr } = editingCoupon
        ? await supabase.from('coupons').update(payload).eq('id', editingCoupon.id)
        : await supabase.from('coupons').insert(payload)
      if (dbErr) { setCouponError(`Error: ${dbErr.message}`); setSavingCoupon(false); return }
      setShowCouponModal(false); loadCoupons()
    } catch (ex) { setCouponError(`Error: ${ex instanceof Error ? ex.message : String(ex)}`) }
    setSavingCoupon(false)
  }
  async function deleteCoupon(id: string) { await supabase.from('coupons').delete().eq('id', id); loadCoupons() }
  async function toggleCoupon(c: Coupon) {
    await supabase.from('coupons').update({ active: !c.active }).eq('id', c.id)
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x))
  }

  /* ══ RENDER ══════════════════════════════════ */
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-body text-xl font-semibold text-gray-900">Packages</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 font-body text-sm text-gray-500 hover:bg-gray-50 transition-colors">
            <CreditCard size={14} strokeWidth={1.8} /> Stripe
          </button>
          {activeTab === 'packages' && (
            <Button onClick={openCreatePkg}><Plus size={14} strokeWidth={2} /> New Package</Button>
          )}
          {activeTab === 'coupons' && (
            <Button onClick={openAddCoupon}><Plus size={14} strokeWidth={2} /> Add Coupon</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([['packages', 'Packages', BookOpen], ['coupons', 'Coupons', Tag]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-body text-sm font-medium border-b-2 -mb-px transition-colors
              ${activeTab === id ? 'border-brand-violet text-brand-violet' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon size={14} strokeWidth={1.8} />{label}
          </button>
        ))}
      </div>

      {/* ── PACKAGES TAB ── */}
      {activeTab === 'packages' && (
        <div>
          {/* Founding spots tracker */}
          {catalog.some(p => p.founding_spot_group) && (
            <div className="mb-5 flex flex-wrap items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="font-body text-xs font-semibold text-amber-700">Founding spots:</span>
              {['community', 'autonomy', 'vip'].map(g => {
                const s = foundingSpotsFor(g)
                if (!s.total) return null
                const remaining = s.total - s.taken
                const label = g.charAt(0).toUpperCase() + g.slice(1)
                return (
                  <span key={g} className={`font-body text-xs px-2 py-0.5 rounded-full font-medium
                    ${remaining > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500 line-through'}`}>
                    {label} [{s.taken}/{s.total}]
                  </span>
                )
              })}
            </div>
          )}

          {catalogLoading ? (
            <div className="flex justify-center py-24"><Spinner /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {catalog.map(pkg => {
                const spots = foundingSpotsFor(pkg.founding_spot_group)
                const foundingRemaining = spots.total - spots.taken
                const hasFoundingSpots = !!pkg.founding_price_cad && foundingRemaining > 0
                return (
                  <div key={pkg.id}
                    className={`bg-white rounded-xl border overflow-hidden
                      ${pkg.recommended ? 'border-brand-violet ring-1 ring-brand-violet/20' : 'border-gray-200'}`}>

                    {/* Card header */}
                    <div className="bg-brand-deep px-5 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading text-xl italic font-semibold text-white">{pkg.name}</h3>
                          {pkg.tagline && <p className="font-body text-xs text-brand-lavender/70 mt-0.5">{pkg.tagline}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {pkg.recommended && (
                            <span className="px-2.5 py-1 rounded-full bg-brand-violet text-white font-body text-xs font-semibold">
                              Recommended
                            </span>
                          )}
                          {/* ··· menu */}
                          <div className="relative">
                            <button
                              onClick={() => setPkgMenuOpen(pkgMenuOpen === pkg.id ? null : pkg.id)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                              <MoreHorizontal size={16} />
                            </button>
                            {pkgMenuOpen === pkg.id && (
                              <div className="absolute right-0 top-8 z-30 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-36">
                                <button onClick={() => openEditPkg(pkg)}
                                  className="flex items-center gap-2 w-full px-3 py-2 font-body text-sm text-gray-700 hover:bg-gray-50">
                                  <Pencil size={13} /> Edit
                                </button>
                                <div className="border-t border-gray-100 my-1" />
                                <button onClick={() => deleteCatalogPkg(pkg.id)}
                                  className="flex items-center gap-2 w-full px-3 py-2 font-body text-sm text-red-600 hover:bg-red-50">
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mt-3 flex items-end gap-2">
                        {hasFoundingSpots ? (
                          <>
                            <span className="font-body text-sm text-brand-lavender/50 line-through">${pkg.price_cad}</span>
                            <span className="font-heading text-2xl font-bold text-white">${pkg.founding_price_cad}</span>
                            <span className="font-body text-sm text-brand-lavender/70">CAD / mo</span>
                          </>
                        ) : (
                          <>
                            <span className="font-heading text-2xl font-bold text-white">${pkg.price_cad}</span>
                            <span className="font-body text-sm text-brand-lavender/70">CAD / mo</span>
                          </>
                        )}
                      </div>
                      {hasFoundingSpots && (
                        <p className="font-body text-xs text-amber-300 mt-1">
                          Founding price — {foundingRemaining} spot{foundingRemaining !== 1 ? 's' : ''} left
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="px-5 py-4 space-y-3">
                      {pkg.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-violet flex-shrink-0 mt-1.5" />
                          <div>
                            <span className="font-body text-sm font-semibold text-gray-800">{f.title}</span>
                            {f.desc && <p className="font-body text-xs text-gray-400 mt-0.5">{f.desc}</p>}
                          </div>
                        </div>
                      ))}
                      {pkg.unique_advantage && (
                        <div className="mt-3 px-3 py-2.5 rounded-lg bg-brand-lavender border border-brand-lavender">
                          <p className="font-body text-xs font-semibold text-brand-deep mb-0.5">Exclusive</p>
                          <p className="font-body text-xs text-brand-deep/70">{pkg.unique_advantage}</p>
                        </div>
                      )}
                    </div>

                    {/* Assign button */}
                    <div className="px-5 pb-4">
                      <button onClick={() => openAssign(pkg)}
                        className="w-full py-2 rounded-lg bg-brand-deep text-white font-body text-sm font-medium hover:bg-brand-deep/90 transition-colors">
                        Assign to Client
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Click-outside overlay for pkg menu */}
          {pkgMenuOpen && <div className="fixed inset-0 z-20" onClick={() => setPkgMenuOpen(null)} />}

          {/* Assign modal */}
          {showAssignModal && assigningPkg && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-heading text-lg font-semibold text-gray-900">Assign Package</h2>
                  <button onClick={() => setShowAssignModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
                </div>
                <p className="font-body text-sm text-gray-500 mb-4">
                  Assigning: <span className="font-semibold text-brand-deep">{assigningPkg.name}</span>
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Select client</label>
                    <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20">
                      <option value="">— Choose a client —</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.full_name ?? c.id}{c.forfait ? ` (${c.forfait})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {assigningPkg.founding_price_cad && (() => {
                    const spots = foundingSpotsFor(assigningPkg.founding_spot_group)
                    const remaining = spots.total - spots.taken
                    return remaining > 0 ? (
                      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <input type="checkbox" checked={assignAsFounding}
                          onChange={e => setAssignAsFounding(e.target.checked)}
                          className="mt-0.5 accent-brand-violet" />
                        <div>
                          <p className="font-body text-sm font-semibold text-amber-800">Founding member price</p>
                          <p className="font-body text-xs text-amber-600">
                            ${assigningPkg.founding_price_cad}/mo instead of ${assigningPkg.price_cad}/mo — {remaining} spot{remaining !== 1 ? 's' : ''} left
                          </p>
                        </div>
                      </label>
                    ) : null
                  })()}
                  {assignError && <p className="font-body text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{assignError}</p>}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAssignModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 font-body text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <Button onClick={doAssign} loading={assigning} className="flex-1">Confirm</Button>
                </div>
              </div>
            </div>
          )}

          {/* Assignment toast */}
          {assignToast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg font-body text-sm">
              <Check size={14} className="text-green-400" /> {assignToast}
            </div>
          )}

          {/* Create / Edit Package Modal */}
          {showPkgModal && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
                  <h2 className="font-heading text-lg font-semibold text-gray-900">
                    {editingCatalogPkg ? 'Edit Package' : 'New Package'}
                  </h2>
                  <button onClick={() => setShowPkgModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
                </div>

                <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Name *</label>
                      <input value={catalogForm.name} onChange={e => setCatalogForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="VIP" className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                    </div>
                    <div>
                      <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Tagline</label>
                      <input value={catalogForm.tagline} onChange={e => setCatalogForm(f => ({ ...f, tagline: e.target.value }))}
                        placeholder="Zero Mental Load" className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Price (CAD/mo) *</label>
                      <input type="number" min="0" value={catalogForm.price_cad}
                        onChange={e => setCatalogForm(f => ({ ...f, price_cad: e.target.value }))}
                        placeholder="300" className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                    </div>
                    <div>
                      <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Price note</label>
                      <input value={catalogForm.price_note} onChange={e => setCatalogForm(f => ({ ...f, price_note: e.target.value }))}
                        placeholder="I handle everything." className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                    </div>
                  </div>

                  <div>
                    <label className="block font-body text-xs font-medium text-gray-600 mb-2">Features</label>
                    <div className="space-y-2">
                      {catalogForm.features.map((f, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <div className="flex-1 space-y-1">
                            <input value={f.title} onChange={e => setFeature(i, 'title', e.target.value)}
                              placeholder="Feature title"
                              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                            <input value={f.desc} onChange={e => setFeature(i, 'desc', e.target.value)}
                              placeholder="Short description (optional)"
                              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 font-body text-xs text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                          </div>
                          <button onClick={() => setCatalogForm(f2 => ({ ...f2, features: f2.features.filter((_, j) => j !== i) }))}
                            className="mt-1 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setCatalogForm(f => ({ ...f, features: [...f.features, { title: '', desc: '' }] }))}
                      className="mt-2 font-body text-xs text-brand-violet hover:underline">+ Add feature</button>
                  </div>

                  <div>
                    <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Exclusive advantage</label>
                    <input value={catalogForm.unique_advantage} onChange={e => setCatalogForm(f => ({ ...f, unique_advantage: e.target.value }))}
                      placeholder="What makes this package unique..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Founding price</label>
                      <input type="number" min="0" value={catalogForm.founding_price_cad}
                        onChange={e => setCatalogForm(f => ({ ...f, founding_price_cad: e.target.value }))}
                        placeholder="225" className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                    </div>
                    <div>
                      <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Spots</label>
                      <input type="number" min="0" value={catalogForm.founding_total_spots}
                        onChange={e => setCatalogForm(f => ({ ...f, founding_total_spots: e.target.value }))}
                        placeholder="3" className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                    </div>
                    <div>
                      <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Spot group</label>
                      <input value={catalogForm.founding_spot_group}
                        onChange={e => setCatalogForm(f => ({ ...f, founding_spot_group: e.target.value }))}
                        placeholder="vip" className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <button type="button" onClick={() => setCatalogForm(f => ({ ...f, recommended: !f.recommended }))}
                        className={`relative w-9 h-5 rounded-full overflow-hidden transition-colors ${catalogForm.recommended ? 'bg-brand-violet' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${catalogForm.recommended ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="font-body text-sm text-gray-600">Recommended</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <button type="button" onClick={() => setCatalogForm(f => ({ ...f, active: !f.active }))}
                        className={`relative w-9 h-5 rounded-full overflow-hidden transition-colors ${catalogForm.active ? 'bg-brand-violet' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${catalogForm.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="font-body text-sm text-gray-600">Active</span>
                    </label>
                  </div>

                  {catalogError && <p className="font-body text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{catalogError}</p>}
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                  <button onClick={() => setShowPkgModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 font-body text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <Button onClick={saveCatalogPkg} loading={savingCatalog} className="flex-1">
                    {editingCatalogPkg ? 'Save changes' : 'Create package'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COUPONS TAB ── */}
      {activeTab === 'coupons' && (
        <div>
          {couponsLoading ? (
            <div className="flex justify-center py-24"><Spinner /></div>
          ) : coupons.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <Tag size={28} className="mx-auto text-gray-200 mb-3" strokeWidth={1.5} />
              <p className="font-body text-sm font-medium text-gray-500">No coupons yet</p>
              <p className="font-body text-xs text-gray-300 mt-1">Create discount codes for your clients</p>
              <button onClick={openAddCoupon} className="mt-4 px-4 py-2 rounded-lg bg-brand-violet text-white font-body text-sm font-medium hover:bg-brand-violet/90">
                + Add Coupon
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_120px_100px_80px_80px] items-center px-5 py-3 border-b border-gray-100 bg-gray-50">
                {['Code', 'Discount', 'Expiry', 'Uses', 'Active', ''].map(h => (
                  <div key={h} className="font-body text-xs font-medium text-gray-400">{h}</div>
                ))}
              </div>
              {coupons.map(c => (
                <div key={c.id} className="grid grid-cols-[1fr_120px_120px_100px_80px_80px] items-center px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-gray-900 text-white font-mono text-xs font-bold tracking-widest">{c.code}</span>
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 font-body text-sm font-medium">
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`} off
                    </span>
                  </div>
                  <div className="font-body text-xs text-gray-500">
                    {c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('en-CA') : 'No expiry'}
                  </div>
                  <div className="font-body text-xs text-gray-500">
                    {c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ''}
                  </div>
                  <div>
                    <button onClick={() => toggleCoupon(c)}
                      className={`relative w-9 h-5 rounded-full overflow-hidden transition-colors ${c.active ? 'bg-brand-violet' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${c.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEditCoupon(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Pencil size={13} /></button>
                    <button onClick={() => deleteCoupon(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Coupon modal */}
          {showCouponModal && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-heading text-lg font-semibold text-gray-900">
                    {editingCoupon ? 'Edit Coupon' : 'New Coupon'}
                  </h2>
                  <button onClick={() => setShowCouponModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Code *</label>
                    <input type="text" value={couponForm.code}
                      onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="SUMMER20"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Type</label>
                      <select value={couponForm.discount_type}
                        onChange={e => setCouponForm(f => ({ ...f, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20">
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">
                        Value {couponForm.discount_type === 'percentage' ? '(%)' : '($)'} *
                      </label>
                      <input type="number" min="0" value={couponForm.discount_value}
                        onChange={e => setCouponForm(f => ({ ...f, discount_value: e.target.value }))}
                        placeholder="20"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Expiry</label>
                      <input type="date" value={couponForm.expiry_date}
                        onChange={e => setCouponForm(f => ({ ...f, expiry_date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                    </div>
                    <div>
                      <label className="block font-body text-xs font-medium text-gray-600 mb-1.5">Max Uses</label>
                      <input type="number" min="0" value={couponForm.max_uses}
                        onChange={e => setCouponForm(f => ({ ...f, max_uses: e.target.value }))}
                        placeholder="Unlimited"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/20" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <button type="button" onClick={() => setCouponForm(f => ({ ...f, active: !f.active }))}
                      className={`relative w-9 h-5 rounded-full overflow-hidden transition-colors ${couponForm.active ? 'bg-brand-violet' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${couponForm.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="font-body text-sm text-gray-600">Active</span>
                  </label>
                  {couponError && <p className="font-body text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{couponError}</p>}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowCouponModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 font-body text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <Button onClick={saveCoupon} loading={savingCoupon} className="flex-1">
                    {editingCoupon ? 'Save' : 'Create'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
