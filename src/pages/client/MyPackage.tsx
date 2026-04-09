import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { Spinner } from '../../components/ui/Spinner'
import { Star } from 'lucide-react'

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
  founding_price_cad: number | null
}

export function ClientMyPackage() {
  const { profile } = useAuthContext()
  const [pkg, setPkg] = useState<CatalogPackage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.forfait) loadPackage()
    else setLoading(false)
  }, [profile])

  async function loadPackage() {
    const { data } = await supabase
      .from('packages')
      .select('*')
      .eq('slug', profile!.forfait!)
      .single()
    setPkg(data as CatalogPackage ?? null)
    setLoading(false)
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="font-body text-xl font-semibold text-gray-900 mb-6">My Package</h1>

      {!profile?.forfait || !pkg ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-brand-lavender flex items-center justify-center mx-auto mb-3">
            <Star size={20} className="text-brand-violet" strokeWidth={1.5} />
          </div>
          <p className="font-body text-sm font-medium text-gray-600">No package assigned yet</p>
          <p className="font-body text-xs text-gray-400 mt-1">Your package will be assigned by your coach.</p>
        </div>
      ) : (
        <div className={`bg-white rounded-xl border overflow-hidden ${pkg.recommended ? 'border-brand-violet ring-1 ring-brand-violet/20' : 'border-gray-200'}`}>
          {/* Header */}
          <div className="bg-brand-deep px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-heading text-2xl italic font-semibold text-white">{pkg.name}</h2>
                {pkg.tagline && <p className="font-body text-sm text-brand-lavender/70 mt-1">{pkg.tagline}</p>}
              </div>
              {(profile as any).is_founding && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 font-body text-xs font-semibold">
                  <Star size={11} fill="currentColor" /> Founding Member
                </span>
              )}
            </div>
            <div className="mt-4 flex items-end gap-2">
              {(profile as any).is_founding && pkg.founding_price_cad ? (
                <>
                  <span className="font-body text-sm text-brand-lavender/50 line-through">${pkg.price_cad}</span>
                  <span className="font-heading text-3xl font-bold text-white">${pkg.founding_price_cad}</span>
                </>
              ) : (
                <span className="font-heading text-3xl font-bold text-white">${pkg.price_cad}</span>
              )}
              <span className="font-body text-sm text-brand-lavender/70 mb-0.5">CAD / mo</span>
            </div>
            {(profile as any).is_founding && (
              <p className="font-body text-xs text-amber-300 mt-1">Price locked for life — founding member</p>
            )}
          </div>

          {/* Features */}
          <div className="px-6 py-5 space-y-4">
            {pkg.features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-violet flex-shrink-0 mt-2" />
                <div>
                  <span className="font-body text-sm font-semibold text-gray-800">{f.title}</span>
                  {f.desc && <p className="font-body text-xs text-gray-400 mt-0.5">{f.desc}</p>}
                </div>
              </div>
            ))}

            {pkg.unique_advantage && (
              <div className="mt-2 px-4 py-3 rounded-xl bg-brand-lavender border border-brand-lavender">
                <p className="font-body text-xs font-semibold text-brand-deep mb-0.5">Exclusive</p>
                <p className="font-body text-sm text-brand-deep/70">{pkg.unique_advantage}</p>
              </div>
            )}

            {pkg.price_note && (
              <p className="font-body text-xs text-gray-400 italic mt-2">{pkg.price_note}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
