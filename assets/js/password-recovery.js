export const passwordRules=value=>({length:value.length>=8,capital:/[A-Z]/.test(value),number:/[0-9]/.test(value),symbol:/[^A-Za-z0-9]/.test(value)});
export async function verifyRecovery({supabase,url,storage,now=Date.now()}) {
  const query=url.searchParams,hash=new URLSearchParams(url.hash.slice(1));
  const read=key=>hash.get(key)||query.get(key);
  if(read('error')||read('error_code'))throw new Error('This reset link is invalid or has expired. Request a fresh link below.');
  let response;
  if(read('access_token')&&read('refresh_token')&&read('type')==='recovery') {
    response=await supabase.auth.setSession({access_token:read('access_token'),refresh_token:read('refresh_token')});
  } else if(read('token_hash')&&read('type')==='recovery') {
    response=await supabase.auth.verifyOtp({token_hash:read('token_hash'),type:'recovery'});
  } else if(read('code')) {
    response=await supabase.auth.exchangeCodeForSession(read('code'));
  } else {
    let marker;
    try {marker=JSON.parse(storage.getItem('georgetech-password-recovery'));}catch(_error){}
    if(!marker || marker.expires<=now)throw new Error('Open the link from your password reset email, or request a new link below.');
    const {data,error}=await supabase.auth.getUser();
    if(error||data.user?.id!==marker.userId)throw new Error('This reset link is no longer active. Request a new link below.');
    return data.user;
  }
  if(response.error||!response.data?.session)throw new Error('We could not verify this reset link. Request a fresh link below.');
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)throw new Error('We could not verify this reset link. Request a fresh link below.');
  try {storage.setItem('georgetech-password-recovery',JSON.stringify({userId:data.user.id,expires:now+15*60*1000}));}catch(_error){}
  return data.user;
}
export async function initialiseRecovery({supabase,recoveryURL}) {
  const byId=id=>document.getElementById(id),form=byId('reset-form'),status=byId('reset-status');
  const password=byId('password'),confirmation=byId('confirm-password'),match=byId('match-message');
  let ready=false;
  const show=(text,type='error')=>{status.textContent=text;status.className=`support-status ${type}`;};
  const source=recoveryURL.searchParams.get('source')||new URLSearchParams(recoveryURL.hash.slice(1)).get('source');
  if(source==='app-orchardops') {
    document.title='Reset OrchardOps password | GeorgeTech';byId('recovery-title').textContent='Reset your OrchardOps password';
    byId('recovery-intro').textContent='Choose a new password for your OrchardOps account, powered by GeorgeTech.';
    const logo=byId('recovery-brand');logo.src='assets/images/OrchardOpsLogoTransparent.png';logo.alt='OrchardOps';logo.classList.remove('hidden');
    byId('recovery-account-note').textContent='Use your new password when you next sign in to OrchardOps.';
  }
  const updateMatch=()=> {
    const equal=password.value===confirmation.value;
    match.textContent=confirmation.value ? (equal?'Passwords match':'Passwords do not match') : '';
    match.className='match-message '+(equal?'valid':'invalid');
  };
  password.addEventListener('input',()=> {
    const rules=passwordRules(password.value);
    document.querySelectorAll('[data-rule]').forEach(el=>{el.classList.toggle('valid',rules[el.dataset.rule]);});updateMatch();
  });
  confirmation.addEventListener('input',updateMatch);
  document.querySelectorAll('[data-password-target]').forEach(button=>button.addEventListener('click',()=> {
    const input=byId(button.dataset.passwordTarget),visible=input.type==='password';input.type=visible?'text':'password';
    button.setAttribute('aria-pressed',String(visible));
    button.setAttribute('aria-label',(visible?'Hide ':'Show ')+(input===password?'new password':'confirmation password'));
  }));
  byId('request-reset-form').addEventListener('submit',async event=> {
    event.preventDefault();if(!event.currentTarget.reportValidity())return;
    const button=byId('request-reset-submit');button.disabled=true;button.textContent='Sending…';
    try {
      const redirect=new URL('password-reset.html',location.href);if(source==='app-orchardops')redirect.searchParams.set('source',source);
      const {error}=await supabase.auth.resetPasswordForEmail(byId('reset-email').value.trim(),{redirectTo:redirect.href});
      if(error)throw error;
      show('If an account exists for that address, a reset link will be sent. Please check your inbox.','success');
    }catch(_error){show('We could not send a reset link. Please try again shortly or contact support.');}
    finally {button.disabled=false;button.textContent='Send reset link';}
  });
  form.addEventListener('submit',async event=> {
    event.preventDefault();if(!ready)return;
    if(!Object.values(passwordRules(password.value)).every(Boolean)){show('Please meet all four password requirements.');password.focus();return;}
    if(password.value!==confirmation.value){show('The passwords do not match.');confirmation.focus();return;}
    const button=byId('reset-submit');button.disabled=true;button.textContent='Saving…';
    try {
      const {error}=await supabase.auth.updateUser({password:password.value});
      if(error)throw error;
      ready=false;
      try {sessionStorage.removeItem('georgetech-password-recovery');}catch(_error){}
      form.reset();form.classList.add('hidden');byId('reset-success').classList.remove('hidden');
      show('Your password has been updated.','success');
      try { await supabase.auth.signOut({scope:'local'}); } catch (_error) { /* The password was already saved. */ }
    }catch(_error){show('Your password could not be updated. Please try again, or request a fresh reset link.');byId('request-reset-form').classList.remove('hidden');}
    finally{button.disabled=false;button.textContent='Save new password';}
  });
  try {
    let storage;try{storage=sessionStorage;}catch(_error){storage={getItem:()=>null,setItem(){}};}
    await verifyRecovery({supabase,url:recoveryURL,storage});ready=true;
    status.className='support-status hidden';form.classList.remove('hidden');
  } catch(error) {
    show(error.message);byId('request-reset-form').classList.remove('hidden');form.classList.add('hidden');
  }
}
