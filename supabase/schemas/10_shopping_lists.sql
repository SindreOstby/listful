-- Shopping lists owned by a single user.
create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

create index shopping_lists_owner_id_idx on public.shopping_lists (owner_id);

alter table public.shopping_lists enable row level security;

revoke all on table public.shopping_lists from anon, authenticated;
grant select, insert, update, delete on table public.shopping_lists to authenticated;

create policy "Owners can view their lists"
  on public.shopping_lists for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can create lists"
  on public.shopping_lists for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners can update their lists"
  on public.shopping_lists for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners can delete their lists"
  on public.shopping_lists for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
