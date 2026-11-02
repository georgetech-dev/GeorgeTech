# Client Support update — 26 October 2026

## Install

1. In the existing Supabase project's SQL Editor, run the complete contents of:
   `supabase/migrations/20261026010000_client_support_account_and_services.sql`
2. Upload the website files to the current GeorgeTech website root. Keep the
   `assets/js/` and `assets/css/` directory structure. No new Supabase project,
   Edge Function or secrets are needed for this update.
3. Reload the website, sign in through `support.html`, and open My account and
   Services. Check the user's existing company and role against Admin Station.
4. Check that Authentication → URL Configuration still permits
   `https://georgetech.uk/password-reset.html` (and the www equivalent if used).
   These are the existing password reset destinations, so an already working
   configuration does not need changing.

The SQL only adds two authenticated, self-scoped functions. It does not change
existing roles, company assignments, application grants, RLS policies or ticket
helpers. The only profile changes the new account form can save are the current
user's name and phone number. The migration has not been applied to the live
project as part of this file update.

## Tabs

- Support tickets: existing list, filters, conversations, uploads and new requests.
- My account: personal details, sign-in email, company name and ID, role, user
  status, company status, and a password change email.
- Services: the existing app catalogue, company access, and verified user-specific
  checks for Chat, SMS and Extractor sign-in where those modules are installed.
  Other application-specific permissions are explicitly marked “Checked in
  service”; the portal does not invent access or bypass the application's checks.
- Appointments: video appointments marked Coming soon.
- Help: help articles marked Coming soon, with a route to raise a support request.

No new appointments database or booking engine is included. Service enquiries
open the existing support request form with the product and subject prefilled.
The Chat launch link is shown only when the existing Chat permission function
confirms access. Other verified services can use existing app_catalog.launch_url
or app_url fields where present; the migration does not add or require these
columns. Only HTTPS launch links are rendered.

## Password recovery

The reset page matches the current GeorgeTech design. It supports existing
recovery token links, token-hash recovery links and PKCE codes, checks the user
with Supabase, removes recovery credentials from the address bar and handles
expired links. It can request a fresh email. Existing OrchardOps source branding
is recognised. GeorgeTech and webmail passwords remain separate.

A password change is initiated with an email link from My account. No passwords
are saved in the website source or sent through support tickets. The live chat
widget is excluded from the reset page. Password policy requirements are retained
from the existing page: 8 characters, an uppercase letter, a number and a symbol.

## Validation

Desktop and 390px/320px layouts and tab behaviour were reviewed with isolated
preview data, including account saves, service enquiries, keyboard navigation,
browser back and ticket conversations. Recovery logic checks cover all three
link formats, invalid/expired links, server user validation, same-tab refresh,
marker expiry, user mismatch and unavailable browser storage. JavaScript syntax,
local links, unique IDs, tab relationships and package integrity were checked.

Preview fixtures and mock accounts are not included in the deliverable. Live
password emails, live password changes and the new SQL functions still need a
check after deployment to the existing Supabase project.

Changed or added files:

- support.html
- support-tickets.html
- password-reset.html
- assets/css/client-portal.css
- assets/js/support-portal.js
- assets/js/client-account.js
- assets/js/password-reset.js
- assets/js/password-recovery.js
- assets/js/site.js
- supabase/migrations/20261026010000_client_support_account_and_services.sql
- README.md
- CLIENT_SUPPORT_UPDATE.md

Reference: https://supabase.com/docs/guides/auth/passwords
