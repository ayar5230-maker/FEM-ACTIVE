import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getCurrentWeek } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { StatCard } from '../../components/ui/StatCard'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import type { Workout, Exercise, Message } from '../../lib/types'

interface WorkoutWithExercises extends Workout {
  exercises: Exercise[]
}

export function ClientHome() {
  const { profile } = useAuthContext()
  const navigate = useNavigate()
  const [nextWorkout, setNextWorkout] = useState<WorkoutWithExercises | null>(null)
  const [latestMessage, setLatestMessage] = useState<Message | null>(null)
  const [stats, setStats] = useState({
    sessionsThisWeek: 0,
    adherencePct: 0,
    streak: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadHomeData()
  }, [profile])

  async function loadHomeData() {
    if (!profile) return
    setLoading(true)

    const currentWeek = getCurrentWeek(profile.created_at)

    const [workoutsRes, checkInsRes, messagesRes] = await Promise.all([
      supabase
        .from('workouts')
        .select('*, exercises(*)')
        .eq('client_id', profile.id)
        .eq('week', currentWeek)
        .order('created_at', { ascending: true }),
      supabase
        .from('check_ins')
        .select('sessions_done, sessions_total, week')
        .eq('client_id', profile.id)
        .order('week', { ascending: false })
        .limit(8),
      supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${profile.coach_id},receiver_id.eq.${profile.id})`)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    const workouts = (workoutsRes.data ?? []) as WorkoutWithExercises[]
    const checkIns = checkInsRes.data ?? []
    const messages = messagesRes.data ?? []

    // Find next incomplete workout
    const incomplete = workouts.find(w =>
      (w.exercises ?? []).some(e => !e.completed)
    )
    setNextWorkout(incomplete ?? workouts[0] ?? null)

    // Adherence
    const allExercises = workouts.flatMap(w => w.exercises ?? [])
    const adherence = allExercises.length > 0
      ? Math.round((allExercises.filter(e => e.completed).length / allExercises.length) * 100)
      : 0

    // Sessions this week (from latest check-in if week matches)
    const thisWeekCheckIn = checkIns.find(ci => ci.week === currentWeek)
    const sessionsThisWeek = thisWeekCheckIn?.sessions_done ?? 0

    // Streak: consecutive weeks with check-ins
    let streak = 0
    for (let i = 0; i < checkIns.length; i++) {
      if (checkIns[i].sessions_done > 0) streak++
      else break
    }

    setStats({ sessionsThisWeek, adherencePct: adherence, streak })
    setLatestMessage(messages[0] ?? null)
    setLoading(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const currentWeek = profile ? getCurrentWeek(profile.created_at) : 1
  const nextCheckInDays = profile
    ? 7 - (Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) % 7)
    : 7

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-brand-deep">
          {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'toi'} 💜
        </h1>
        <p className="font-body text-brand-deep/50 mt-1">
          Week {currentWeek} of your program · {new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Sessions this week"
              value={stats.sessionsThisWeek}
              icon="◎"
              accent
            />
            <StatCard
              label="Adherence"
              value={`${stats.adherencePct}%`}
              icon="◈"
            />
            <StatCard
              label="Active streak"
              value={`${stats.streak}wk`}
              sub="consecutive weeks"
              icon="🔥"
            />
            <StatCard
              label="Next check-in"
              value={`${nextCheckInDays}d`}
              sub="days remaining"
              icon="◍"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Next workout */}
            <Card>
              <h2 className="font-heading text-lg font-semibold text-brand-deep mb-4">
                Next workout
              </h2>
              {!nextWorkout ? (
                <div className="text-center py-6">
                  <p className="font-body text-sm text-brand-deep/40">
                    No program for this week
                  </p>
                  <p className="font-body text-xs text-brand-deep/30 mt-1">
                    Your coach will assign you a program soon
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="font-body text-xs text-brand-violet font-medium">
                      {nextWorkout.day_label ?? `Week ${nextWorkout.week}`}
                    </p>
                    <p className="font-heading text-xl font-semibold text-brand-deep mt-0.5">
                      {nextWorkout.title}
                    </p>
                    {nextWorkout.coach_note && (
                      <p className="font-body text-sm text-brand-deep/60 mt-2 bg-brand-lavender/40 rounded-xl px-3 py-2">
                        💬 {nextWorkout.coach_note}
                      </p>
                    )}
                  </div>

                  {nextWorkout.exercises && nextWorkout.exercises.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {nextWorkout.exercises.slice(0, 4).map(ex => (
                        <div key={ex.id} className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${ex.completed ? 'bg-green-400' : 'bg-brand-lavender border border-brand-violet/30'}`} />
                          <span className="font-body text-sm text-brand-deep/70">
                            {ex.name} · {ex.sets}×{ex.reps}{ex.weight_kg ? ` · ${ex.weight_kg}kg` : ''}
                          </span>
                        </div>
                      ))}
                      {nextWorkout.exercises.length > 4 && (
                        <p className="font-body text-xs text-brand-deep/40 pl-5">
                          +{nextWorkout.exercises.length - 4} more exercises
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => navigate('/client/workouts')}
                  >
                    Start workout →
                  </Button>
                </>
              )}
            </Card>

            {/* Latest message from coach */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-semibold text-brand-deep">
                  Message from your coach
                </h2>
                <button
                  onClick={() => navigate('/client/messages')}
                  className="font-body text-xs text-brand-violet hover:underline"
                >
                  See all →
                </button>
              </div>
              {!latestMessage ? (
                <div className="text-center py-6">
                  <p className="font-body text-sm text-brand-deep/40">No messages yet</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/client/messages')}
                  >
                    Write to coach
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="bg-brand-lavender/40 rounded-xl px-4 py-3 mb-4">
                    <p className="font-body text-sm text-brand-deep leading-relaxed">
                      {latestMessage.body}
                    </p>
                    <p className="font-body text-xs text-brand-deep/40 mt-2">
                      {new Date(latestMessage.created_at).toLocaleDateString('en-CA', {
                        weekday: 'long', month: 'long', day: 'numeric'
                      })}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate('/client/messages')}
                  >
                    Reply →
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
