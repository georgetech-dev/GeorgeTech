export function initClientAccount({supabase, getUser, onDetailsSaved, onRequestService}) {
  const byId=id=>document.getElementById(id);
  let account=null, generation=0, cooldown=null;
  const roleNames={admin:'Company administrator',office:'Office',engineer:'Engineer',agent:'Agent',customer:'Customer',owner:'Company owner'};
  const message=(text,type='error')=>{const el=byId('account-status');el.textContent=text;el.className=`status ${type}`;};
  const text=(id,value)=>{byId(id).textContent=value||'Not recorded';};
  const editable=value=>['account-name','account-phone','save-account-details'].forEach(id=>{byId(id).disabled=!value;});
  function renderAccount(value) {
    account=value;
    byId('account-email').value=getUser()?.email||'';
    byId('account-name').value=value?.full_name||'';
    byId('account-phone').value=value?.phone||'';
    text('account-company-name',value?.company_name);
    text('account-company-id',value?.company_id);
    text('account-role',roleNames[value?.primary_role]||value?.primary_role);
    text('account-user-status',value ? (value.is_active ? 'Active' : 'Inactive') : 'Profile not linked');
    text('account-company-status',value?.company_status);
    editable(Boolean(value));
  }
  function renderServices(services) {
    const host=byId('company-services');host.replaceChildren();
    if(!services.length) {
      const empty=document.createElement('p');empty.className='empty-state';
      empty.textContent='No services are currently listed. Contact GeorgeTech if you expected to see a service here.';host.append(empty);return;
    }
    services.forEach(service=> {
      const card=document.createElement('article');card.className='company-service-card';
      const heading=document.createElement('h3');heading.textContent=service.name;
      const description=document.createElement('p');description.textContent=service.description||'A GeorgeTech service for your business.';
      const facts=document.createElement('dl');facts.className='service-access-facts';
      for(const [label,value,good] of [
        ['Company',service.company_enabled?'Enabled':'Not enabled',service.company_enabled],
        ['Your access',service.user_enabled===true?'Available':service.user_enabled===false?'Not available':'Checked in service',service.user_enabled===true]
      ]) {
        const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
        dt.textContent=label;dd.textContent=value;dd.className=good?'access-good':'access-neutral';row.append(dt,dd);facts.append(row);
      }
      const note=document.createElement('p');note.className='hint';note.textContent=service.access_note;
      card.append(heading,description,facts,note);
      let url=null;
      try {const parsed=new URL(service.launch_url);if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password)url=parsed.href;}catch(_error){}
      if(url && service.company_enabled && service.user_enabled===true) {
        const link=document.createElement('a');link.className='button button-primary';link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open service';card.append(link);
      } else {
        const button=document.createElement('button');button.className='text-button';button.type='button';button.textContent='Ask about this service';
        button.addEventListener('click',()=>onRequestService(service.name));card.append(button);
      }
      host.append(card);
    });
  }
  async function load() {
    const user=getUser();if(!user)return;
    const request=++generation,refresh=byId('refresh-services');refresh.disabled=true;
    byId('services-context').textContent='Checking your company and user access…';
    try {
      const {data,error}=await supabase.rpc('get_my_client_portal_v1');
      if(request!==generation || getUser()?.id!==user.id)return;
      if(error || !data || !Array.isArray(data.services))throw error||new Error('Account details are unavailable.');
      renderAccount(data.account);renderServices(data.services);
      byId('services-context').textContent=data.account?.company_name ? `${data.account.company_name} · Access for ${user.email}` : 'No company profile is linked to this account.';
      byId('account-status').className='status hidden';
      if(!data.account)message('Your sign-in is active, but a company profile has not been linked. Contact support for help.');
    } catch(_error) {
      if(request!==generation)return;
      renderAccount(null);message('Your account details could not be loaded. Please try Refresh access or contact support.');
      byId('services-context').textContent='Service access could not be checked. Please try again or contact GeorgeTech.';
      const empty=document.createElement('p');empty.className='empty-state';empty.textContent='Your tickets remain available while we check your account details.';
      byId('company-services').replaceChildren(empty);
    } finally {if(request===generation)refresh.disabled=false;}
  }
  byId('refresh-services').addEventListener('click',load);
  byId('account-details-form').addEventListener('submit',async event=> {
    event.preventDefault();if(!account || !getUser())return;
    const form=event.currentTarget;if(!form.reportValidity())return;
    const userId=getUser().id,button=byId('save-account-details');button.disabled=true;button.textContent='Saving…';
    const full_name=byId('account-name').value.trim(),phone=byId('account-phone').value.trim();
    try {
      const {error}=await supabase.rpc('update_my_client_details_v1',{p_full_name:full_name,p_phone:phone});
      if(getUser()?.id!==userId)return;
      if(error)throw error;
      account={...account,full_name,phone};onDetailsSaved(account);message('Your details have been saved.','success');
    }catch(_error){if(getUser()?.id===userId)message('Your details could not be saved. Please try again.');}
    finally{button.disabled=!account;button.textContent='Save details';}
  });
  byId('account-change-password').addEventListener('click',async()=> {
    const button=byId('account-change-password');button.disabled=true;button.textContent='Sending link…';
    try {
      const {data,error:userError}=await supabase.auth.getUser();
      if(userError || !data.user?.email || data.user.id!==getUser()?.id)throw new Error('Sign in again to change your password.');
      const {error}=await supabase.auth.resetPasswordForEmail(data.user.email,{redirectTo:new URL('password-reset.html',location.href).href});
      if(error)throw error;
      message('A secure password change link has been sent to your sign-in email. Check your inbox.','success');
      button.textContent='Link sent — check your email';
      cooldown=setTimeout(()=>{button.disabled=false;button.textContent='Change password';},30000);
    }catch(_error){message('We could not send the password link. Please try again or contact support.');button.disabled=false;button.textContent='Change password';}
  });
  function clear() {
    generation++;account=null;clearTimeout(cooldown);renderAccount(null);
    byId('company-services').replaceChildren();byId('account-email').value='';byId('account-status').className='status hidden';
  }
  return {load,clear};
}
