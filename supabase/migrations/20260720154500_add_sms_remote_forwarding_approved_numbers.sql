-- Approved inbound sender numbers for remote SMS forwarding commands.

alter table public.sms_company_settings
add column if not exists remote_forwarding_enabled boolean not null default false;

alter table public.sms_company_settings
add column if not exists remote_forwarding_approved_numbers text[] not null default '{}';

alter table public.sms_company_settings
add column if not exists remote_forwarding_denied_message text not null default 'You do not have permission to forward messages from the portal. Please submit a ticket to georgetech.uk/support';

alter table public.sms_company_settings
drop constraint if exists sms_company_settings_remote_denied_message_len;

alter table public.sms_company_settings
add constraint sms_company_settings_remote_denied_message_len
check (char_length(remote_forwarding_denied_message) between 1 and 500);

notify pgrst, 'reload schema';
