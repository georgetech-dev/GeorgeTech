-- Support access status helper.
--
-- The Support Centre should remain visible when access has been suspended, but
-- it needs enough context to show whether the ban is company-wide or user-specific.

create or replace function public.get_my_support_access(target_app_code text default 'customer_portal')
returns table (
  can_access boolean,
  denial_scope text,
  banner_title text,
  banner_message text,
  company_status text,
  profile_is_active boolean,
  app_access_enabled boolean,
  app_is_active boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  access_row record;
begin
  select
    p.is_active as profile_is_active,
    c.status as company_status,
    caa.is_enabled as app_access_enabled,
    ac.is_active as app_is_active
  into access_row
  from public.profiles p
  left join public.companies c
    on c.id = p.company_id
  left join public.company_app_access caa
    on caa.company_id = p.company_id
   and caa.app_code = target_app_code
  left join public.app_catalog ac
    on ac.code = target_app_code
  where p.user_id = auth.uid()
  order by p.is_active desc
  limit 1;

  if not found then
    return query select
      false,
      'user',
      'Support Centre access banned',
      'Your user account does not have an active GeorgeTech profile. This is a user-specific access ban. Please contact GeorgeTech support if you believe this is incorrect.',
      null::text,
      false,
      null::boolean,
      null::boolean;
    return;
  end if;

  if coalesce(access_row.profile_is_active, false) = false then
    return query select
      false,
      'user',
      'Support Centre access banned',
      'Your user account has been suspended. This is user-specific, not company-wide. Please contact GeorgeTech support if you believe this is incorrect.',
      access_row.company_status::text,
      access_row.profile_is_active::boolean,
      access_row.app_access_enabled::boolean,
      access_row.app_is_active::boolean;
    return;
  end if;

  if coalesce(access_row.company_status, '') <> 'active' then
    return query select
      false,
      'company',
      'Support Centre access banned',
      'Your company has been suspended, so this is a company-wide access ban. Please contact GeorgeTech support if you believe this is incorrect.',
      access_row.company_status::text,
      access_row.profile_is_active::boolean,
      access_row.app_access_enabled::boolean,
      access_row.app_is_active::boolean;
    return;
  end if;

  return query select
    true,
    null::text,
    null::text,
    null::text,
    access_row.company_status::text,
    access_row.profile_is_active::boolean,
    access_row.app_access_enabled::boolean,
    access_row.app_is_active::boolean;
end;
$$;

grant execute on function public.get_my_support_access(text) to authenticated;

notify pgrst, 'reload schema';
