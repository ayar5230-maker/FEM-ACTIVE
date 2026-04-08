import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, clientId } = await req.json()

    if (!message || !clientId) {
      return new Response(
        JSON.stringify({ error: 'message and clientId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase with service role key for full DB access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Load client context
    const [profileRes, nutritionRes, checkInsRes, workoutsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', clientId).single(),
      supabase.from('nutrition').select('*').eq('client_id', clientId).single(),
      supabase
        .from('check_ins')
        .select('week, weight_kg, energy, sleep_hours, sessions_done, sessions_total, status')
        .eq('client_id', clientId)
        .order('week', { ascending: false })
        .limit(3),
      supabase
        .from('workouts')
        .select('week, title, day_label, exercises(*)')
        .eq('client_id', clientId)
        .order('week', { ascending: false })
        .limit(2),
    ])

    const profile = profileRes.data
    const nutrition = nutritionRes.data
    const recentCheckIns = checkInsRes.data ?? []
    const currentWorkouts = workoutsRes.data ?? []

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build context
    const created = new Date(profile.created_at)
    const currentWeek = Math.max(1, Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1)

    let context = `Tu es le coach de ${profile.full_name ?? 'cette cliente'}, semaine ${currentWeek} de son programme`
    if (profile.forfait) context += ` (forfait: ${profile.forfait})`
    context += '.\n\n'

    if (nutrition) {
      context += `Objectifs nutritionnels actuels:
- Calories: ${nutrition.calories} kcal/jour
- Protéines: ${nutrition.protein_g}g, Glucides: ${nutrition.carbs_g}g, Lipides: ${nutrition.fat_g}g
${nutrition.coach_note ? `- Note: ${nutrition.coach_note}` : ''}

`
    }

    if (recentCheckIns.length > 0) {
      context += 'Check-ins récents:\n'
      recentCheckIns.forEach(ci => {
        context += `- Semaine ${ci.week}: `
        if (ci.weight_kg) context += `poids ${ci.weight_kg}kg, `
        if (ci.energy) context += `énergie ${ci.energy}/10, `
        if (ci.sleep_hours) context += `sommeil ${ci.sleep_hours}h, `
        context += `${ci.sessions_done}/${ci.sessions_total} séances`
        context += ` (${ci.status === 'reviewed' ? 'révisé' : 'en attente'})\n`
      })
      context += '\n'
    }

    if (currentWorkouts.length > 0) {
      context += 'Programme actuel:\n'
      currentWorkouts.forEach(w => {
        context += `- S${w.week} ${w.day_label ? `${w.day_label}: ` : ''}${w.title}\n`
      })
      context += '\n'
    }

    const systemPrompt = `Tu es un coach sportif et nutritionnel premium francophone spécialisé pour les femmes.
Tu travailles pour Fem'Active, une marque de coaching luxe.
Ton style est chaleureux, encourageant et personnalisé — jamais robotique ni générique.
Tu réponds TOUJOURS en français canadien naturel, avec de la bienveillance.
Tes réponses font 2 à 4 phrases maximum, concises et percutantes.
Utilise les données de la cliente pour personnaliser chaque réponse.
Si la cliente pose une question de santé grave, oriente-la vers un médecin.

Contexte de la cliente:
${context}`

    // Call Anthropic API
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: systemPrompt,
        messages: [
          { role: 'user', content: message }
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      console.error('Anthropic API error:', err)
      return new Response(
        JSON.stringify({ error: 'AI service unavailable' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicData = await anthropicRes.json()
    const reply = anthropicData.content?.[0]?.text ?? ''

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
