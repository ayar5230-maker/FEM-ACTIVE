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
   {"title":"Private community","desc":"Safe, supportive space to connect with other women, share doubts, and celebrate victories"},
   {"title":"Weekly workout challenge","desc":"A new complete 30-minute session published each week — we all do it together, creating shared commitment"},
   {"title":"Daily morning boost","desc":"Motivational messages to remind you of your goals and energize you to move, even on rainy days"},
   {"title":"Kitchen corner (1 recipe/week)","desc":"Simple, quick, delicious recipes for your busiest days when cravings typically strike"}
 ]'::jsonb,
 'Sense of belonging — you are part of a movement, never doing this alone',
 false, 1, 75, 5, 'community', true, true, 'CAD', 'Monthly', 'Until Cancelled', 'Monthly'),

-- 2. Autonomy
(null, 'autonomy', 'Autonomy', 'Strategic Weekly Reviews', 200,
 'Even with autonomy, you are never alone.',
 '[
   {"title":"Customized 4-day training program","desc":"Optimized for female metabolism with video demonstrations for each exercise via app"},
   {"title":"Transformation guide","desc":"Comprehensive documentation for tracking body composition and weight progression"},
   {"title":"Gym progress tracker","desc":"Tool for recording weights and times — what gets measured gets improved"},
   {"title":"Motivation & mood tracker","desc":"Space to log energy levels and hormonal cycles to optimize workout intensity"}
 ]'::jsonb,
 'Hormonal cycle tracker — optimize your training sessions around your cycle, a 100% female-focused approach',
 false, 2, 150, 4, 'autonomy', true, true, 'CAD', 'Monthly', 'Until Cancelled', 'Monthly'),

-- 3. Autonomy + Nutrition
(null, 'autonomy-nutrition', 'Autonomy + Nutrition', 'Strategic Weekly Reviews', 240,
 'Even with autonomy, you are never alone.',
 '[
   {"title":"Customized 4-day training program","desc":"Optimized for female metabolism with video demonstrations for each exercise via app"},
   {"title":"Transformation guide","desc":"Comprehensive documentation for tracking body composition and weight progression"},
   {"title":"Gym progress tracker","desc":"Tool for recording weights and times — what gets measured gets improved"},
   {"title":"Motivation & mood tracker","desc":"Space to log energy levels and hormonal cycles to optimize workout intensity"},
   {"title":"Meal planning diary","desc":"Simple, quick, delicious recipes for your busiest days when cravings typically strike"},
   {"title":"Weekly written check-in","desc":"Personalized feedback to adjust strategy, maintain motivation, and celebrate wins"}
 ]'::jsonb,
 'Hormonal cycle tracker — optimize your training around your cycle, a 100% female-focused approach',
 false, 3, 180, 4, 'autonomy', true, true, 'CAD', 'Monthly', 'Until Cancelled', 'Monthly'),

-- 4. VIP
(null, 'vip', 'VIP', 'Zero Mental Load', 300,
 'I handle everything. You follow the path.',
 '[
   {"title":"Direct in-app access (8am–8pm weekdays)","desc":"Questions at a restaurant? Unsure about gym equipment? Sudden motivation dip? Response under an hour. Never stay stuck."},
   {"title":"Weekly 30-min coaching session","desc":"Real-time analysis of your results, plan adjustments based on fatigue levels, and mental boost for the week ahead"},
   {"title":"Fully customized 4-day program","desc":"Adapted to your equipment (gym or home) and your preferences"},
   {"title":"Meal planning diary","desc":"Simple, quick, delicious recipes for your busiest days when cravings typically strike"},
   {"title":"Complete tracking ecosystem","desc":"Weight loss/gain guides, gym progress trackers, and daily mood/motivation monitoring"}
 ]'::jsonb,
 'Weekly live coaching session — the only package with a real-time call with your coach every single week',
 false, 4, 225, 3, 'vip', true, true, 'CAD', 'Monthly', 'Until Cancelled', 'Monthly'),

-- 5. VIP + Nutrition
(null, 'vip-nutrition', 'VIP + Nutrition', 'Zero Mental Load', 340,
 'I handle everything. You just show up.',
 '[
   {"title":"Direct in-app access (8am–8pm weekdays)","desc":"Questions at a restaurant? Unsure about gym equipment? Sudden motivation dip? Response under an hour. Never stay stuck."},
   {"title":"Weekly 30-min coaching session","desc":"Real-time analysis of your results, plan adjustments based on fatigue levels, and mental boost for the week ahead"},
   {"title":"Fully customized 4-day program","desc":"Adapted to your equipment (gym or home) and your preferences"},
   {"title":"Complete nutrition plan","desc":"Personalized macros, meal planning diary, and a full nutrition strategy adapted to your goals"},
   {"title":"Complete tracking ecosystem","desc":"Weight loss/gain guides, gym progress trackers, and daily mood/motivation monitoring"}
 ]'::jsonb,
 'Live coaching + full nutrition — the only package combining real-time weekly sessions with a complete personalized nutrition strategy',
 true, 5, 255, 3, 'vip', true, true, 'CAD', 'Monthly', 'Until Cancelled', 'Monthly');
