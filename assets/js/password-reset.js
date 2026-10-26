import { initialiseRecovery } from './password-recovery.js?v=20261026-1';
// Capture and remove recovery credentials before loading external code.
const recoveryURL=new URL(window.location.href);
const source=recoveryURL.searchParams.get('source')||new URLSearchParams(recoveryURL.hash.slice(1)).get('source');
history.replaceState({},document.title,location.pathname+(source==='app-orchardops'?'?source=app-orchardops':''));
try {
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const supabase=createClient('https://lgchqleltppfdgtpgsbj.supabase.co','sb_publishable_ZHBBlxQVW0MBUUwQ5Kv1Aw_uufRzvu1',{auth:{detectSessionInUrl:false}});
  await initialiseRecovery({supabase,recoveryURL});
} catch(_error) {
  const status=document.getElementById('reset-status');status.className='support-status error';
  status.textContent='We could not load the password service. Please refresh the page or contact GeorgeTech support.';
}
