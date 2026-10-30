import {openPortalVideo} from './portal-video.js?v=20261030-appointments-1';
export function validateAppointments(value){
 if(!value||typeof value.can_view!=='boolean'||!Array.isArray(value.appointments))throw new Error('Invalid appointment response.');
 for(const a of value.appointments)if(typeof a.id!=='string'||typeof a.title!=='string'||!['scheduled','cancelled','completed'].includes(a.status)||typeof a.can_join!=='boolean'||!Number.isFinite(Date.parse(a.starts_at))||!Number.isFinite(Date.parse(a.ends_at)))throw new Error('Invalid appointment.');
 return value;
}
export function initClientAppointments({supabase,getUser,openVideo=openPortalVideo}){
 const $=id=>document.getElementById(id);let generation=0,activeCall=null,resetting=false;
 const node=(tag,cls,value)=>{const e=document.createElement(tag);e.className=cls;e.textContent=value;return e;};
 const status=(value,error=false)=>{$('appointments-status').textContent=value;$('appointments-status').classList.toggle('error',error);};
 function clear(){generation++;resetting=true;activeCall?.close();activeCall=null;resetting=false;$('appointments-upcoming').replaceChildren();$('appointments-past').replaceChildren();status('Your appointments will load when you open this section.');$('refresh-appointments').disabled=false;}
 function join(a){const user=getUser(),version=generation;if(!user||activeCall)return;
  activeCall=openVideo({onClose:()=>{activeCall=null;if(!resetting)void load();},getAccess:async()=>{
   const {data,error}=await supabase.functions.invoke('video-appointment-join',{body:{appointment_id:a.id}});
   if(error||version!==generation||getUser()?.id!==user.id)throw new Error('Appointment unavailable.');return data;
  }});
 }
 function card(a){const e=node('article','appointment-card',''),details=node('div','appointment-card-details','');details.append(node('h4','',a.title),node('p','',new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'}).format(new Date(a.starts_at))+' · UK time'));
  if(a.status!=='scheduled')details.append(node('span','appointment-state',a.status==='completed'?'Ended':'Cancelled'));
  else details.append(node('p','appointment-until','Available until '+new Intl.DateTimeFormat('en-GB',{timeStyle:'short',timeZone:'Europe/London'}).format(new Date(a.ends_at))));
  e.append(details);if(a.can_join){const b=node('button','button button-primary','Join appointment');b.type='button';b.onclick=()=>join(a);e.append(b);}else if(a.status==='scheduled')e.append(node('span','appointment-state','Join opens at the appointment time'));return e;
 }
 async function load(){const user=getUser();if(!user)return;const version=++generation;status('Loading your appointments…');$('refresh-appointments').disabled=true;
  try{const {data,error}=await supabase.rpc('get_my_video_appointments_v1');if(version!==generation||getUser()?.id!==user.id)return;if(error)throw error;const response=validateAppointments(data);
   $('appointments-upcoming').replaceChildren();$('appointments-past').replaceChildren();
   if(!response.can_view){status('Appointments are unavailable for this account. Please contact GeorgeTech.',true);return;}
   const upcoming=response.appointments.filter(a=>a.status==='scheduled'),past=response.appointments.filter(a=>a.status!=='scheduled');
   $('appointments-upcoming').replaceChildren(...(upcoming.length?upcoming.sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at)).map(card):[node('p','appointment-empty','You have no upcoming appointments. We’ll add your next appointment here once arranged.')]));
   $('appointments-past').replaceChildren(...(past.length?past.map(card):[node('p','appointment-empty','No previous appointments.')]));status('Your appointments with GeorgeTech. Select Join when your appointment is available.');
  }catch{if(version===generation){$('appointments-upcoming').replaceChildren();$('appointments-past').replaceChildren();status('We couldn’t load your appointments. Please refresh, or contact GeorgeTech if this continues.',true);}}
  finally{if(version===generation)$('refresh-appointments').disabled=false;}
 }
 $('refresh-appointments').onclick=()=>load();return {load,clear};
}
