# GeorgeTech support workflow

The public support page requires an existing GeorgeTech Supabase account. Signed-in users can create tickets and can only read their own tickets. They cannot change queue state, priority, assignment, internal notes, or resolution data.

## Ticket lifecycle

1. `new` — newly submitted and awaiting review.
2. `in_progress` — accepted by a team member; set `assigned_to` and `priority`.
3. `waiting_on_customer` — more information is needed from the requester.
4. `resolved` — a resolution has been supplied; the database records `resolved_at`.
5. `closed` — no more action is expected; the database records `closed_at`.

The admin console should access tickets through trusted server-side code using the Supabase service role. Never expose the service-role key in browser code. Queue views should normally order by priority and then `created_at`, oldest first. Admin actions should update `status`, `priority`, `assigned_to`, `internal_notes`, and `resolution` as appropriate.

## Customer conversations and screenshots

Customer-visible replies are stored in `support_ticket_comments`; staff replies should use `author_type = 'staff'` and a helpful `author_name`. Keep private operational information in `support_tickets.internal_notes`, never in a public comment.

Screenshot metadata is stored in `support_ticket_attachments`, while the files live in the private `support-attachments` Storage bucket. When staff upload an attachment, its path must use `{customer_user_id}/{ticket_id}/{unique_file_name}` so the customer can receive a signed preview URL.

Customers can add comments and screenshots while a ticket is open. They can close their own ticket through the restricted `close_own_support_ticket` database function. Closing disables further customer comments and uploads.

## Setup

Run `supabase/migrations/20260703160000_create_support_tickets.sql` against the GeorgeTech Supabase project before using the form. Ensure the site URL and `/password-reset.html` redirect URL are allowed in Supabase Authentication URL Configuration.
