create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "users_select_own_profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_insert_own_profile"
on public.user_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users_update_own_profile"
on public.user_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index user_profiles_user_id_idx on public.user_profiles(user_id);

