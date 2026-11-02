-- Customers may read their own ticket-facing fields, but never staff-only notes.
revoke select on public.support_tickets from authenticated;

grant select (
  id,
  ticket_number,
  user_id,
  requester_name,
  requester_email,
  product,
  category,
  subject,
  description,
  status,
  priority,
  resolution,
  created_at,
  updated_at,
  resolved_at,
  closed_at
) on public.support_tickets to authenticated;

