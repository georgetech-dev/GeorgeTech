/* Measured, finite sequences. Final HTML remains readable without animation. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const page = document.documentElement;
  if (!Element.prototype.animate || (!preference.matches && !page.classList.contains('home-motion-ready'))) return;
  const running = new Map(), seen = new WeakSet(), pending = new Map();
  const ease = 'cubic-bezier(.4,0,.2,1)';
  const available = () => !preference.matches && !document.hidden;
  const bounds = element => element.getBoundingClientRect();
  const smooth = t => t * t * (3 - 2 * t);
  const mix = (a,b,t) => a + (b-a)*t;
  const settle = root => {
    (running.get(root) || []).forEach(animation => animation.cancel());
    running.delete(root);
    root.dataset.motionState = 'complete';
  };
  function play(root, steps) {
    settle(root);
    if (!available()) return;
    root.dataset.motionState = 'playing';
    const animations = steps.filter(step => step.element).map(({element, frames, duration, delay = 0, easing = ease}) =>
      element.animate(frames, {duration, delay, easing, fill:'both'}));
    running.set(root, animations);
    Promise.all(animations.map(animation => animation.finished.catch(() => {}))).then(() => {
      if (running.get(root) === animations) settle(root);
    });
  }
  const step=(element,frames,duration,delay=0,easing=ease)=>({element,frames,duration,delay,easing});
  const reveal=(element,delay=0,duration=1800)=>step(element,[{clipPath:'inset(0 100% 0 0)',opacity:0},{clipPath:'inset(0 0% 0 0)',opacity:1}],duration,delay);
  function draw(element,duration=1800,delay=0){const length=element.getTotalLength();return step(element,[{strokeDasharray:`${length} ${length}`,strokeDashoffset:length,opacity:0},{strokeDasharray:`${length} ${length}`,strokeDashoffset:0,opacity:1}],duration,delay);}
  function trace(root,delay=900,duration=3900){return [...root.querySelectorAll('[data-trace]')].map(element=>{const len=element.getComputedTextLength()*2.9;return step(element,[{strokeDasharray:`${len} ${len}`,strokeDashoffset:len,fill:'transparent',opacity:0,offset:0},{strokeDasharray:`${len} ${len}`,strokeDashoffset:0,fill:'transparent',opacity:1,offset:.64},{strokeDasharray:`${len} ${len}`,strokeDashoffset:0,fill:'#1268ce',opacity:1,offset:1}],duration,delay);});}
  function base(root){const steps=[];root.querySelectorAll('[data-rest]').forEach((el,i)=>steps.push(reveal(el,400+i*450,1800)));steps.push(...trace(root));root.querySelectorAll('.trace-corner').forEach(el=>steps.push(draw(el,2200,700)));root.querySelectorAll('.trace-green').forEach(el=>steps.push(draw(el,1800,3400)));return steps;}
  function drawings(root,delay=0){return [...root.querySelectorAll('[data-draw]')].map((el,i)=>draw(el,1800,delay+Math.min(i*130,800)));}
  function orbit(){
    const root=document.querySelector('[data-orbit-title]');if(!root)return;
    const steps=[];root.querySelectorAll('[data-ink-title]').forEach((el,i)=>steps.push(reveal(el,200+i*600,1800)));
    const word=root.querySelector('.ink-word'),length=word.getComputedTextLength()*2.8;
    steps.push(step(word,[{strokeDasharray:`${length} ${length}`,strokeDashoffset:length,fill:'transparent',opacity:0,offset:0},{strokeDasharray:`${length} ${length}`,strokeDashoffset:0,fill:'transparent',opacity:1,offset:.62},{strokeDasharray:`${length} ${length}`,strokeDashoffset:0,fill:'#1268ce',opacity:1,offset:1}],4200,900),draw(root.querySelector('.ink-line'),2300,500),draw(root.querySelector('.ink-green'),2100,3700));play(root,steps);
  }
  function follow(){
    const root=document.querySelector('[data-follow-title]');if(!root)return;
    const steps=base(root);steps.push(...drawings(root,900));
    steps.push(step(root.querySelector('.rail-dot'),[{transform:'translateX(0)',opacity:0,offset:0},{transform:'translateX(0)',opacity:1,offset:.1},{transform:'translateX(374px)',opacity:1,offset:.85},{transform:'translateX(374px)',opacity:0,offset:1}],3300,1200,'linear'),reveal(root.querySelector('.sentence-tail'),3000,1600));play(root,steps);
  }
  function services(){const root=document.querySelector('[data-services-title]');if(root)play(root,[...base(root),...drawings(root,200)]);}
  function field(){
    const root=document.querySelector('[data-field-heading]');if(!root)return;
    const steps=base(root);steps.push(...drawings(root,600));
    root.querySelectorAll('.field-record').forEach((el,i)=>{const dx=312+i*73,dy=32-i*34,frames=[];for(let n=0;n<=80;n++){const t=n/80,u=t*t*(3-2*t);frames.push({offset:t,transform:`translate(${dx*u}px,${dy*u-35*Math.sin(t*Math.PI)}px)`,opacity:Math.min(1,(1-t)*7)});}steps.push(step(el,frames,3000,2200+i*400,'linear'));});
    steps.push(step(root.querySelector('.field-final-records'),[{opacity:0},{opacity:1}],1800,4600));play(root,steps);
  }
  function construction(root) {
    const tail=root.querySelector('.anagram-tail'), svg=tail.querySelector('.blueprint-guides');
    const rect=bounds(tail), words=[...tail.querySelectorAll('.blueprint-word')];
    svg.replaceChildren();
    svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
    // Baselines follow the actual word layout, including phone-width wrapping.
    const horizontal=new Set(),vertical=new Set();
    words.forEach(word=> {
      const r=bounds(word);
      horizontal.add(Math.round(r.top-rect.top+1)); horizontal.add(Math.round(r.bottom-rect.top-1));
      vertical.add(Math.max(1,Math.round(r.left-rect.left))); vertical.add(Math.min(rect.width-1,Math.round(r.right-rect.left)));
    });
    const lines=[];
    const add=(x1,y1,x2,y2)=> {
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      for(const [key,value] of Object.entries({x1,y1,x2,y2})) line.setAttribute(key,value);
      svg.append(line); lines.push(line);
    };
    horizontal.forEach(y=>add(0,y,rect.width,y));
    const horizontalCount=lines.length;
    vertical.forEach(x=>add(x,0,x,rect.height));
    const steps=lines.map((element,i)=> {
      const length=element.getTotalLength();
      return {element,duration:3300,delay:2850+(i<horizontalCount?i*95:650+(i-horizontalCount)*65),frames:[
        {strokeDasharray:`${length} ${length}`,strokeDashoffset:length,opacity:0,offset:0},
        {strokeDasharray:`${length} ${length}`,strokeDashoffset:0,opacity:.65,offset:.28},
        {strokeDasharray:`${length} ${length}`,strokeDashoffset:0,opacity:.65,offset:.72},
        {strokeDasharray:`${length} ${length}`,strokeDashoffset:0,opacity:0,offset:1}]};
    });
    words.forEach((element,i)=>steps.push({element,duration:1250,delay:4200+i*250,frames:[
      {clipPath:'inset(0 100% 0 0)',opacity:0},{clipPath:'inset(0 0% 0 0)',opacity:1}]}));
    return steps;
  }
  function anagram() {
    const root=document.querySelector('[data-anagram-title]');
    if(!root) return;
    settle(root);
    const steps=[];
    root.querySelectorAll('.anagram-word').forEach((word,wi)=> {
      const letters=[...word.querySelectorAll('.anagram-letter')],positions=letters.map(letter=>bounds(letter).left);
      letters.forEach((element,i)=> {
        const dx=positions[letters.length-1-i]-positions[i];
        steps.push({element,duration:3100,delay:wi*100,frames:[
          {transform:`translate(${dx}px,4px)`,opacity:0,offset:0},
          {transform:`translate(${dx}px,0)`,opacity:1,offset:.14},
          {transform:`translate(${dx}px,0)`,opacity:1,offset:.40},
          {transform:'none',opacity:1,offset:1}]});
      });
    });
    steps.push(...construction(root));
    play(root,steps);
  }
  function capability(root) {
    play(root,[{element:root.querySelector('.capability-label'),duration:1900,frames:[
      {opacity:0,transform:'translateY(-12px)',offset:0},
      {opacity:1,transform:'translateY(-12px)',offset:.3},{opacity:1,transform:'none',offset:1}]},
      {element:root.querySelector('svg'),duration:1900,frames:[
        {opacity:0,transform:'translateY(18px) scale(.72)',offset:0},
        {opacity:0,transform:'translateY(18px) scale(.72)',offset:.25},{opacity:1,transform:'none',offset:1}]}]);
  }
  function drawSteps(root,duration=1500,stagger=110) {
    return [...root.querySelectorAll('path:not([stroke-dasharray]),rect:not([stroke-dasharray]),circle:not([stroke="none"]),ellipse')].map((element,i)=> {
      const length=element.getTotalLength();
      return {element,duration,delay:Math.min(i*stagger,900),frames:[
        {strokeDasharray:`${length} ${length}`,strokeDashoffset:length,opacity:0},
        {strokeDasharray:`${length} ${length}`,strokeDashoffset:0,opacity:1}]};
    });
  }
  const principle=root=>play(root,drawSteps(root,1700,125));
  const service=root=>play(root,drawSteps(root,1600,120));
  function clock(root) {
    play(root,[{element:root.querySelector('.clock-minute'),duration:7000,frames:[
      {transform:'rotate(-330deg)'},{transform:'rotate(390deg)'}]},
      {element:root.querySelector('.clock-hour'),duration:7000,frames:[
        {transform:'rotate(-10deg)'},{transform:'rotate(50deg)'}]},
      {element:root.querySelector('.clock-halo'),duration:7000,frames:[
        {strokeDasharray:'460 460',strokeDashoffset:460,opacity:.3},
        {strokeDasharray:'460 460',strokeDashoffset:0,opacity:1}]}]);
  }

  const actions={hero:orbit,follow,services,field,anagram};
  const targets={hero:'[data-orbit-title]',follow:'[data-follow-title]',services:'[data-services-title]',field:'[data-field-heading]',anagram:'[data-anagram-title]'};
  function start(root,action){
    if(!root)return;
    seen.add(root);pending.delete(root);
    try{action(root);}catch(_error){settle(root);}
  }
  document.querySelectorAll('[data-replay]').forEach(button=>button.addEventListener('click',()=>{
    const action=actions[button.dataset.replay],root=document.querySelector(targets[button.dataset.replay]);
    if(action)start(root,action);
  }));
  document.addEventListener('focusin',event=>{
    const root=event.target.closest?.('[data-motion-root]'),record=pending.get(root);
    if(record)start(root,record.action);
  });
  // Hover, focus and press feedback never delays navigation or changes link semantics.
  document.querySelectorAll('[data-capability], .ledger-list > a').forEach(link=> {
    let feedback=[];
    const stop=()=>{feedback.forEach(a=>a.cancel());feedback=[];};
    const respond=()=> {
      stop(); if(!available()) return;
      const icon=link.querySelector('svg'), label=link.querySelector('.capability-label');
      const shape=link.querySelector('.visual-accent') || icon?.querySelector('path');
      if(icon) feedback.push(icon.animate([
        {transform:'translateY(0) rotate(0)'},{transform:'translateY(-5px) rotate(-6deg)',offset:.45},
        {transform:'translateY(-2px) rotate(0)'}],{duration:850,easing:ease,fill:'forwards'}));
      if(label) feedback.push(label.animate([{transform:'translateY(0)'},{transform:'translateY(3px)'}],{duration:650,easing:ease,fill:'forwards'}));
      if(shape) {const length=shape.getTotalLength();feedback.push(shape.animate([
        {strokeDasharray:`${length} ${length}`,strokeDashoffset:length},
        {strokeDasharray:`${length} ${length}`,strokeDashoffset:0}],{duration:1100,easing:ease}));}
    };
    link.addEventListener('pointerenter',respond);
    link.addEventListener('focus',respond);
    link.addEventListener('pointerleave',stop);
    link.addEventListener('blur',stop);
    link.addEventListener('click',()=> {
      if(available()) link.querySelector('svg')?.animate([
        {transform:'scale(1)'},{transform:'scale(.84)',offset:.35},{transform:'scale(1)'}],{duration:420,easing:ease});
    });
    preference.addEventListener('change',stop);
  });
  const updatePreference=()=> {
    document.body.classList.toggle('motion-enabled',!preference.matches);
    page.classList.toggle('home-motion-ready',!preference.matches);
    if(preference.matches){
      [...running.keys()].forEach(settle);
      pending.forEach((_record,root)=>{seen.add(root);settle(root);});pending.clear();
    }
  };
  preference.addEventListener('change',updatePreference); updatePreference();
  let frame,resizeTimer;
  function check() {
    frame=null;
    if(!available()) return;
    const vh=window.innerHeight,triggerLine=vh*.85;
    pending.forEach((record,element)=> {
      const r=bounds(element);
      const visible=r.bottom>0 && r.top<vh;
      if(visible && (record.immediate || r.top<=triggerLine)) start(element,record.action);
    });
  }
  const schedule=()=>{if(!frame) frame=requestAnimationFrame(check);};
  function register(element,action,immediate=false) {
    if(!element || seen.has(element)) return;
    if(preference.matches){seen.add(element);settle(element);return;}
    element.dataset.motionState='pending';
    pending.set(element,{action,immediate});
  }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',()=> {
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=> { [...running.keys()].forEach(settle);schedule(); },150);
  },{passive:true});
  document.addEventListener('visibilitychange',()=> {
    if(document.hidden) [...running.keys()].forEach(settle); else schedule();
  });
  preference.addEventListener('change',schedule);
  // Register immediately so the waiting state exists before fonts or scroll events.
    register(document.querySelector('[data-orbit-title]'),orbit,true);
    register(document.querySelector('[data-follow-title]'),follow);
    register(document.querySelector('[data-anagram-title]'),anagram);
    document.querySelectorAll('[data-capability]').forEach(el=>register(el,capability));
    document.querySelectorAll('.principle-art').forEach(el=>register(el,principle));
    document.querySelectorAll('[data-service-visual]').forEach(el=>register(el,service));
    register(document.querySelector('[data-services-title]'),services);
    register(document.querySelector('[data-field-heading]'),field);
    register(document.querySelector('[data-time-visual]'),clock);
  clearTimeout(window.homeMotionGuard);
  (document.fonts?.ready || Promise.resolve()).then(schedule,schedule);
  setTimeout(schedule,1500);
})();
