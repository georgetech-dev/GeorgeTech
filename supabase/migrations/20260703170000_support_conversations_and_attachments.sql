-- Customer-visible support conversation, private screenshot storage, and safe close action.

create table public.support_ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_type text not null check (author_type in ('customer', 'staff')),
  author_name text not null check (char_length(author_name) between 1 and 120),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index support_ticket_comments_timeline_idx
  on public.support_ticket_comments (ticket_id, created_at);

alter table public.support_ticket_comments enable row level security;

create policy "Customers can view comments on their tickets"
on public.support_ticket_comments
for select to authenticated
using (
  exists (
    select 1 from public.support_tickets ticket
    where ticket.id = ticket_id and ticket.user_id = (select auth.uid())
  )
);

create policy "Customers can comment on their open tickets"
on public.support_ticket_comments
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and author_type = 'customer'
  and exists (
    select 1 from public.support_tickets ticket
    where ticket.id = ticket_id
      and ticket.user_id = (select auth.uid())
      and ticket.status <> 'closed'
  )
);

grant select, insert on public.support_ticket_comments to authenticated;

create table public.support_ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  comment_id uuid references public.support_ticket_comments(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  file_size integer not null check (file_size > 0 and file_size <= 5242880),
  created_at timestamptz not null default now()
);

create index support_ticket_attachments_ticket_idx
  on public.support_ticket_attachments (ticket_id, created_at);

alter table public.support_ticket_attachments enable row level security;

create policy "Customers can view attachments on their tickets"
on public.support_ticket_attachments
for select to authenticated
using (
  exists (
    select 1 from public.support_tickets ticket
    where ticket.id = ticket_id and ticket.user_id = (select auth.uid())
  )
);

create policy "Customers can attach screenshots to their tickets"
on public.support_ticket_attachments
for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and split_part(storage_path, '/', 1) = (select auth.uid())::text
  and exists (
    select 1 from public.support_tickets ticket
    where ticket.id = ticket_id
      and ticket.user_id = (select auth.uid())
      and ticket.status <> 'closed'
  )
);

grant select, insert on public.support_ticket_attachments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Customers can upload their own support screenshots"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'support-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.support_tickets ticket
    where ticket.id::text = (storage.foldername(name))[2]
      and ticket.user_id = (select auth.uid())
      and ticket.status <> 'closed'
  )
);

create policy "Customers can view their own support screenshots"
on storage.objects
for select to authenticated
using (
  bucket_id = 'support-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.close_own_support_ticket(target_ticket_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  update public.support_tickets
  set status = 'closed'
  where id = target_ticket_id
    and user_id = auth.uid()
    and status <> 'closed';

  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;

revoke all on function public.close_own_support_ticket(uuid) from public;
grant execute on function public.close_own_support_ticket(uuid) to authenticated;
