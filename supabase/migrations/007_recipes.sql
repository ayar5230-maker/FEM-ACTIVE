-- Cookbooks
create table public.cookbooks (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid references public.profiles(id) on delete cascade,
  name          text not null,
  description   text,
  cover_image_url text,
  display_order int not null default 0,
  created_at    timestamptz default now()
);
alter table public.cookbooks enable row level security;
create policy "coach_manage_cookbooks" on public.cookbooks
  for all using (coach_id = auth.uid());
create policy "clients_read_cookbooks" on public.cookbooks
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and coach_id = cookbooks.coach_id)
  );

-- Recipes
create table public.recipes (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  image_url     text,
  prep_time_min int not null default 10,
  cook_time_min int not null default 20,
  servings      int not null default 1,
  ingredients   jsonb not null default '[]',
  instructions  jsonb not null default '[]',
  calories      int,
  protein_g     numeric(6,1),
  carbs_g       numeric(6,1),
  fat_g         numeric(6,1),
  fiber_g       numeric(6,1),
  tags          text[] default '{}',
  created_at    timestamptz default now()
);
alter table public.recipes enable row level security;
create policy "coach_manage_recipes" on public.recipes
  for all using (coach_id = auth.uid());
create policy "clients_read_recipes" on public.recipes
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and coach_id = recipes.coach_id)
  );

-- Junction table
create table public.cookbook_recipes (
  cookbook_id uuid references public.cookbooks(id) on delete cascade,
  recipe_id   uuid references public.recipes(id) on delete cascade,
  primary key (cookbook_id, recipe_id)
);
alter table public.cookbook_recipes enable row level security;
create policy "coach_manage_cookbook_recipes" on public.cookbook_recipes
  for all using (
    exists (select 1 from public.cookbooks where id = cookbook_id and coach_id = auth.uid())
  );
create policy "clients_read_cookbook_recipes" on public.cookbook_recipes
  for select using (
    exists (
      select 1 from public.cookbooks cb
      join public.profiles p on p.coach_id = cb.coach_id
      where cb.id = cookbook_id and p.id = auth.uid()
    )
  );
