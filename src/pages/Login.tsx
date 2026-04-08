import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import type { Profile } from '../lib/types'

type Mode = 'login' | 'signup'

export function LoginPage() {
  const navigate = useNavigate()
  const { profile, loading, setProfile } = useAuthContext()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  useEffect(() => {
    if (!loading && profile) {
      navigate(profile.role === 'coach' ? '/coach' : '/client', { replace: true })
    }
  }, [profile, loading, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    // 10-second timeout so the button never spins forever
    const timer = setTimeout(() => {
      setSubmitting(false)
      setError('Connexion trop lente. Vérifie ta connexion internet ou que ton projet Supabase est actif (supabase.com/dashboard).')
    }, 10000)

    if (mode === 'login') {
      try {
        console.log('[Login] calling signIn...')
        const { data, error: err } = await signIn(email, password)
        clearTimeout(timer)
        console.log('[Login] signIn result:', { user: data?.user?.id, err })

        if (err || !data.user) {
          setError(`Email ou mot de passe incorrect. (${err?.message ?? 'no user'})`)
          setSubmitting(false)
          return
        }

        console.log('[Login] fetching profile...')
        const { data: profData, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        console.log('[Login] profile result:', { profData, profErr })
        const prof = profData as Profile | null

        if (profErr || !prof) {
          setError(`Erreur de profil : ${profErr?.message ?? 'introuvable'}`)
          setSubmitting(false)
          return
        }
        setProfile(prof)
        navigate(prof.role === 'coach' ? '/coach' : '/client', { replace: true })
      } catch (ex) {
        clearTimeout(timer)
        const msg = ex instanceof Error ? ex.message : String(ex)
        console.error('[Login] exception:', msg)
        setError(`Erreur inattendue : ${msg}`)
        setSubmitting(false)
      }
    } else {
      if (!fullName.trim()) {
        clearTimeout(timer)
        setError('Le prénom est requis.')
        setSubmitting(false)
        return
      }
      const { error: err } = await signUp(email, password, fullName)
      clearTimeout(timer)
      if (err) {
        setError(err.message)
      } else {
        setSignupSuccess(true)
      }
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-lavender">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-brand-lavender/30">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-brand-deep px-16 py-12">
        <div>
          <h1 className="font-heading text-4xl italic font-semibold text-white">Fem'Active</h1>
          <p className="font-body text-brand-lavender/60 mt-2 text-sm">Coaching féminin premium</p>
        </div>
        <div>
          <blockquote className="font-heading text-2xl italic text-white/90 leading-relaxed">
            "Chaque séance est un pas de plus vers la meilleure version de toi."
          </blockquote>
          <div className="mt-8 space-y-3">
            {['Programme personnalisé', 'Suivi nutritionnel', 'Coach disponible', 'Résultats concrets'].map(f => (
              <div key={f} className="flex items-center gap-3 text-brand-lavender/80 font-body text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-violet flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="font-body text-brand-lavender/30 text-xs">© {new Date().getFullYear()} Fem'Active</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-heading text-3xl italic font-semibold text-brand-deep">Fem'Active</h1>
            <p className="font-body text-brand-deep/50 text-sm mt-1">Coaching féminin premium</p>
          </div>

          {signupSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <span className="text-2xl text-green-600">✓</span>
              </div>
              <h2 className="font-heading text-2xl text-brand-deep">Compte créé !</h2>
              <p className="font-body text-brand-deep/60 text-sm">
                Vérifie ton email pour confirmer ton compte, puis connecte-toi.
              </p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => { setMode('login'); setSignupSuccess(false) }}
              >
                Se connecter
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="font-heading text-2xl font-semibold text-brand-deep">
                  {mode === 'login' ? 'Bon retour 👋' : 'Créer un compte'}
                </h2>
                <p className="font-body text-brand-deep/50 text-sm mt-1">
                  {mode === 'login'
                    ? 'Connecte-toi à ton espace personnalisé'
                    : 'Rejoins la communauté Fem\'Active'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block font-body text-sm font-medium text-brand-deep mb-1.5">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Sophie"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-lavender bg-white
                        font-body text-sm text-brand-deep placeholder-brand-deep/30
                        focus:outline-none focus:ring-2 focus:ring-brand-violet/30 focus:border-brand-violet
                        transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-body text-sm font-medium text-brand-deep mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="sophie@exemple.com"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-lavender bg-white
                      font-body text-sm text-brand-deep placeholder-brand-deep/30
                      focus:outline-none focus:ring-2 focus:ring-brand-violet/30 focus:border-brand-violet
                      transition-all"
                  />
                </div>

                <div>
                  <label className="block font-body text-sm font-medium text-brand-deep mb-1.5">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-lavender bg-white
                      font-body text-sm text-brand-deep placeholder-brand-deep/30
                      focus:outline-none focus:ring-2 focus:ring-brand-violet/30 focus:border-brand-violet
                      transition-all"
                  />
                </div>

                {error && (
                  <p className="font-body text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  loading={submitting}
                  className="w-full"
                  size="lg"
                >
                  {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="font-body text-sm text-brand-deep/50">
                  {mode === 'login' ? "Pas encore de compte ?" : 'Déjà un compte ?'}{' '}
                  <button
                    onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
                    className="text-brand-violet font-medium hover:underline"
                  >
                    {mode === 'login' ? "S'inscrire" : 'Se connecter'}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
