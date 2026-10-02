/* Setup > Now thread options. Draws over the seam between #setup and #now; guide.js and nowsec.js stay
   untouched. The thread colour follows the Setup tab (Companion cool, Students warm).
   data-review="now" shows the switcher (nowflow.html). */
(() => {
  const review = document.currentScript.dataset.review === 'now';
  const guide = document.querySelector('#setup'), now = document.querySelector('#now');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search);
  const variants = {
    a: ['A · Pinch again', 'Strands run out of the steps and the screen and pinch into a bead over “Now and next”, like the last two seams.'],
    b: ['B · The steps lead to Now', 'The thread leaves the last step, runs down the left and lands in the “Now” dot, which lights up.'],
    c: ['C · Into the orb', 'Strands leave the steps and the screen, pass behind the heading and sink into the ledger’s orb, which glows as they land.'],
    original: ['Original', 'Setup and Now as approved, with no connection.'],
  };
  let mode = review && variants[params.get('seam')] ? params.get('seam') : 'c';   // C picked 2026-09-30
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
  const box = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height, cx: (b.left + b.right) / 2, cy: (b.top + b.bottom) / 2 }; };
  const text = (el) => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, cx: (b.left + b.right) / 2 }; };

  const layer = document.createElement('canvas'); layer.className = 'nus-flow-bridge'; layer.setAttribute('aria-hidden', 'true'); document.body.append(layer);
  const pen = NusDraw(layer);   // one draw call a frame (gl2d.js)
  let W = 1, H = 1, dpr = 1;
  function size() { W = innerWidth; H = innerHeight; dpr = Math.min(1.5, devicePixelRatio || 1); layer.width = Math.round(W * dpr); layer.height = Math.round(H * dpr); }
  size(); addEventListener('resize', size, { passive: true });

  const COOL = [176, 190, 255], WARM = [232, 204, 150];
  const S = Array.from({ length: 140 }, (_, i) => ({ side: i % 2, sp: Math.random() * 2 - 1, s: Math.random(), ox: 0, oy: 0, vx: 0, vy: 0 }));
  const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 }, soft = { x: -1e4, y: -1e4 };
  addEventListener('pointermove', (e) => { const t = performance.now(), dt = Math.max(1, t - ptr.t) / 1000;
    ptr.vx = ptr.vx * 0.5 + ((e.clientX - ptr.x) / dt) * 0.5; ptr.vy = ptr.vy * 0.5 + ((e.clientY - ptr.y) / dt) * 0.5; ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = t; }, { passive: true });
  // hover the steps, the screen or the Now column and the thread brightens
  let hot = 0, glow = 1;
  function wire() {
    const on = () => (hot = 1), off = () => (hot = 0);
    [guide.querySelector('.fa'), now.querySelector('.ledger')].forEach((el) => { if (el) { el.addEventListener('mouseenter', on); el.addEventListener('mouseleave', off); } });
  }

  function geo() {
    const list = guide.querySelector('.gsteps'), screen = guide.querySelector('.screen'), nums = [...guide.querySelectorAll('.gsteps .n')];
    const head = now.querySelector('.head'), dot = now.querySelector('.ch-now .dot'), mid = now.querySelector('.mid');
    if (!list || !screen || !nums.length || !head || !dot || !mid) return null;
    const m = box(mid), tab = [...guide.querySelectorAll('.prod button')].findIndex((b) => b.classList.contains('on'));
    return { list: box(list), screen: box(screen), last: box(nums[nums.length - 1]), stacked: innerWidth <= 980,
      kicker: text(head.querySelector('.mono')), h2: text(head.querySelector('h2')), sub: text(head.querySelector('p')),
      dot: box(dot), orb: { x: m.cx, y: m.cy - 20, r: 86 }, rgb: tab === 1 ? WARM : COOL,
      low: Math.max(box(list).b, box(screen).b) };
  }
  function span(g) {
    const y = scrollY;
    if (mode === 'b') return [g.last.b + y - H * 0.85, g.dot.t + y - H * 0.5];
    return [g.low + y - H * 0.9, (mode === 'a' ? g.kicker.t : g.orb.y) + y - H * (mode === 'a' ? 0.46 : 0.5)];
  }
  function progress(g) { if (reduced.matches) return 1; const [a, b] = span(g); return clamp((scrollY - a) / (b - a)); }

  /* ---------- A and C: strands out of the steps (side 0) and the screen (side 1) ---------- */
  const beadA = (g) => ({ x: g.kicker.cx, y: g.kicker.t - 24 });
  function src(g, s) { const r = g.stacked ? g.screen : s.side ? g.screen : g.list; return { x: r.cx + s.sp * r.w * 0.34, y: r.b }; }
  function pathA(g, s, t) {
    const o = s._o || src(g, s), Q = beadA(g), dy = Q.y - o.y;
    return { x: bez(o.x, o.x, Q.x + s.sp * 8, Q.x, t), y: bez(o.y, o.y + dy * 0.62, Q.y - Math.min(70, dy * 0.3), Q.y, t) };
  }
  function pathC(g, s, t) {
    const o = s._o || src(g, s), O = g.orb, ang = -Math.PI / 2 + s.sp * 0.9, ex = O.x + Math.cos(ang) * O.r * 0.95, ey = O.y + Math.sin(ang) * O.r * 0.95, dy = ey - o.y;
    return { x: bez(o.x, o.x, ex + s.sp * 20, ex, t), y: bez(o.y, o.y + dy * 0.5, ey - dy * 0.35, ey, t) };
  }
  function strands(g, p, dt, now, still, path) {
    const damp = Math.exp(-5 * dt), rad = 110; pen.rgb(g.rgb[0], g.rgb[1], g.rgb[2]);
    for (const s of S) {
      s._o = src(g, s);   // once per strand per frame, not once per point
      if (!still) {
        const m = path(g, s, 0.5), dx = m.x + s.ox - ptr.x, dy = m.y + s.oy - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < rad * rad && d2 > 1) { const d = Math.sqrt(d2), f = (1 - d / rad) ** 2; s.vx += (dx / d) * f * 2200 * dt + ptr.vx * f * 2 * dt; s.vy += (dy / d) * f * 2200 * dt + ptr.vy * f * 2 * dt; }
        s.vx = (s.vx - 14 * s.ox * dt) * damp; s.vy = (s.vy - 14 * s.oy * dt) * damp; s.ox += s.vx * dt; s.oy += s.vy * dt;
      }
      const end = clamp(p * 1.18 - s.s * 0.18); if (end <= 0) continue;
      const a = (0.05 + 0.15 * (1 - Math.abs(s.sp) * 0.6)) * glow;
      const n = Math.max(1, Math.round(40 * end));
      for (let j = 0; j <= n; j++) { const t = (j / n) * end, q = path(g, s, t), bell = Math.sin(Math.PI * t); j ? pen.to(q.x + s.ox * bell, q.y + s.oy * bell) : pen.start(q.x, q.y, Math.min(0.7, a), 0.6); }
      pen.stroke();
      if (!still && p > 0.98 && s.s < (hot ? 0.12 : 0.045)) { const t = ((now / 1000) * 0.3 + s.s * 9) % 1; light(path(g, s, t), t); pen.rgb(g.rgb[0], g.rgb[1], g.rgb[2]); }
    }
    tip(p, still, path(g, S[0], Math.min(1, p * 1.18)));
  }
  function halo(x, y, R, on, core = 0.9) {
    if (on <= 0) return; pen.rgb(255, 246, 228); pen.glow(x, y, 0, R, core * on, 0.25, 0.35 * on);
  }
  function drawA(g, p, dt, t, still) { strands(g, p, dt, t, still, pathA); const Q = beadA(g); halo(Q.x, Q.y, 20 * (still ? 1 : 0.85 + 0.15 * Math.sin(t / 520)), sm(p, 0.7, 0.95)); }
  function drawC(g, p, dt, t, still) {
    strands(g, p, dt, t, still, pathC);
    // the orb takes the light as the strands land
    const on = sm(p, 0.8, 1), O = g.orb; if (on > 0) { pen.rgb(g.rgb[0], g.rgb[1], g.rgb[2]); pen.glow(O.x, O.y, O.r * 0.4, O.r * 1.9, 0.16 * on * (still ? 1 : 0.85 + 0.15 * Math.sin(t / 600))); }
  }

  /* ---------- B: one thread from the last step into the Now dot ---------- */
  function poly(segs) {
    const pts = []; segs.forEach(([f, n], i) => { for (let j = i ? 1 : 0; j <= n; j++) pts.push(f(j / n)); });
    let L = 0; pts[0].l = 0; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); pts[i].l = L; } pts.L = L; return pts;
  }
  const at = (pts, l) => { let i = 1; while (i < pts.length - 1 && pts[i].l < l) i++; const a = pts[i - 1], b = pts[i], u = clamp((l - a.l) / Math.max(1e-6, b.l - a.l)); return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }; };
  function lanes(pts, upto, rgb, alpha) {
    for (let lane = 0; lane < 5; lane++) {
      const off = (lane - 2) * 1.5; let started = false; pen.rgb(rgb[0], rgb[1], rgb[2]);
      for (let i = 0; i < pts.length; i++) {
        const q = pts[i]; if (q.l > upto) break;
        const nb = pts[Math.min(pts.length - 1, i + 1)], pb = pts[Math.max(0, i - 1)], tx = nb.x - pb.x, ty = nb.y - pb.y, tl = Math.hypot(tx, ty) || 1;
        let x = q.x - (ty / tl) * off, y = q.y + (tx / tl) * off; const dx = x - soft.x, dy = y - soft.y, d = Math.hypot(dx, dy);
        if (d < 80 && d > 0.5) { const f = (1 - d / 80) ** 2 * (10 + Math.abs(off) * 6); x += (dx / d) * f; y += (dy / d) * f; }
        started ? pen.to(x, y) : (pen.start(x, y, alpha * (lane === 2 ? 1 : 0.45), lane === 2 ? 0.9 : 0.6), (started = true));
      }
      if (started) pen.stroke();
    }
  }
  function pathB(g) {
    // lands on the "Now" dot from above, so it never crosses the word
    const x0 = g.last.cx, y0 = g.last.b + 2, yA = Math.max(g.sub.b + 16, y0 + 40), D = g.dot, ex = D.cx, ey = D.t - 1;
    return poly([[(t) => ({ x: x0, y: y0 + (yA - y0) * t }), 40],
      [(t) => ({ x: bez(x0, x0, ex, ex, t), y: bez(yA, yA + (ey - yA) * 0.75, ey - (ey - yA) * 0.75, ey, t) }), 30]]);
  }
  function drawB(g, p, dt, t, still) {
    const pts = pathB(g), upto = p * pts.L;
    lanes(pts, upto, g.rgb, Math.min(0.8, 0.4 * glow));
    tip(p, still, at(pts, upto));
    if (!still && p > 0.98) { const u = ((t / 1000) * 0.3) % 1; light(at(pts, u * pts.L), u, 7); }
    const D = g.dot; halo(D.cx, D.cy, 22 * (still ? 1 : 0.85 + 0.15 * Math.sin(t / 520)), sm(p, 0.9, 1), 0.7);
  }

  function light(q, t, r = 6) { pen.rgb(255, 248, 235); pen.glow(q.x, q.y, 0, r, 0.85 * Math.sin(Math.PI * t)); }
  function tip(p, still, q) { if (still || p < 0.01 || p > 0.99) return; pen.rgb(238, 240, 250); pen.glow(q.x, q.y, 0, 14, 0.7); }
  function clear(T) { for (let i = 0; i < 8; i++) { const pad = 4 + (8 - i) * 3.4; pen.erase(T.l - pad, T.t - pad * 0.8, T.r - T.l + pad * 2, T.b - T.t + pad * 1.6, 14, 0.3); } }

  let frame = 0, last = performance.now(), drawn = false;
  const inRange = (g) => Math.min(g.last.b, g.low) < H + 80 && g.orb.y + 120 > -80;
  function draw(t) {
    frame = 0; const dt = Math.min(0.05, (t - last) / 1000); last = t;
    // clear only when something was drawn, so scrolling elsewhere never touches this full-screen canvas
    const off = () => { if (drawn) { pen.begin(W, H, dpr); pen.end(); drawn = false; } layer.style.visibility = 'hidden'; };
    if (mode === 'original') return off();
    const g = geo(); if (!g || !inRange(g)) return off();
    pen.begin(W, H, dpr); drawn = true; layer.style.visibility = '';
    soft.x += (ptr.x - soft.x) * Math.min(1, dt * 10); soft.y += (ptr.y - soft.y) * Math.min(1, dt * 10);
    glow += ((hot ? 1.6 : 1) - glow) * Math.min(1, dt * 5);
    const p = progress(g), still = reduced.matches;
    (mode === 'a' ? drawA : mode === 'b' ? drawB : drawC)(g, p, dt, t, still);
    if (mode === 'c') { clear(g.kicker); clear(g.h2); clear(g.sub); }
    pen.end();
    if (!still) queue();
  }
  const gate = NusMotion.observe([guide, now], active => {
    if (active) queue();
    else { cancelAnimationFrame(frame); frame = 0; if (drawn) { pen.begin(W, H, dpr); pen.end(); drawn = false; } layer.style.visibility = 'hidden'; }
  });
  function queue() { if (!frame && !document.hidden && gate.active) frame = requestAnimationFrame(draw); }
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
    </style><div class="panel"><div class="row"><strong>05 / Setup → Now</strong>
      <select aria-label="Thread option">${Object.entries(variants).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
      <button class="extra" data-replay>Replay</button><button class="extra" data-hand>Handoff</button><a class="extra" href="index.html#setup">Working page</a><button data-fold aria-expanded="true">Hide</button></div>
      <p aria-live="polite"></p></div>`;
    document.body.append(el);
    const sel = ui.querySelector('select'), note = ui.querySelector('p');
    const pick = () => { sel.value = mode; note.textContent = variants[mode][1] + ' Its colour follows the Setup tab. Hover the steps or the Now list, or sweep the cursor through it.'; params.set('seam', mode); history.replaceState(null, '', `${location.pathname}?${params}`); queue(); };
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
