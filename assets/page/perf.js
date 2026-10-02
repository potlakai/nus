/* Page-only animation lifecycle. Nothing here changes the Companion artwork. */
(() => {
  const layouts = new Set();
  let layoutFrame = 0;
  function invalidate() {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      layouts.forEach(fn => fn());
    });
  }
  new ResizeObserver(invalidate).observe(document.body);
  addEventListener('resize', invalidate, { passive: true });
  document.addEventListener('load', invalidate, true);
  if (document.fonts) document.fonts.ready.then(invalidate);
  function observe(elements, change, margin = '160px') {
    const visible = new Set();
    let observed = false;
    const state = { active: false, destroy: () => observer.disconnect() };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target));
      const active = visible.size > 0;
      if (!observed || active !== state.active) { observed = true; state.active = active; change(active); }
    }, { rootMargin: margin });
    elements.forEach(el => observer.observe(el));
    return state;
  }
  function loop(element, draw, continuous = true) {
    let frame = 0, previous = 0;
    const gate = observe([element], active => { if (active) wake(); else stop(); }, '0px');
    function stop() { cancelAnimationFrame(frame); frame = 0; previous = 0; }
    function wake() {
      if (!frame && gate.active && !document.hidden) frame = requestAnimationFrame(t => {
        frame = 0;
        draw(t, previous ? Math.min(.05, (t - previous) / 1000) : 1 / 60);
        previous = t;
        if (typeof continuous === 'function' ? continuous() : continuous) wake();
      });
    }
    const visibility = () => document.hidden ? stop() : wake();
    document.addEventListener('visibilitychange', visibility);
    return { wake, destroy() { stop(); gate.destroy(); document.removeEventListener('visibilitychange', visibility); } };
  }
  window.NusMotion = { observe, loop, onLayout(fn) { layouts.add(fn); return () => layouts.delete(fn); } };

  // The host owns visibility: the renderer must not restart all Knots on tab return.
  if (!window.NusKnot3D) return;
  const mount = NusKnot3D.mount.bind(NusKnot3D), instances = new Set();
  document.addEventListener('visibilitychange', () => instances.forEach(sync => sync()));
  NusKnot3D.mount = (canvas, opts) => {
    const k = mount(canvas, { ...opts, pauseWhenHidden: false });
    if (!k || !k.pause || !k.resume) return k;
    const pause = k.pause.bind(k), resume = k.resume.bind(k), destroy = k.destroy.bind(k);
    const gate = observe([canvas], () => sync(), '120px');
    const sync = () => gate.active && !document.hidden ? resume() : pause();
    k.resume = sync;
    for (const name of ['setState', 'setUnravel', 'setReducedMotion']) {
      const original = k[name].bind(k);
      k[name] = (...args) => { original(...args); if (!gate.active || document.hidden) pause(); };
    }
    k.destroy = () => { gate.destroy(); instances.delete(sync); destroy(); };
    instances.add(sync); canvas._nusKnot = k; pause();
    return k;
  };
})();
