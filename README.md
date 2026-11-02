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
- `hello/` — mobile-first digital business card; use `?profile=stephan`
- `privacy/` — direct-link product-specific privacy notices

## Digital business card profiles

The public card is available at `https://georgetech.uk/hello/?profile=stephan`.
Profile details are stored in the allowlisted `profiles` object in
`hello/card.js`. Add another entry there before using a new `?profile=` value;
unknown or missing values safely fall back to Stephan.

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

## Homepage motion update — 26 October 2026

- The headline builds around WORK and settles into its final sentence.
- Software follows job before the rest of the second heading appears.
- Understand the work sorts its letters before the second line arrives.
- The six capability links have animated SVGs and the four principles have
  SVG illustrations. Typographic action arrows have been replaced by SVGs.
- Phone and email are shown together in the main navigation and hero.
- Stephan's digital card and its contact download use stephan@georgetech.uk.
- Primary buttons keep a stable gradient and fade a colour layer on hover.

Motion is contained in assets/css/home-motion.css and
assets/js/home-motion.js. Sequences run once when the centre of their heading or illustration reaches
the central 15% of the viewport (the opening headline starts on arrival); the three wording sequences have Replay controls. Browser reduced
motion preferences show the final wording immediately. Text also remains
readable with JavaScript unavailable, and active sequences settle on resize.

Upload the ZIP contents to the existing website root, keeping assets/ and hello/
in place. This update changes static website files; it does not require a new
Supabase migration or function deployment. Earlier contact-form deployment
requirements above still apply if they have not already been completed.


## Homepage motion refinement — 26 October 2026

- The hero uses a smooth circular orbit around WORK before settling (5.9 seconds).
- Software follows job along a longer curved path, then the sentence forms
  (7.3 seconds). It waits for the middle of the viewport before starting.
- The anagram is slower; measured horizontal and vertical construction guides
  introduce each word of “Then design the system”, then fade away.
- Each service row has a bespoke SVG illustration; capability links and service
  rows respond to hover, keyboard focus and presses without delaying navigation.
- Principle illustrations also wait for the viewport centre.
- Field knowledge is illustrated by field notes becoming an operational dashboard.
- A finite analogue-clock animation accompanies “Let’s save you time”, linking
  directly to contact.html#callback-form. No animation loops indefinitely.
- Reduced motion shows the finished layout immediately, with no wording motion.

Only index.html, assets/css/home-motion.css, assets/js/home-motion.js and this
README changed in this refinement. No backend changes are needed.

## Client Support tabs and password recovery — 26 October 2026

Client Support now includes Tickets, My account, Services, Appointments and Help.
The account and service details require the new self-scoped SQL functions.
**Read CLIENT_SUPPORT_UPDATE.md for the SQL migration and upload steps.**
Video appointments and the help centre are labelled Coming soon. The reset page
has the current site design and handles invalid links and fresh reset emails.
