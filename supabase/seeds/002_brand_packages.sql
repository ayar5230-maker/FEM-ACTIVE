-- Idempotent: remove all catalog packages first
delete from public.packages where coach_id is null;

-- Insert the 5 brand packages
insert into public.packages
  (coach_id, slug, name, tagline, price_cad, price_note, features, unique_advantage, recommended, display_order,
   founding_price_cad, founding_total_spots, founding_spot_group, active, visible, currency, plan_type, duration_length, duration)
values

-- 1. Community
(null, 'community', 'Community', 'Small Investment, Big Impact', 100,
 'For the price of a daily coffee, you get a coach and a support team.',
 '[
   {"title": "Private community", "desc": ""},
   {"title": "Weekly workout challenge", "desc": ""},
   {"title": "Daily morning boost", "desc": ""},
   {"title": "Kitchen corner (1 recipe/week)", "desc": ""}
 ]'::jsonb,
 'Sense of belonging — you are never alone',
 false, 1,
 75, 5, 'community',
 true, true, 'CAD', 'Monthly', 'Until Cancelled', 'Monthly'),

-- 2. Community + Nutrition
(null, 'community-nutrition', 'Community + Nutrition', 'Small Investment, Big Impact', 140,
 'Everything in Community, plus a complete nutrition layer.',
 '[
   {"title": "Private community", "desc": ""},
   {"title": "Weekly workout challenge", "desc": ""},
   {"title": "Daily morning boost", "desc": ""},
   {"title": "Kitchen corner (1 recipe/week)", "desc": ""},
   {"title": "Personalized macro targets", "desc": ""},
   {"title": "Meal planning diary", "desc": ""}
 ]'::jsonb,
 'Community energy + full nutrition — accountability on training AND eating',
 false, 2,
 105, 5, 'community',
 true, true, 'CAD', 'Monthly', 'Until Cancelled', 'Monthly'),

-- 3. Autonomy + Nutrition
(null, 'autonomy-nutrition', 'Autonomy + Nutrition', 'Strategic Weekly Reviews', 240,
 'Even with autonomy, you are never alone.',
 '[
   {"title": "Customized 4-day training program", "desc": ""},
   {"title": "Transformation guide", "desc": ""},
   {"title": "Gym progress tracker", "desc": ""},
   {"title": "Motivation & mood tracker", "desc": ""},
   {"title": "Meal planning diary", "desc": ""},
   {"title": "Weekly written check-in", "desc": ""}
 ]'::jsonb,
 'Hormonal cycle tracker — optimize your training around your cycle',
 false, 3,
 180, 4, 'autonomy',
 true, true, 'CAD', 'Monthly', 'Until Cancelled', 'Monthly'),

-- 4. VIP
(null, 'vip', 'VIP', 'Zero Mental Load', 300,
 'I handle everything. You follow the path.',
 '[
   {"title": "Direct in-app access (8am–8pm weekdays)", "desc": ""},
   {"title": "Weekly 30-min coaching session", "desc": ""},
   {"title": "Fully customized 4-day program", "desc": ""},
   {"title": "Meal planning diary", "desc": ""},
   {"title": "Complete tracking ecosystem", "desc": ""}
 ]'::jsonb,
 'Weekly live coaching session — the only package with a real-time weekly call',
 false, 4,
 225, 3, 'vip',
 true, true, 'CAD', 'Monthly', 'Until Cancelled', 'Monthly'),

-- 5. VIP + Nutrition
(null, 'vip-nutrition', 'VIP + Nutrition', 'Zero Mental Load', 340,
 'I handle everything. You just show up.',
 '[
   {"title": "Direct in-app access (8am–8pm weekdays)", "desc": ""},
   {"title": "Weekly 30-min coaching session", "desc": ""},
   {"title": "Fully customized 4-day program", "desc": ""},
   {"title": "Complete nutrition plan", "desc": ""},
   {"title": "Complete tracking ecosystem", "desc": ""}
 ]'::jsonb,
 'Live coaching + full nutrition — the only package combining weekly calls with a personalized nutrition strategy',
 true, 5,
 255, 3, 'vip',
 true, true, 'CAD', 'Monthly', 'Until Cancelled', 'Monthly');
