export function initClientChat({getUser,getName}){
 const mount=document.getElementById('portal-chat-mount'),status=document.getElementById('portal-chat-status');let ready=null,host=null,visible=false,generation=0;
 function hide(){visible=false;const focused=document.activeElement;if(host){const panel=host.shadowRoot?.getElementById('panel');if(panel&&!panel.hidden)host.shadowRoot.getElementById('launcher')?.click();host.hidden=true;if(focused&&focused!==host)focused.focus({preventScroll:true});}}
 function clear(){generation++;hide();const reset=()=>host?.shadowRoot?.getElementById('new-chat')?.click();if(host)reset();else if(ready)void ready.then(reset).catch(()=>{});}
 function prepare(){if(ready)return ready;ready=new Promise((resolve,reject)=>{
  const fail=()=>{observer.disconnect();clearTimeout(timer);reject(new Error('Chat unavailable'));};
  const inspect=()=>{const element=document.getElementById('georgetech-chat-widget'),root=element?.shadowRoot,launcher=root?.getElementById('launcher');if(!root||!launcher||launcher.hidden||element.hidden)return;
   host=element;const style=document.createElement('style');style.textContent=':host{position:relative!important;inset:auto!important;display:block!important;width:100%!important;height:100%!important;z-index:0!important;--accent:#176bc8!important}.launcher,.popup,.close{display:none!important}.panel{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important;border-radius:12px!important;box-shadow:none!important}:host([hidden]){display:none!important}';root.append(style);root.getElementById('panel').setAttribute('role','region');root.addEventListener('keydown',event=>{if(event.key==='Tab'||event.key==='Escape')event.stopImmediatePropagation();},true);mount.append(host);
   observer.disconnect();clearTimeout(timer);resolve(host);
  };
  const observer=new MutationObserver(inspect),timer=setTimeout(fail,15000);observer.observe(document.body,{childList:true,subtree:true});
  const guard=document.createElement('style');guard.textContent='body>#georgetech-chat-widget{display:none!important}';document.head.append(guard);const script=document.createElement('script');script.src='https://chat.georgetech.uk/widget.js';script.dataset.site='bcd47f2f-e479-4521-a472-2e10001f5c97';script.async=true;script.onload=()=>{const root=document.getElementById('georgetech-chat-widget')?.shadowRoot;if(root)observer.observe(root,{childList:true,subtree:true,attributes:true});inspect();};script.onerror=fail;document.body.append(script);
 });return ready;}
 async function show(){const version=generation,user=getUser();if(!user)return;visible=true;status.textContent='Opening chat…';try{await prepare();if(version!==generation)return;if(!visible||getUser()?.id!==user.id){hide();return;}host.hidden=false;const root=host.shadowRoot,start=root.getElementById('start');
  if(start){if(start.elements.name)start.elements.name.value=getName()||'';if(start.elements.email)start.elements.email.value=getUser().email||'';}
  if(root.getElementById('panel').hidden)root.getElementById('launcher').click();status.textContent='';
 }catch{if(version!==generation||!visible)return;status.textContent='Chat is unavailable. Please raise a ticket or call 01959 474747.';}}
 return {show,hide,clear};
}
