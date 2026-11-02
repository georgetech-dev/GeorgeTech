-- Self-scoped read model for the Client Support tabs. Existing grants, roles,
-- company access and application permission checks are not changed.
begin;
create or replace function public.get_my_client_portal_v1()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  p public.profiles%rowtype;
  c public.companies%rowtype;
  a record;
  meta jsonb;
  services jsonb := '[]'::jsonb;
  company_enabled boolean;
  user_enabled boolean;
  access_note text;
  launch_url text;
  extra_enabled boolean;
begin
  if me is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into p from public.profiles where user_id = me order by is_active desc, id limit 1;
  if not found then return jsonb_build_object('account', null, 'services', services); end if;
  select * into c from public.companies where id = p.company_id;
  for a in
    select ac.*, caa.is_enabled as company_access_enabled
    from public.app_catalog ac
    left join public.company_app_access caa on caa.app_code = ac.code and caa.company_id = p.company_id
    where ac.is_active is true
    order by ac.sort_order nulls last, ac.name
  loop
    meta := to_jsonb(a);
    company_enabled := coalesce(a.company_access_enabled, false) and coalesce(c.status = 'active', false);
    user_enabled := null;
    launch_url := null;
    access_note := 'Additional permissions are checked in the service.';
    if not company_enabled then
      user_enabled := false; access_note := 'This service is not enabled for your company.';
    elsif p.is_active is not true then
      user_enabled := false; access_note := 'Your user profile is inactive.';
    elsif lower(a.code) = 'chat' then
      if to_regprocedure('public.gt_can_chat(uuid,text)') is not null then
        execute 'select public.gt_can_chat($1, $2)' into user_enabled using p.company_id, 'view';
        access_note := case when user_enabled then 'Your chat membership allows access.' else 'Chat access has not been assigned to your user.' end;
        if user_enabled then launch_url := 'https://chat.georgetech.uk'; end if;
      end if;
    elsif lower(a.code || ' ' || a.name) like '%sms%' then
      if to_regclass('public.sms_user_permissions') is not null then
        execute 'select sms_enabled from public.sms_user_permissions where user_id = $1 and company_id = $2 limit 1'
          into extra_enabled using me, p.company_id;
        user_enabled := coalesce(extra_enabled, false);
        access_note := case when user_enabled then 'SMS access is enabled for your user.' else 'SMS access has not been enabled for your user.' end;
      end if;
    elsif lower(a.code || ' ' || a.name) like '%extractor%' then
      if to_regclass('public.chrome_extension_company_permissions') is not null then
        execute 'select login_enabled from public.chrome_extension_company_permissions where company_id = $1 limit 1'
          into extra_enabled using p.company_id;
        user_enabled := coalesce(extra_enabled, false);
        access_note := case when user_enabled then 'Extension sign-in is enabled. Individual site permissions still apply.' else 'Extension sign-in is disabled for your company.' end;
      end if;
    end if;
    if user_enabled is true then
      launch_url := coalesce(launch_url, nullif(meta ->> 'launch_url', ''), nullif(meta ->> 'app_url', ''));
    end if;
    services := services || jsonb_build_array(jsonb_build_object(
      'code', a.code, 'name', a.name, 'description', coalesce(meta ->> 'description', ''),
      'company_enabled', company_enabled, 'user_enabled', user_enabled,
      'access_note', access_note, 'launch_url', launch_url
    ));
  end loop;
  return jsonb_build_object('account', jsonb_build_object(
    'full_name', p.full_name, 'phone', to_jsonb(p) ->> 'phone',
    'company_id', p.company_id, 'company_name', c.name, 'company_status', c.status,
    'primary_role', p.primary_role, 'is_active', p.is_active
  ), 'services', services);
end;
$$;
revoke all on function public.get_my_client_portal_v1() from public, anon;
grant execute on function public.get_my_client_portal_v1() to authenticated;

-- Only personal contact details can be edited; identity, email, company, role
-- and permissions are deliberately absent from the arguments and update.
create or replace function public.update_my_client_details_v1(p_full_name text, p_phone text)
returns void language plpgsql security definer set search_path = '' as $$
declare profile_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if length(btrim(coalesce(p_full_name, ''))) not between 1 and 120 then
    raise exception 'Please enter a name of 1 to 120 characters';
  end if;
  if length(coalesce(p_phone, '')) > 40 then raise exception 'Phone number is too long'; end if;
  select id into profile_id from public.profiles where user_id = auth.uid() order by is_active desc, id limit 1;
  if profile_id is null then raise exception 'No linked profile was found' using errcode = '42501'; end if;
  update public.profiles set full_name = btrim(p_full_name), phone = nullif(btrim(p_phone), '')
    where id = profile_id and user_id = auth.uid();
end;
$$;
revoke all on function public.update_my_client_details_v1(text,text) from public, anon;
grant execute on function public.update_my_client_details_v1(text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
