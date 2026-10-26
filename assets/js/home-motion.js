/* Measured, finite sequences. Final HTML remains readable without animation. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (!Element.prototype.animate) return;
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
  const translateTo = (element, stage, x, y, scale = 1) => {
    const r = bounds(element);
    return `translate(${stage.left+x-r.left-r.width/2}px,${stage.top+y-r.top-r.height/2}px) scale(${scale})`;
  };
  // Dense samples form a continuous ellipse; a tangent-matched Bezier eases into type.
  function curvedFrames(element, stage, point, scale, endAt = .70) {
    const r = bounds(element);
    const final = {x:r.left-stage.left+r.width/2, y:r.top-stage.top+r.height/2};
    const at = point(endAt), before = point(endAt-.001);
    const c1 = {x:at.x+(at.x-before.x)/.001*(1-endAt)/3,
      y:at.y+(at.y-before.y)/.001*(1-endAt)/3};
    const tangent=Math.hypot(c1.x-at.x,c1.y-at.y);
    const limit=Math.min(stage.width,stage.height)*.28;
    if(tangent>limit) { c1.x=at.x+(c1.x-at.x)*limit/tangent; c1.y=at.y+(c1.y-at.y)*limit/tangent; }
    const c2 = {x:mix(at.x,final.x,.90),y:mix(at.y,final.y,.90)};
    const frames=[];
    for(let i=0;i<=100;i++) {
      const t=i/100;
      let p, size=scale;
      if(t<=endAt) p=point(t);
      else {
        const u=(t-endAt)/(1-endAt), v=1-u;
        p={x:v*v*v*at.x+3*v*v*u*c1.x+3*v*u*u*c2.x+u*u*u*final.x,
          y:v*v*v*at.y+3*v*v*u*c1.y+3*v*u*u*c2.y+u*u*u*final.y};
        size=mix(scale,1,smooth(u));
      }
      frames.push({offset:t,transform:translateTo(element,stage,p.x,p.y,size),opacity:Math.min(1,t/.07)});
    }
    frames[100]={offset:1,transform:'none',opacity:1};
    return frames;
  }
  function orbit() {
    const root=document.querySelector('[data-orbit-title]');
    if(!root) return;
    settle(root);
    const stage=bounds(root.querySelector('.title-stage'));
    const cx=stage.width*.5, cy=stage.height*.49;
    const steps=[...root.querySelectorAll('[data-title-word]')].map((element,i)=> {
      const phase=-Math.PI/2+i*Math.PI*2/5;
      const scale=.43;
      const half=bounds(element).width*scale/2;
      const rx=Math.max(0,stage.width/2-half-8), ry=stage.height*.37;
      const point=t=>({x:cx+rx*Math.cos(phase+t*2*Math.PI/.70), y:cy+ry*Math.sin(phase+t*2*Math.PI/.70)});
      return {element,duration:5900,easing:'linear',frames:curvedFrames(element,stage,point,scale)};
    });
    const work=root.querySelector('[data-title-work]');
    const centre=translateTo(work,stage,cx,cy,.91);
    steps.push({element:work,duration:5900,frames:[
      {transform:centre,opacity:0,offset:0},{transform:centre,opacity:1,offset:.08},
      {transform:centre,opacity:1,offset:.70},{transform:'none',opacity:1,offset:1}]});
    play(root,steps);
  }
  function follow() {
    const root=document.querySelector('[data-follow-title]');
    if(!root) return;
    settle(root);
    const stage=bounds(root), words=[...root.querySelectorAll('[data-follow-word]')];
    const software=words[0],job=words[4];
    const mobile=stage.width<400, scale=mobile ? .66 : .73;
    const rx=Math.max(8,stage.width/2-bounds(software).width*scale/2-12);
    const ry=Math.max(18,stage.height*.32), cx=stage.width/2,cy=stage.height*.46;
    const route=phase=>t=> {
      const angle=-1.15+phase+t*Math.PI*2*1.18/.72;
      return {x:cx+rx*Math.cos(angle),y:cy+ry*Math.sin(angle)};
    };
    const steps=[{element:job,duration:7300,easing:'linear',frames:curvedFrames(job,stage,route(0),scale,.72)},
      {element:software,duration:7300,easing:'linear',frames:curvedFrames(software,stage,route(-.95),scale,.72)}];
    words.forEach((element,i)=> {
      if(element===software || element===job) return;
      steps.push({element,duration:1100,delay:5300+i*65,frames:[
        {opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'none'}]});
    });
    play(root,steps);
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
  function field(root) {
    const steps=drawSteps(root,1700,150);
    const signal=root.querySelector('.field-signal');
    steps.push({element:signal,duration:3400,delay:550,easing:'linear',frames:[
      {transform:'translate(0,0)',opacity:0,offset:0},{transform:'translate(0,0)',opacity:1,offset:.1},
      {transform:'translate(20px,0)',opacity:1,offset:.30},{transform:'translate(32px,-14px)',opacity:1,offset:.45},
      {transform:'translate(32px,-30px)',opacity:1,offset:.6},{transform:'translate(46px,-44px)',opacity:1,offset:.75},
      {transform:'translate(66px,-44px)',opacity:0,offset:1}]});
    steps.push({element:root.querySelector('.field-screen'),duration:2100,delay:1700,frames:[
      {opacity:.12,transform:'translateY(7px)'},{opacity:1,transform:'none'}]});
    const heading=root.parentElement.querySelector('[data-field-heading]');
    steps.push({element:heading.querySelector('span:last-child'),duration:2000,delay:1800,frames:[
      {backgroundSize:'0% 2px'},{backgroundSize:'100% 2px'}]});
    play(root,steps);
  }
  function clock(root) {
    play(root,[{element:root.querySelector('.clock-minute'),duration:7000,frames:[
      {transform:'rotate(-330deg)'},{transform:'rotate(390deg)'}]},
      {element:root.querySelector('.clock-hour'),duration:7000,frames:[
        {transform:'rotate(-10deg)'},{transform:'rotate(50deg)'}]},
      {element:root.querySelector('.clock-halo'),duration:7000,frames:[
        {strokeDasharray:'460 460',strokeDashoffset:460,opacity:.3},
        {strokeDasharray:'460 460',strokeDashoffset:0,opacity:1}]},
      {element:root.querySelector('.clock-check'),duration:1400,delay:5500,frames:[
        {opacity:0,transform:'scale(.8)'},{opacity:1,transform:'none'}]}]);
  }

  const actions={hero:orbit,follow,anagram};
  document.querySelectorAll('[data-replay]').forEach(button=>button.addEventListener('click',()=>actions[button.dataset.replay]?.()));
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
    if(preference.matches) [...running.keys()].forEach(settle);
  };
  preference.addEventListener('change',updatePreference); updatePreference();
  let frame,resizeTimer;
  function check() {
    frame=null;
    if(!available()) return;
    const vh=window.innerHeight,centre=vh*.5,band=vh*.075;
    pending.forEach((record,element)=> {
      const r=bounds(element),distance=(r.top+r.bottom)/2-centre;
      const visible=r.bottom>0 && r.top<vh;
      if(visible && (record.immediate || Math.abs(distance)<=band)) {
        seen.add(element);pending.delete(element);record.action(element);
      }
    });
  }
  const schedule=()=>{if(!frame) frame=requestAnimationFrame(check);};
  function register(element,action,immediate=false) {
    if(!element || seen.has(element)) return;
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
  (document.fonts?.ready || Promise.resolve()).then(()=> {
    register(document.querySelector('[data-orbit-title]'),orbit,true);
    register(document.querySelector('[data-follow-title]'),follow);
    register(document.querySelector('[data-anagram-title]'),anagram);
    document.querySelectorAll('[data-capability]').forEach(el=>register(el,capability));
    document.querySelectorAll('.principle-art').forEach(el=>register(el,principle));
    document.querySelectorAll('[data-service-visual]').forEach(el=>register(el,service));
    register(document.querySelector('[data-field-build]'),field);
    register(document.querySelector('[data-time-visual]'),clock);
    schedule();
  });
})();
