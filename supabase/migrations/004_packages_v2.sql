-- Add new fields to packages table for HubFit-style package setup
alter table public.packages
  add column if not exists currency      text not null default 'CAD',
  add column if not exists plan_type     text not null default 'Monthly',
  add column if not exists duration_length text not null default 'Until Cancelled',
  add column if not exists free_trial    boolean not null default false,
  add column if not exists initial_fee   boolean not null default false,
  add column if not exists instant_access boolean not null default true,
  add column if not exists benefits      text[] default '{}';
