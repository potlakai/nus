/* Final CTA options + footer. NusEnd.mount(el, "full" | "words" | "card") builds a CTA; NusEnd.footer(el) the footer.
   Download links are the real release files; Mac visitors get the Mac beta for the student app. */
(function () {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMac = /Mac/.test(navigator.platform || navigator.userAgent) && !/iPhone|iPad/.test(navigator.userAgent);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sm = (x, a, b) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const REL = "https://github.com/potlakai/nus-desktop/releases";
  const L = { companion: `${REL}/download/companion-v0.1.3/Nus-Companion-Setup.exe`, win: `${REL}/latest/download/Nus-Setup.exe`, macArm: `${REL}/download/v0.2.6/Nus-arm64.dmg`, macIntel: `${REL}/download/v0.2.6/Nus-x64.dmg`,
    pro: "https://potlakai.github.io/nus/pro.html", privacy: "https://potlakai.github.io/nus/privacy.html", feedback: "feedback.html", repo: "https://github.com/potlakai/nus-desktop", releases: REL };
  const APPLE = '<svg class="os" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.37 12.64c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.29-3.52zM14.2 6.18c.6-.73 1.01-1.74.9-2.75-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.22z"/></svg>';
  const buttons = () => `<div class="btns"><a class="cbtn solid" href="${L.companion}">Get NŪS Companion</a>${isMac
    ? `<a class="cbtn ghost" href="${L.macArm}">${APPLE}NŪS for Students, Mac beta</a>` : `<a class="cbtn ghost" href="${L.win}">Get NŪS for Students</a>`}</div>
    <p class="fine">Companion: Windows 10 or 11. Students: Windows, and ${APPLE}Mac beta. Free to start. You bring the AI keys.</p>`;
  const HEAD = `<div class="kick mono">Your move</div><h2 class="serif">Start with <em>step one.</em></h2>`;

  function full(root) {
    root.innerHTML = `<div class="track"><div class="stage"><div class="orbbox"></div><div class="copy">${HEAD}${buttons()}</div></div></div>`;
    const track = root.querySelector(".track"), copy = root.querySelector(".copy");
    const orb = window.NusOrb ? new NusOrb(root.querySelector(".orbbox"), { tasks: false }) : null;
    let trackTop = 0, trackHeight = 1, pending = 0, lastProgress = -1;
    function measure() { trackTop = track.getBoundingClientRect().top + scrollY; trackHeight = track.offsetHeight; lastProgress = -1; queue(); }
    function queue() { if (!pending) pending = requestAnimationFrame(onScroll); }
    function onScroll() {
      pending = 0;
      const p = clamp((scrollY - trackTop) / Math.max(1, trackHeight - innerHeight));
      if (p === lastProgress) return;
      lastProgress = p;
      if (orb) orb.setStory(reduce ? 1 : 0.5 + 0.5 * sm(p, 0, 0.7));
      const a = reduce ? 1 : sm(p, 0.45, 0.75); copy.style.opacity = a; copy.style.transform = `translateY(${(1 - a) * 24}px)`; copy.style.pointerEvents = a > 0.5 ? "" : "none";
    }
    // read layout only while the ending is near, so scrolling elsewhere never forces a reflow here
    let near = false; new IntersectionObserver((es) => { near = es[0].isIntersecting; if (near) onScroll(); }, { rootMargin: "100% 0px" }).observe(track);
    addEventListener("scroll", () => near && queue(), { passive: true });
    NusMotion.onLayout(measure); measure();
  }
  function words(root) {
    const W = ["Start", "with", "step", "one."];
    root.innerHTML = `<div class="track"><div class="stage"><div class="kick mono">Your move</div><h2 class="serif">${W.map((w, i) => `<span>${i >= 2 ? `<em>${w}</em>` : w}</span>`).join("")}</h2><div class="after">${buttons()}</div></div></div>`;
    const track = root.querySelector(".track"), spans = [...root.querySelectorAll("h2 span")], after = root.querySelector(".after");
    function onScroll() { const r = track.getBoundingClientRect(), p = reduce ? 1 : clamp(-r.top / Math.max(1, track.offsetHeight - innerHeight) + 0.15);
      spans.forEach((s, i) => s.classList.toggle("on", p > 0.12 + i * 0.13)); after.classList.toggle("on", p > 0.7); }
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }
  function card(root) {
    root.innerHTML = `<div class="wrap"><div class="box"><div class="inner"><div>${HEAD}<p class="fine" style="margin-top:14px;font-size:16px;color:var(--mist)">A more capable you, one step at a time.</p>${buttons()}</div><div class="knotbig"><canvas aria-hidden="true"></canvas></div></div></div></div>`;
    const cv = root.querySelector(".knotbig canvas");
    if (window.NusKnot3D) { const k = NusKnot3D.mount(cv, { ground: false, scale: 0.3, focusGate: false }); cv.parentElement.addEventListener("mouseenter", () => k.setState && k.setState("listening")); cv.parentElement.addEventListener("mouseleave", () => k.setState && k.setState("idle")); }
  }
  function footer(root) {
    root.innerHTML = `<div class="top">
      <div class="brand"><b>NŪS</b><p>A more capable <em>you.</em> Personal AI that does the busywork and shows you the rest.</p><div class="status mono"><span>● Companion 0.1.2</span><span>Students v0.2.6 · Mac beta</span></div></div>
      <div><h4 class="mono">Get it</h4><ul><li><a href="${L.companion}">NŪS Companion</a></li><li><a href="${L.win}">NŪS for Students</a></li><li><a href="${L.macArm}">${APPLE}Mac beta</a></li><li><a href="${L.pro}">Pro</a></li></ul></div>
      <div><h4 class="mono">Set up</h4><ul><li><a href="#setup" data-guide="companion">Companion setup</a></li><li><a href="#setup" data-guide="students">Students setup</a></li><li><a href="#pricing">Pricing</a></li><li><a href="#faq">Questions</a></li></ul></div>
      <div><h4 class="mono">Open</h4><ul><li><a href="${L.repo}">GitHub</a></li><li><a href="${L.releases}">All releases</a></li><li><a href="${L.privacy}">Privacy</a></li></ul></div>
      <div><h4 class="mono">Talk to us</h4><ul><li><a href="${L.feedback}">Give feedback</a></li><li><a href="#now">Where it’s heading</a></li></ul></div></div>
      <div class="meta"><span>NŪS · ${new Date().getFullYear()}</span><span>Your data stays on your computer. You bring your own AI keys.</span></div>
      <div class="mark" aria-hidden="true"><div class="w">NUS</div><div class="m"></div></div>`;
    const mark = root.querySelector(".mark");
    // the wordmark rises into view as you reach the bottom, the way the hero's sank away
    // the macron sits over the real U, measured from the rendered glyph so it holds at any width
    const w = mark.querySelector(".w"), m = mark.querySelector(".m");
    function placeMacron() { const rg = document.createRange(); rg.setStart(w.firstChild, 1); rg.setEnd(w.firstChild, 2); const u = rg.getBoundingClientRect(), mr = mark.getBoundingClientRect();
      if (!u.width) return; const mw = u.width * 0.5; m.style.left = u.left - mr.left + (u.width - mw) / 2 + "px"; m.style.width = mw + "px"; }
    let rise = -1;
    function onScroll() { const r = mark.getBoundingClientRect(), v = reduce ? 1 : +clamp((innerHeight - r.top) / (r.height + 200)).toFixed(3); if (v !== rise) mark.style.setProperty("--rise", (rise = v)); }
    addEventListener("resize", placeMacron); (document.fonts ? document.fonts.ready : Promise.resolve()).then(placeMacron); placeMacron();
    let near = false; new IntersectionObserver((es) => { near = es[0].isIntersecting; if (near) onScroll(); }, { rootMargin: "100% 0px" }).observe(mark);
    addEventListener("scroll", () => near && onScroll(), { passive: true }); addEventListener("resize", onScroll); onScroll();
  }
  window.NusEnd = { mount: (el, kind) => ({ full, words, card })[kind](el), footer };
})();
