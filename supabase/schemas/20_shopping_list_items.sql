-- Items on a shopping list. Access follows ownership of the parent list.
create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  quantity numeric not null default 1 check (quantity > 0),
  unit text check (unit is null or char_length(unit) between 1 and 20),
  is_checked boolean not null default false,
  created_at timestamptz not null default now()
);

create index shopping_list_items_list_id_created_at_idx
  on public.shopping_list_items (list_id, created_at);

alter table public.shopping_list_items enable row level security;

revoke all on table public.shopping_list_items from anon, authenticated;
grant select, insert, update, delete on table public.shopping_list_items to authenticated;

create policy "Owners can view items on their lists"
  on public.shopping_list_items for select
  to authenticated
  using (
    list_id in (select id from public.shopping_lists where owner_id = (select auth.uid()))
  );

create policy "Owners can add items to their lists"
  on public.shopping_list_items for insert
  to authenticated
  with check (
    list_id in (select id from public.shopping_lists where owner_id = (select auth.uid()))
  );

create policy "Owners can update items on their lists"
  on public.shopping_list_items for update
  to authenticated
  using (
    list_id in (select id from public.shopping_lists where owner_id = (select auth.uid()))
  )
  with check (
    list_id in (select id from public.shopping_lists where owner_id = (select auth.uid()))
  );

create policy "Owners can delete items on their lists"
  on public.shopping_list_items for delete
  to authenticated
  using (
    list_id in (select id from public.shopping_lists where owner_id = (select auth.uid()))
  );
