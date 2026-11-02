alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own_active_profile" on public.profiles;
drop policy if exists "profiles_select_same_company_active_profiles" on public.profiles;
create policy "profiles_select_own_active_profile"
on public.profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
  and is_active = true
);
