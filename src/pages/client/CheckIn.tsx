import { useState, useEffect } from 'react'
import { supabase, getCurrentWeek } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import type { CheckIn, PhotoAngle } from '../../lib/types'

export function ClientCheckIn() {
  const { profile } = useAuthContext()
  const { toasts, addToast, removeToast } = useToast()
  const [existingCheckIn, setExistingCheckIn] = useState<CheckIn | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploaded, setUploaded] = useState<Partial<Record<PhotoAngle, boolean>>>({})
  const [uploadingPhoto, setUploadingPhoto] = useState<PhotoAngle | null>(null)

  const [form, setForm] = useState({
    weight_kg: '',
    energy: 7,
    sleep_hours: '',
    sessions_done: 0,
    sessions_total: 4,
    client_note: '',
  })

  // Track check-in ID for photo uploads
  const [checkInId, setCheckInId] = useState<string | null>(null)

  useEffect(() => {
    if (profile) checkExistingCheckIn()
  }, [profile])

  async function checkExistingCheckIn() {
    if (!profile) return
    const currentWeek = getCurrentWeek(profile.created_at)
    const { data } = await supabase
      .from('check_ins')
      .select('*, photos:check_in_photos(*)')
      .eq('client_id', profile.id)
      .eq('week', currentWeek)
      .single()

    if (data) {
      setExistingCheckIn(data as CheckIn)
      setCheckInId(data.id)
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSubmitting(true)

    const currentWeek = getCurrentWeek(profile.created_at)
    const payload = {
      client_id: profile.id,
      coach_id: profile.coach_id,
      week: currentWeek,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      energy: form.energy,
      sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : null,
      sessions_done: form.sessions_done,
      sessions_total: form.sessions_total,
      client_note: form.client_note || null,
      status: 'pending' as const,
    }

    const { data, error } = await supabase
      .from('check_ins')
      .insert(payload)
      .select()
      .single()

    if (error) {
      addToast('Error submitting check-in', 'error')
    } else {
      setCheckInId(data.id)
      setExistingCheckIn(data as CheckIn)
      addToast('Check-in submitted successfully! 🎉', 'success')
    }
    setSubmitting(false)
  }

  async function handlePhotoUpload(angle: PhotoAngle, file: File) {
    if (!profile || !checkInId) {
      addToast('Submit your check-in first', 'error')
      return
    }
    setUploadingPhoto(angle)

    const ext = file.name.split('.').pop()
    const path = `${profile.id}/${checkInId}/${angle}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('checkin-photos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      addToast(`Error uploading ${angle} photo`, 'error')
      setUploadingPhoto(null)
      return
    }

    // Delete existing photo for this angle, then insert fresh
    await supabase.from('check_in_photos')
      .delete()
      .eq('check_in_id', checkInId)
      .eq('angle', angle)

    await supabase.from('check_in_photos').insert({
      check_in_id: checkInId,
      client_id: profile.id,
      storage_path: path,
      angle,
    })

    setUploaded(prev => ({ ...prev, [angle]: true }))
    addToast(`${angle === 'front' ? 'Front' : angle === 'side' ? 'Side' : 'Back'} photo added!`, 'success')
    setUploadingPhoto(null)
  }

  const currentWeek = profile ? getCurrentWeek(profile.created_at) : 1

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-brand-deep">Weekly check-in</h1>
        <p className="font-body text-brand-deep/50 mt-1">Week {currentWeek} of your program</p>
      </div>

      {existingCheckIn ? (
        <div className="space-y-4">
          <Card className="border-brand-violet/20 bg-brand-lavender/30">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-violet flex items-center justify-center text-white text-lg flex-shrink-0">
                ✓
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-brand-deep">
                  Check-in submitted!
                </h2>
                <p className="font-body text-sm text-brand-deep/60 mt-1">
                  Your week {currentWeek} check-in was submitted on{' '}
                  {new Date(existingCheckIn.created_at).toLocaleDateString('en-CA', {
                    weekday: 'long', month: 'long', day: 'numeric'
                  })}.
                </p>
                <span className={`inline-flex mt-2 px-3 py-1 rounded-full font-body text-xs font-medium ${
                  existingCheckIn.status === 'reviewed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {existingCheckIn.status === 'reviewed' ? '✓ Reviewed by coach' : '⏳ Awaiting review'}
                </span>
              </div>
            </div>
          </Card>

          {existingCheckIn.coach_feedback && (
            <Card className="border-brand-violet/20">
              <p className="font-body text-xs font-medium text-brand-deep/50 mb-2">Coach feedback</p>
              <p className="font-body text-sm text-brand-deep leading-relaxed">
                {existingCheckIn.coach_feedback}
              </p>
            </Card>
          )}

          {/* Photo upload section (even after submission) */}
          {checkInId && (
            <Card>
              <h3 className="font-heading text-base font-semibold text-brand-deep mb-4">
                Progress photos
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {(['front', 'side', 'back'] as PhotoAngle[]).map(angle => (
                  <label
                    key={angle}
                    className={`
                      aspect-[3/4] rounded-xl flex flex-col items-center justify-center gap-2
                      border-2 border-dashed cursor-pointer transition-all
                      ${uploaded[angle]
                        ? 'border-green-400 bg-green-50'
                        : 'border-brand-lavender hover:border-brand-violet/40 bg-brand-lavender/20'}
                    `}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(angle, file)
                      }}
                    />
                    {uploadingPhoto === angle ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        <span className="text-2xl">{uploaded[angle] ? '✓' : '+'}</span>
                        <span className="font-body text-xs text-brand-deep/50">
                          {angle === 'front' ? 'Front' : angle === 'side' ? 'Side' : 'Back'}
                        </span>
                      </>
                    )}
                  </label>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Metrics */}
          <Card>
            <h2 className="font-heading text-lg font-semibold text-brand-deep mb-5">
              Your metrics
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block font-body text-sm font-medium text-brand-deep mb-1.5">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.weight_kg}
                  onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
                  placeholder="ex: 62.5"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-lavender font-body text-sm
                    focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                />
              </div>

              <div>
                <label className="block font-body text-sm font-medium text-brand-deep mb-1.5">
                  Sleep hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={24}
                  value={form.sleep_hours}
                  onChange={e => setForm(f => ({ ...f, sleep_hours: e.target.value }))}
                  placeholder="ex: 7.5"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-lavender font-body text-sm
                    focus:outline-none focus:ring-2 focus:ring-brand-violet/30"
                />
              </div>
            </div>

            {/* Energy slider */}
            <div className="mt-4">
              <div className="flex justify-between font-body text-sm mb-2">
                <span className="font-medium text-brand-deep">Energy level</span>
                <span className="font-bold text-brand-violet">{form.energy}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={form.energy}
                onChange={e => setForm(f => ({ ...f, energy: parseInt(e.target.value) }))}
                className="w-full h-2 bg-brand-lavender rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-brand-violet [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between font-body text-xs text-brand-deep/40 mt-1">
                <span>Exhausted</span>
                <span>On top</span>
              </div>
            </div>

            {/* Sessions */}
            <div className="mt-4">
              <label className="block font-body text-sm font-medium text-brand-deep mb-2">
                Sessions completed this week
              </label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, sessions_done: n }))}
                    className={`w-10 h-10 rounded-xl font-body text-sm font-bold transition-all ${
                      form.sessions_done === n
                        ? 'bg-brand-violet text-white'
                        : 'bg-brand-lavender/50 text-brand-deep/60 hover:bg-brand-lavender'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Note */}
          <Card>
            <label className="block font-body text-sm font-medium text-brand-deep mb-2">
              Personal note (optional)
            </label>
            <textarea
              value={form.client_note}
              onChange={e => setForm(f => ({ ...f, client_note: e.target.value }))}
              rows={4}
              placeholder="How did your week go? Any challenges, victories to celebrate?"
              className="w-full px-4 py-3 rounded-xl border border-brand-lavender font-body text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-violet/30 resize-none"
            />
          </Card>

          {/* Photos */}
          <Card>
            <h2 className="font-heading text-lg font-semibold text-brand-deep mb-2">
              Progress photos
            </h2>
            <p className="font-body text-xs text-brand-deep/50 mb-4">
              You can add your photos after submitting the check-in.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(['front', 'side', 'back'] as PhotoAngle[]).map(angle => (
                <div
                  key={angle}
                  className="aspect-[3/4] rounded-xl bg-brand-lavender/30 border-2 border-dashed border-brand-lavender
                    flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-brand-deep/30 text-lg">📷</span>
                  <span className="font-body text-xs text-brand-deep/30">
                    {angle === 'front' ? 'Front' : angle === 'side' ? 'Side' : 'Back'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Button type="submit" loading={submitting} className="w-full" size="lg">
            Submit my check-in
          </Button>
        </form>
      )}
    </div>
  )
}
