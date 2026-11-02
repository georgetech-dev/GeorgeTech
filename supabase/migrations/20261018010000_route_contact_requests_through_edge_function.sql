-- Contact requests are now accepted only by the contact-intake Edge Function,
-- which validates Cloudflare Turnstile before writing with the service role.

drop policy if exists "Public can submit contact requests" on public.contact_requests;
revoke insert on table public.contact_requests from anon, authenticated;
revoke usage, select on sequence public.contact_requests_id_seq from anon, authenticated;

comment on table public.contact_requests is
  'Contact requests validated by Cloudflare Turnstile and stored by the contact-intake Edge Function.';
