// The thread: the Knot's own strand, run through the whole page. It leaves the
// hero Knot, visits every [data-thread] anchor in document order, wraps
// around the ones marked "loop" (in front on the near side, behind the card
// on the far side), brushes past the ones marked "pass", and ends inside the
// closing Knot. A light travels along it and hurries when you scroll.
//
// Two fixed, viewport-sized canvases: #thread-back sits beneath the page
// content, #thread-front above it. Each strand sample goes to one or the other
// by its depth, so the thread physically passes behind screens and cards.
// The material is shared with knot3d.js (the same chrome discs).
//
// All geometry (anchor rects, the 3D spline, the dense sample table) happens
// in layout(). The frame loop only projects the visible slice and draws.
(() => {
  'use strict';

  const back = document.getElementById('thread-back');
  const front = document.getElementById('thread-front');
  if (!back || !front || !window.NusKnot3D) return;
  const M = window.NusKnot3D.material;
  const bctx = back.getContext('2d');
  const fctx = front.getContext('2d');
  if (!bctx || !fctx) return;

  const reduced = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    || /motion=reduce/.test(location.search);

  const PAD = 34;        // how far a loop stands off the element it circles (front side)
  const INSET = 46;      // how far inside the element's far edge the strand passes behind it
  const PASS = 48;       // how far a pass stands off the element's side
  const EDGE = 16;       // never closer than this to the viewport edge
  const STEP = 1.5;      // sample spacing along the strand, document px
  const TUBE = 8.5;      // strand radius, css px
  const MARGIN = 80;     // draw this far outside the viewport so the strand never pops
  const TWO_PI = Math.PI * 2;

  let W = 0, VH = 0, H = 0, dpr = 1;
  let X = null, Y = null, Z = null, L = null, A = null, SD = null, N = 0, total = 0; // dense samples
  let ready = false;
  let scrollY = 0, lastScroll = 0;
  let bandLen = 0, time = 0, last = performance.now(), running = false, frame = null;
  let stars = [];
  let lastW = 0, lastH = 0;
  let accent = [80, 108, 255];

  const clampX = (x) => Math.max(EDGE, Math.min(W - EDGE, x));

  // ---------------------------------------------------------- read pass
  // Every anchor becomes a run of 3D waypoints. When the strand has to change
  // sides of the page between two anchors, it crosses in the empty band at
  // the boundary between their sections (never through a heading), so the
  // only things it ever passes over are the screens it wraps.
  function waypoints() {
    const els = document.querySelectorAll('[data-thread]');
    const sy = window.scrollY || 0;
    const narrow = W < 720;
    const anchors = [];
    let alternate = 'left';
    let zflip = 1;
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const top = r.top + sy, bottom = r.bottom + sy;
      const kind = el.dataset.thread;
      const side = el.dataset.threadSide || alternate;
      alternate = side === 'left' ? 'right' : 'left';
      const cx = r.left + r.width / 2;
      const sec = el.closest('section, header') || el;
      const sr = sec.getBoundingClientRect();
      const a = { kind, top, bottom, secTop: sr.top + sy, secBottom: sr.bottom + sy, pts: [] };
      if (kind === 'knot-start') {
        a.pts.push([cx, bottom - r.height * 0.16, 0.8]);
        // On a phone the Knot sits above the wordmark: leave sideways at once
        // so the strand runs down the edge instead of through the copy.
        if (narrow) a.pts.push([EDGE + 6, bottom + 40, 0.5]);
        a.transit = false;
      } else if (kind === 'knot-end') {
        a.pts.push([cx, top + r.height * 0.16, 0.8]);
      } else if (kind === 'loop' && !narrow && r.width < W * 0.8) {
        // Near side stands off the card (in front); far side passes behind it.
        const nearL = side === 'left';
        const near = clampX(nearL ? r.left - PAD : r.right + PAD);
        const far = nearL ? r.right - INSET : r.left + INSET;
        const T = top - PAD * 0.6, B = bottom + PAD * 0.6;
        const mid = (near + far) / 2;
        a.pts.push(
          [near, top + r.height * 0.28, 0.9],
          [mid + (nearL ? 40 : -40), T, 0.15],
          [far, top + r.height * 0.5, -0.95],
          [mid + (nearL ? 40 : -40), B, -0.15],
          [near, top + r.height * 0.78, 0.9]
        );
      } else {
        const x = narrow ? EDGE + 4 : clampX(side === 'left' ? r.left - PASS : r.right + PASS);
        a.pts.push([x, top + r.height / 2, 0.35 * zflip]);
        zflip = -zflip;
      }
      anchors.push(a);
    });

    const pts = [];
    let prev = null;
    for (const a of anchors) {
      if (prev && a.transit !== false) {
        const exitX = prev.pts[prev.pts.length - 1][0];
        const entryX = a.pts[0][0];
        const differentSections = a.secTop > prev.secBottom - 2;
        const gy = differentSections ? (prev.secBottom + a.secTop) / 2 : (prev.bottom + a.top) / 2;
        const room = differentSections ? Infinity : a.top - prev.bottom;
        if (Math.abs(entryX - exitX) > W * 0.28 && room > 90 && gy > prev.pts[prev.pts.length - 1][1] + 40 && gy < a.pts[0][1] - 40) {
          const bend = entryX > exitX ? 24 : -24;
          pts.push([exitX + bend, gy, 0.3], [entryX - bend, gy, 0.3]);
        }
      }
      for (const p of a.pts) pts.push(p);
      prev = a;
    }
    return pts;
  }

  // Catmull-Rom (tension .5) through 3D waypoints, sampled every STEP px.
  function sample(p) {
    const xs = [], ys = [], zs = [];
    const push = (x, y, z) => { xs.push(x); ys.push(y); zs.push(z); };
    push(p[0][0], p[0][1], p[0][2]);
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const chord = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const n = Math.max(2, Math.ceil(chord / STEP * 1.35));
      for (let s = 1; s <= n; s++) {
        const t = s / n, t2 = t * t, t3 = t2 * t;
        const out = [0, 0, 0];
        for (let d = 0; d < 3; d++) {
          const a = p0[d], b = p1[d], c = p2[d], e = p3[d];
          out[d] = 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - e) * t2 + (-a + 3 * b - 3 * c + e) * t3);
        }
        push(out[0], out[1], out[2]);
      }
    }
    N = xs.length;
    X = Float32Array.from(xs); Y = Float32Array.from(ys); Z = Float32Array.from(zs);
    L = new Float32Array(N); A = new Float32Array(N); SD = new Float32Array(N);
    let acc = 0;
    for (let i = 1; i < N; i++) { acc += Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]); L[i] = acc; }
    total = acc;
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
      A[i] = Math.atan2(Y[b] - Y[a], X[b] - X[a]);
      SD[i] = M.lightSide(A[i]);
    }
  }

  function seedStars() {
    stars = [];
    const count = Math.round(70 + W * H * 0.000012);
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < count; i++) {
      stars.push({ x: rnd() * W, y: rnd() * (H * 0.42 + VH), r: 0.5 + rnd() * 1.1, a: 0.18 + rnd() * 0.5, tw: rnd() * TWO_PI, sp: 0.4 + rnd() * 0.8 });
    }
  }

  function readAccent() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--knot-accent');
    accent = M.parseColor(raw, [80, 108, 255]);
  }

  function sizeCanvases() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(W * dpr), h = Math.round(VH * dpr);
    for (const c of [back, front]) {
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      c.style.width = W + 'px'; c.style.height = VH + 'px';
    }
  }

  function layout() {
    W = document.documentElement.clientWidth;
    VH = window.innerHeight;
    H = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const pts = waypoints();
    sizeCanvases();
    readAccent();
    seedStars();
    if (pts.length < 2) { ready = false; return; }
    sample(pts);
    ready = true;
    lastW = W; lastH = H;
    if (reduced || !running) draw(performance.now());
  }

  // ------------------------------------------------------------- frame
  const pool = [];
  const backList = [], frontList = [];
  const byZ = (a, b) => a.z - b.z;

  function getPt(i) { return pool[i] || (pool[i] = { sx: 0, sy: 0, z: 0, persp: 1, ang: 0, s: 0, len: 4 }); }

  function draw(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    scrollY = window.scrollY || 0;
    const dy = scrollY - lastScroll;
    lastScroll = scrollY;
    if (!reduced) {
      time += dt;
      // The light runs down the strand on its own and hurries with the scroll.
      bandLen += dt * 240 + Math.max(0, dy) * 1.1;
      if (total > 0 && bandLen > total + 200) bandLen = -200;
    }

    bctx.clearRect(0, 0, back.width, back.height);
    fctx.clearRect(0, 0, front.width, front.height);

    // Stars, parallaxed at a third of the scroll, on the back layer.
    const px = scrollY * 0.34;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const y = s.y - px;
      if (y < -4 || y > VH + 4) continue;
      const a = reduced ? s.a : s.a * (0.6 + 0.4 * Math.sin(time * s.sp + s.tw));
      bctx.beginPath();
      bctx.arc(s.x * dpr, y * dpr, s.r * dpr, 0, TWO_PI);
      bctx.fillStyle = `rgba(214,220,255,${a.toFixed(3)})`;
      bctx.fill();
    }

    if (!ready) { if (running) frame = requestAnimationFrame(draw); return; }

    // Project the visible slice; sway the depth a little so the strand breathes.
    const y0 = scrollY - MARGIN, y1 = scrollY + VH + MARGIN;
    const slen = Math.max(3, STEP * 3.4) * dpr;
    backList.length = 0; frontList.length = 0;
    let k = 0;
    for (let i = 0; i < N; i++) {
      const y = Y[i];
      if (y < y0 || y > y1) continue;
      const z = Z[i] + (reduced ? 0 : 0.14 * Math.sin(time * 0.8 + L[i] * 0.007));
      const p = getPt(k++);
      p.z = z;
      p.persp = 1 + z * 0.22;
      p.sx = X[i] * dpr;
      p.sy = (y - scrollY) * dpr;
      p.ang = A[i];
      p.s = SD[i];
      p.len = slen;
      (z < 0 ? backList : frontList).push(p);
    }
    backList.sort(byZ);
    frontList.sort(byZ);

    const tube = TUBE * dpr;
    const set = M.sprites(accent, 0.22);
    M.drawTube(bctx, backList, tube, set);
    M.drawTube(fctx, frontList, tube, set);

    // The travelling light: find its sample, brighten the strand around it.
    if (!reduced && total > 0) {
      let lo = 0, hi = N - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L[mid] <= bandLen) lo = mid; else hi = mid; }
      const by = Y[lo];
      if (by >= y0 && by <= y1) {
        const z = Z[lo];
        const ctx = z < 0 ? bctx : fctx;
        const half = 16;
        const run = [];
        const from = Math.max(0, lo - half), to = Math.min(N - 1, lo + half);
        for (let j = from; j <= to; j++) {
          run.push({ sx: X[j] * dpr, sy: (Y[j] - scrollY) * dpr, z: Z[j], persp: 1 + Z[j] * 0.22, ang: A[j], s: SD[j], len: slen });
        }
        M.drawBright(ctx, run, tube, set, (i) => 0.6 * (1 - Math.abs((from + i) - lo) / (half + 1)));
        M.drawLight(ctx, X[lo] * dpr, (by - scrollY) * dpr, tube * 4.2, accent, 0.8);
      }
    }

    if (running) frame = requestAnimationFrame(draw);
  }

  function start() { if (running || reduced) return; running = true; last = performance.now(); frame = requestAnimationFrame(draw); }
  function stop() { running = false; if (frame) cancelAnimationFrame(frame); frame = null; }

  // Relayout when the document changes size (images, fonts, FAQ toggles,
  // viewport). Debounced; ignored when nothing actually changed.
  let timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const w = document.documentElement.clientWidth;
      const h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      if (ready && w === lastW && h === lastH && VH === window.innerHeight) return;
      layout();
    }, 120);
  }
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('load', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(document.body);
  document.addEventListener('toggle', schedule, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  if (reduced) window.addEventListener('scroll', () => draw(performance.now()), { passive: true });

  layout();
  start();

  window.NusThread = { layout, relayout: schedule };
})();
