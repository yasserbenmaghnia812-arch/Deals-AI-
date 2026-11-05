create table if not exists public.saved_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null check (char_length(product_name) between 1 and 200),
  budget_dzd numeric(12,2),
  store text check (store in ('aliexpress','temu','other')),
  product_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.tracked_parcels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tracking_number text not null check (char_length(tracking_number) between 3 and 120),
  carrier text,
  tracking_url text,
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, tracking_number)
);

create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null check (char_length(query) between 1 and 200),
  budget_dzd numeric(12,2),
  created_at timestamptz not null default now()
);

create index if not exists saved_products_user_created_idx on public.saved_products(user_id, created_at desc);
create index if not exists tracked_parcels_user_created_idx on public.tracked_parcels(user_id, created_at desc);
create index if not exists search_history_user_created_idx on public.search_history(user_id, created_at desc);

alter table public.saved_products enable row level security;
alter table public.tracked_parcels enable row level security;
alter table public.search_history enable row level security;

drop policy if exists "Users manage their own saved products" on public.saved_products;
create policy "Users manage their own saved products" on public.saved_products
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own tracked parcels" on public.tracked_parcels;
create policy "Users manage their own tracked parcels" on public.tracked_parcels
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own search history" on public.search_history;
create policy "Users manage their own search history" on public.search_history
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.saved_products, public.tracked_parcels, public.search_history to authenticated;

-- Keep the tables inaccessible to unauthenticated clients.
revoke all on public.saved_products, public.tracked_parcels, public.search_history from anon;
