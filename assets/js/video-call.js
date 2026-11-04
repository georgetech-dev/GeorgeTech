import {parseVideoInvitation, invitationFragment} from './video-invitation.js?v=20261030-1';
import {openPortalVideo} from './portal-video.js?v=20261104-experience-1';
let invitation=null,activeCall=null;
const $=id=>document.getElementById(id);
function join(){
 if(activeCall)return;
 if(!invitation||Date.now()/1000>=invitation.expiresAt){$('problem').hidden=false;$('problem').textContent='This invitation has expired. Ask GeorgeTech for a new link.';return;}
 activeCall=openPortalVideo({returnLabel:'GeorgeTech',getAccess:async()=>({room_url:invitation.room,token:invitation.token,expires_at:new Date(invitation.expiresAt*1000).toISOString(),user_name:invitation.name}),onClose:reason=>{activeCall=null;if(reason==='returned')location.assign('index.html');}});
}
$('join').addEventListener('click',join);
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
