import {parseVideoInvitation, invitationFragment} from './video-invitation.js?v=20261030-1';
'use strict';
let invitation=null,frame=null,loading=null,attempt=0,joined=false,lastError='';
const $=id=>document.getElementById(id);
function safeError(error){let message=String(error?.errorMsg||error?.error?.msg||error?.message||'The video connection failed. Please try again.');if(invitation?.token)message=message.split(invitation.token).join('[access token hidden]');return message.replace(/https?:\/\/[^\s<>"']+/g,'[call address hidden]').slice(0,700)}
function loadDaily(){if(window.Daily)return Promise.resolve(window.Daily);if(loading)return loading;loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://unpkg.com/@daily-co/daily-js@0.94.0';script.crossOrigin='anonymous';const timer=setTimeout(()=>{loading=null;script.remove();reject(new Error('The video service took too long to load. Please try again.'))},18000);script.onload=()=>{clearTimeout(timer);if(window.Daily)resolve(window.Daily);else{loading=null;reject(new Error('The video service did not load. Please try again.'))}};script.onerror=()=>{clearTimeout(timer);loading=null;script.remove();reject(new Error('Could not load the video service. Check your internet connection.'))};document.head.append(script)});return loading}
function showError(error){lastError=safeError(error);$('call-error').textContent=lastError;$('call-error').hidden=false;$('recovery').hidden=false;$('status').textContent='Connection stopped. Your error is shown below.'}
function hostPresence(){if(!frame||!joined)return;const people=Object.values(frame.participants()||{});const host=people.some(p=>!p.local&&p.owner);$('status').textContent=host?'You’re connected with '+invitation.host+'.':'Waiting for '+invitation.host+' to join. Please stay on this page.'}
function isFullscreen(){return !!(document.fullscreenElement||document.webkitFullscreenElement)}
function updateFullscreenButton(){const button=$('fullscreen');button.hidden=!(isFullscreen()||$('call').requestFullscreen||$('call').webkitRequestFullscreen);button.textContent=isFullscreen()?'Exit full screen':'Full screen';button.setAttribute('aria-pressed',String(isFullscreen()))}
function exitFullscreen(){try{const exit=document.exitFullscreen||document.webkitExitFullscreen;if(isFullscreen()&&exit)Promise.resolve(exit.call(document)).catch(()=>{})}catch{}}
function enterFullscreen(){
 const call=$('call'),request=call.requestFullscreen||call.webkitRequestFullscreen;
 if(!request||isFullscreen())return;
 // Request directly from the Join click, before loading the video SDK consumes user activation.
 try{Promise.resolve(request.call(call)).then(()=>{if(call.hidden)exitFullscreen();updateFullscreenButton()}).catch(()=>{updateFullscreenButton()})}catch{updateFullscreenButton()}
}
async function join(){
 if(!invitation||Date.now()/1000>=invitation.expiresAt){$('problem').hidden=false;$('problem').textContent='This invitation has expired. Ask GeorgeTech for a new link.';return}
 const current=++attempt;joined=false;lastError='';$('main').hidden=true;$('call').hidden=false;document.body.classList.add('call-active');$('call-error').hidden=true;$('recovery').hidden=true;$('status').textContent='Preparing your call…';updateFullscreenButton();enterFullscreen();const old=frame;frame=null;
 try{if(old)await old.destroy();if(current!==attempt)return;const Daily=await loadDaily();if(current!==attempt)return;const own=Daily.createFrame($('frame'),{iframeStyle:{width:'100%',height:'100%',border:'0'},showLeaveButton:true,showFullscreenButton:false});frame=own;
 own.on('joining-meeting',()=>{if(current===attempt&&!lastError)$('status').textContent='Check your devices, then join using the video room’s button.'});
 own.on('joined-meeting',()=>{if(current!==attempt)return;joined=true;$('call-error').hidden=true;hostPresence()});
 for(const event of ['participant-joined','participant-updated','participant-left'])own.on(event,()=>{if(current===attempt)hostPresence()});
 own.on('error',error=>{if(current===attempt)showError(error)});
 own.on('left-meeting',()=>{if(current!==attempt||lastError)return;void leave()});
 await own.join({url:invitation.room,token:invitation.token,userName:invitation.name});
 }catch(error){if(current===attempt)showError(error)}
}
async function leave(){++attempt;joined=false;const old=frame;frame=null;$('call').hidden=true;document.body.classList.remove('call-active');exitFullscreen();$('main').hidden=false;$('title').textContent='You’ve left the call';$('intro').textContent='Thank you for speaking with GeorgeTech. You can return to the GeorgeTech website or rejoin while your invitation is valid.';$('eyebrow').textContent='Call finished';$('invitation').hidden=true;$('finished').hidden=false;$('rejoin').hidden=!invitation||Date.now()/1000>=invitation.expiresAt;$('problem').hidden=true;$('title').focus();if(old){try{await old.destroy()}catch{}}}
$('join').addEventListener('click',join);$('retry').addEventListener('click',join);$('leave').addEventListener('click',leave);
$('rejoin').addEventListener('click',join);
$('fullscreen').addEventListener('click',()=>{if(isFullscreen())exitFullscreen();else enterFullscreen()});
document.addEventListener('fullscreenchange',updateFullscreenButton);document.addEventListener('webkitfullscreenchange',updateFullscreenButton);
window.addEventListener('pagehide',()=>{++attempt;frame?.destroy().catch(()=>{})});
function showInvitation() {
 try {
  invitation=parseVideoInvitation(location.hash);
  $('guest-name').textContent=invitation.name;
  $('host-name').textContent=invitation.host;
  $('expires').textContent=new Date(invitation.expiresAt*1000).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'});
  $('title').textContent='Your call is ready.';
  $('intro').textContent='You’re invited to speak with '+invitation.host+'. Join below when you’re ready.';
  $('invitation').hidden=false;$('invitation-form').hidden=true;$('problem').hidden=true;
 } catch(error) {
  invitation=null;$('invitation').hidden=true;$('invitation-form').hidden=false;
  $('problem').textContent=error.message;$('problem').hidden=false;
 }
}
$('invitation-form').addEventListener('submit',event=>{
 event.preventDefault();
 try {
  const fragment=invitationFragment($('invitation-link').value.trim(),location.href);
  history.replaceState(null,'',location.pathname+fragment);
  $('invitation-link').value='';showInvitation();$('title').focus();
 } catch(error) { $('problem').textContent=error.message;$('problem').hidden=false; }
});
if(location.hash)showInvitation();
