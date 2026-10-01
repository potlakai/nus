/* Every Companion Knot on the page (lesson, Two ways in desk, Setup scenes, FAQ, ending) animates only
   while its canvas is on screen. Wraps NusKnot3D.mount; companion/knot3d.js itself is unchanged.
   knot3d resumes itself when the tab comes back and when its state changes, so off-screen Knots are
   paused again after a tab switch and by a slow sweep. Load right after companion/knot3d.js. */
(() => {
  if (!window.NusKnot3D || !window.IntersectionObserver) return;
  const mount = NusKnot3D.mount.bind(NusKnot3D);
  const away = new Set();
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const k = e.target._nusKnot; if (!k) return;
    if (e.isIntersecting) { away.delete(k); k.resume(); } else { away.add(k); k.pause(); }
  }), { rootMargin: "120px" });
  const repause = () => away.forEach((k) => k.pause());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(repause, 0); });
  setInterval(() => { if (!document.hidden) repause(); }, 1000);
  NusKnot3D.mount = (canvas, opts) => {
    const k = mount(canvas, opts);
    if (k && k.pause && k.resume) { canvas._nusKnot = k; io.observe(canvas); }
    return k;
  };
})();
