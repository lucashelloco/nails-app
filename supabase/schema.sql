-- Schéma Supabase pour l'appli Onglerie.
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller → Run.

-- Produits (stock) --------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  category text not null
    check (category in ('vernis', 'gel', 'capsule', 'outillage', 'consommable', 'autre')),
  brand text,
  quantity integer not null default 0 check (quantity >= 0),
  unit text not null default 'unités',
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_owner_idx on public.products (owner_id);

-- Clientes ------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_owner_idx on public.clients (owner_id);

-- updated_at automatique ----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

-- Sécurité : chaque compte ne voit et ne modifie que ses propres données ----
alter table public.products enable row level security;
alter table public.clients enable row level security;

create policy "products: propriétaire uniquement" on public.products
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "clients: propriétaire uniquement" on public.clients
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- +1 / -1 sur le stock de façon atomique (pas de conflit si deux appareils
-- modifient la quantité en même temps). "security invoker" = la RLS s'applique.
create or replace function public.adjust_product_quantity(p_id uuid, p_delta integer)
returns public.products
language sql
security invoker
set search_path = ''
as $$
  update public.products
     set quantity = greatest(0, quantity + p_delta)
   where id = p_id
  returning *;
$$;

revoke execute on function public.adjust_product_quantity(uuid, integer) from public, anon;
grant execute on function public.adjust_product_quantity(uuid, integer) to authenticated;

-- Temps réel : les autres appareils sont prévenus des changements -----------
alter publication supabase_realtime add table public.products, public.clients;
