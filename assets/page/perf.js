/* Every Companion Knot on the page (lesson, Two ways in desk, Setup scenes, FAQ, ending) animates only
   while its canvas is on screen. Wraps NusKnot3D.mount; companion/knot3d.js itself is unchanged.
   Load right after companion/knot3d.js. */
(() => {
  if (!window.NusKnot3D || !window.IntersectionObserver) return;
  const mount = NusKnot3D.mount.bind(NusKnot3D);
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const k = e.target._nusKnot; if (!k) return;
    if (e.isIntersecting) k.resume(); else k.pause();
  }), { rootMargin: "120px" });
  NusKnot3D.mount = (canvas, opts) => {
    const k = mount(canvas, opts);
    if (k && k.pause && k.resume) { canvas._nusKnot = k; io.observe(canvas); }
    return k;
  };
})();
