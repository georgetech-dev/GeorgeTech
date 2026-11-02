# Client Support update — 2 November 2026

Publish these website files through your existing website repository.

- Dashboard opens first, with actual open-ticket and due-payment counts.
- Chat is a navigation option. The floating launcher is suppressed for signed-in clients.
- Tickets use two steps: service/report type, then details/screenshots. Known contact details are supplied automatically.
- The mobile navigation briefly shows two rows on the first visit, then collapses to one row. Every panel change collapses it.
- Appointments have a simple empty state and compact cards.
- Daily uses the entire call area, with its own controls. Leaving shows the GeorgeTech logo and returns after five seconds; Return now is also available.
- The new service-status card uses staff notices with company/global audiences, expiry, optional expected fix and third-party details.

Service-status notices require the separate Admin Station service-status update and its single new database migration. Until activated, the card says “Service status unavailable”. Due-payment counts show “—” if billing is not installed or access is restricted; zero is only shown for a successful empty result.

The visual checks use mock data and mock video frames. No real Daily call or live billing payment was made. Existing billing contracts and sandbox restrictions are unchanged.
