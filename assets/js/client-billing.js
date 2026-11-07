import {displayState,stateText,stateNote,attentionStates,money,projectCosts,billingSummary} from './billing-account.js?v=20261107-account-1';
// Company data comes only from a self-scoped server read model. No client-side balances or paid flags are persisted.
export function paypalApprovalUrl(value,environment){
 try{const u=new URL(value);const host=environment==='sandbox'?'www.sandbox.paypal.com':environment==='live'?'www.paypal.com':null;
 return host&&u.protocol==='https:'&&u.hostname===host&&!u.port&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
export async function checkoutErrorMessage(error,data){
 let payload=data;
 if(!payload?.error&&error?.context){try{const response=typeof error.context.clone==='function'?error.context.clone():error.context;payload=await response.json();}catch{}}
 if(typeof payload?.error==='string'&&payload.error.trim())return payload.error.trim().slice(0,400);
 const status=Number(error?.context?.status);
 return Number.isInteger(status)&&status>=400?`Checkout was rejected (HTTP ${status}). The server returned no readable error details. Please contact GeorgeTech.`:'We could not reach checkout. Please refresh and try again.';
}
const supportedEnvironment=value=>value==='sandbox'||value==='live';
const chargeStatuses=['scheduled','due','overdue','processing','paid','cancelled','partially_refunded','refunded','failed','reversed'];
const subscriptionStatuses=['pending_approval','active','suspended','cancelled','expired','failed'];
export function billingReturnMessage(value){
 if(value==='confirmed')return'PayPal has confirmed this payment. The records below show the provider-confirmed result.';
 if(value==='failed')return'PayPal did not confirm this payment. No completed payment has been recorded.';
 if(value==='cancelled')return'PayPal checkout was cancelled. Your outstanding items are shown below.';
 if(value==='pending'||value==='approved')return'You have returned from PayPal. Confirmation is still pending; no payment is shown as complete until PayPal confirms it.';
 return'';
}
export function validateBilling(data){
 if(!data||typeof data!=='object'||typeof data.can_view!=='boolean')throw new Error('Invalid billing response');
 if(!data.can_view)return data;
 if(!['sandbox','live'].includes(data.environment)||!data.company?.id||typeof data.company.name!=='string'||typeof data.can_pay!=='boolean'||typeof data.checkout_available!=='boolean'||!Array.isArray(data.charges)||!Array.isArray(data.subscriptions))throw new Error('Invalid billing response');
 const amount=item=>typeof item.id==='string'&&typeof item.title==='string'&&typeof item.currency==='string'&&/^[A-Z]{3}$/.test(item.currency)&&Number.isSafeInteger(item.amount_minor)&&item.amount_minor>=0;
 if(!data.charges.every(item=>amount(item)&&['due','upcoming','history'].includes(item.bucket)&&chargeStatuses.includes(item.status))||!data.subscriptions.every(item=>amount(item)&&subscriptionStatuses.includes(item.status)))throw new Error('Invalid billing records');
 if(data.transactions!==undefined&&(!Array.isArray(data.transactions)||!data.transactions.every(t=>typeof t.id==='string'&&typeof t.provider_transaction_id==='string'&&typeof t.title==='string'&&typeof t.currency==='string'&&/^[A-Z]{3}$/.test(t.currency)&&Number.isSafeInteger(t.amount_minor)&&t.amount_minor>=0&&Number.isSafeInteger(t.refundable_amount_minor)&&t.refundable_amount_minor>=0)))throw new Error('Invalid billing transactions');
 return data;
}
export function initClientBilling({supabase,getUser,onSupport=()=>{}}){
 const byId=id=>document.getElementById(id),groups=['due','upcoming','subscriptions','history'];
 let generation=0,loadedFor=null,inFlight=null,snapshot=null,dialog=null;
 const text=(tag,cls,value)=>{const el=document.createElement(tag);el.className=cls;el.textContent=value;return el;};
 const status=(message,error=false)=>{const el=byId('billing-status');el.textContent=message;el.classList.toggle('error',error);};
 const date=value=>{if(!value)return null;const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Europe/London'}).format(d):null;};
 const button=(label,cls,action)=>{const el=text('button',cls,label);el.type='button';el.addEventListener('click',action);return el;};
 const live=(version,user)=>version===generation&&getUser()?.id===user.id;
 function support(item,kind='payment',transaction=null){
  const subject=kind==='refund'?'Refund request':kind==='cancellation'?'Subscription cancellation request':'Payment support';
  const lines=[`${subject}: ${item.title}`,`Company: ${snapshot?.company?.name||''}`,`Reference: ${item.reference||item.id}`,
   `Amount: ${money(item.amount_minor,item.currency)}`,`Account environment: ${snapshot?.environment||''}`];
  if(transaction)lines.push(`PayPal transaction ID: ${transaction.provider_transaction_id}`);
  else if(item.provider_subscription_id)lines.push(`PayPal subscription ID: ${item.provider_subscription_id}`);
  lines.push('',kind==='refund'?'Please review my refund request. My reason:':kind==='cancellation'?'I would like to discuss cancelling this subscription.':'Please help me with this payment.','');
  onSupport({subject:`${subject}: ${item.title}`.slice(0,120),details:lines.join('\n')});
 }
 function empty(message){for(const group of groups){byId('billing-'+group).replaceChildren(text('p','billing-empty',message));const count=byId('billing-'+group+'-count');if(count)count.textContent='0';}}
 function clear(){generation++;snapshot=null;loadedFor=null;inFlight=null;dialog?.remove();dialog=null;
  byId('billing-mode').classList.add('hidden');byId('billing-company').textContent='Your company account';empty('Open Payments to load your account.');
  for(const id of ['billing-overview','billing-forecast','billing-transactions'])byId(id)?.replaceChildren();
  status('');byId('refresh-payments').disabled=false;byId('refresh-payments').setAttribute('aria-busy','false');
 }
 async function checkout(item,kind,control){
  const user=getUser(),version=generation,environment=snapshot?.environment;
  if(!user||!snapshot?.can_pay||!snapshot.checkout_available||!supportedEnvironment(environment))return;
  control.disabled=true;control.textContent='Opening PayPal…';status('Preparing PayPal checkout…');
  try{const {data,error}=await supabase.functions.invoke('billing-checkout',{body:{kind,record_id:item.id}});
   if(!live(version,user))return;
   if(error||data?.error)throw new Error(await checkoutErrorMessage(error,data));
   if(data?.environment!==environment)throw new Error('The payment environment changed. Refresh Payments.');
   const url=paypalApprovalUrl(data.approval_url,environment);if(!url)throw new Error('Checkout URL invalid');window.location.assign(url);
  }catch(error){if(live(version,user)){status((error?.message||'Checkout could not be opened.')+' No payment has been confirmed here.',true);
    // Reload the authoritative state: an interrupted provider call can reserve an attempt.
    loadedFor=null;void load(true,true);}}
  finally{if(control.isConnected){control.disabled=false;control.textContent=kind==='subscription'?'Approve subscription':'Pay with PayPal';}}
 }
 function cancelSubscription(item,opener){
  const user=getUser(),version=generation,environment=snapshot?.environment;if(!user)return;
  dialog?.remove();dialog=document.createElement('dialog');dialog.className='billing-dialog';dialog.setAttribute('aria-labelledby','billing-cancel-title');
  const box=text('div','billing-dialog-content','');box.append(text('span','billing-eyebrow','Subscription settings'),text('h2','', 'Cancel '+item.title+'?'));box.querySelector('h2').id='billing-cancel-title';
  box.append(text('p','billing-warning','Cancelling could affect or interrupt the service linked to this subscription.'),
   text('p','','If you have a dispute or are having difficulty paying your fees, we strongly recommend contacting support first so we can discuss your options.'),
   text('p','billing-caption','Cancellation does not automatically refund previous payments or remove any outstanding charges.'));
  const feedback=text('p','billing-dialog-status','');feedback.setAttribute('role','status');box.append(feedback);
  const actions=text('div','billing-dialog-actions','');
  const close=()=>{dialog?.close();};
  actions.append(button('Keep subscription','billing-secondary',close),button('Contact support','billing-secondary',()=>{close();if(live(version,user))support(item,'cancellation');}));
  const canCancel=item.can_cancel===true;
  const confirm=button(canCancel?'Confirm cancellation':'Request cancellation through support','billing-danger',async()=>{
   if(!live(version,user)||snapshot?.environment!==environment){close();return;}
   if(!canCancel){close();support(item,'cancellation');return;}
   confirm.disabled=true;feedback.textContent='Saving your cancellation request…';
   try{const {data,error}=await supabase.rpc('request_my_subscription_cancellation_v1',{p_subscription_id:item.id,p_expected_environment:environment,p_warning_acknowledged:true});
    if(!live(version,user))return;if(error||data?.requested!==true)throw error||new Error('Request not saved');
    close();await load(true);if(live(generation,user))status(data.confirmed?'PayPal has confirmed cancellation.':'Cancellation requested. We are waiting for PayPal to confirm it.');
   }catch{if(live(version,user)){feedback.textContent='We could not confirm your request was saved. Refresh Payments or contact support before trying again.';confirm.disabled=false;}}
  });actions.append(confirm);box.append(actions);dialog.append(box);document.body.append(dialog);
  dialog.addEventListener('close',()=>{dialog?.remove();dialog=null;if(opener.isConnected)opener.focus();});dialog.showModal();
 }
 function card(item,kind){
  const state=displayState(item,kind),el=text('article','billing-item billing-record state-'+state,''),head=text('div','billing-item-head','');
  head.append(text('h4','',item.title),text('strong','billing-amount',money(item.amount_minor,item.currency)));el.append(head);
  const meta=text('div','billing-record-meta',''),when=date(kind==='subscription'?item.next_payment_at:item.due_at);
  if(when)meta.append(text('span','',`${kind==='subscription'?'Next payment':'Due'} ${when}`));
  if(kind==='subscription'&&item.interval_label)meta.append(text('span','',item.interval_label));
  if(item.reference)meta.append(text('span','billing-reference',`Ref ${item.reference}`));el.append(meta);
  const row=text('div','billing-record-footer','');row.append(text('span','billing-badge '+state,stateText(state)));
  const actions=text('div','billing-record-actions','');
  const payable=kind==='subscription'?item.status==='pending_approval':item.bucket!=='history'&&['due','overdue','scheduled'].includes(item.status);
  if(payable&&snapshot.can_pay&&snapshot.checkout_available&&item.can_checkout===true&&supportedEnvironment(snapshot.environment)){
   let control;control=button(kind==='subscription'?'Approve subscription':'Pay with PayPal','billing-pay',()=>checkout(item,kind,control));actions.append(control);
  }
  if(attentionStates.has(state)||state==='suspended'||state==='cancellation_pending')actions.append(button('Contact support','billing-secondary',()=>support(item)));
  if(kind==='subscription'&&['active','suspended'].includes(item.status)&&!item.cancellation_requested_at){
   let control;control=button(item.can_cancel===true?'Cancel subscription':'Request cancellation','billing-text-danger',()=>cancelSubscription(item,control));actions.append(control);
  }
  row.append(actions);el.append(row);const note=stateNote(state);if(note)el.append(text('p','billing-record-note',note));
  if(item.description){const details=document.createElement('details');details.className='billing-description';details.append(text('summary','','Details'),text('p','',item.description));el.append(details);}
  const txs=(snapshot.transactions||[]).filter(t=>(kind==='subscription'?t.subscription_id:t.charge_id)===item.id);
  if(txs.length){const latest=txs.find(t=>['capture','subscription_payment'].includes(t.transaction_type));if(latest)el.append(text('p','billing-transaction-ref','PayPal transaction: '+latest.provider_transaction_id));}
  return el;
 }
 function renderOverview(data){
  const host=byId('billing-overview');if(!host)return;host.replaceChildren();
  const currencies=[...new Set([...data.charges,...data.subscriptions].map(i=>i.currency))];if(!currencies.length)currencies.push('GBP');
  for(const currency of currencies){const sums=billingSummary(data,currency);const cell=text('div','billing-total','');cell.append(text('span','','Outstanding · '+currency),text('strong','',money(sums.outstanding,currency)));host.append(cell);}
  const sums=billingSummary(data);const active=text('div','billing-total','');active.append(text('span','','Active subscriptions'),text('strong','',String(sums.active)));host.append(active);
  const attention=text('div','billing-total '+(sums.attention?'attention':''),'');attention.append(text('span','','Need attention'),text('strong','',String(sums.attention)));host.append(attention);
 }
 function renderForecast(data){
  const host=byId('billing-forecast');if(!host)return;host.replaceChildren();
  host.append(text('h3','','Looking ahead'),text('p','billing-caption','Estimated costs for the next six months. Includes scheduled one-off charges and active subscriptions with confirmed payment dates.'));
  const currencies=[...new Set([...data.charges,...data.subscriptions].map(i=>i.currency))];if(!currencies.length)currencies.push('GBP');
  for(const currency of currencies){const result=projectCosts(data,new Date(),currency),max=Math.max(1,...result.months.map(m=>m.oneOff+m.recurring));
   const heading=text('div','billing-section-heading','');heading.append(text('h4','',currency+' estimate'),text('strong','',money(result.total,currency)));host.append(heading);
   const chart=text('div','billing-chart','');chart.setAttribute('aria-hidden','true');
   for(const m of result.months){const column=text('div','billing-chart-column',''),stack=text('div','billing-chart-stack','');
    column.append(text('span','billing-chart-value',money(m.oneOff+m.recurring,currency)));
    for(const [kind,value]of [['recurring',m.recurring],['one-off',m.oneOff]]){const bar=text('span','billing-chart-bar '+kind,'');bar.style.height=(value/max*100)+'%';stack.append(bar);}
    column.append(stack,text('span','billing-chart-label',m.label));chart.append(column);}
   host.append(chart);const accessible=text('details','billing-forecast-table','');accessible.append(text('summary','','View monthly amounts'));
   const table=document.createElement('table'),thead=document.createElement('thead'),tr=document.createElement('tr');
   for(const label of ['Month','Subscriptions','One-off','Total']){const th=text('th','',label);th.scope='col';tr.append(th);}thead.append(tr);table.append(thead);
   const tbody=document.createElement('tbody');for(const m of result.months){const row=document.createElement('tr');for(const v of [m.label,money(m.recurring,currency),money(m.oneOff,currency),money(m.oneOff+m.recurring,currency)])row.append(text('td','',v));tbody.append(row);}table.append(tbody);accessible.append(table);host.append(accessible);
   if(result.unknownSchedules)host.append(text('p','billing-caption',`${result.unknownSchedules} active subscription${result.unknownSchedules===1?' has':'s have'} no confirmed future schedule and ${result.unknownSchedules===1?'is':'are'} excluded.`));
  }
  const legend=text('p','billing-chart-legend','');legend.append(text('span','recurring','Subscriptions'),text('span','one-off','One-off charges'));host.append(legend,
   text('p','billing-caption','Estimate only. Overdue items are in your outstanding balance, not added again here. Pending approvals and cancellation requests are excluded. Existing commitments may still apply.'));
 }
 function renderTransactions(data){
  const host=byId('billing-transactions');if(!host)return;host.replaceChildren();
  if(!Array.isArray(data.transactions)){host.append(text('p','billing-empty','No transaction references are available. Contact support for a payment reference.'));return;}
  if(!data.transactions.length){host.append(text('p','billing-empty','No transactions recorded.'));return;}
  for(const tx of data.transactions){const el=text('article','billing-transaction',''),top=text('div','billing-item-head','');
   top.append(text('h4','',tx.title),text('strong','billing-amount',money(tx.amount_minor,tx.currency)));el.append(top,
    text('p','billing-caption',`${({capture:'Payment',subscription_payment:'Subscription payment',refund:'Refund',reversal:'Reversal'})[tx.transaction_type]||'Transaction'} · ${date(tx.occurred_at)||''} · ${tx.provider_status}`));
   const idRow=text('div','billing-transaction-id','');idRow.append(text('span','','PayPal transaction ID'),text('code','',tx.provider_transaction_id));
   const copy=button('Copy ID','billing-secondary',async()=>{try{await navigator.clipboard.writeText(tx.provider_transaction_id);copy.textContent='Copied';}catch{copy.textContent='Select the ID to copy';}});idRow.append(copy);el.append(idRow);
   if(tx.provider_parent_id)el.append(text('p','billing-caption','Related transaction: '+tx.provider_parent_id));
   if(tx.refundable_amount_minor>0)el.append(button('Request a refund','billing-secondary',()=>support(tx,'refund',tx)));
   host.append(el);
  }
  host.append(text('p','billing-caption',`Showing up to ${data.transactions_limit||250} recent transactions. Refund requests go to support for review; no refund is issued automatically.`));
 }
 function render(data){
  snapshot=data;
  if(!data.can_view){byId('billing-mode').classList.add('hidden');byId('billing-company').textContent='Company account';for(const id of ['billing-overview','billing-forecast','billing-transactions'])byId(id)?.replaceChildren();empty('Company billing is restricted to authorised billing users.');status('Contact your company administrator or GeorgeTech for billing access.');return;}
  byId('billing-company').textContent=data.company.name+' · Account';const mode=byId('billing-mode');mode.textContent=data.environment==='sandbox'?'Sandbox · Test payments':'PayPal';mode.classList.remove('hidden');
  const lists={due:data.charges.filter(c=>c.bucket==='due'||c.status==='failed'),upcoming:data.charges.filter(c=>c.bucket==='upcoming'&&c.status!=='failed'),subscriptions:data.subscriptions,history:data.charges.filter(c=>c.bucket==='history'&&c.status!=='failed')};
  const messages={due:'Nothing to pay.',upcoming:'No scheduled one-off payments.',subscriptions:'No subscriptions.',history:'No previous charges.'};
  for(const group of groups){const list=lists[group];byId('billing-'+group).replaceChildren(...(list.length?list.map(i=>card(i,group==='subscriptions'?'subscription':'charge')):[text('p','billing-empty',messages[group])]));const count=byId('billing-'+group+'-count');if(count)count.textContent=String(list.length);}
  renderOverview(data);renderForecast(data);renderTransactions(data);
  const returned=new URLSearchParams(location.search).get('billing_return');status(billingReturnMessage(returned)||(!data.checkout_available?'Online checkout is temporarily unavailable.':!data.can_pay?'You have view-only access to this account.':''));
 }
 async function load(force=false,preserveStatus=false){
  const user=getUser();if(!user)return;if(inFlight)return inFlight;if(!force&&loadedFor===user.id)return;
  const request=++generation,previousMessage=byId('billing-status').textContent;byId('refresh-payments').disabled=true;byId('refresh-payments').setAttribute('aria-busy','true');if(!preserveStatus)status('Loading account…');
  const promise=(async()=>{try{let result=await supabase.rpc('get_my_company_billing_v2');
    if(result.error&&['PGRST202','42883'].includes(result.error.code))result=await supabase.rpc('get_my_company_billing_v1');
    if(!live(request,user))return;if(result.error)throw result.error;render(validateBilling(result.data));loadedFor=user.id;if(preserveStatus)status(previousMessage,true);
   }catch{if(live(request,user)){loadedFor=null;snapshot=null;empty('Account information could not be loaded.');for(const id of ['billing-overview','billing-forecast','billing-transactions'])byId(id)?.replaceChildren();status('We could not load your payments. Refresh or contact support.',true);}}
   finally{if(live(request,user)){byId('refresh-payments').disabled=false;byId('refresh-payments').setAttribute('aria-busy','false');inFlight=null;}}
  })();inFlight=promise;return promise;
 }
 byId('refresh-payments').addEventListener('click',()=>load(true));clear();return {load,clear};
}
