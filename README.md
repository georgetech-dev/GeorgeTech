# GeorgeTech website

Public website and support portal for `georgetech.uk`.

## Main pages

- `index.html` — homepage
- `services.html` — service areas
- `business-websites.html` — business website service details
- `bookings-customer-access.html` — booking and customer portal service details
- `dashboards-business-systems.html` — dashboards, CRM and operational systems
- `automation-integrations.html` — workflow automation and integrations
- `app-setup.html` — business app setup and rollout
- `about.html` — GeorgeTech background and approach
- `contact.html` — enquiry and support routes
- `privacy.html` — general privacy notice
- `accessibility.html` — accessibility statement
- `terms.html` — website terms
- `support.html` and `support-tickets.html` — existing Supabase support portal
- `privacy/` — direct-link product-specific privacy notices

## Contact form

The public callback form on `contact.html` sends enquiries to the
`contact-intake` Supabase Edge Function. The function validates Cloudflare
Turnstile on the server before writing to `public.contact_requests`. Direct
browser inserts are removed by the latest migration so the security check
cannot be bypassed.

Before publishing the updated contact form:

1. Store the existing Turnstile widget secret in Supabase as
   `TURNSTILE_SECRET`. Never add the secret to this repository.
2. Deploy `supabase/functions/contact-intake` with JWT verification disabled as
   configured in `supabase/config.toml`.
3. Apply `20261018010000_route_contact_requests_through_edge_function.sql`
   after confirming the function responds correctly. This removes the old
   anonymous database insert route.

The function accepts requests only from `https://georgetech.uk` and
`https://www.georgetech.uk`, and requires Turnstile action `contact` from one
of those hostnames.

## Local preview

Run a local web server from this folder, for example:

```text
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Important

- Do not commit secrets or local `.env` files.
- Supabase CLI state in `supabase/.temp/` is intentionally ignored.
