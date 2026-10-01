-- Support portal helpers and notification outbox.
--
-- This migration supports the customer-facing support centre without requiring
-- the static page to know private profile/app_catalog implementation details.

create or replace function public.get_my_support_profile()
returns table (
  full_name text,
  display_name text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row jsonb;
begin
  select to_jsonb(p)
    into profile_row
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;

  return query
  select
    coalesce(
      profile_row ->> 'full_name',
      nullif(concat_ws(' ', profile_row ->> 'first_name', profile_row ->> 'last_name'), ''),
      profile_row ->> 'name'
    )::text as full_name,
    coalesce(
      profile_row ->> 'display_name',
      profile_row ->> 'full_name',
      nullif(concat_ws(' ', profile_row ->> 'first_name', profile_row ->> 'last_name'), ''),
      profile_row ->> 'name'
    )::text as display_name,
    coalesce(profile_row ->> 'email', auth.jwt() ->> 'email')::text as email;
end;
$$;

grant execute on function public.get_my_support_profile() to authenticated;

create or replace function public.get_support_products()
returns table (
  code text,
  name text
)
language sql
security definer
set search_path = public
as $$
  select
    ac.code::text,
    ac.name::text
  from public.app_catalog ac
  where ac.is_active = true
  order by ac.sort_order nulls last, ac.name;
$$;

grant execute on function public.get_support_products() to authenticated;

create table if not exists public.support_notification_queue (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  comment_id uuid null references public.support_ticket_comments(id) on delete cascade,
  notification_type text not null check (notification_type in (
    'ticket_created_customer',
    'ticket_created_admin',
    'comment_created_customer',
    'comment_created_admin'
  )),
  recipient_role text not null check (recipient_role in ('customer', 'admin')),
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  last_error text null,
  created_at timestamptz not null default now(),
  processed_at timestamptz null
);

create index if not exists support_notification_queue_status_idx
  on public.support_notification_queue (status, created_at);

alter table public.support_notification_queue enable row level security;

-- Deliberately no authenticated read/write policy. This queue is for a trusted
-- admin console, Edge Function, or service-role email worker.

create or replace function public.queue_support_ticket_created_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_email text := coalesce(nullif(current_setting('app.support_admin_email', true), ''), 'support@georgetech.uk');
begin
  insert into public.support_notification_queue (
    ticket_id,
    notification_type,
    recipient_role,
    recipient_email,
    subject,
    body
  ) values
  (
    new.id,
    'ticket_created_customer',
    'customer',
    new.requester_email,
    'Support request received: ' || new.ticket_number,
    'Hi ' || new.requester_name || E',\n\nWe have received your support request "' || new.subject || '".' ||
      E'\n\nTicket reference: ' || new.ticket_number ||
      E'\nStatus: ' || replace(new.status, '_', ' ') ||
      E'\n\nYou can view updates in the GeorgeTech Support Centre.'
  ),
  (
    new.id,
    'ticket_created_admin',
    'admin',
    admin_email,
    'New support ticket: ' || new.ticket_number || ' - ' || new.subject,
    'A new support ticket has been submitted.' ||
      E'\n\nTicket: ' || new.ticket_number ||
      E'\nRequester: ' || new.requester_name || ' <' || new.requester_email || '>' ||
      E'\nProduct: ' || new.product ||
      E'\nCategory: ' || new.category ||
      E'\n\n' || new.description
  );

  return new;
end;
$$;

drop trigger if exists queue_support_ticket_created_notifications on public.support_tickets;
create trigger queue_support_ticket_created_notifications
after insert on public.support_tickets
for each row execute function public.queue_support_ticket_created_notifications();

create or replace function public.queue_support_comment_created_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_ticket public.support_tickets%rowtype;
  admin_email text := coalesce(nullif(current_setting('app.support_admin_email', true), ''), 'support@georgetech.uk');
begin
  select *
    into target_ticket
  from public.support_tickets
  where id = new.ticket_id;

  if not found then
    return new;
  end if;

  if new.author_type = 'staff' then
    insert into public.support_notification_queue (
      ticket_id,
      comment_id,
      notification_type,
      recipient_role,
      recipient_email,
      subject,
      body
    ) values (
      target_ticket.id,
      new.id,
      'comment_created_customer',
      'customer',
      target_ticket.requester_email,
      'Update on support ticket ' || target_ticket.ticket_number,
      'GeorgeTech has added an update to your support request "' || target_ticket.subject || '".' ||
        E'\n\n' || new.body ||
        E'\n\nView the full conversation in the GeorgeTech Support Centre.'
    );
  else
    insert into public.support_notification_queue (
      ticket_id,
      comment_id,
      notification_type,
      recipient_role,
      recipient_email,
      subject,
      body
    ) values (
      target_ticket.id,
      new.id,
      'comment_created_admin',
      'admin',
      admin_email,
      'Customer replied to ' || target_ticket.ticket_number,
      target_ticket.requester_name || ' replied to "' || target_ticket.subject || '".' ||
        E'\n\n' || new.body
    );
  end if;

  return new;
end;
$$;

drop trigger if exists queue_support_comment_created_notifications on public.support_ticket_comments;
create trigger queue_support_comment_created_notifications
after insert on public.support_ticket_comments
for each row execute function public.queue_support_comment_created_notifications();

notify pgrst, 'reload schema';
