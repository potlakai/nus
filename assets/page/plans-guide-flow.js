/* Pricing > Setup thread options. Draws over the seam between #pricing and #setup; plans.js and guide.js stay
   untouched. data-review="setup" shows the switcher (setupflow.html). */
(() => {
  const review = document.currentScript.dataset.review === 'setup';
  const plans = document.querySelector('#pricing'), guide = document.querySelector('#setup');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search);
  const variants = {
    a: ['A · Pinch again', 'The strands run on out of the three plans and pinch into a bead over “Setup”, the same move as the one above pricing.'],
    b: ['B · Your key', '“Your AI, your key.” lights up, then a brass thread drops from it, behind the heading, into the app switcher.'],
    c: ['C · The thread becomes the steps', 'A thread leaves pricing, runs down beside the heading and becomes the rail through the numbered steps, lit up to the step playing now.'],
    original: ['Original', 'Pricing and Setup as approved, with no connection.'],
  };
  let mode = review && variants[params.get('next')] ? params.get('next') : 'a';   // A picked 2026-09-30
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
  const box = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height, cx: (b.left + b.right) / 2, cy: (b.top + b.bottom) / 2 }; };
  const text = (el) => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, cx: (b.left + b.right) / 2 }; };

  const layer = document.createElement('canvas'); layer.className = 'nus-flow-bridge'; layer.setAttribute('aria-hidden', 'true'); document.body.append(layer);
  const ctx = layer.getContext('2d');
  let W = 1, H = 1, dpr = 1;
  function size() { W = innerWidth; H = innerHeight; dpr = Math.min(1.5, devicePixelRatio || 1); layer.width = Math.round(W * dpr); layer.height = Math.round(H * dpr); }
  size(); addEventListener('resize', size, { passive: true });

  const COOL = [176, 190, 255], WARM = [232, 204, 150], BRASS = [224, 184, 112];
  const S = Array.from({ length: 150 }, (_, i) => ({ col: i % 3, sp: Math.random() * 2 - 1, s: Math.random(), ox: 0, oy: 0, vx: 0, vy: 0 }));
  const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 }, soft = { x: -1e4, y: -1e4 };
  addEventListener('pointermove', (e) => { const now = performance.now(), dt = Math.max(1, now - ptr.t) / 1000;
    ptr.vx = ptr.vx * 0.5 + ((e.clientX - ptr.x) / dt) * 0.5; ptr.vy = ptr.vy * 0.5 + ((e.clientY - ptr.y) / dt) * 0.5; ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now; }, { passive: true });
  // hover: a plan column, or the matching Setup tab, brightens its strands
  let hotCol = -1, hotTab = -1; const w = [1, 1, 1];
  function wire() {
    plans.querySelectorAll('.col').forEach((c, k) => { c.addEventListener('mouseenter', () => (hotCol = k)); c.addEventListener('mouseleave', () => (hotCol = -1)); });
    guide.querySelectorAll('.prod button').forEach((b, k) => { b.addEventListener('mouseenter', () => (hotTab = k)); b.addEventListener('mouseleave', () => (hotTab = -1)); });
  }

  function geo() {
    const cols = [...plans.querySelectorAll('.col')].map(box), keys = plans.querySelector('.keys');
    const head = guide.querySelector('.head'), nums = [...guide.querySelectorAll('.gsteps .n')];
    if (!cols.length || !head || !nums.length) return null;
    const on = guide.querySelector('.gsteps button.on .n');
    return { cols, stacked: innerWidth <= 980, keys: text(keys), keyB: box(keys.querySelector('b')),
      kicker: text(head.querySelector('.mono')), h2: text(head.querySelector('h2')), sub: text(head.querySelector('p')),
      seg: box(guide.querySelector('.prod .seg')), nums: nums.map(box), on: on ? nums.indexOf(on) : 0,
      faOp: +getComputedStyle(guide.querySelector('.fa')).opacity, low: Math.max(...cols.map((c) => c.b)) };
  }
  // scroll progress in document space, so it scrubs both ways
  function span(g) {
    const y = scrollY, a = g.low + y - H * 0.9;
    const target = mode === 'a' ? g.kicker.t : mode === 'b' ? g.seg.t : g.nums[0].t;
    return [a, target + y - H * (mode === 'c' ? 0.5 : 0.46)];
  }
  function progress(g) { if (reduced.matches) return 1; const [a, b] = span(g); return clamp((scrollY - a) / (b - a)); }

  /* ---------- A · pinch again ---------- */
  const bead = (g) => ({ x: g.kicker.cx, y: g.kicker.t - 24 });
  function pathA(g, s, t) {
    const c = g.stacked ? g.cols[2] : g.cols[s.col], Q = bead(g);
    const x0 = c.cx + s.sp * c.w * 0.34, y0 = c.b, dy = Q.y - y0;
    return { x: bez(x0, x0, Q.x + s.sp * 8, Q.x, t), y: bez(y0, y0 + dy * 0.62, Q.y - Math.min(70, dy * 0.3), Q.y, t) };
  }
  function drawA(g, p, dt, now, still) {
    const want = [0, 1, 2].map((k) => (hotCol < 0 && hotTab < 0 ? 1 : hotCol === k || (hotTab === 0 && k === 0) || (hotTab === 1 && k > 0) ? 1.9 : 0.4));
    w.forEach((v, k) => (w[k] += (want[k] - v) * Math.min(1, dt * 5)));
    const damp = Math.exp(-5 * dt), rad = 110; ctx.lineWidth = 0.6;
    for (const s of S) {
      if (!still) {
        const m = pathA(g, s, 0.5), dx = m.x + s.ox - ptr.x, dy = m.y + s.oy - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < rad * rad && d2 > 1) { const d = Math.sqrt(d2), f = (1 - d / rad) ** 2; s.vx += (dx / d) * f * 2200 * dt + ptr.vx * f * 2 * dt; s.vy += (dy / d) * f * 2200 * dt + ptr.vy * f * 2 * dt; }
        s.vx = (s.vx - 14 * s.ox * dt) * damp; s.vy = (s.vy - 14 * s.oy * dt) * damp; s.ox += s.vx * dt; s.oy += s.vy * dt;
      }
      const end = clamp(p * 1.18 - s.s * 0.18); if (end <= 0) continue;
      const col = s.col === 2 ? WARM : COOL, a = (0.05 + 0.15 * (1 - Math.abs(s.sp) * 0.6)) * Math.min(1, w[s.col]) * (0.6 + 0.4 * Math.min(2, w[s.col]));
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${Math.min(0.7, a)})`; ctx.beginPath();
      const n = Math.max(1, Math.round(40 * end));
      for (let j = 0; j <= n; j++) { const t = (j / n) * end, q = pathA(g, s, t), bell = Math.sin(Math.PI * t); j ? ctx.lineTo(q.x + s.ox * bell, q.y + s.oy * bell) : ctx.moveTo(q.x, q.y); }
      ctx.stroke();
      if (!still && p > 0.98 && s.s < (w[s.col] > 1.2 ? 0.14 : 0.045)) light(pathA(g, s, ((now / 1000) * 0.3 + s.s * 9) % 1), ((now / 1000) * 0.3 + s.s * 9) % 1);
    }
    const Q = bead(g), on = sm(p, 0.7, 0.95), R = 20 * on * (still ? 1 : 0.85 + 0.15 * Math.sin(now / 520));
    if (on > 0) { const gr = ctx.createRadialGradient(Q.x, Q.y, 0, Q.x, Q.y, R); gr.addColorStop(0, `rgba(255,246,228,${0.9 * on})`); gr.addColorStop(0.25, `rgba(232,214,176,${0.35 * on})`); gr.addColorStop(1, 'rgba(176,190,255,0)'); ctx.fillStyle = gr; ctx.fillRect(Q.x - R, Q.y - R, R * 2, R * 2); }
    tip(g, p, still, pathA(g, S[0], Math.min(1, p * 1.18)));
  }

  /* ---------- polyline helpers for B and C ---------- */
  function poly(segs) { // segs: array of point generators f(t) with sample counts
    const pts = [];
    segs.forEach(([f, n], i) => { for (let j = i ? 1 : 0; j <= n; j++) pts.push(f(j / n)); });
    let L = 0; pts[0].l = 0; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); pts[i].l = L; }
    pts.L = L; return pts;
  }
  const at = (pts, l) => { let i = 1; while (i < pts.length - 1 && pts[i].l < l) i++; const a = pts[i - 1], b = pts[i], u = clamp((l - a.l) / Math.max(1e-6, b.l - a.l)); return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }; };
  // a few hairlines along the path; near the cursor they part like hair
  function lanes(pts, upto, rgb, alpha, from = 0, fade = null) {
    for (let lane = 0; lane < 5; lane++) {
      const off = (lane - 2) * 1.5; ctx.beginPath(); let started = false;
      for (let i = 0; i < pts.length; i++) {
        const q = pts[i]; if (q.l < from) continue; if (q.l > upto) break;
        const nb = pts[Math.min(pts.length - 1, i + 1)], pb = pts[Math.max(0, i - 1)], tx = nb.x - pb.x, ty = nb.y - pb.y, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
        let x = q.x + nx * off, y = q.y + ny * off; const dx = x - soft.x, dy = y - soft.y, d = Math.hypot(dx, dy);
        if (d < 80 && d > 0.5) { const f = (1 - d / 80) ** 2 * (10 + Math.abs(off) * 6); x += (dx / d) * f; y += (dy / d) * f; }
        started ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), (started = true));
      }
      ctx.lineWidth = lane === 2 ? 0.9 : 0.6; ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * (lane === 2 ? 1 : 0.45) * (fade ?? 1)})`; ctx.stroke();
    }
  }
  function light(q, t, r = 6) { const gl = Math.sin(Math.PI * t), gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r); gr.addColorStop(0, `rgba(255,248,235,${0.85 * gl})`); gr.addColorStop(1, 'rgba(255,248,235,0)'); ctx.fillStyle = gr; ctx.fillRect(q.x - r, q.y - r, r * 2, r * 2); }
  function tip(g, p, still, q) { if (still || p < 0.01 || p > 0.99) return; const gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 14); gr.addColorStop(0, 'rgba(238,240,250,.7)'); gr.addColorStop(1, 'rgba(176,190,255,0)'); ctx.fillStyle = gr; ctx.fillRect(q.x - 14, q.y - 14, 28, 28); }

  /* ---------- B · your key ---------- */
  function pathB(g) {
    const x0 = g.keyB.cx, y0 = g.keyB.b + 6, x1 = g.seg.cx, y1 = Math.min(g.kicker.t - 36, y0 + 120), y2 = g.seg.t - 3;
    return poly([[(t) => ({ x: bez(x0, x0, x1, x1, t), y: bez(y0, y0 + (y1 - y0) * 0.7, y1 - (y1 - y0) * 0.5, y1, t) }), 36], [(t) => ({ x: x1, y: y1 + (y2 - y1) * t }), 40]]);
  }
  function drawB(g, p, dt, now, still) {
    const under = sm(p, 0, 0.16), f = sm(p, 0.12, 1), pts = pathB(g), hot = hotTab >= 0 || hotCol >= 0 ? 1.6 : 1;
    // the key phrase gets a brass underline first
    if (under > 0) { ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${BRASS},${0.75 * under})`; ctx.beginPath(); ctx.moveTo(g.keyB.l, g.keyB.b + 3); ctx.lineTo(g.keyB.l + g.keyB.w * under, g.keyB.b + 3); ctx.stroke(); }
    if (f > 0) lanes(pts, f * pts.L, BRASS, Math.min(0.8, 0.38 * hot));
    tip(g, f, still, at(pts, f * pts.L));
    if (!still && p > 0.98) for (let k = 0; k < 2; k++) { const t = ((now / 1000) * 0.35 + k * 0.5) % 1; light(at(pts, t * pts.L), t, 7); }
    // arrival: the app switcher takes a brass rim
    const arr = sm(p, 0.9, 1); if (arr > 0) { const s = g.seg; ctx.save(); ctx.shadowColor = `rgba(${BRASS},${0.7 * arr})`; ctx.shadowBlur = 18; ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${BRASS},${0.55 * arr * (still ? 1 : 0.8 + 0.2 * Math.sin(now / 600))})`; ctx.beginPath(); ctx.roundRect(s.l, s.t, s.w, s.h, s.h / 2); ctx.stroke(); ctx.restore(); }
  }

  /* ---------- C · the thread becomes the steps ---------- */
  function pathC(g) {
    const n = g.nums, first = n[0], last = n[n.length - 1];
    const x0 = g.keys.cx, y0 = g.keys.b + 10, rx = Math.max(12, Math.min(g.h2.l, g.sub.l, g.seg.l) - 44), yTop = g.kicker.t - 10, yBot = Math.max(g.seg.b, g.sub.b) + 10;
    return { pts: poly([
      [(t) => ({ x: bez(x0, x0, rx, rx, t), y: bez(y0, y0 + (yTop - y0) * 0.7, yTop - (yTop - y0) * 0.4, yTop, t) }), 34],
      [(t) => ({ x: rx, y: yTop + (yBot - yTop) * t }), 20],
      [(t) => ({ x: bez(rx, rx, first.cx, first.cx, t), y: bez(yBot, yBot + (first.t - yBot) * 0.6, first.t - (first.t - yBot) * 0.5, first.t, t) }), 30],
      [(t) => ({ x: first.cx, y: first.t + (last.b - first.t) * t }), 40]]), railFrom: null };
  }
  function drawC(g, p, dt, now, still) {
    const { pts } = pathC(g), n = g.nums, hot = hotCol >= 0 || hotTab >= 0 ? 1.5 : 1;
    const railStart = pts[34 + 20 + 30].l;   // end of the third piece = the first number's rim
    const upto = p * pts.L;
    lanes(pts, Math.min(upto, railStart), COOL, 0.36 * hot);
    if (upto > railStart) {
      // the rail through the steps: bright up to the step playing now, faint after it
      const onL = railStart + (n[g.on].cy - n[0].t), op = g.faOp;
      lanes(pts, Math.min(upto, onL), BRASS, 0.6 * op, railStart - 1);
      lanes(pts, upto, COOL, 0.22 * op, Math.min(upto, onL) - 1);
      if (upto >= onL) { const c = n[g.on], R = c.w / 2 + 7, gr = ctx.createRadialGradient(c.cx, c.cy, R * 0.55, c.cx, c.cy, R + 8); gr.addColorStop(0, `rgba(${BRASS},${0.5 * op})`); gr.addColorStop(1, `rgba(${BRASS},0)`); ctx.fillStyle = gr; ctx.fillRect(c.cx - R - 8, c.cy - R - 8, (R + 8) * 2, (R + 8) * 2); }
    }
    tip(g, p, still, at(pts, upto));
    if (!still && p > 0.98) { const t = ((now / 1000) * 0.22) % 1; light(at(pts, t * pts.L), t, 7); }
    // numbers sit on the rail like beads
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
    n.forEach((c) => { ctx.beginPath(); ctx.arc(c.cx, c.cy, c.w / 2 + 1, 0, 6.3); ctx.fill(); });
    ctx.globalCompositeOperation = 'source-over';
  }

  // text in front: erase a soft box behind each line a thread passes
  function clear(T) { if (!T) return; for (let i = 0; i < 8; i++) { const pad = 4 + (8 - i) * 2.2; ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.roundRect(T.l - pad, T.t - pad * 0.7, T.r - T.l + pad * 2, T.b - T.t + pad * 1.4, 12); ctx.fill(); } }

  let frame = 0, last = performance.now(), idle = false;
  const inRange = (g) => g.low < H + 80 && Math.max(g.nums[g.nums.length - 1].b, g.seg.b) > -80;
  function draw(now) {
    frame = 0; const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (mode === 'original') { layer.style.visibility = 'hidden'; return; }
    const g = geo(); if (!g || !inRange(g)) { idle = true; layer.style.visibility = 'hidden'; return; }
    layer.style.visibility = '';
    soft.x += (ptr.x - soft.x) * Math.min(1, dt * 10); soft.y += (ptr.y - soft.y) * Math.min(1, dt * 10);
    const p = progress(g), still = reduced.matches;
    if (mode === 'a') drawA(g, p, dt, now, still); else if (mode === 'b') drawB(g, p, dt, now, still); else drawC(g, p, dt, now, still);
    ctx.globalCompositeOperation = 'destination-out';
    clear(g.keys); if (mode === 'b') { clear(g.kicker); clear(g.h2); clear(g.sub); }
    ctx.globalCompositeOperation = 'source-over';
    if (still) { idle = true; return; }
    idle = false; queue();
  }
  function queue() { if (!frame && !document.hidden) frame = requestAnimationFrame(draw); }
  addEventListener('scroll', queue, { passive: true }); addEventListener('resize', queue, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else queue(); });
  reduced.addEventListener('change', queue);
  guide.addEventListener('click', () => setTimeout(queue, 50));

  if (review) {
    const el = document.createElement('aside'); el.setAttribute('aria-label', 'Section connection comparison');
    el.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:100;pointer-events:none';
    const ui = el.attachShadow({ mode: 'open' });
    ui.innerHTML = `<style>
      :host{font:13px Inter,system-ui,sans-serif;color:#f1ecdf}
      .panel{box-sizing:border-box;max-width:730px;margin:auto;padding:12px 16px;border:1px solid #343a4b;border-radius:16px;background:rgba(6,8,16,.95);pointer-events:auto;box-shadow:0 8px 30px #0006}
      .row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}strong{font-size:12px;color:#b9c1d3;margin-right:auto}
      select,button,a{font:inherit;color:inherit;background:#151a29;border:1px solid #343a4b;border-radius:8px;padding:7px 10px;text-decoration:none;cursor:pointer}
      button:hover,a:hover{border-color:#d1a75f}:focus-visible{outline:2px solid #d1a75f;outline-offset:3px}
      p{margin:9px 0 0;color:#b9c1d3;line-height:1.4;font-size:12px}.folded .extra,.folded p{display:none}
      @media(max-width:480px){.panel{padding:10px}.row{gap:7px}strong{width:100%}select{flex:1;min-width:0}p{font-size:11px}}
    </style><div class="panel"><div class="row"><strong>04 / Pricing → Setup</strong>
      <select aria-label="Thread option">${Object.entries(variants).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
      <button class="extra" data-replay>Replay</button><button class="extra" data-hand>Handoff</button><a class="extra" href="index.html#pricing">Working page</a><button data-fold aria-expanded="true">Hide</button></div>
      <p aria-live="polite"></p></div>`;
    document.body.append(el);
    const sel = ui.querySelector('select'), note = ui.querySelector('p');
    const pick = () => { sel.value = mode; note.textContent = variants[mode][1] + ' Hover a plan or a Setup tab, or sweep the cursor through it.'; params.set('next', mode); history.replaceState(null, '', `${location.pathname}?${params}`); queue(); };
    sel.addEventListener('change', () => { mode = sel.value; S.forEach((s) => { s.ox = s.oy = s.vx = s.vy = 0; }); pick(); });
    const go = (f) => { const g = geo(); if (!g) return; const [a, b] = span(g); scrollTo({ top: a + (b - a) * f, behavior: 'instant' }); queue(); };
    ui.querySelector('[data-replay]').addEventListener('click', () => go(0.02));
    ui.querySelector('[data-hand]').addEventListener('click', () => go(1));
    ui.querySelector('[data-fold]').addEventListener('click', (e) => { const f = ui.querySelector('.panel').classList.toggle('folded'); e.target.textContent = f ? 'Show' : 'Hide'; e.target.setAttribute('aria-expanded', String(!f)); });
    pick();
  }
  wire();
  if (document.fonts) document.fonts.ready.then(queue);
  queue();
})();
