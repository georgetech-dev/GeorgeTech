# GeorgeTech company billing — sandbox integration handoff

28 October 2026. The website ZIP includes a Payments tab, a company billing client and mobile navigation. No PayPal credentials, backend migrations or payment functions have been deployed. The Payments tab handles an absent backend without showing invented balances or a usable checkout. Do not interpret the preview data as actual customer billing.

## First task for Admin Station Codex: inspect and report

Work against the current Admin Station source and the existing Supabase project `lgchqleltppfdgtpgsbj`. Inspect before making database or permission changes. Do not start a general redesign, create another Supabase project, deploy, rename services or alter existing company/user permissions during this audit.

Report: company/customer profile screens and route paths; membership/role tables and the exact GeorgeTech staff authorization check; current company identifiers and multi-company behaviour; existing billing/invoice/payment/subscription tables, RPCs, Edge Functions, integrations and storage; SQL grants/RLS; any PayPal integration; secret/deployment mechanism (names and presence only, no values); recommended smallest additive implementation and affected files. Check the actual database schema as well as local migration files, if connected. State what could not be inspected. Never infer that every customer's company admin is GeorgeTech staff.

Return a compact proposed plan and the read-model/API compatibility below before deployment. Backend work is blocked on this audit and sandbox configuration; front-end mobile fixes are independent.

## Business model

GeorgeTech is the merchant, each existing company is the customer. This is not a marketplace or payments to arbitrary customer PayPal accounts. Create a company customer profile and an account sheet in Admin Station. Allow staff to draft, edit before issue, issue, cancel, and record one-off charges; schedule future charges; create subscription invitations; view transactions, failures, refunds and an audit trail. Issuing to the portal and sending an external email are separate explicit actions. No automatic external email sending in this phase.

Customer Payments contains Payments due (including overdue), Coming up (future one-off charges), Subscriptions, and Payment history. Subscription renewals belong under Subscriptions, not duplicated in Coming up. Keep the account sheet as a financial record with references back to the source service or invoice; do not assume it replaces an accounting package.

Default currency: GBP. Store money as integer minor units; date/time in UTC with business due-date rules in Europe/London. Totals must never sum currencies or sandbox/live records together. Draft charges are private to staff; issued records are visible only to authorized billing users of the owning company. Do not expose company billing to every office, engineer or customer user by default. Audit existing capabilities, then propose an explicit company billing role/capability. Do not silently add privileges to existing roles.

Proposed entities (adapt to existing tables, do not duplicate them): billing customers referencing existing companies; issued charges with due date, visibility/issue time and status; subscription offers/agreements with product/plan IDs, agreed price, interval and next billing date; provider checkout attempts; provider transactions/captures/refunds; deduplicated verified webhook inbox; append-only billing audit events. Put sandbox/live environment on every provider entity and enforce unique provider IDs within environment. Enforce foreign keys, immutable issued amounts and references or explicit versioning, nonnegative amounts, and company ownership on every association.

## Website read contract (version 1)

Authenticated RPC: `public.get_my_company_billing_v1()` with no client-supplied company ID. Derive active membership and selected company on the server, verify billing permission, and scope every query. If existing membership supports multiple companies, report the selection mechanism before implementing this zero-argument contract. On success return:

```json
{
  "environment": "sandbox",
  "company": {"id": "existing-company-uuid", "name": "Company name"},
  "can_view": true,
  "can_pay": true,
  "checkout_available": true,
  "charges": [{
    "id": "charge-uuid", "reference": "GT-P-0001", "title": "Website setup",
    "description": "Agreed one-off setup payment", "amount_minor": 12500,
    "currency": "GBP", "due_at": "2026-11-01T12:00:00Z",
    "status": "due", "bucket": "due", "can_checkout": true
  }],
  "subscriptions": [{
    "id": "subscription-uuid", "title": "Website care", "reference": "GT-S-0001",
    "description": "Monthly website care", "amount_minor": 2500, "currency": "GBP",
    "interval_label": "Every month", "next_payment_at": null,
    "status": "pending_approval", "can_checkout": true
  }]
}
```

No access: return `{"can_view":false}` or permission error without financial rows. No credentials or raw provider payloads in this response. The frontend has no direct table access.

Charge buckets computed server-side: `due`, `upcoming`, `history`. Charge statuses accepted: `scheduled`, `due`, `overdue`, `processing`, `paid`, `cancelled`, `partially_refunded`, `refunded`, `failed`, `reversed`. Subscription statuses: `pending_approval`, `active`, `suspended`, `cancelled`, `expired`, `failed`. Map PayPal provider statuses explicitly. Due/overdue must represent unpaid balances, not the original invoice amount after a partial refund. If supporting partial payments, agree additional UI fields before implementing; version 1 assumes one full capture per charge and shows refunds in history. Include processing records in the appropriate visible bucket without a checkout button. Return bounded arrays with pagination planned for history; do not silently return an incomplete overdue list.

Use RLS and explicit GRANT/REVOKE. The authenticated role must never be able to update amounts, company ownership, provider IDs or paid flags. If a security-definer read function is needed, use an empty search_path, explicit schema qualification and authorization inside the function. Revoke PUBLIC/anon execute; grant only the required authenticated RPC execution. Keep staff write operations behind the verified GeorgeTech authorization check.

## Checkout contract

Authenticated Edge Function `billing-checkout`, body:

```json
{"kind":"charge", "record_id":"charge-uuid"}
```

or `kind:"subscription"`. The server must re-check user, company, record state, billing permission, environment and the immutable amount. Never accept an amount, currency, plan ID, company ID, provider order ID or arbitrary return URL from the browser. Return:

```json
{"environment":"sandbox", "approval_url":"https://www.sandbox.paypal.com/..."}
```

This frontend release enables sandbox checkout only; live requires an explicit code/config rollout after approval. The URL validator only permits HTTPS `www.sandbox.paypal.com` for sandbox or `www.paypal.com` for live. One-off uses Orders v2 with server-side creation and capture. Subscription uses PayPal Products/Plans/Subscriptions; approval is not a completed charge. Show the agreed interval, price and start date before approval. Do not charge a subscription before the customer approves it.

Redirect return/cancel endpoints must use server-issued expiring opaque state tied to user/company/environment and a checkout attempt; reject replay, mismatched order/subscription and tampered state. Keep return URLs on a server allowlist. For a charge, server verifies and captures the approved order idempotently, verifies merchant, currency, amount, reference and final capture status, then redirects to `support-tickets.html?billing_return=approved#payments`. Cancellation returns `billing_return=cancelled`. Browser query strings are display hints only: the page reloads server-confirmed records and never marks a record paid. If redirect capture is interrupted, reconcile through verified events and a server job. Protect return endpoints from arbitrary captures and do not put session access tokens into URLs.

Use stable idempotency keys per payment attempt, reuse retries, and serialize/constrain simultaneous checkout attempts so double-clicks and two staff/browser sessions cannot create duplicate captures. A network timeout must remain pending until reconciled; do not create a fresh charge to recover it.

## Webhooks and reconciliation

Use a server-only PayPal webhook endpoint. Verify signatures using the configured environment and webhook ID before any financial mutation. Enforce unique event IDs; process duplicates safely and tolerate out-of-order events. Subscribe to the correct Orders capture, refund/reversal and subscription lifecycle/payment events for the APIs actually chosen; check PayPal's current event list. Retrieve provider resources server-side as needed. Validate merchant, company reference, amount, currency and environment before applying changes. Do not let an older event overwrite a later terminal state. Persist processing failures for retry and reconcile pending attempts against PayPal so lost browser returns or delayed/missed webhooks do not lose payments. Log event IDs/statuses, not access tokens or payer credentials.

## Sandbox setup after audit

Server secrets required: `PAYPAL_ENV=sandbox`, sandbox client ID, sandbox client secret and the webhook ID for that sandbox app; the project service/secret key remains server-only. Use separate sandbox merchant and buyer accounts. Report secret names and whether configured, never values. No credentials belong in the static website ZIP. PayPal sandbox balances/test buyers are separate from real money. Switching live requires explicit intent, separate credentials/webhook/plan/order records and a completed sandbox checklist.

Test: no company; inactive member; member without billing permission; company A attempting company B IDs; view-only user attempting checkout; edited amount/plan from client; one-off scheduled/due/overdue; completed, declined and pending capture; abandoned checkout; interrupted return; duplicate/tampered/out-of-order webhook; invalid signature; refund/reversal; subscription approval, renewal, failed renewal, suspension and cancellation; two simultaneous checkout requests; mixed environments; expired auth and state. The account sheet must reconcile with provider captures/refunds, not merely browser success screens.

## Website files already prepared

`support-tickets.html`, `assets/js/client-billing.js`, `assets/js/portal-navigation.js`, `assets/js/support-portal.js`, `assets/css/client-portal.css`. Account, Services and Appointments are peer navigation buttons, alongside Tickets, Payments and Help. All six are visible on desktop. On mobile the shared bar opens with two rows then slides down to one after four seconds unless interacted with. Its handle expands/collapses the whole sheet, including by swiping; further grid rows can be added later. The top bar greets the user by first name, without displaying their full email. Existing ticket data, account permissions and service checks remain in place. No live payment records are fabricated.

## Primary references

- https://developer.paypal.com/studio/checkout/standard/integrate
- https://developer.paypal.com/subscriptions/integrate
- https://developer.paypal.com/security-guidelines
- https://developer.paypal.com/api/rest/webhooks/event-names/
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/
