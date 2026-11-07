// Presentation only. Provider-confirmed balances and permissions remain server-owned.
export const attentionStates = new Set(['payment_failed','needs_review','checkout_cancelled','reversed']);
export function displayState(item, kind = 'charge') {
  if (kind === 'subscription' && item.cancellation_requested_at && !item.cancellation_confirmed_at) return 'cancellation_pending';
  if (['paid','partially_refunded','refunded','reversed','cancelled'].includes(item.status)) return item.status;
  if (typeof item.display_state === 'string') return item.display_state;
  if (item.status === 'failed') return 'payment_failed';
  // Older servers cannot distinguish failure from uncertainty. Never invent a failed outcome.
  if (item.status === 'processing') return 'needs_review';
  return item.status;
}
export function stateText(state) {
  return ({payment_failed:'Payment unsuccessful',needs_review:'Payment needs checking',checkout_cancelled:'Checkout not completed',
    awaiting_confirmation:'Awaiting PayPal confirmation',pending_approval:'Awaiting your approval',cancellation_pending:'Cancellation requested',
    partially_refunded:'Partly refunded',paid:'Paid',due:'Due',overdue:'Overdue',scheduled:'Scheduled',active:'Active',suspended:'Paused',
    cancelled:'Cancelled',expired:'Ended',refunded:'Refunded',reversed:'Payment reversed'})[state] || 'Contact support';
}
export function stateNote(state) {
  return ({needs_review:'Payment is not confirmed. Please contact support before paying again.',
    payment_failed:'No completed payment is confirmed for this item. We can help you resolve it.',
    checkout_cancelled:'Checkout did not complete. Contact support if you believe you were charged.',
    awaiting_confirmation:'We are checking the result with PayPal. Please do not pay again.',
    cancellation_pending:'Your request is saved. Cancellation is complete only when PayPal confirms it.',
    reversed:'PayPal reported a reversal. Please contact support.'})[state] || '';
}
export function money(minor, currency = 'GBP') {
  const digits = new Intl.NumberFormat('en-GB',{style:'currency',currency}).resolvedOptions().maximumFractionDigits;
  return new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(minor / 10 ** digits);
}
const londonDate = value => {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const get = key => Number(parts.find(p => p.type === key)?.value);
  return new Date(Date.UTC(get('year'),get('month')-1,get('day'),12));
};
const monthKey = d => d.toISOString().slice(0,7);
function occurrence(anchor, unit, count, index) {
  if (unit === 'day' || unit === 'week') return new Date(anchor.getTime() + index*count*(unit==='week'?7:1)*86400000);
  const months = index*count*(unit==='year'?12:1);
  const d = new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+months,1,12));
  const last = new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(anchor.getUTCDate(),last)); return d;
}
export function projectCosts(data, now = new Date(), currency = 'GBP') {
  const today = londonDate(now), start = new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),1,12));
  const months = Array.from({length:6},(_,i) => {
    const d = new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+i,1,12));
    return {key:monthKey(d),label:new Intl.DateTimeFormat('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'}).format(d),oneOff:0,recurring:0};
  });
  const end = new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+6,1,12));
  const add = (date,minor,kind) => { const m = months.find(m => m.key === monthKey(date)); if (m) m[kind] += minor; };
  let unknownSchedules = 0;
  for (const c of data.charges || []) {
    if (c.currency!==currency || !['scheduled','due','overdue'].includes(c.status)) continue;
    const date = londonDate(c.due_at);
    if (date && date >= today && date < end) add(date,Number.isSafeInteger(c.outstanding_minor)?c.outstanding_minor:c.amount_minor,'oneOff');
  }
  for (const s of data.subscriptions || []) {
    if (s.currency!==currency || s.status!=='active' || s.cancellation_requested_at) continue;
    const anchor = s.next_payment_at ? londonDate(s.next_payment_at) : null;
    if (!anchor || anchor < today || !['day','week','month','year'].includes(s.interval_unit) || !Number.isSafeInteger(s.interval_count) || s.interval_count<1 || (s.provider_total_cycles>0&&!Number.isSafeInteger(s.remaining_cycles))) {unknownSchedules++;continue;}
    const limit = s.remaining_cycles == null ? 2000 : Math.min(s.remaining_cycles,2000);
    for (let i=0;i<limit;i++) {const date=occurrence(anchor,s.interval_unit,s.interval_count,i);if(date>=end)break;if(date>=today)add(date,s.amount_minor,'recurring');}
  }
  return {months,unknownSchedules,total:months.reduce((n,m)=>n+m.oneOff+m.recurring,0)};
}
export function billingSummary(data, currency = 'GBP') {
  let outstanding=0,attention=0;
  for(const c of data.charges||[]) {
    const state=displayState(c);
    if(attentionStates.has(state)) attention++;
    if(c.currency===currency && (c.bucket==='due'||(c.status==='failed'&&Date.parse(c.due_at)<=Date.now())) && !['paid','refunded','cancelled','partially_refunded'].includes(c.status))
      outstanding += Number.isSafeInteger(c.outstanding_minor)?c.outstanding_minor:c.amount_minor;
  }
  return {outstanding,attention,active:(data.subscriptions||[]).filter(s=>s.status==='active'&&!s.cancellation_requested_at).length};
}
