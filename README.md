# GeorgeTech website

Public website and support portal for `georgetech.uk`.

## Main pages

- `index.html` — homepage
- `services.html` — service areas
- `about.html` — GeorgeTech background and approach
- `contact.html` — enquiry and support routes
- `privacy.html` — general privacy notice
- `accessibility.html` — accessibility statement
- `terms.html` — website terms
- `support.html` and `support-tickets.html` — existing Supabase support portal
- `privacy/` — direct-link product-specific privacy notices

## Contact form

The public callback form on `contact.html` stores new enquiries in the
`public.contact_requests` Supabase table. Apply the included migrations before
publishing the updated site. Public visitors can submit a request but cannot
read, change or delete enquiries.

## Local preview

Run a local web server from this folder, for example:

```text
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Important

- Do not commit secrets or local `.env` files.
- Supabase CLI state in `supabase/.temp/` is intentionally ignored.
