-- Measurements table for client body metrics
create table if not exists public.measurements (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.profiles(id) on delete cascade,
  recorded_at     timestamptz not null default now(),
  weight_kg       numeric(5,2),
  hip_cm          numeric(5,1),
  waist_cm        numeric(5,1),
  chest_cm        numeric(5,1),
  bicep_left_cm   numeric(5,1),
  bicep_right_cm  numeric(5,1),
  thigh_cm        numeric(5,1),
  note            text,
  created_at      timestamptz default now()
);

alter table public.measurements enable row level security;

-- Coach can read/insert/update/delete measurements for their clients
create policy "coach_manage_measurements" on public.measurements
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = measurements.client_id
        and p.coach_id = auth.uid()
    )
  );

-- Client can read their own measurements
create policy "client_read_own_measurements" on public.measurements
  for select using (client_id = auth.uid());

-- Add coach_note column to profiles (for coach's private note on each client)
alter table public.profiles
  add column if not exists coach_note text;
