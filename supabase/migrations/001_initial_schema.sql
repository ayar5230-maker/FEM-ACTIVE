-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('coach', 'client')) not null default 'client',
  full_name text,
  email text,
  forfait text,
  coach_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Profiles RLS
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Coach can view all client profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- WORKOUTS
-- ============================================================
create table public.workouts (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  coach_id uuid references public.profiles(id) not null,
  week int not null default 1,
  day_label text,
  title text not null,
  coach_note text,
  created_at timestamptz default now()
);

alter table public.workouts enable row level security;

create policy "Client can read own workouts"
  on public.workouts for select
  using (auth.uid() = client_id);

create policy "Coach can manage client workouts"
  on public.workouts for all
  using (auth.uid() = coach_id);

-- ============================================================
-- EXERCISES
-- ============================================================
create table public.exercises (
  id uuid default uuid_generate_v4() primary key,
  workout_id uuid references public.workouts(id) on delete cascade not null,
  name text not null,
  sets int not null default 3,
  reps text not null default '10',
  weight_kg numeric,
  completed boolean default false,
  order_index int default 0
);

alter table public.exercises enable row level security;

create policy "Client can read and complete own exercises"
  on public.exercises for select
  using (
    exists (
      select 1 from public.workouts w
      where w.id = exercises.workout_id and w.client_id = auth.uid()
    )
  );

create policy "Client can update own exercise completion"
  on public.exercises for update
  using (
    exists (
      select 1 from public.workouts w
      where w.id = exercises.workout_id and w.client_id = auth.uid()
    )
  );

create policy "Coach can manage exercises"
  on public.exercises for all
  using (
    exists (
      select 1 from public.workouts w
      where w.id = exercises.workout_id and w.coach_id = auth.uid()
    )
  );

-- ============================================================
-- NUTRITION
-- ============================================================
create table public.nutrition (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  coach_id uuid references public.profiles(id) not null,
  calories int not null default 2000,
  protein_g int not null default 150,
  carbs_g int not null default 200,
  fat_g int not null default 65,
  coach_note text,
  updated_at timestamptz default now(),
  unique(client_id)
);

alter table public.nutrition enable row level security;

create policy "Client can read own nutrition"
  on public.nutrition for select
  using (auth.uid() = client_id);

create policy "Coach can manage nutrition"
  on public.nutrition for all
  using (auth.uid() = coach_id);

-- ============================================================
-- CHECK-INS
-- ============================================================
create table public.check_ins (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  coach_id uuid references public.profiles(id),
  week int not null default 1,
  weight_kg numeric,
  energy int check (energy between 1 and 10),
  sleep_hours numeric,
  sessions_done int default 0,
  sessions_total int default 4,
  client_note text,
  coach_feedback text,
  status text default 'pending' check (status in ('pending', 'reviewed')),
  created_at timestamptz default now()
);

alter table public.check_ins enable row level security;

create policy "Client can manage own check-ins"
  on public.check_ins for all
  using (auth.uid() = client_id);

create policy "Coach can manage all check-ins"
  on public.check_ins for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

-- ============================================================
-- CHECK-IN PHOTOS
-- ============================================================
create table public.check_in_photos (
  id uuid default uuid_generate_v4() primary key,
  check_in_id uuid references public.check_ins(id) on delete cascade not null,
  client_id uuid references public.profiles(id) not null,
  storage_path text not null,
  angle text check (angle in ('front', 'side', 'back')) not null,
  created_at timestamptz default now()
);

alter table public.check_in_photos enable row level security;

create policy "Client can manage own check-in photos"
  on public.check_in_photos for all
  using (auth.uid() = client_id);

create policy "Coach can read all check-in photos"
  on public.check_in_photos for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

-- ============================================================
-- MESSAGES (Realtime enabled)
-- ============================================================
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  body text not null,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

-- Enable realtime
alter publication supabase_realtime add table public.messages;

create policy "Sender and receiver can read messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Authenticated users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Receiver can mark messages as read"
  on public.messages for update
  using (auth.uid() = receiver_id);

-- ============================================================
-- TRIGGERS: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'client'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- STORAGE: checkin-photos bucket policies (run after creating bucket)
-- ============================================================
-- Run these after creating the 'checkin-photos' bucket in Supabase Storage:
--
-- insert into storage.buckets (id, name, public) values ('checkin-photos', 'checkin-photos', false);
--
-- create policy "Client can upload own photos"
--   on storage.objects for insert
--   with check (bucket_id = 'checkin-photos' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Client can read own photos"
--   on storage.objects for select
--   using (bucket_id = 'checkin-photos' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Coach can read all photos"
--   on storage.objects for select
--   using (
--     bucket_id = 'checkin-photos' and
--     exists (
--       select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'
--     )
--   );
