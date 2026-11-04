/* The released Knot on the landing page. knot-spec.js and knot-engine.js are the Companion's own files;
   this is the small host the page needs, the same job renderer.js does in the app.
   NusKnot3D.mount(canvas, { thread, origin, place, onArrive }) returns the engine's knot handle plus:
     knot.strand   setTarget(rect), rewind(), getState(), lasso(rect, landing), flyHome(), arrive(fn)
   With `origin` (an element) the engine works in that element's coordinates instead of the window's, so the
   thread and the Knot scroll with the section and nothing has to be redrawn on scroll. Every rect passed in
   here is a normal window rect. */
(function () {
  if (!window.NusKnotEngine) return;
  function localize(canvas, origin) {
    const box = canvas.parentElement;
    const toLocal = (r) => { const o = origin.getBoundingClientRect(); return { left: r.left - o.left, top: r.top - o.top, right: r.right - o.left, bottom: r.bottom - o.top, width: r.width, height: r.height, x: r.left - o.left, y: r.top - o.top }; };
    const own = canvas.getBoundingClientRect.bind(canvas);
    canvas.getBoundingClientRect = () => toLocal(own());
    Object.defineProperty(canvas, "parentElement", { configurable: true, value: { getBoundingClientRect: () => toLocal(box.getBoundingClientRect()) } });
    return box;
  }
  function mount(canvas, opts) {
    opts = opts || {};
    if (!canvas) return null;
    const origin = opts.origin || null, box = origin ? localize(canvas, origin) : canvas.parentElement;
    if (opts.thread && origin) origin.appendChild(opts.thread);
    const local = (r) => { if (!origin) return r; const o = origin.getBoundingClientRect(); return { x: r.x - o.left, y: r.y - o.top, w: r.w, h: r.h }; };
    let moved = { x: 0, y: 0 }, arriveFn = null;
    const engine = NusKnotEngine.mount({ body: canvas, thread: opts.thread || null, pauseWhenHidden: false, hooks: {
      onArrive() { const f = arriveFn; arriveFn = null; if (f) f(); },
      // the Knot flies by moving its box; `translate` stays clear of any entrance transition on `transform`
      place(p) { const r = canvas.parentElement.getBoundingClientRect(), hx = r.left + r.width / 2 - moved.x, hy = r.top + r.height / 2 - moved.y;
        moved = { x: p.x - hx, y: p.y - hy }; box.style.translate = `${moved.x}px ${moved.y}px`; },
    } });
    if (!engine) return null;
    const k = engine.knot, th = engine.thread;
    k.setUnravel = () => {};   // the old Knot's scroll tail: the page no longer draws it
    const homeOf = () => { const r = canvas.parentElement.getBoundingClientRect(); return { x: r.left + r.width / 2 - moved.x, y: r.top + r.height / 2 - moved.y }; };
    k.strand = {
      arrive(fn) { arriveFn = fn; },
      setTarget(rect) { return th.setTarget(local(rect)); },
      rewind() { th.rewind(); },
      getState() { return th.getState(); },
      // flies beside the control and throws the line round it; `landing` is a window point
      lasso(rect, landing) { const l = local({ x: landing.x, y: landing.y, w: 0, h: 0 }); k.travelTo({ x: l.x, y: l.y }, { lasso: local(rect) }); },
      flyHome(o) { k.travelTo(homeOf(), o || {}); },
      // put the Knot straight on a window point, for dragging it by hand
      placeAt(p) { const l = local({ x: p.x, y: p.y, w: 0, h: 0 }), r = canvas.parentElement.getBoundingClientRect(), hx = r.left + r.width / 2 - moved.x, hy = r.top + r.height / 2 - moved.y;
        moved = { x: l.x - hx, y: l.y - hy }; box.style.translate = `${moved.x}px ${moved.y}px`; },
      // after a resize the Knot's corner moved: drop back to it with nothing out
      resetHome() { moved = { x: 0, y: 0 }; box.style.translate = ""; k.cancelTravel(); k.redraw(); },
    };
    canvas._knot = k;
    return k;
  }
  window.NusKnot3D = { mount };
})();
