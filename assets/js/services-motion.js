(() => {
  'use strict';
  const page = document.documentElement;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (!Element.prototype.animate || (!preference.matches && !page.classList.contains('services-motion-ready'))) return;
  const roots = [...document.querySelectorAll('[data-services-motion]')];
  const pending = new Set();
  const running = new Map();
  const ease = 'cubic-bezier(.22,.7,.24,1)';
  let frame = null;

  function settle(root) {
    const animations = running.get(root) || [];
    running.delete(root);
    animations.forEach(animation => animation.cancel());
    pending.delete(root);
    root.dataset.motionState = 'complete';
  }
  function play(root, build) {
    pending.delete(root);
    root.dataset.motionState = 'playing';
    const animations = [];
    running.set(root, animations);
    const animate = (element, keyframes, options) => {
      if (!element) return;
      const animation = element.animate(keyframes, { fill: 'both', easing: ease, ...options });
      animations.push(animation);
    };
    try { build(animate); } catch (_error) { settle(root); return; }
    Promise.all(animations.map(animation => animation.finished.catch(() => {}))).then(() => {
      if (running.get(root) === animations) settle(root);
    });
  }

  function startHeading(root) {
    play(root, animate => {
      const phrases = [...root.querySelectorAll('.start-phrase')];
      phrases.forEach((phrase, index) => animate(phrase, [
        { opacity: 0, transform: `translate(${index * 9}px,${24 + index * 12}px) rotate(${index - 1}deg)` },
        { opacity: 1, transform: 'translate(0,0) rotate(0deg)' }
      ], { duration: 1700, delay: index * 420 }));
      animate(root.querySelector('.outcome-line path'), [
        { strokeDasharray: '1', strokeDashoffset: 1 },
        { strokeDasharray: '1', strokeDashoffset: 0 }
      ], { duration: 1400, delay: 1500 });
    });
  }

  function drawDiagram(root) {
    play(root, animate => {
      root.querySelectorAll('path, rect, circle').forEach((shape, index) => {
        const length = shape.getTotalLength();
        animate(shape, [
          { opacity: 0, strokeDasharray: `${length}`, strokeDashoffset: length },
          { opacity: 1, strokeDasharray: `${length}`, strokeDashoffset: 0 }
        ], { duration: 1450, delay: Math.min(index, 12) * 85 });
      });
      root.querySelectorAll('.diagram-piece').forEach((piece, index) => animate(piece, [
        { opacity: 0, transform: 'translateY(9px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 1100, delay: index * 220 }));
    });
  }

  function climbWords(root) {
    const words = [...root.querySelectorAll('.step-word')];
    const stage = root.closest('.step-sentence-stage').getBoundingClientRect();
    const boxes = words.map(word => word.getBoundingClientRect());
    const origin = boxes[3]; // Every word flies in from the final position of “first”.
    const totalWidth = boxes.reduce((sum, box) => sum + box.width, 0);
    const gap = 7;
    const scale = Math.min(.72, (stage.width - 20 - gap * (words.length - 1)) / totalWidth);
    const stairWidth = totalWidth * scale + gap * (words.length - 1);
    let stairX = stage.left + (stage.width - stairWidth) / 2;
    // Temporary word positions form an ascending staircase. No step outlines are rendered.
    const lowY = stage.top + stage.height * .67;
    play(root, animate => {
      words.forEach((word, index) => {
        const box = boxes[index];
        const x = stairX - box.left;
        const y = lowY - index * 14 - box.top;
        stairX += box.width * scale + gap;
        const pose = (dx, dy, size = scale) => `translate(${dx}px,${dy}px) scale(${size})`;
        animate(word, [
          { offset: 0, opacity: 0, transform: pose(origin.left - box.left, origin.top - box.top, .38), easing: ease },
          { offset: .07, opacity: 1, transform: pose(origin.left - box.left, origin.top - box.top, .48), easing: ease },
          { offset: .23, opacity: 1, transform: pose(x, y), easing: 'ease-out' },
          { offset: .32, opacity: 1, transform: pose(x + 2, y - 33), easing: 'ease-in' },
          { offset: .41, opacity: 1, transform: pose(x + 5, y - 14), easing: 'ease-out' },
          { offset: .50, opacity: 1, transform: pose(x + 7, y - 47), easing: 'ease-in' },
          { offset: .59, opacity: 1, transform: pose(x + 10, y - 28), easing: ease },
          { offset: .70, opacity: 1, transform: pose(x + 10, y - 28), easing: ease },
          { offset: .84, opacity: 1, transform: pose(0, -16, 1), easing: 'ease-in' },
          { offset: .93, opacity: 1, transform: pose(0, 3, 1), easing: 'ease-out' },
          { offset: 1, opacity: 1, transform: 'translate(0,0) scale(1)' }
        ], { duration: 4900, delay: index * 150, easing: 'linear' });
      });
    });
  }

  function start(root) {
    if (!pending.has(root)) return;
    if (preference.matches) { settle(root); return; }
    const actions = { start: startHeading, diagram: drawDiagram, steps: climbWords };
    try { (actions[root.dataset.servicesMotion] || settle)(root); } catch (_error) { settle(root); }
  }
  function check() {
    frame = null;
    if (document.hidden || preference.matches) return;
    pending.forEach(root => {
      const box = root.getBoundingClientRect();
      if (box.bottom > 0 && box.top <= innerHeight * .85) start(root);
    });
  }
  const schedule = () => { if (frame === null) frame = requestAnimationFrame(check); };
  roots.forEach(root => {
    if (preference.matches) settle(root);
    else { root.dataset.motionState = 'pending'; pending.add(root); }
  });
  window.addEventListener('scroll', schedule, { passive: true });
  let resizeTimer;
  window.addEventListener('resize', () => {
    // Settle into the responsive final layout rather than keeping stale coordinates.
    [...running.keys()].forEach(settle);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(schedule, 120);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) [...running.keys()].forEach(settle);
    else schedule();
  });
  preference.addEventListener('change', () => {
    if (preference.matches) {
      [...running.keys(), ...pending].forEach(settle);
      page.classList.remove('services-motion-ready');
    }
    schedule();
  });
  clearTimeout(window.servicesMotionGuard);
  (document.fonts?.ready || Promise.resolve()).then(schedule, schedule);
  setTimeout(schedule, 1500);
})();
