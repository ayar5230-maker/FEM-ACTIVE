-- Make coach_id nullable (catalog packages have no coach_id)
alter table public.packages alter column coach_id drop not null;

-- Add catalog columns
alter table public.packages
  add column if not exists slug              text,
  add column if not exists tagline           text,
  add column if not exists features          jsonb default '[]',
  add column if not exists unique_advantage  text,
  add column if not exists recommended       boolean not null default false,
  add column if not exists display_order     int not null default 0,
  add column if not exists price_note        text,
  add column if not exists founding_price_cad   int,
  add column if not exists founding_total_spots int,
  add column if not exists founding_spot_group  text;

-- Unique slug index (only for non-null slugs)
create unique index if not exists packages_slug_unique on public.packages(slug) where slug is not null;

-- Add is_founding flag to profiles
alter table public.profiles
  add column if not exists is_founding boolean not null default false;

-- Drop & recreate RLS policies
drop policy if exists "coach_manage_packages" on public.packages;
drop policy if exists "client_read_packages" on public.packages;

-- Coaches manage their own packages OR catalog packages (coach_id is null)
create policy "coach_manage_packages" on public.packages
  for all using (
    (coach_id = auth.uid())
    or
    (coach_id is null and exists (
      select 1 from public.profiles where id = auth.uid() and role = 'coach'
    ))
  );

-- Anyone authenticated can read active catalog packages; clients can read their coach's active packages
create policy "read_active_packages" on public.packages
  for select using (
    active = true and (
      coach_id is null
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and (p.coach_id = packages.coach_id or (select role from public.profiles where id = auth.uid()) = 'coach')
      )
    )
  );
