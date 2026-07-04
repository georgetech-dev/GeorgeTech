alter table public.gateway_status enable row level security;
alter table public.inbound_sms enable row level security;
alter table public.outbound_sms enable row level security;
drop policy if exists "gateway_status_select_company" on public.gateway_status;
drop policy if exists "gateway_status_insert_company" on public.gateway_status;
drop policy if exists "gateway_status_update_company" on public.gateway_status;
drop policy if exists "inbound_sms_select_company" on public.inbound_sms;
drop policy if exists "inbound_sms_insert_company" on public.inbound_sms;
drop policy if exists "outbound_sms_select_company" on public.outbound_sms;
drop policy if exists "outbound_sms_insert_company" on public.outbound_sms;
drop policy if exists "outbound_sms_update_company" on public.outbound_sms;
create policy "gateway_status_select_company"
on public.gateway_status
for select
to authenticated
using (
  company_id in (
    select p.company_id
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.is_active = true
  )
);
create policy "gateway_status_insert_company"
on public.gateway_status
for insert
to authenticated
with check (
  company_id in (
    select p.company_id
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.is_active = true
  )
);
create policy "gateway_status_update_company"
on public.gateway_status
for update
to authenticated
using (
  company_id in (
    select p.company_id
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.is_active = true
  )
)
with check (
  company_id in (
    select p.company_id
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.is_active = true
  )
);
create policy "inbound_sms_select_company"
on public.inbound_sms
for select
to authenticated
using (
  company_id in (
    select p.company_id
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.is_active = true
  )
);
create policy "inbound_sms_insert_company"
on public.inbound_sms
for insert
to authenticated
with check (
  company_id in (
    select p.company_id
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.is_active = true
  )
);
create policy "outbound_sms_select_company"
on public.outbound_sms
for select
to authenticated
using (
  company_id in (
    select p.company_id
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.is_active = true
  )
);
create policy "outbound_sms_insert_company"
on public.outbound_sms
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and company_id in (
    select p.company_id
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.is_active = true
  )
);
create policy "outbound_sms_update_company"
on public.outbound_sms
for update
to authenticated
using (
  company_id in (
    select p.company_id
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.is_active = true
  )
)
with check (
  company_id in (
    select p.company_id
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.is_active = true
  )
);
