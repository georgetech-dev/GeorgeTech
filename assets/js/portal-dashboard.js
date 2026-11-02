import {validateBilling} from './client-billing.js?v=20261028-1';
export function summarizeNotices(value){
 const checked=Date.parse(value?.checked_at);
 if(!value||value.can_view!==true||!Array.isArray(value.notices)||!Number.isFinite(checked))throw new Error('Status unavailable');
 for(const n of value.notices)if(!['operational','degraded','outage','maintenance'].includes(n.status)||typeof n.service_name!=='string'||!n.service_name.trim()||typeof n.message!=='string'||typeof n.third_party!=='boolean'||!Number.isFinite(Date.parse(n.expires_at))||Date.parse(n.expires_at)<=checked)throw new Error('Invalid service status');
 const next=value.next_change_at==null?null:Date.parse(value.next_change_at);if(next!==null&&(!Number.isFinite(next)||next<=checked))throw new Error('Invalid status refresh');
 return {notices:value.notices.filter(n=>n.status!=='operational'),delay:next===null?null:next-checked};
}
export function initPortalDashboard({supabase,getUser,navigate}){
 const $=id=>document.getElementById(id);let generation=0,timer=null;
 const text=(tag,cls,value)=>{const e=document.createElement(tag);e.className=cls;e.textContent=value;return e;};
 function clear(){generation++;$('dashboard-refresh').disabled=false;clearTimeout(timer);timer=null;for(const id of ['dashboard-payments-count','dashboard-tickets-count'])$(id).textContent='—';$('dashboard-service-title').textContent='Checking services…';$('dashboard-service-status').className='portal-service-status';$('dashboard-service-notices').replaceChildren();}
 async function services(version,user){
  try{const {data,error}=await supabase.rpc('get_my_service_status_v1');if(error)throw error;if(version!==generation||getUser()?.id!==user.id)return;const result=summarizeNotices(data);
   $('dashboard-service-status').className='portal-service-status '+(result.notices.length?'has-issues':'all-good');$('dashboard-service-title').textContent=result.notices.length?'Service updates':'All services are good';
   const rows=result.notices.map(n=>{const card=text('article','service-notice','');card.append(text('h4','',n.service_name),text('span','service-status-label',({degraded:'Service disruption',outage:'Service unavailable',maintenance:'Maintenance'})[n.status]),text('p','',n.message));
    if(n.third_party)card.append(text('p','service-meta',n.provider_name?'Third-party issue · '+n.provider_name:'Third-party issue'));
    if(n.expected_resolution_at){const date=new Date(n.expected_resolution_at);if(Number.isFinite(date.getTime()))card.append(text('p','service-meta','Expected fix: '+new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'}).format(date)));}return card;});$('dashboard-service-notices').replaceChildren(...rows);
   clearTimeout(timer);const delay=Number.isFinite(result.delay)?Math.min(result.delay+250,60000):60000;timer=setTimeout(()=>{if(version===generation&&getUser()?.id===user.id)void services(version,user);},delay);
  }catch{if(version===generation){$('dashboard-service-status').className='portal-service-status unavailable';$('dashboard-service-title').textContent='Service status unavailable';$('dashboard-service-notices').replaceChildren();}}
 }
 async function load(){const user=getUser();if(!user)return;const version=++generation;clearTimeout(timer);for(const id of ['dashboard-payments-count','dashboard-tickets-count'])$(id).textContent='—';$('dashboard-service-title').textContent='Checking services…';$('dashboard-service-status').className='portal-service-status';$('dashboard-service-notices').replaceChildren();$('dashboard-refresh').disabled=true;
  await Promise.allSettled([
   (async()=>{try{const {count,error}=await supabase.from('support_tickets').select('id',{count:'exact',head:true}).eq('user_id',user.id).not('status','in','(closed,resolved)');if(error)throw error;if(version===generation&&getUser()?.id===user.id)$('dashboard-tickets-count').textContent=Number.isSafeInteger(count)?String(count):'—';}catch{if(version===generation)$('dashboard-tickets-count').textContent='—';}})(),
   (async()=>{try{const {data,error}=await supabase.rpc('get_my_company_billing_v1');if(error)throw error;const value=validateBilling(data);if(version===generation&&getUser()?.id===user.id)$('dashboard-payments-count').textContent=value.can_view?String(value.charges.filter(c=>c.bucket==='due'&&['due','overdue'].includes(c.status)).length):'—';}catch{if(version===generation)$('dashboard-payments-count').textContent='—';}})(),
   services(version,user)
  ]);if(version===generation)$('dashboard-refresh').disabled=false;
 }
 $('dashboard-refresh').onclick=()=>load();$('dashboard-payments').onclick=()=>navigate('payments-panel');$('dashboard-tickets').onclick=()=>navigate('tickets-panel');$('dashboard-appointments').onclick=()=>navigate('appointments-panel');$('dashboard-new-ticket').onclick=()=>navigate('new-ticket-panel');
 return {load,clear,pause(){generation++;clearTimeout(timer);}};
}
