let sdkPromise=null;
function sdk(){
 if(window.Daily)return Promise.resolve(window.Daily);
 if(sdkPromise)return sdkPromise;
 sdkPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://unpkg.com/@daily-co/daily-js@0.94.0';script.crossOrigin='anonymous';script.referrerPolicy='no-referrer';
  const fail=()=>{clearTimeout(timer);script.remove();sdkPromise=null;reject(new Error('The video service could not load. Check your connection and try again.'));};
  const timer=setTimeout(fail,18000);script.onerror=fail;script.onload=()=>{clearTimeout(timer);if(window.Daily)resolve(window.Daily);else fail();};document.head.append(script);
 });return sdkPromise;
}
export function validateCallAccess(data){
 let url;try{url=new URL(data.room_url);}catch{throw new Error('Invalid appointment room.');}
 if(url.protocol!=='https:'||url.hostname!=='georgetech.daily.co'||url.port||url.username||url.password||url.search||url.hash||!/^\/gt-[a-f0-9]{32}$/.test(url.pathname)||typeof data.token!=='string'||data.token.length<16||data.token.length>8000||!Number.isFinite(Date.parse(data.expires_at))||Date.parse(data.expires_at)<=Date.now())throw new Error('Invalid appointment access.');
 return {url:url.href,token:data.token,userName:typeof data.user_name==='string'?data.user_name.slice(0,80):'Customer'};
}
export function openPortalVideo({getAccess,onClose=()=>{}}){
 const previous=document.activeElement,overlay=document.createElement('section');
 overlay.className='portal-video-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','GeorgeTech video appointment');
 overlay.innerHTML='<div class="portal-video-toolbar"><div><strong>GeorgeTech</strong><span class="portal-video-status" role="status">Opening your appointment…</span></div><button type="button" class="portal-video-fullscreen">Full screen</button><button type="button" class="portal-video-leave">Leave call</button></div><div class="portal-video-mount"></div><div class="portal-video-finish" hidden><h2>You’ve left the call</h2><p>Return to your appointments whenever you’re ready.</p><button type="button" class="button button-primary portal-video-close">Close &amp; return to Appointments</button></div>';
 const mount=overlay.querySelector('.portal-video-mount'),message=overlay.querySelector('.portal-video-status'),finish=overlay.querySelector('.portal-video-finish'),leaveButton=overlay.querySelector('.portal-video-leave');
 let frame=null,closed=false,finished=false;
 const inert=[...document.body.children].map(element=>[element,element.inert]);inert.forEach(([element])=>{element.inert=true;});document.body.append(overlay);document.body.classList.add('portal-video-active');
 const exitFullscreen=()=>{try{if(document.fullscreenElement===overlay)Promise.resolve(document.exitFullscreen()).catch(()=>{});}catch{}};
 const fullscreen=()=>{try{if(document.fullscreenElement===overlay)exitFullscreen();else Promise.resolve(overlay.requestFullscreen?.()).catch(()=>{});}catch{}};
 async function destroy(){const old=frame;frame=null;if(old)try{await old.destroy();}catch{}}
 function close(){if(closed)return;closed=true;window.removeEventListener('pagehide',close);exitFullscreen();void destroy();overlay.remove();document.body.classList.remove('portal-video-active');inert.forEach(([element,value])=>{element.inert=value;});previous?.focus();onClose();}
 function end(error=false){if(closed||finished)return;finished=true;void destroy();mount.hidden=true;finish.hidden=false;leaveButton.hidden=true;overlay.querySelector('.portal-video-fullscreen').hidden=true;message.textContent=error?'The call could not connect.':'Call finished';if(error){finish.querySelector('h2').textContent='We couldn’t connect your call';finish.querySelector('p').textContent='Return to Appointments and try Join again. If it continues, contact GeorgeTech.';}finish.querySelector('button').focus();}
 overlay.querySelector('.portal-video-close').onclick=close;leaveButton.onclick=()=>end();overlay.querySelector('.portal-video-fullscreen').onclick=fullscreen;leaveButton.focus();
 // Run from the original Join click, before network waits consume user activation.
 fullscreen();window.addEventListener('pagehide',close);
 void (async()=>{try{const access=validateCallAccess(await getAccess());if(closed||finished)return;const Daily=await sdk();if(closed||finished)return;
  const own=Daily.createFrame(mount,{iframeStyle:{width:'100%',height:'100%',border:'0'},showLeaveButton:true,showFullscreenButton:false});frame=own;
  own.on('joined-meeting',()=>{if(!closed&&!finished)message.textContent='You’re in your GeorgeTech appointment.';});
  own.on('left-meeting',()=>end());own.on('error',()=>end(true));
  await own.join(access);
 }catch{end(true);}})();
 return {close};
}
