create table if not exists public.coupons (
  id             uuid primary key default gen_random_uuid(),
  coach_id       uuid not null references public.profiles(id) on delete cascade,
  code           text not null,
  discount_type  text not null default 'percentage', -- 'percentage' | 'fixed'
  discount_value numeric(8,2) not null,
  expiry_date    date,
  max_uses       integer,
  uses_count     integer not null default 0,
  active         boolean not null default true,
  created_at     timestamptz default now()
);

alter table public.coupons enable row level security;

create policy "coach_manage_coupons" on public.coupons
  for all using (coach_id = auth.uid());
