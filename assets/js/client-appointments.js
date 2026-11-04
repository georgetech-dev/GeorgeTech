import {openPortalVideo} from './portal-video.js?v=20261102-1';
export function validateAppointments(value){
 if(!value||typeof value.can_view!=='boolean'||!Array.isArray(value.appointments))throw new Error('Invalid appointment response.');
 for(const a of value.appointments)if(typeof a.id!=='string'||typeof a.title!=='string'||!['scheduled','cancelled','completed'].includes(a.status)||typeof a.can_join!=='boolean'||!Number.isFinite(Date.parse(a.starts_at))||!Number.isFinite(Date.parse(a.ends_at)))throw new Error('Invalid appointment.');
 return value;
}
export function initClientAppointments({supabase,getUser,openVideo=openPortalVideo}){
 const $=id=>document.getElementById(id);let generation=0,activeCall=null,resetting=false;
 const node=(tag,cls,value)=>{const e=document.createElement(tag);e.className=cls;e.textContent=value;return e;};
 const status=(value,error=false)=>{$('appointments-status').textContent=value;$('appointments-status').classList.toggle('error',error);};
 function clear(){generation++;resetting=true;activeCall?.close();activeCall=null;resetting=false;$('appointments-upcoming').replaceChildren();$('appointments-past').replaceChildren();$('appointments-history').hidden=true;status('');$('refresh-appointments').disabled=false;}
 function join(a){const user=getUser(),version=generation;if(!user||activeCall)return;
  activeCall=openVideo({onClose:()=>{activeCall=null;if(!resetting)void load();},getAccess:async()=>{
   const {data,error}=await supabase.functions.invoke('video-appointment-join',{body:{appointment_id:a.id}});
   if(error||version!==generation||getUser()?.id!==user.id)throw new Error('Appointment unavailable.');return data;
  }});
 }
 function card(a){const e=node('article','appointment-card',''),details=node('div','appointment-card-details','');details.append(node('h4','',a.title),node('p','',new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'}).format(new Date(a.starts_at))+' · UK time'));
  if(a.kind==='in_person')details.append(node('p','appointment-location',a.location||'Location to be confirmed'));
  if(a.status!=='scheduled')details.append(node('span','appointment-state',a.status==='completed'?'Ended':'Cancelled'));
  else details.append(node('p','appointment-until','Available until '+new Intl.DateTimeFormat('en-GB',{timeStyle:'short',timeZone:'Europe/London'}).format(new Date(a.ends_at))));
  e.append(details);if(a.can_join){const b=node('button','button button-primary','Join appointment');b.type='button';b.onclick=()=>join(a);e.append(b);}else if(a.status==='scheduled'&&a.kind!=='in_person')e.append(node('span','appointment-state','Join opens at the appointment time'));return e;
 }
 async function load(){const user=getUser();if(!user)return;const version=++generation;status('Loading…');$('refresh-appointments').disabled=true;$('refresh-appointments').setAttribute('aria-busy','true');
  try{const [{data,error},visits]=await Promise.all([supabase.rpc('get_my_video_appointments_v1'),supabase.rpc('get_my_in_person_appointments_v1')]);if(version!==generation||getUser()?.id!==user.id)return;if(error)throw error;const response={...validateAppointments(data),appointments:[...data.appointments]};let visitWarning='';if(!visits.error&&visits.data){const extra=validateAppointments(visits.data);response.appointments.push(...extra.appointments.filter(a=>a.kind==='in_person'&&a.can_join===false));}else if(visits.error?.code!=='PGRST202')visitWarning='Video appointments loaded. In-person appointments could not be loaded.';
   $('appointments-upcoming').replaceChildren();$('appointments-past').replaceChildren();
   if(!response.can_view){status('Appointments are unavailable for this account. Please contact GeorgeTech.',true);return;}
   const upcoming=response.appointments.filter(a=>a.status==='scheduled'),past=response.appointments.filter(a=>a.status!=='scheduled');
   $('appointments-upcoming').replaceChildren(...(upcoming.length?upcoming.sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at)).map(card):[node('p','appointment-empty','No upcoming appointments.')]));
   $('appointments-past').replaceChildren(...past.map(card));$('appointments-history').hidden=!past.length;status(visitWarning,Boolean(visitWarning));
  }catch{if(version===generation){$('appointments-upcoming').replaceChildren();$('appointments-past').replaceChildren();$('appointments-history').hidden=true;status('Couldn’t load appointments. Please try again.',true);}}
  finally{if(version===generation){$('refresh-appointments').disabled=false;$('refresh-appointments').setAttribute('aria-busy','false');}}
 }
 $('refresh-appointments').onclick=()=>load();return {load,clear};
}
