/* Now vs Where it's heading, option A "The orb ledger" (picked 2026-09-30). The NŪS orb in the middle (the
   template's globe-with-stats slot); shipped items on the left on solid lines with running lights, where it's
   heading on the right on dashed brass lines. Hover an item: its line lights up and the orb leans toward it.
   Usage: NusNow.mount(el)  (el is an empty .nowsec element) */
(function () {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NOW = [
    { t: "Say it, it acts", d: "Voice actions with Jev. It picks each action in about a quarter second.", tag: "companion" },
    { t: "Point at anything", d: "Ctrl+Shift+T. The thread runs to the spot and the answer lands there.", tag: "both" },
    { t: "Your folders, mapped", d: "Add notes and docs. The Map connects them with your routines and chats.", tag: "companion" },
    { t: "Routines", d: "Say a few actions in a row, keep them, then say “run my routine”.", tag: "companion" },
    { t: "Syllabus in, semester mapped", d: "It reads your syllabus. Nothing is saved until you check it.", tag: "students" },
    { t: "Today, Review, Map", d: "What matters now, what it read, and how it all connects.", tag: "students" },
    { t: "Mac beta", d: "The student app on Apple silicon and Intel Macs.", tag: "students" },
    { t: "Yours, on your computer", d: "Your data stays local. You bring your own AI keys.", tag: "both" },
  ];
  const HEAD = [
    { t: "Guidance that fades", d: "Help that steps back as you get better, like “Later” above." },
    { t: "Noticing patterns", d: "It notices how you work and suggests the next move." },
    { t: "One companion, everywhere", d: "The same Knot across school, work and life." },
    { t: "Next up", d: "A notarized Mac build, Canvas and Blackboard sync, and a signed installer." },
  ];
  const TAG = { companion: "Companion", students: "Students", both: "Both apps" };
  const sphere = (() => { const N = 520, g = Math.PI * (3 - Math.sqrt(5)), P = []; for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = g * i; P.push([Math.cos(t) * r, y, Math.sin(t) * r]); } return P; })();
  const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
  function drawOrb(ctx, ox, oy, R, angle) {
    const bg = ctx.createRadialGradient(ox, oy, R * 0.1, ox, oy, R * 1.7); bg.addColorStop(0, "rgba(120,140,220,.13)"); bg.addColorStop(1, "rgba(120,140,220,0)");
    ctx.fillStyle = bg; ctx.fillRect(ox - R * 1.8, oy - R * 1.8, R * 3.6, R * 3.6);
    const ca = Math.cos(angle), sa = Math.sin(angle), ct = Math.cos(0.32), st = Math.sin(0.32);
    for (const p of sphere) { const x1 = p[0] * ca + p[2] * sa, z1 = -p[0] * sa + p[2] * ca, y2 = p[1] * ct - z1 * st, z2 = p[1] * st + z1 * ct, d = (z2 + 1) / 2, r = 0.5 + d * 1.2;
      ctx.fillStyle = `rgba(238,240,250,${0.14 + 0.82 * d * d})`; ctx.fillRect(ox + x1 * R - r / 2, oy + y2 * R - r / 2, r, r); }
  }
  function mount(host) {
    host.innerHTML = `<div class="sec">
      <div class="head reveal"><div class="mono">Now and next</div><h2 class="serif">What it does <em>today.</em></h2><p>Everything on the left ships now. The right is where it’s heading, and it says so.</p></div>
      <div class="ledger reveal">
        <div class="col l"><div class="colhead ch-now"><b>Now</b><span class="dot"></span></div>
          ${NOW.map((x) => `<div class="item" tabindex="0"><i class="pin"></i><b><span class="tag ${x.tag}">${TAG[x.tag]}</span>${x.t}</b><span class="d">${x.d}</span></div>`).join("")}</div>
        <div class="mid"><span class="todaylbl mono">Today</span></div>
        <div class="col r"><div class="colhead ch-next"><span class="dot"></span><b>Where it’s heading</b></div>
          ${HEAD.map((x) => `<div class="item" tabindex="0"><i class="pin"></i><b>${x.t}</b><span class="d">${x.d}</span></div>`).join("")}</div>
      </div></div>`;
    const root = host.querySelector(".ledger"), L = root.querySelector(".col.l"), mid = root.querySelector(".mid");
    const c = document.createElement("canvas"); c.className = "lines"; c.setAttribute("aria-hidden", "true"); root.prepend(c);
    const ctx = c.getContext("2d"); let W = 1, H = 1, dpr = 1, angle = 0, grow = reduce ? 1 : 0, seen = false, vis = false, hot = null, lean = 0, last = performance.now();
    const items = [...root.querySelectorAll(".item")];
    items.forEach((it) => { it.addEventListener("mouseenter", () => (hot = it)); it.addEventListener("mouseleave", () => (hot = null)); it.addEventListener("focus", () => (hot = it)); it.addEventListener("blur", () => (hot = null)); });
    function size() { const r = root.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(1.5, devicePixelRatio || 1); c.width = W * dpr; c.height = H * dpr; }
    size(); new ResizeObserver(size).observe(root);
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis) seen = true; }, { threshold: 0.2 }).observe(root);
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.12 });
    host.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    NusMotion.loop(c, (now, dt) => {
      if (!vis || document.hidden) return;
      last = now; if (seen && !reduce) grow = Math.min(1, grow + dt * 0.6); if (!reduce) angle += dt * 0.15;
      const want = hot ? (L.contains(hot) ? -1 : 1) : 0; lean += (want - lean) * Math.min(1, dt * 4);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const h = root.getBoundingClientRect(), m = mid.getBoundingClientRect(), ox = m.left - h.left + m.width / 2 + lean * 10, oy = m.top - h.top + m.height / 2 - 20, Ro = 86;
      if (W >= 980) items.forEach((it, k) => {   // stacked on narrow screens: no lines across the text
        const left = L.contains(it), pin = it.querySelector(".pin").getBoundingClientRect(), px = pin.left - h.left + 4, py = pin.top - h.top + 4;
        const sx = ox + (left ? -1 : 1) * Ro * 0.92, sy = oy + (py - oy) * 0.35, on = hot === it, x1 = sx + (px - sx) * 0.45, x2 = sx + (px - sx) * 0.6;
        const end = Math.max(0, Math.min(1, grow * 1.3 - k * 0.04));
        ctx.lineWidth = on ? 1.5 : 1;
        if (left) { ctx.setLineDash([]); ctx.strokeStyle = `rgba(206,216,246,${on ? 0.8 : 0.28})`; }
        else { ctx.setLineDash([4, 6]); ctx.lineDashOffset = reduce ? 0 : -now / 60; ctx.strokeStyle = `rgba(209,167,95,${on ? 0.75 : 0.3})`; }
        ctx.beginPath(); ctx.moveTo(sx, sy); for (let s = 1; s <= 24 * end; s++) { const t = s / 24; ctx.lineTo(bez(sx, x1, x2, px, t), bez(sy, sy, py, py, t)); } ctx.stroke();
        if (left && end >= 1 && !reduce) { const t = ((now / 1000) * 0.3 + k * 0.17) % 1, bx = bez(sx, x1, x2, px, t), by = bez(sy, sy, py, py, t), gl = Math.sin(Math.PI * t) * (on ? 1 : 0.6);
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, 6); g.addColorStop(0, `rgba(255,255,255,${0.85 * gl})`); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(bx - 6, by - 6, 12, 12); }
      });
      ctx.setLineDash([]); drawOrb(ctx, ox, oy, Ro, angle);
      ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.fillStyle = "rgba(139,150,174,.9)"; ctx.fillText("NŪS", ox, oy - Ro - 16);
    });
  }
  window.NusNow = { mount };
})();
