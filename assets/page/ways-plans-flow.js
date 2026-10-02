/* Two ways in > Pricing thread options, round 2 (after the rejected rails of 2026-09-30).
   Draws the bridge between the two product cards and the pricing strands, which start at the top of
   #pricing .sec (centre, ±70 px). plans.js and plans.css stay untouched. data-review="pricing" shows the switcher. */
(() => {
  const review = document.currentScript.dataset.review === 'pricing';
  const fork = document.querySelector('#ways .fork'), cards = [...fork.querySelectorAll('.card')];
  const foot = fork.querySelector('.foot'), orMark = fork.querySelector('.or'), gap = fork.querySelector('.gap');
  const pricing = document.querySelector('#pricing');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search);
  const variants = {
    a: ['A · Two become one', 'Cool strands leave the Companion card, warm ones leave Students, and they braid into one pricing bundle.'],
    b: ['B · Down the middle', 'The fork orb’s own thread runs down between the cards, parts around the “or” and the line, then opens into pricing.'],
    c: ['C · Pinch point', 'Both bundles pinch into one bright point under the line, then open into the pricing strands.'],
    original: ['Original', 'Pricing as approved: its strands start on their own.'],
  };
  let mode = review && variants[params.get('thread')] ? params.get('thread') : 'c';   // C picked 2026-09-30
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
  const docTop = (el) => el.getBoundingClientRect().top + scrollY;

  const layer = document.createElement('canvas'); layer.className = 'nus-flow-bridge'; layer.setAttribute('aria-hidden', 'true'); document.body.append(layer);
  const pen = NusDraw(layer);   // one draw call a frame (gl2d.js)
  let W = 1, H = 1, dpr = 1;
  function size() { W = innerWidth; H = innerHeight; dpr = Math.min(1.5, devicePixelRatio || 1); layer.width = Math.round(W * dpr); layer.height = Math.round(H * dpr); }
  size(); addEventListener('resize', size, { passive: true });

  // strands: side 0 = Companion (cool), 1 = Students (warm)
  const S = Array.from({ length: 150 }, (_, i) => ({ side: i % 2, sp: Math.random() * 2 - 1, e: Math.random() * 2 - 1, s: Math.random(), ph: Math.random() * 6.28, ox: 0, oy: 0, vx: 0, vy: 0, py: 0 }));
  const COL = [[176, 190, 255], [232, 204, 150]];
  const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 };
  addEventListener('pointermove', (e) => { const now = performance.now(), dt = Math.max(1, now - ptr.t) / 1000;
    ptr.vx = ptr.vx * 0.5 + ((e.clientX - ptr.x) / dt) * 0.5; ptr.vy = ptr.vy * 0.5 + ((e.clientY - ptr.y) / dt) * 0.5; ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now; }, { passive: true });
  let focus = -1; const w = [1, 1];
  cards.forEach((cd, k) => { cd.addEventListener('mouseenter', () => (focus = k)); cd.addEventListener('mouseleave', () => (focus = -1)); cd.addEventListener('focusin', () => (focus = k)); cd.addEventListener('focusout', () => (focus = -1)); });

  // the foot line's real text box (the <p> is full width), plus the "or" disc
  function textBox() {
    const r = document.createRange(); r.selectNodeContents(foot); const b = r.getBoundingClientRect();
    return { l: b.left, r: b.right, t: b.top, b: b.bottom, cx: (b.left + b.right) / 2 };
  }
  function geo() {
    const sec = pricing.querySelector('.sec') || pricing, ps = sec.getBoundingClientRect();
    const c = cards.map((cd) => cd.getBoundingClientRect()), stacked = innerWidth <= 980;
    const fr = fork.getBoundingClientRect(), o = orMark.getBoundingClientRect();
    return { c, stacked, cx: ps.left + ps.width / 2, pTop: ps.top, text: textBox(),
      orb: { x: fr.left + fork.clientWidth / 2, y: fr.top + gap.offsetTop + 96, r: 58 },
      or: o.width ? { x: o.left + o.width / 2, y: o.top + o.height / 2, r: o.width / 2 } : null,
      low: Math.max(c[0].bottom, c[1].bottom) };
  }
  // scroll progress in document space, so it scrubs both ways
  function progress(g) {
    if (reduced.matches) return 1;
    const y = scrollY, lowDoc = g.low + y, pDoc = g.pTop + y;
    if (mode === 'b' && !g.stacked) { const a = g.orb.y + y - H * 0.55, b = pDoc - H * 0.4; return clamp((y - a) / (b - a)); }
    const a = lowDoc - H * 0.92, b = pDoc - H * 0.42; return sm((y - a) / (b - a), 0, 1);
  }
  // where strand s leaves from (bottom edge of its card; both from the last card when stacked)
  function source(g, s) {
    if (g.stacked) { const r = g.c[1], dir = s.side ? 1 : -1; return { x: r.left + r.width / 2 + dir * (0.08 + 0.34 * Math.abs(s.sp)) * r.width, y: r.bottom }; }
    const r = g.c[s.side]; return { x: r.left + r.width / 2 + s.sp * r.width * 0.34, y: r.bottom };
  }

  // A · braid: two bundles swoop inward and wrap around each other on the way down
  function pathA(g, s, t) {
    const o = s._o || source(g, s), x3 = g.cx + s.e * 70, y3 = g.pTop, dy = y3 - o.y, dir = s.side ? 1 : -1;
    let x = bez(o.x, o.x, x3, x3, t), y = bez(o.y, o.y + dy * 0.55, y3 - dy * 0.5, y3, t);
    const env = sm(t, 0.3, 0.62) * (1 - sm(t, 0.86, 1));
    x += dir * (16 + 10 * Math.abs(s.sp)) * Math.cos(Math.PI * 2.4 * t + s.ph * 0.08) * env;
    return { x, y, depth: dir * Math.sin(Math.PI * 2.4 * t) * env };
  }
  // C · pinch: into one point under the line, then out into pricing's fan
  function pinchPoint(g) { return { x: g.cx, y: g.text.b + (g.pTop - g.text.b) * 0.5 }; }
  function pathC(g, s, t) {
    const o = s._o || source(g, s), Q = g.Q || pinchPoint(g), k = 0.74;
    if (t < k) { const u = t / k; return { x: bez(o.x, o.x, Q.x + s.sp * 6, Q.x, u), y: bez(o.y, o.y + (Q.y - o.y) * 0.7, Q.y - 18, Q.y, u), depth: 0 }; }
    const u = (t - k) / (1 - k), x3 = g.cx + s.e * 70;
    return { x: bez(Q.x, Q.x, x3, x3, u), y: bez(Q.y, Q.y + 16, g.pTop - 16, g.pTop, u), depth: 0 };
  }
  // B · spine: straight down from the fork orb through the gutter. The "or" and the line sit on it like beads.
  function pathB(g, s, t) {
    if (g.stacked) return pathC(g, s, t);
    const y0 = g.orb.y + g.orb.r * 0.9, y = y0 + (g.pTop - y0) * t;
    let x = g.cx + s.sp * (3 + 11 * sm(y, y0, y0 + 160));
    x += (s.e * 70 - s.sp * 14) * sm(y, g.text.b + 6, g.pTop);
    return { x, y, depth: 0 };
  }
  const PATH = { a: pathA, b: pathB, c: pathC };

  let frame = 0, last = performance.now(), drawn = false;
  function inRange(g) { const top = mode === 'b' && !g.stacked ? g.orb.y : g.low; return top < H + 60 && g.pTop > -60; }
  function draw(now) {
    frame = 0; const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const off = () => { if (drawn) { pen.begin(W, H, dpr); pen.end(); drawn = false; } layer.style.visibility = 'hidden'; };
    if (mode === 'original' || !pricing.querySelector('.sec')) return off();
    const g = geo(); if (!inRange(g)) return off();
    pen.begin(W, H, dpr); drawn = true; layer.style.visibility = ''; g.Q = pinchPoint(g);
    const p = progress(g), still = reduced.matches, path = PATH[mode], steps = mode === 'b' ? 56 : 40;
    for (let k = 0; k < 2; k++) { const want = focus < 0 ? 1 : focus === k ? 1.9 : 0.4; w[k] += (want - w[k]) * Math.min(1, dt * 5); }
    const damp = Math.exp(-5 * dt), rad = 110, EXT = 0.22, dim = mode === 'b' && !g.stacked ? 0.42 : 1;
    // soften where pricing's own strands begin, so the bridge runs into them with no seam
    pen.rgb(6, 8, 16); for (let i = 0; i < 33; i++) pen.rect(g.cx - 170, g.pTop - 2 + i * 2, 340, 2, 1 - (i + 0.5) / 33);   // ink fading out downwards
    for (const s of S) {
      s._o = source(g, s);   // once per strand per frame, not once per point
      // cursor parts the strands, then they spring back (same feel as the fork and pricing)
      if (!still) {
        const m = path(g, s, 0.55), dx = m.x + s.ox - ptr.x, dy = (mode === 'b' ? 0 : m.y + s.oy - ptr.y), near = mode === 'b' ? Math.abs(ptr.y - m.y) < (g.pTop - m.y) + 200 : true;
        const d2 = dx * dx + dy * dy;
        if (near && d2 < rad * rad && d2 > 1) { const d = Math.sqrt(d2), f = (1 - d / rad) ** 2; s.vx += (dx / d) * f * 2200 * dt + ptr.vx * f * 2 * dt; s.vy += (dy / d) * f * 2200 * dt + ptr.vy * f * 2 * dt; if (mode === 'b') s.py = ptr.y; }
        s.vx = (s.vx - 14 * s.ox * dt) * damp; s.vy = (s.vy - 14 * s.oy * dt) * damp; s.ox += s.vx * dt; s.oy += s.vy * dt;
      }
      const end = clamp(p * 1.18 - s.s * 0.18) * (1 + EXT); if (end <= 0) continue;
      const col = COL[s.side], base = dim * (0.05 + 0.15 * (1 - Math.abs(s.sp) * 0.6)) * Math.min(1, w[s.side]) * (0.6 + 0.4 * Math.min(2, w[s.side]));
      const n = Math.max(1, Math.round(steps * end));
      // one stroke per run of equal (quantised) alpha keeps the draw calls low
      let px = 0, py = 0, run = -1;
      const flush = () => { if (run > 0) pen.stroke(); };
      pen.rgb(col[0], col[1], col[2]);
      for (let j = 0; j <= n; j++) {
        // past t = 1 the strand carries on straight down over pricing's first strands, fading out
        const t = (j / n) * end, q = t <= 1 ? path(g, s, t) : { ...path(g, s, 1), depth: 0 }, bell = mode === 'b' ? Math.exp(-((q.y - s.py) ** 2) / 12800) : Math.sin(Math.PI * Math.min(1, t));
        if (t > 1) q.y += (t - 1) * 300;
        const x = q.x + s.ox * bell, y = q.y + (mode === 'b' ? 0 : s.oy * bell);
        if (j) {
          const a = Math.round(125 * base * (1 + 0.45 * q.depth) * sm(t, 0, 0.06) * (1 - sm(t, 1, 1 + EXT)));
          if (a !== run) { flush(); run = a; if (a > 0) pen.start(px, py, Math.min(0.7, a / 125), 0.6); }
          if (a > 0) pen.to(x, y);
        }
        px = x; py = y;
      }
      flush();
      // lights run down once the bridge is complete
      if (!still && p > 0.98 && s.s < (w[s.side] > 1.2 ? 0.14 : 0.045)) {
        const t = ((now / 1000) * 0.3 + s.s * 9) % 1, q = path(g, s, t), gl = Math.sin(Math.PI * t);
        pen.rgb(255, 248, 235); pen.glow(q.x, q.y, 0, 6, 0.85 * gl);
      }
    }
    // the drawing tip: a soft light that leads the thread while you scroll
    if (!still && p > 0.01 && p < 0.99) {
      const q = path(g, S[0], Math.min(1, p * 1.18));
      pen.rgb(238, 240, 250); pen.glow(q.x, q.y, 0, 14, 0.7);
    }
    if (mode === 'c' || (mode === 'b' && g.stacked)) {
      const Q = pinchPoint(g), on = sm(p, 0.55, 0.8), pulse = still ? 1 : 0.85 + 0.15 * Math.sin(now / 520), R = 22 * on * pulse;
      if (on > 0) { pen.rgb(255, 246, 228); pen.glow(Q.x, Q.y, 0, R, 0.9 * on, 0.25, 0.35 * on); }
    }
    // the foot line and the "or" disc sit in front: erase a soft box behind them
    const T = g.text; for (let i = 0; i < 8; i++) { const pad = 4 + (8 - i) * 2.2; pen.erase(T.l - pad, T.t - pad * 0.7, T.r - T.l + pad * 2, T.b - T.t + pad * 1.4, 12, 0.2); }
    if (g.or) { const r = g.or.r + 1; pen.erase(g.or.x - r, g.or.y - r, r * 2, r * 2, r, 1); }
    pen.end();
    queue(true);
  }
  let idle = false;
  const gate = NusMotion.observe([fork, pricing], active => {
    if (active) queue();
    else { cancelAnimationFrame(frame); frame = 0; if (drawn) { pen.begin(W, H, dpr); pen.end(); drawn = false; } layer.style.visibility = 'hidden'; }
  });
  function queue(fromDraw) {
    if (frame || document.hidden || !gate.active) return;
    if (fromDraw && reduced.matches) { idle = true; return; }   // draw() only gets here while in range, so no second geo()
    idle = false; frame = requestAnimationFrame(draw);
  }
  addEventListener('scroll', () => queue(), { passive: true });
  addEventListener('resize', () => queue(), { passive: true });

  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else queue(); });
  reduced.addEventListener('change', () => queue());

  if (review) {
    const box = document.createElement('aside'); box.setAttribute('aria-label', 'Section connection comparison');
    box.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:100;pointer-events:none';
    const ui = box.attachShadow({ mode: 'open' });
    ui.innerHTML = `<style>
      :host{font:13px Inter,system-ui,sans-serif;color:#f1ecdf}
      .panel{box-sizing:border-box;max-width:730px;margin:auto;padding:12px 16px;border:1px solid #343a4b;border-radius:16px;background:rgba(6,8,16,.95);pointer-events:auto;box-shadow:0 8px 30px #0006}
      .row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}strong{font-size:12px;color:#b9c1d3;margin-right:auto}
      select,button,a{font:inherit;color:inherit;background:#151a29;border:1px solid #343a4b;border-radius:8px;padding:7px 10px;text-decoration:none;cursor:pointer}
      button:hover,a:hover{border-color:#d1a75f}:focus-visible{outline:2px solid #d1a75f;outline-offset:3px}
      p{margin:9px 0 0;color:#b9c1d3;line-height:1.4;font-size:12px}.folded .extra,.folded p{display:none}
      @media(max-width:480px){.panel{padding:10px}.row{gap:7px}strong{width:100%}select{flex:1;min-width:0}p{font-size:11px}}
    </style><div class="panel"><div class="row"><strong>03 / Two ways in → Pricing</strong>
      <select aria-label="Thread option">${Object.entries(variants).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
      <button class="extra" data-replay>Replay</button><button class="extra" data-hand>Handoff</button><a class="extra" href="index.html#pricing">Working page</a><button data-fold aria-expanded="true">Hide</button></div>
      <p aria-live="polite"></p></div>`;
    document.body.append(box);
    const sel = ui.querySelector('select'), note = ui.querySelector('p');
    const pick = () => { sel.value = mode; note.textContent = variants[mode][1] + ' Hover a card, or sweep the cursor through the strands.'; params.set('thread', mode); history.replaceState(null, '', `${location.pathname}?${params}`); queue(); };
    sel.addEventListener('change', () => { mode = sel.value; S.forEach((s) => { s.ox = s.oy = s.vx = s.vy = 0; }); pick(); });
    const at = (f) => { const g = geo(), y = scrollY, lowDoc = g.low + y, pDoc = g.pTop + y;
      const a = mode === 'b' ? g.orb.y + y - H * 0.55 : lowDoc - H * 0.92, b = mode === 'b' ? pDoc - H * 0.4 : pDoc - H * 0.42; scrollTo({ top: a + (b - a) * f, behavior: 'instant' }); };
    ui.querySelector('[data-replay]').addEventListener('click', () => at(mode === 'b' ? 0 : 0.05));
    ui.querySelector('[data-hand]').addEventListener('click', () => at(1));
    ui.querySelector('[data-fold]').addEventListener('click', (e) => { const f = ui.querySelector('.panel').classList.toggle('folded'); e.target.textContent = f ? 'Show' : 'Hide'; e.target.setAttribute('aria-expanded', String(!f)); });
    pick();
  }
  if (document.fonts) document.fonts.ready.then(() => queue());
  queue();
})();
