-- Sample coaching packages — auto-detects the first coach in the database.
-- Paste in Supabase SQL Editor and click Run.

do $$
declare
  v_coach_id uuid;
begin
  select id into v_coach_id
  from public.profiles
  where role = 'coach'
  limit 1;

  if v_coach_id is null then
    raise exception 'No coach profile found. Make sure you are signed up with role=coach.';
  end if;

  insert into public.packages
    (coach_id, name, description, price_cad, duration, currency, plan_type,
     duration_length, free_trial, initial_fee, instant_access, benefits, active, visible)
  values

  -- 1. Starter
  (v_coach_id,
   'Starter',
   'Perfect for beginners ready to take their first step. Includes a personalised training plan and weekly check-ins to keep you on track.',
   97.00, 'Monthly', 'CAD', 'Monthly', 'Until Cancelled',
   false, false, true,
   ARRAY[
     'Personalised training program',
     'Weekly check-in form',
     'Coach feedback within 48 h',
     'Access to the client portal'
   ],
   true, true),

  -- 2. Premium
  (v_coach_id,
   'Premium',
   'Our most popular plan. Full training + nutrition support with priority coach messaging so you always feel supported.',
   197.00, 'Monthly', 'CAD', 'Monthly', 'Until Cancelled',
   false, false, true,
   ARRAY[
     'Everything in Starter',
     'Custom nutrition plan',
     'Priority messaging (24 h response)',
     'Monthly progress photo review',
     'Macro adjustments every 2 weeks'
   ],
   true, true),

  -- 3. Elite VIP
  (v_coach_id,
   'Elite VIP',
   'The full white-glove experience. Unlimited access to your coach, bi-weekly calls, and a fully tailored programme updated every month.',
   297.00, 'Monthly', 'CAD', 'Monthly', 'Until Cancelled',
   false, false, true,
   ARRAY[
     'Everything in Premium',
     'Bi-weekly 30-min video calls',
     'Unlimited coach messaging',
     'Weekly programme adjustments',
     'Supplement guidance',
     'Mindset & habit coaching'
   ],
   true, true);

  raise notice 'Inserted 3 packages for coach %', v_coach_id;
end;
$$;
