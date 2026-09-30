/* Pricing, option C "Three columns" (PICKED 2026-09-30, no receipt): Companion $0 / Students Free $0 /
   Students Pro $9.99, each with its own buttons, a cursor spotlight, and the fork's strands running in.
   The Students column carries the Mac beta download with the Apple mark, same as Two ways in.
   Facts from nus-desktop/src/limits.js. Usage: NusPlans.mount(el)  (el is an empty .plans element) */
(function () {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMac = /Mac/.test(navigator.platform || navigator.userAgent) && !/iPhone|iPad/.test(navigator.userAgent);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const REL = "https://github.com/potlakai/nus-desktop/releases", PRO_URL = "https://potlakai.github.io/nus/pro.html";
  const L = { companion: `${REL}/download/companion-v0.1.1/Nus-Companion-Setup.exe`, win: `${REL}/latest/download/Nus-Setup.exe`, macArm: `${REL}/latest/download/Nus-arm64.dmg`, macIntel: `${REL}/latest/download/Nus-x64.dmg` };
  const APPLE = '<svg class="os" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.37 12.64c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.29-3.52zM14.2 6.18c.6-.73 1.01-1.74.9-2.75-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.22z"/></svg>';
  const TICK = '<svg class="tick" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7"/></svg>';
  const studentsBtns = isMac
    ? `<a class="btn solid" href="${L.macArm}">${APPLE}Mac beta</a><a class="btn ghost" href="${L.macIntel}">${APPLE}Intel Mac</a>`
    : `<a class="btn solid" href="${L.win}">Download free</a><a class="btn ghost" href="${L.macArm}">${APPLE}Mac beta</a>`;
  const PLANS = [
    { k: "The Knot on its own", name: "NŪS Companion", price: "$0", one: "No plan, no account.",
      list: ["Your own Jarvis: voice actions and pointing", "Your folders of notes and docs, mapped", "On top of every Windows app", "Your own AI keys"],
      foot: `<a class="btn ghost" href="${L.companion}">Download for Windows</a>`, small: isMac ? "Version 0.1.1. Windows only for now." : "Version 0.1.1. Windows 10 and 11." },
    { k: "Students", name: "Free", price: "$0", one: "Forever. No trial clock.",
      list: ["Unlimited courses, tasks and calendar", "3 syllabus imports, 10 questions a day", "Companion 20 minutes a day", "1 connected account, 1 automation rule", "7 days of history, 512 MB"],
      foot: studentsBtns, small: isMac ? "Apple silicon or Intel. Windows too." : "Windows, and Mac beta." },
    { k: "Students", name: "Pro", price: "$9.99<small>/ month</small>", one: "Everything in Free, with the caps off.", pro: true,
      list: ["Unlimited imports and questions", "Unlimited Companion, full history", "Google Calendar and Outlook together", "More automation rules, 2 GB"],
      foot: `<a class="btn brass" href="${PRO_URL}">Get Pro</a>`, small: "Buy here or in the app. Cancel any time." },
  ];

  /* strands coming down from the fork above into the columns */
  function Threads(host, targetsFn) {
    const c = document.createElement("canvas"); c.className = "threads"; c.setAttribute("aria-hidden", "true"); host.prepend(c);
    const ctx = c.getContext("2d"); let W = 1, H = 1, dpr = 1, grow = reduce ? 1 : 0, seen = false, visible = false, last = performance.now();
    const S = Array.from({ length: 150 }, () => ({ s: Math.random(), sp: (Math.random() - 0.5) * 2, top: (Math.random() - 0.5) * 2, ox: 0, oy: 0, vx: 0, vy: 0 }));
    const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 }, lit = [1, 1, 1];
    // the canvas stops just below the column tops, where the strands end
    function size() { const r = host.getBoundingClientRect(), cols = host.querySelector(".cols"); W = r.width; H = cols ? Math.min(r.height, cols.getBoundingClientRect().top - r.top + 24) : r.height; dpr = Math.min(1.5, devicePixelRatio || 1); c.width = W * dpr; c.height = H * dpr; c.style.height = H + "px"; }
    size(); new ResizeObserver(size).observe(host);
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) seen = true; }, { threshold: 0.05 }).observe(host);
    addEventListener("pointermove", (e) => { const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now(), dt = Math.max(1, now - ptr.t) / 1000;
      ptr.vx = ptr.vx * 0.5 + ((x - ptr.x) / dt) * 0.5; ptr.vy = ptr.vy * 0.5 + ((y - ptr.y) / dt) * 0.5; ptr.x = x; ptr.y = y; ptr.t = now; }, { passive: true });
    const bez = (a, b, c2, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c2 + t * t * t * d; };
    (function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (seen && !reduce) grow = Math.min(1, grow + dt * 0.55);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const T = targetsFn(); if (!T.length) return;
      T.forEach((t, i) => (lit[i] += ((t.hot ? 1.8 : 1) - lit[i]) * Math.min(1, dt * 4)));
      ctx.lineWidth = 0.6;
      S.forEach((s, i) => {
        const ti = i % T.length, t = T[ti], x0 = W / 2 + s.top * 70, y0 = 0, x3 = t.x + s.sp * t.w * 0.38, y3 = t.y;
        let x1 = x0, y1 = y0 + (y3 - y0) * 0.5, x2 = x3 - s.sp * 20, y2 = y3 - (y3 - y0) * 0.35;
        const mx = bez(x0, x1, x2, x3, 0.5), my = bez(y0, y1, y2, y3, 0.5), dx = mx + s.ox - ptr.x, dy = my + s.oy - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < 14400 && d2 > 1) { const d = Math.sqrt(d2), f = (1 - d / 120) ** 2; s.vx += (dx / d) * f * 2200 * dt + ptr.vx * f * 2 * dt; s.vy += (dy / d) * f * 2200 * dt + ptr.vy * f * 2 * dt; }
        s.vx = (s.vx - 14 * s.ox * dt) * Math.exp(-5 * dt); s.vy = (s.vy - 14 * s.oy * dt) * Math.exp(-5 * dt); s.ox += s.vx * dt; s.oy += s.vy * dt;
        x1 += s.ox; y1 += s.oy; x2 += s.ox; y2 += s.oy;
        const col = t.warm ? "232,204,150" : "176,190,255", a = (0.05 + 0.14 * (1 - Math.abs(s.sp) * 0.6)) * lit[ti];
        ctx.strokeStyle = `rgba(${col},${Math.min(0.6, a)})`; ctx.beginPath(); ctx.moveTo(x0, y0);
        const end = clamp(grow * 1.2 - s.s * 0.2);
        for (let k = 1; k <= 30 * end; k++) { const u = k / 30; ctx.lineTo(bez(x0, x1, x2, x3, u), bez(y0, y1, y2, y3, u)); }
        ctx.stroke();
        if (grow >= 1 && s.s < (t.hot ? 0.12 : 0.05)) {
          const u = ((now / 1000) * 0.25 + s.s * 9) % 1, bx = bez(x0, x1, x2, x3, u), by = bez(y0, y1, y2, y3, u), gl = Math.sin(Math.PI * u);
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, 6); g.addColorStop(0, `rgba(255,248,235,${0.85 * gl})`); g.addColorStop(1, "rgba(255,248,235,0)");
          ctx.fillStyle = g; ctx.fillRect(bx - 6, by - 6, 12, 12);
        }
      });
    })(last);
  }

  function mount(root) {
    root.innerHTML = `<div class="sec">
      <div class="head reveal"><div class="mono">Pricing</div><h2 class="serif">Free to <em>start.</em></h2><p>Both apps are free. Pro is only for the student who hits the caps.</p></div>
      <div class="cols">${PLANS.map((p) => `<article class="col reveal${p.pro ? " pro" : ""}">
        <div class="k mono">${p.k}</div><h3 class="serif">${p.name}</h3><div class="price">${p.price}</div><p class="one">${p.one}</p>
        <ul>${p.list.map((l) => `<li>${TICK}<span>${l}</span></li>`).join("")}</ul>
        <div class="foot"><div class="btns">${p.foot}</div>${p.small ? `<p class="small">${p.small}</p>` : ""}</div>
      </article>`).join("")}</div>
      <p class="keys reveal"><b>Your AI, your key.</b> On every plan you bring your own AI key, and the provider bills you directly. Cancel Pro any time.</p>
    </div>`;
    const sec = root.querySelector(".sec"), cols = [...root.querySelectorAll(".col")];
    let hot = -1;
    cols.forEach((c, i) => {
      c.addEventListener("mousemove", (e) => { const r = c.getBoundingClientRect(); c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px"); });
      c.addEventListener("mouseenter", () => (hot = i)); c.addEventListener("mouseleave", () => (hot = -1));
      c.addEventListener("focusin", () => (hot = i)); c.addEventListener("focusout", () => (hot = -1));
    });
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.15 });
    root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    Threads(sec, () => cols.map((c, i) => { const r = c.getBoundingClientRect(), h = sec.getBoundingClientRect(); return { x: r.left - h.left + r.width / 2, y: r.top - h.top, w: r.width, warm: i === 2, hot: hot === i }; }));
  }
  window.NusPlans = { mount, APPLE };
})();
