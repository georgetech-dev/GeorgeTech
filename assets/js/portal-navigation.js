export function firstNameGreeting(profile,user){
 const meta=user?.user_metadata||{};const name=[profile?.first_name,profile?.full_name,profile?.display_name,meta.given_name,meta.full_name,meta.name].find(v=>typeof v==='string'&&v.trim()&&!v.includes('@'));
 return name?'Hello '+name.trim().split(/\s+/u)[0]:'Hello';
}
export function initPortalNavigation(){
 const nav=document.getElementById('portal-navigation'),toggle=document.getElementById('portal-drawer-toggle'),hide=document.getElementById('portal-dock-hide'),tabs=document.getElementById('portal-tabs'),mobile=matchMedia('(max-width:680px)'),items=()=>[...tabs.querySelectorAll('.portal-tab')];
 let state=1,timer=null,drag=null,skipClick=false;
 const cancelHint=()=>clearTimeout(timer);
 function stops(){const visible=items().filter((_,i)=>!mobile.matches||state===2||state===1&&i<4);items().forEach((b,i)=>{const concealed=!visible.includes(b);b.inert=concealed;b.tabIndex=-1;if(concealed)b.setAttribute('aria-hidden','true');else b.removeAttribute('aria-hidden');});const active=visible.find(b=>b.getAttribute('aria-selected')==='true')||visible[0];if(active)active.tabIndex=0;}
 function measure(){
  if(!mobile.matches){nav.style.removeProperty('--dock-offset');document.body.style.setProperty('--portal-dock-height','0px');return;}
  const row=items()[0]?.offsetHeight||60,style=getComputedStyle(tabs),padding=(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0),gap=parseFloat(style.rowGap)||4;
  const handle=toggle.offsetHeight||28,total=nav.offsetHeight||handle+padding+Math.ceil(items().length/4)*row+gap;
  const visible=state===2?total:state===1?Math.min(total,handle+row+padding):handle;
  nav.style.setProperty('--dock-offset',Math.max(0,total-visible)+'px');document.body.style.setProperty('--portal-dock-height',visible+'px');
 }
 function setState(value){state=Math.max(0,Math.min(2,value));const hiddenActive=items().findIndex(b=>b===document.activeElement);if(mobile.matches&&hiddenActive>=0&&(state===0||state===1&&hiddenActive>=4))toggle.focus({preventScroll:true});nav.dataset.dockState=String(state);nav.classList.toggle('expanded',state===2);toggle.setAttribute('aria-expanded',String(state===2));toggle.querySelector('span').textContent=state===2?'Fewer options':state===0?'Show more':'More options';hide.hidden=state===0;stops();measure();}
 toggle.onclick=()=>{if(skipClick){skipClick=false;return;}cancelHint();setState(state===2?1:2);};hide.onclick=()=>{cancelHint();setState(0);toggle.focus({preventScroll:true});};
 nav.addEventListener('pointerdown',cancelHint);nav.addEventListener('focusin',cancelHint);nav.addEventListener('keydown',e=>{if(e.key==='Escape'&&mobile.matches){cancelHint();setState(Math.max(0,state-1));toggle.focus();}});
 toggle.addEventListener('pointerdown',e=>{if(!mobile.matches||e.button!==0)return;cancelHint();drag={id:e.pointerId,y:e.clientY,offset:parseFloat(nav.style.getPropertyValue('--dock-offset'))||0,moved:false};toggle.setPointerCapture(e.pointerId);});
 toggle.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dy=e.clientY-drag.y;if(Math.abs(dy)>6)drag.moved=true;if(drag.moved){nav.style.transition='none';nav.style.transform=`translateY(${Math.max(0,Math.min(nav.offsetHeight-toggle.offsetHeight,drag.offset+dy))}px)`;}});
 function finish(e,cancelled=false){if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;nav.style.removeProperty('transition');nav.style.removeProperty('transform');if(d.moved){skipClick=true;setTimeout(()=>{skipClick=false;},0);const dy=e.clientY-d.y;setState(cancelled?state:state+(dy<-20?1:dy>20?-1:0));}}
 toggle.addEventListener('pointerup',e=>finish(e));toggle.addEventListener('pointercancel',e=>finish(e,true));mobile.addEventListener('change',()=>{cancelHint();setState(1);});if('ResizeObserver'in window){const observer=new ResizeObserver(measure);observer.observe(nav);observer.observe(tabs);}stops();
 return {welcome(){cancelHint();let seen=false;try{seen=sessionStorage.getItem('gt-portal-dock-hint-v4')==='1';sessionStorage.setItem('gt-portal-dock-hint-v4','1');}catch{}setState(mobile.matches&&!seen?2:1);if(mobile.matches&&!seen)timer=setTimeout(()=>{if(!drag)setState(1);},1400);},panelChanged(){cancelHint();setState(1);if(mobile.matches)window.scrollTo({top:0,behavior:'instant'});},revealTab(tab){cancelHint();if(mobile.matches&&items().indexOf(tab)>=4)setState(2);},clear(){cancelHint();setState(1);}};
}
