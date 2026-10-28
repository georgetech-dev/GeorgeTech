// Company data comes only from a self-scoped server read model. No client-side balances or paid flags are persisted.
export function paypalApprovalUrl(value,environment){
 try{const u=new URL(value);const host=environment==='sandbox'?'www.sandbox.paypal.com':environment==='live'?'www.paypal.com':null;
 return host&&u.protocol==='https:'&&u.hostname===host&&!u.port&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
const checkoutEnvironment='sandbox'; // Enable live only after sandbox validation and an explicit rollout.
const chargeStatuses=['scheduled','due','overdue','processing','paid','cancelled','partially_refunded','refunded','failed','reversed'];
const subscriptionStatuses=['pending_approval','active','suspended','cancelled','expired','failed'];
export function validateBilling(data){
 if(!data||typeof data!=='object'||typeof data.can_view!=='boolean')throw new Error('Invalid billing response');
 if(!data.can_view)return data;
 if(!['sandbox','live'].includes(data.environment)||!data.company?.id||typeof data.company.name!=='string'||typeof data.can_pay!=='boolean'||typeof data.checkout_available!=='boolean'||!Array.isArray(data.charges)||!Array.isArray(data.subscriptions))throw new Error('Invalid billing response');
 const amount=item=>typeof item.id==='string'&&typeof item.title==='string'&&typeof item.currency==='string'&&/^[A-Z]{3}$/.test(item.currency)&&Number.isSafeInteger(item.amount_minor)&&item.amount_minor>=0;
 if(!data.charges.every(item=>amount(item)&&['due','upcoming','history'].includes(item.bucket)&&chargeStatuses.includes(item.status))||!data.subscriptions.every(item=>amount(item)&&subscriptionStatuses.includes(item.status)))throw new Error('Invalid billing records');
 return data;
}
export function initClientBilling({supabase,getUser}){
 const byId=id=>document.getElementById(id),groups=['due','upcoming','subscriptions','history'];
 let generation=0,loadedFor=null,inFlight=null,snapshot=null;
 const status=(message,error=false)=>{const el=byId('billing-status');el.textContent=message;el.classList.toggle('error',error);};
 const text=(tag,cls,value)=>{const el=document.createElement(tag);el.className=cls;el.textContent=value;return el;};
 const date=value=>{if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Europe/London'}).format(d);};
 const money=item=>{try{return new Intl.NumberFormat('en-GB',{style:'currency',currency:item.currency}).format(item.amount_minor/10**new Intl.NumberFormat('en-GB',{style:'currency',currency:item.currency}).resolvedOptions().maximumFractionDigits);}catch{return `${item.currency} ${(item.amount_minor/100).toFixed(2)}`;}};
 function empty(message){groups.forEach(group=>{byId('billing-'+group).replaceChildren(text('p','billing-empty',message));const count=byId('billing-'+group+'-count');if(count)count.textContent='—';});}
 function clear(){generation++;snapshot=null;loadedFor=null;inFlight=null;byId('billing-mode').classList.add('hidden');byId('billing-company').textContent='Your company payments and subscriptions.';empty('Payment details have not been loaded.');status('Open Payments to load your company account.');byId('refresh-payments').disabled=false;}
 async function checkout(item,kind,button){
  const user=getUser(),currentGeneration=generation,environment=snapshot?.environment;if(!user||!snapshot?.can_pay||!snapshot.checkout_available||environment!==checkoutEnvironment)return;
  button.disabled=true;button.textContent='Opening PayPal…';status('Preparing your secure PayPal checkout…');
  try{const {data,error}=await supabase.functions.invoke('billing-checkout',{body:{kind,record_id:item.id}});
   if(currentGeneration!==generation||getUser()?.id!==user.id)return;
   if(error||data?.environment!==environment)throw new Error('Checkout unavailable');
   const url=paypalApprovalUrl(data.approval_url,environment);if(!url)throw new Error('Checkout URL invalid');
   window.location.assign(url);
  }catch{if(currentGeneration===generation&&getUser()?.id===user.id)status('We could not open PayPal. No payment has been confirmed here. Refresh or contact GeorgeTech.',true);}
  finally{if(button.isConnected){button.disabled=false;button.textContent=kind==='subscription'?'Approve subscription':'Pay with PayPal';}}
 }
 function card(item,kind){
  const el=text('article','billing-item',''),head=text('div','billing-item-head','');head.append(text('h4','',item.title),text('strong','billing-amount',money(item)));el.append(head);
  if(item.reference)el.append(text('p','',`Reference: ${item.reference}`));
  const formatted=date(kind==='subscription'?item.next_payment_at:item.due_at);if(formatted)el.append(text('p','',`${kind==='subscription'?'Next payment':'Due'}: ${formatted}`));
  if(kind==='subscription'&&item.interval_label)el.append(text('p','',item.interval_label));
  if(item.description)el.append(text('p','',item.description));
  el.append(text('span','billing-badge '+item.status,item.status.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase())));
  const payable=kind==='subscription'?item.status==='pending_approval':item.bucket!=='history'&&['due','overdue','scheduled'].includes(item.status);
  if(payable&&snapshot.environment===checkoutEnvironment&&snapshot.can_pay&&snapshot.checkout_available&&item.can_checkout===true){
   const button=text('button','billing-pay',kind==='subscription'?'Approve subscription':'Pay with PayPal');button.type='button';button.addEventListener('click',()=>checkout(item,kind,button));el.append(document.createElement('br'),button);
  }
  return el;
 }
 function render(data){
  snapshot=data;
  if(!data.can_view){byId('billing-mode').classList.add('hidden');byId('billing-company').textContent='Company account';empty('Company billing is restricted to authorised billing users.');status('You do not currently have access to your company’s billing. Contact your company administrator or GeorgeTech.');return;}
  byId('billing-company').textContent=data.company.name+' · Company account';
  const mode=byId('billing-mode');mode.textContent=data.environment==='sandbox'?'PayPal sandbox · Test payments only':'PayPal';mode.classList.remove('hidden');
  const lists={due:data.charges.filter(c=>c.bucket==='due'),upcoming:data.charges.filter(c=>c.bucket==='upcoming'),subscriptions:data.subscriptions,history:data.charges.filter(c=>c.bucket==='history')};
  const messages={due:'No one-off payments are due.',upcoming:'No one-off payments are scheduled.',subscriptions:'No subscriptions are listed.',history:'No completed or cancelled payments are listed.'};
  groups.forEach(group=>{const list=lists[group],host=byId('billing-'+group);host.replaceChildren(...(list.length?list.map(item=>card(item,group==='subscriptions'?'subscription':'charge')):[text('p','billing-empty',messages[group])]));const count=byId('billing-'+group+'-count');if(count)count.textContent=String(list.length);});
  const returned=new URLSearchParams(location.search).get('billing_return');
  status(returned==='approved'?'You have returned from PayPal. The records below show the latest server-confirmed status. Refresh if confirmation is still pending.':returned==='cancelled'?'PayPal checkout was cancelled. Your outstanding items are shown below.':(!data.checkout_available||data.environment!==checkoutEnvironment)?'Your payment records are available. Online checkout is being connected.':!data.can_pay?'You can view this company account. Payment approval has not been assigned to your user.':'');
 }
 async function load(force=false){
  const user=getUser();if(!user)return;if(inFlight)return inFlight;if(!force&&loadedFor===user.id)return;
  const request=++generation;byId('refresh-payments').disabled=true;status('Loading your company payments…');
  const promise=(async()=>{try{const {data,error}=await supabase.rpc('get_my_company_billing_v1');if(request!==generation||getUser()?.id!==user.id)return;if(error)throw error;const valid=validateBilling(data);render(valid);loadedFor=user.id;}
   catch(error){if(request!==generation)return;loadedFor=null;snapshot=null;empty('Payment details are not available yet.');const missing=error?.code==='PGRST202'||error?.code==='42883';status(missing?'Company payments are being connected. Contact GeorgeTech if you need to make a payment.':'We could not load your company payments. Please try Refresh or contact GeorgeTech.',!missing);}
   finally{if(request===generation){byId('refresh-payments').disabled=false;inFlight=null;}}
  })();inFlight=promise;return promise;
 }
 byId('refresh-payments').addEventListener('click',()=>load(true));
 clear();return {load,clear};
}
