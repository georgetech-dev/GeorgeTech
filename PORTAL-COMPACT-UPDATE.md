# Client Support compact update — 2 November 2026

Publish these website files through the existing repository.

The main portal is now support-centre.html. The previous support-tickets.html remains as a redirect that preserves query parameters and the selected tab, so existing appointment/payment return links continue to work.

This update reduces the logo/header height, removes repeated visible panel headings, tightens panel spacing, replaces forward arrows with the supplied open icon, adds rotating refresh feedback, and adds unread-ticket counts/badges and an unread-only view. Read markers follow the existing browser-local ticket behaviour. The mobile dock opens as two compact rows on its first visit, slides to one row, and can be minimised to just Show more with Hide or a downward swipe. Panel changes return it to one row.

The signed-out public chat widget remains enabled. It hides while the mobile menu is open and when a saved signed-in client session is present. Signed-in support chat remains inside the portal.

Payments use None instead of a dash when no count is available, with the detailed Payments view explaining unavailable/restricted access. A successful empty response shows 0. This display change does not activate PayPal or change the billing contract.

Branded appointment confirmation/reminder emails and optional future appointment scheduling are supplied in the separate appointment-email package. Publishing these website files does not activate email sending. Keep the previously supplied service-status controls as well.
