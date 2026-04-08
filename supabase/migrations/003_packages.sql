-- Packages / coaching plans table
create table if not exists public.packages (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  price_cad   numeric(8,2) not null default 0,
  duration    text not null default 'Monthly',  -- Monthly | Weekly | Yearly | One-time
  active      boolean not null default true,
  visible     boolean not null default true,
  created_at  timestamptz default now()
);

alter table public.packages enable row level security;

-- Coach can do everything with their own packages
create policy "coach_manage_packages" on public.packages
  for all using (coach_id = auth.uid());

-- Clients can read active+visible packages from their coach
create policy "client_read_packages" on public.packages
  for select using (
    active = true
    and visible = true
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.coach_id = packages.coach_id
    )
  );
