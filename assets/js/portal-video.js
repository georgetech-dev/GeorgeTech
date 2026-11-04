let sdkPromise=null;
function sdk(){
 if(window.Daily)return Promise.resolve(window.Daily);
 if(sdkPromise)return sdkPromise;
 sdkPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://unpkg.com/@daily-co/daily-js@0.94.0';script.crossOrigin='anonymous';script.referrerPolicy='no-referrer';
  const fail=()=>{clearTimeout(timer);script.remove();sdkPromise=null;reject(new Error('Video service unavailable.'));};
  const timer=setTimeout(fail,18000);script.onerror=fail;script.onload=()=>{clearTimeout(timer);if(window.Daily)resolve(window.Daily);else fail();};document.head.append(script);
 });return sdkPromise;
}
export function validateCallAccess(data){
 let url;try{url=new URL(data.room_url);}catch{throw new Error('Invalid appointment room.');}
 if(url.protocol!=='https:'||url.hostname!=='georgetech.daily.co'||url.port||url.username||url.password||url.search||url.hash||!/^\/gt-[a-f0-9]{32}$/.test(url.pathname)||typeof data.token!=='string'||data.token.length<16||data.token.length>8000||/\s/.test(data.token)||!Number.isFinite(Date.parse(data.expires_at))||Date.parse(data.expires_at)<=Date.now())throw new Error('Invalid appointment access.');
 return {url:url.href,token:data.token,userName:typeof data.user_name==='string'?data.user_name.slice(0,80):'Customer'};
}
export function openPortalVideo({getAccess,onClose=()=>{},returnLabel='Appointments'}){
 const previous=document.activeElement,overlay=document.createElement('section');
 overlay.className='portal-video-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','GeorgeTech video call');
 overlay.innerHTML='<div class="portal-video-connecting"><p role="status">Opening your call…</p><button type="button" class="portal-video-cancel">Cancel</button></div><div class="portal-video-mount"></div><div class="portal-video-finish" hidden><img src="assets/images/georgetech-logo.png" alt="GeorgeTech" width="145" height="134"><h2>You’ve left the call</h2><p class="portal-video-countdown" role="status"></p><button type="button" class="portal-video-close">Return now</button></div>';
 const mount=overlay.querySelector('.portal-video-mount'),connecting=overlay.querySelector('.portal-video-connecting'),finish=overlay.querySelector('.portal-video-finish'),countdown=overlay.querySelector('.portal-video-countdown');
 let frame=null,closed=false,finished=false,timer=null;
 const inert=[...document.body.children].map(element=>[element,element.inert]);inert.forEach(([element])=>{element.inert=true;});document.body.append(overlay);document.body.classList.add('portal-video-active');
 const exitFullscreen=()=>{try{if((document.fullscreenElement||document.webkitFullscreenElement)===overlay){const exit=document.exitFullscreen||document.webkitExitFullscreen;if(exit)Promise.resolve(exit.call(document)).catch(()=>{});}}catch{}};
 async function destroy(){const old=frame;frame=null;if(old)try{await old.destroy();}catch{}}
 function close(reason='closed'){if(closed)return;closed=true;clearTimeout(timer);window.removeEventListener('pagehide',pagehide);exitFullscreen();void destroy();overlay.remove();document.body.classList.remove('portal-video-active');inert.forEach(([element,value])=>{element.inert=value;});previous?.focus();onClose(reason);}
 const pagehide=()=>close('pagehide');
 function end(error=false){
  if(closed||finished)return;finished=true;void destroy();mount.hidden=true;connecting.hidden=true;finish.hidden=false;exitFullscreen();
  if(error){finish.querySelector('h2').textContent='Couldn’t connect';countdown.textContent='Please return and try again.';}
  else {let seconds=5;const tick=()=>{if(closed)return;countdown.textContent='Returning to '+returnLabel+' in '+seconds+' '+(seconds===1?'second':'seconds')+'…';if(seconds===0){close('returned');return;}seconds--;timer=setTimeout(tick,1000);};tick();}
  finish.querySelector('button').focus();
 }
 overlay.querySelector('.portal-video-close').onclick=()=>close(finished?'returned':'cancelled');overlay.querySelector('.portal-video-cancel').onclick=()=>close('cancelled');overlay.querySelector('.portal-video-cancel').focus();
 // Request during the Join click, before asynchronous access/SDK loading consumes activation.
 try{const request=overlay.requestFullscreen||overlay.webkitRequestFullscreen;if(request)Promise.resolve(request.call(overlay)).catch(()=>{});}catch{}
 // Daily retains its fullscreen button for browsers that decline the request.
 window.addEventListener('pagehide',pagehide);
 void (async()=>{try{const access=validateCallAccess(await getAccess());if(closed||finished)return;const Daily=await sdk();if(closed||finished)return;
  const own=Daily.createFrame(mount,{iframeStyle:{width:'100%',height:'100%',border:'0'},showLeaveButton:true,showFullscreenButton:true});frame=own;
  own.on('loaded',()=>{if(!closed&&!finished)connecting.hidden=true;});own.on('joining-meeting',()=>{if(!closed&&!finished)connecting.hidden=true;});own.on('joined-meeting',()=>{if(!closed&&!finished)connecting.hidden=true;});
  own.on('left-meeting',()=>end());own.on('error',()=>end(true));
  // Prebuilt exposes its own pre-call screen as soon as join starts.
  connecting.hidden=true;await own.join(access);
 }catch{end(true);}})();
 return {close};
}
