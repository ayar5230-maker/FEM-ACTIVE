import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { Card } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import type { Nutrition } from '../../lib/types'

const mealIdeas = [
  { meal: 'Breakfast', ideas: ['Protein oatmeal with blueberries', 'Veggie omelette', 'Greek yogurt + fruit + granola'] },
  { meal: 'AM Snack', ideas: ['Apple + almond butter', '1 banana + whey shake', 'Cottage cheese + cinnamon'] },
  { meal: 'Lunch', ideas: ['Rice bowl + grilled chicken + veggies', 'Quinoa + chickpea salad', 'Turkey + avocado wrap'] },
  { meal: 'PM Snack', ideas: ['Edamame', 'Nuts + dark chocolate', 'Homemade protein bar'] },
  { meal: 'Dinner', ideas: ['Salmon + sweet potato + broccoli', 'Turkey chili + brown rice', 'Stir-fried tofu + rice noodles'] },
]

export function ClientNutrition() {
  const { profile } = useAuthContext()
  const [nutrition, setNutrition] = useState<Nutrition | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) loadNutrition()
  }, [profile])

  async function loadNutrition() {
    if (!profile) return
    const { data } = await supabase.from('nutrition').select('*').eq('client_id', profile.id).single()
    setNutrition(data ?? null)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  const totalCal = nutrition
    ? nutrition.protein_g * 4 + nutrition.carbs_g * 4 + nutrition.fat_g * 9
    : 0

  const macros = nutrition ? [
    { label: 'Protein', value: nutrition.protein_g, unit: 'g', pct: Math.round((nutrition.protein_g * 4 / totalCal) * 100), color: 'bg-brand-violet' },
    { label: 'Carbs', value: nutrition.carbs_g, unit: 'g', pct: Math.round((nutrition.carbs_g * 4 / totalCal) * 100), color: 'bg-brand-violet-light' },
    { label: 'Fat', value: nutrition.fat_g, unit: 'g', pct: Math.round((nutrition.fat_g * 9 / totalCal) * 100), color: 'bg-purple-300' },
  ] : []

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-brand-deep">Nutrition</h1>
        <p className="font-body text-brand-deep/50 mt-1">Your personalized nutritional goals</p>
      </div>

      {!nutrition ? (
        <Card>
          <div className="text-center py-12">
            <p className="font-heading text-xl text-brand-deep/30">Nutrition plan not set</p>
            <p className="font-body text-sm text-brand-deep/30 mt-2">
              Your coach has not yet defined your nutritional goals.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Calorie target */}
          <Card className="bg-brand-deep text-white border-brand-deep">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-sm text-brand-lavender/60 uppercase tracking-wider">
                  Calorie goal
                </p>
                <p className="font-heading text-6xl font-bold text-white mt-1">
                  {nutrition.calories}
                </p>
                <p className="font-body text-sm text-brand-lavender/60 mt-1">kcal / jour</p>
              </div>
              <div className="text-6xl opacity-20">⚡</div>
            </div>
          </Card>

          {/* Macros */}
          <div className="grid md:grid-cols-3 gap-4">
            {macros.map(m => (
              <Card key={m.label}>
                <p className="font-body text-xs text-brand-deep/50 uppercase tracking-wider mb-1">{m.label}</p>
                <p className="font-heading text-4xl font-bold text-brand-deep">
                  {m.value}<span className="text-lg font-normal text-brand-deep/40 ml-1">{m.unit}</span>
                </p>
                <div className="mt-3 h-2 bg-brand-lavender rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.pct}%` }} />
                </div>
                <p className="font-body text-xs text-brand-deep/40 mt-1">{m.pct}% of calories</p>
              </Card>
            ))}
          </div>

          {/* Coach note */}
          {nutrition.coach_note && (
            <Card className="border-brand-violet/20 bg-brand-lavender/40">
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0">💬</span>
                <div>
                  <p className="font-body text-xs font-medium text-brand-deep/60 mb-1">Coach note</p>
                  <p className="font-body text-sm text-brand-deep leading-relaxed">{nutrition.coach_note}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Meal ideas */}
          <div>
            <h2 className="font-heading text-xl font-semibold text-brand-deep mb-4">
              Meal ideas
            </h2>
            <div className="space-y-3">
              {mealIdeas.map(m => (
                <Card key={m.meal} padding="sm">
                  <p className="font-body text-xs font-medium text-brand-violet uppercase tracking-wider mb-2">
                    {m.meal}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {m.ideas.map(idea => (
                      <span
                        key={idea}
                        className="px-3 py-1.5 bg-brand-lavender/60 rounded-full font-body text-sm text-brand-deep"
                      >
                        {idea}
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <p className="font-body text-xs text-brand-deep/30 text-center">
            Updated on {new Date(nutrition.updated_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  )
}
