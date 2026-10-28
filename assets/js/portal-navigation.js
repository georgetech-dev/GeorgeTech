export function firstNameGreeting(profile,user){
 const meta=user?.user_metadata||{};
 const name=[profile?.first_name,profile?.full_name,profile?.display_name,meta.given_name,meta.full_name,meta.name].find(value=>typeof value==='string'&&value.trim()&&!value.includes('@'));
 return name?'Hello '+name.trim().split(/\s+/u)[0]:'Hello';
}
export function initPortalNavigation(){
 const nav=document.getElementById('portal-navigation'),toggle=document.getElementById('portal-drawer-toggle'),tabs=document.getElementById('portal-tabs');
 const mobile=matchMedia('(max-width:680px)'),buttons=()=>[...tabs.querySelectorAll('.portal-tab')];
 let timer=null,interacted=false,isExpanded=true,drag=null,skipClick=false;
 const cancelWelcome=()=>{interacted=true;clearTimeout(timer);};
 function tabStops(){
  const items=buttons(),visible=items.filter((tab,index)=>!mobile.matches||isExpanded||index<4);
  items.forEach((tab,index)=>{const concealed=mobile.matches&&!isExpanded&&index>=4;tab.inert=concealed;if(concealed)tab.setAttribute('aria-hidden','true');else tab.removeAttribute('aria-hidden');tab.tabIndex=-1;});
  const target=visible.find(tab=>tab.getAttribute('aria-selected')==='true')||visible[0];if(target)target.tabIndex=0;
 }
 function measure(){
  if(!mobile.matches){nav.style.removeProperty('--portal-hidden-height');document.body.style.setProperty('--portal-dock-height','0px');return;}
  const first=buttons()[0],style=getComputedStyle(tabs);
  const firstRow=(first?.offsetHeight||72)+(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0);
  const hidden=Math.max(0,tabs.offsetHeight-firstRow);
  nav.style.setProperty('--portal-hidden-height',hidden+'px');
  document.body.style.setProperty('--portal-dock-height',Math.ceil(nav.offsetHeight-(isExpanded?0:hidden))+'px');
 }
 function expanded(value){
  if(!value&&buttons().slice(4).includes(document.activeElement))toggle.focus({preventScroll:true});
  isExpanded=value;nav.classList.toggle('expanded',value);toggle.setAttribute('aria-expanded',String(value));toggle.querySelector('span').textContent=value?'Fewer options':'More options';tabStops();measure();
 }
 function collapse(){clearTimeout(timer);expanded(false);}
 toggle.addEventListener('click',()=>{if(skipClick){skipClick=false;return;}cancelWelcome();expanded(!isExpanded);});
 nav.addEventListener('pointerdown',cancelWelcome);nav.addEventListener('focusin',cancelWelcome);
 nav.addEventListener('keydown',event=>{if(event.key==='Escape'&&isExpanded&&mobile.matches){collapse();toggle.focus();}});
 // Dragging the handle moves the entire sheet; clicks and keyboard activation also work.
 toggle.addEventListener('pointerdown',event=>{if(!mobile.matches||event.button!==0)return;const max=parseFloat(nav.style.getPropertyValue('--portal-hidden-height'))||0;drag={id:event.pointerId,start:event.clientY,origin:isExpanded?0:max,max,moved:false};toggle.setPointerCapture(event.pointerId);});
 toggle.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;const dy=event.clientY-drag.start;if(Math.abs(dy)>5)drag.moved=true;if(!drag.moved)return;nav.style.transition='none';nav.style.transform=`translateY(${Math.min(drag.max,Math.max(0,drag.origin+dy))}px)`;});
 function endDrag(event,cancelled=false){if(!drag||event.pointerId!==drag.id)return;const state=drag;drag=null;nav.style.removeProperty('transition');nav.style.removeProperty('transform');if(state.moved){skipClick=true;setTimeout(()=>{skipClick=false;},0);const dy=event.clientY-state.start;expanded(cancelled?isExpanded:Math.abs(dy)>20?dy<0:state.origin+dy<state.max/2);}}
 toggle.addEventListener('pointerup',event=>endDrag(event));toggle.addEventListener('pointercancel',event=>endDrag(event,true));
 mobile.addEventListener('change',()=>{clearTimeout(timer);expanded(false);measure();});
 if('ResizeObserver'in window){const observer=new ResizeObserver(measure);observer.observe(nav);observer.observe(tabs);}
 tabStops();
 return {
  welcome(){clearTimeout(timer);if(mobile.matches){interacted=false;expanded(true);timer=setTimeout(()=>{if(!interacted&&!nav.contains(document.activeElement))collapse();},4000);}else{expanded(false);measure();}},
  panelChanged(){tabStops();if(mobile.matches)window.scrollTo({top:Math.max(0,document.getElementById('ticket-section').getBoundingClientRect().top+window.scrollY-90),behavior:'instant'});},
  revealTab(tab){cancelWelcome();if(mobile.matches&&buttons().indexOf(tab)>=4)expanded(true);},
  clear(){collapse();}
 };
}
