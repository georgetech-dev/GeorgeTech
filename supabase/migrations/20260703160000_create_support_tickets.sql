-- GeorgeTech support ticket queue.
-- Run this migration in the Supabase SQL editor or through the Supabase CLI.

create sequence if not exists public.support_ticket_number_seq start 1001;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default
    ('GT-' || lpad(nextval('public.support_ticket_number_seq')::text, 6, '0')),
  user_id uuid not null references auth.users(id) on delete restrict,
  requester_name text not null check (char_length(requester_name) between 1 and 120),
  requester_email text not null,
  product text not null check (char_length(product) between 1 and 100),
  category text not null check (category in (
    'Technical issue',
    'Account or login',
    'Feature request',
    'Billing',
    'Privacy or data',
    'Other'
  )),
  subject text not null check (char_length(subject) between 1 and 120),
  description text not null check (char_length(description) between 1 and 10000),
  status text not null default 'new' check (status in (
    'new',
    'in_progress',
    'waiting_on_customer',
    'resolved',
    'closed'
  )),
  priority text not null default 'normal' check (priority in (
    'low',
    'normal',
    'high',
    'urgent'
  )),
  assigned_to uuid references auth.users(id) on delete set null,
  internal_notes text,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz
);

create index if not exists support_tickets_user_created_idx
  on public.support_tickets (user_id, created_at desc);

create index if not exists support_tickets_queue_idx
  on public.support_tickets (status, priority, created_at);

create or replace function public.set_support_ticket_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();

  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at = now();
  end if;

  if new.status = 'closed' and old.status is distinct from 'closed' then
    new.closed_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_support_ticket_updated_at on public.support_tickets;
create trigger set_support_ticket_updated_at
before update on public.support_tickets
for each row execute function public.set_support_ticket_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists "Users can create their own tickets" on public.support_tickets;
create policy "Users can create their own tickets"
on public.support_tickets
for insert
to authenticated
with check (
  auth.uid() = user_id
  and requester_email = (auth.jwt() ->> 'email')
);

drop policy if exists "Users can view their own tickets" on public.support_tickets;
create policy "Users can view their own tickets"
on public.support_tickets
for select
to authenticated
using (auth.uid() = user_id);

-- Intentionally no authenticated UPDATE or DELETE policy.
-- The future admin console should use a trusted server-side client/service role.
-- Recommended queue: new -> in_progress -> waiting_on_customer -> resolved -> closed.

grant select, insert on public.support_tickets to authenticated;
grant usage, select on sequence public.support_ticket_number_seq to authenticated;

