-- Fix SMS login permission visibility.
--
-- Users must be able to read their own sms_user_permissions row during login,
-- otherwise the portal/gateway cannot discover whether access is enabled.

drop policy if exists "sms_user_permissions_select_own_company" on public.sms_user_permissions;
create policy "sms_user_permissions_select_own_company"
on public.sms_user_permissions
for select
to authenticated
using (
  user_id = auth.uid()
  or company_id in (select public.sms_accessible_company_ids())
);
