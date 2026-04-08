import { useState, useEffect } from 'react'
import { supabase, getCurrentWeek } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import type { Workout, Exercise } from '../../lib/types'

interface WorkoutWithExercises extends Workout {
  exercises: Exercise[]
}

export function ClientWorkouts() {
  const { profile } = useAuthContext()
  const { toasts, addToast, removeToast } = useToast()
  const [workoutsByWeek, setWorkoutsByWeek] = useState<Map<number, WorkoutWithExercises[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [activeWeek, setActiveWeek] = useState<number>(1)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    if (profile) loadWorkouts()
  }, [profile])

  async function loadWorkouts() {
    if (!profile) return
    setLoading(true)

    const { data } = await supabase
      .from('workouts')
      .select('*, exercises(*)')
      .eq('client_id', profile.id)
      .order('week', { ascending: false })
      .order('created_at', { ascending: true })

    const workouts = (data ?? []) as WorkoutWithExercises[]

    const byWeek = new Map<number, WorkoutWithExercises[]>()
    workouts.forEach(w => {
      const existing = byWeek.get(w.week) ?? []
      byWeek.set(w.week, [...existing, w])
    })

    setWorkoutsByWeek(byWeek)

    // Default to current week
    const currentWeek = getCurrentWeek(profile.created_at)
    setActiveWeek(byWeek.has(currentWeek) ? currentWeek : (Array.from(byWeek.keys())[0] ?? 1))
    setLoading(false)
  }

  async function toggleExercise(exercise: Exercise) {
    setToggling(exercise.id)
    const { error } = await supabase
      .from('exercises')
      .update({ completed: !exercise.completed })
      .eq('id', exercise.id)

    if (!error) {
      // Update local state
      setWorkoutsByWeek(prev => {
        const updated = new Map(prev)
        updated.forEach((workouts, week) => {
          updated.set(week, workouts.map(w => ({
            ...w,
            exercises: w.exercises.map(e =>
              e.id === exercise.id ? { ...e, completed: !e.completed } : e
            ),
          })))
        })
        return updated
      })
      if (!exercise.completed) addToast('Exercise completed! 💪', 'success')
    } else {
      addToast('Error updating exercise', 'error')
    }
    setToggling(null)
  }

  const weeks = Array.from(workoutsByWeek.keys()).sort((a, b) => b - a)
  const currentWeek = profile ? getCurrentWeek(profile.created_at) : 1

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-brand-deep">My workouts</h1>
        <p className="font-body text-brand-deep/50 mt-1">
          Week {currentWeek} of your program
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : workoutsByWeek.size === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="font-heading text-xl text-brand-deep/30">No program assigned</p>
            <p className="font-body text-sm text-brand-deep/30 mt-2">
              Your coach is preparing your personalized program 💜
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Week selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {weeks.map(w => (
              <button
                key={w}
                onClick={() => setActiveWeek(w)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl font-body text-sm font-medium transition-all ${
                  activeWeek === w
                    ? 'bg-brand-violet text-white'
                    : 'bg-white border border-brand-lavender text-brand-deep/60 hover:border-brand-violet/40'
                }`}
              >
                Week {w}
                {w === currentWeek && (
                  <span className="ml-1.5 text-xs opacity-70">•</span>
                )}
              </button>
            ))}
          </div>

          {/* Workouts for selected week */}
          <div className="space-y-4">
            {(workoutsByWeek.get(activeWeek) ?? []).map(workout => {
              const totalEx = workout.exercises?.length ?? 0
              const doneEx = workout.exercises?.filter(e => e.completed).length ?? 0
              const pct = totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0

              return (
                <Card key={workout.id}>
                  {/* Workout header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-body text-xs text-brand-violet font-medium uppercase tracking-wider">
                        {workout.day_label ?? `Week ${workout.week}`}
                      </p>
                      <h3 className="font-heading text-xl font-semibold text-brand-deep mt-0.5">
                        {workout.title}
                      </h3>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-heading text-2xl font-bold text-brand-violet">{pct}%</p>
                      <p className="font-body text-xs text-brand-deep/40">{doneEx}/{totalEx}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-brand-lavender rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-brand-violet rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Coach note */}
                  {workout.coach_note && (
                    <div className="bg-brand-lavender/40 rounded-xl px-4 py-3 mb-4">
                      <p className="font-body text-xs font-medium text-brand-deep/50 mb-0.5">Coach note</p>
                      <p className="font-body text-sm text-brand-deep">{workout.coach_note}</p>
                    </div>
                  )}

                  {/* Exercises */}
                  {workout.exercises && workout.exercises.length > 0 && (
                    <div className="space-y-2">
                      {workout.exercises
                        .sort((a, b) => a.order_index - b.order_index)
                        .map(exercise => (
                          <button
                            key={exercise.id}
                            onClick={() => toggleExercise(exercise)}
                            disabled={toggling === exercise.id}
                            className={`
                              w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left
                              ${exercise.completed
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-brand-lavender/20 border border-brand-lavender hover:border-brand-violet/30'}
                            `}
                          >
                            {toggling === exercise.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <div className={`
                                w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                ${exercise.completed
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-brand-violet/40'}
                              `}>
                                {exercise.completed && <span className="text-white text-xs font-bold">✓</span>}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`font-body text-sm font-medium ${exercise.completed ? 'text-green-700 line-through decoration-green-400' : 'text-brand-deep'}`}>
                                {exercise.name}
                              </p>
                              <p className={`font-body text-xs ${exercise.completed ? 'text-green-600/60' : 'text-brand-deep/50'}`}>
                                {exercise.sets} sets × {exercise.reps} reps
                                {exercise.weight_kg ? ` · ${exercise.weight_kg} kg` : ''}
                              </p>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}

                  {pct === 100 && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                      <p className="font-body text-sm font-medium text-green-700">
                        🎉 Workout completed! Great performance!
                      </p>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
