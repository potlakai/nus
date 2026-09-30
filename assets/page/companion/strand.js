// Preview copy of nus-desktop-day1/companion/renderer/strand.js (2026-09-29), unchanged except redraw().
// The Companion strand: the Knot's own thread, unwound across the screen to
// the one control it is talking about, and wound back when it is done.
//
// Same material as the Knot (NusKnot3D.material), so the thread is literally
// the Knot's open end continuing on. Screen space only: the canvas covers the
// overlay window, coordinates are window CSS px, and the path is one gentle
// S-curve from the Knot's tail to the edge of a target box. Progress runs
// 0..1 (unwind) and back (rewind); the Knot opens as the thread leaves it.
//
// Colour: --thread-accent on the canvas (set per task by the host) is the
// light that rides the chrome strand. The Knot's own glow is a separate,
// state-driven --knot-accent, so "reading your screen" (amber) can show on
// the mark while the thread keeps its task colour.
(() => {
  'use strict';

  const TWO_PI = Math.PI * 2;
  const STRAND_TUBE = 2.5;      // strand radius on the screen, CSS px
  const STRAND_Z = -0.35;       // depth of the strand, for lighting
  const STRAND_TINT = 0.55;     // how much of the accent the chrome carries
  const SAMPLE_STEP = 3.2;      // px along the curve between slices
  const JOIN = 200;             // px over which the strand adopts the Knot's live tail
  const GAP = 9;                // px the tip stops short of the target box
  const PULSE_SPEED = 260;      // px/s of a travelling light
  const PULSE_HALF = 42;        // px of strand lit around a light
  const PULSE_PERIOD = 2600;    // ms between lights while pointing
  const POINTING_LOOP_MS = 30000; // how long a settled pointer keeps breathing before it holds still
  const UNWIND_MS = 650, UNWIND_PER_PX = 0.25;
  const REWIND_MS = 420, REWIND_PER_PX = 0.12;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (v) => { const x = clamp(v, 0, 1); return x * x * (3 - 2 * x); };
  const easeInOut = (v) => { const x = clamp(v, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const easeOut = (v) => 1 - Math.pow(1 - clamp(v, 0, 1), 3);

  // Samples spaced by arc length, so a flat run is as dense as a drop.
  function cubic(a, b, c, d, out) {
    const est = Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y) + Math.hypot(d.x - c.x, d.y - c.y);
    const n = Math.max(4, Math.ceil(est / SAMPLE_STEP));
    for (let i = 0; i <= n; i++) {
      const t = i / n, m = 1 - t, t2 = t * t, m2 = m * m;
      out.push({
        x: m2 * m * a.x + 3 * m2 * t * b.x + 3 * m * t2 * c.x + t2 * t * d.x,
        y: m2 * m * a.y + 3 * m2 * t * b.y + 3 * m * t2 * c.y + t2 * t * d.y,
      });
    }
    return out;
  }

  function withLengths(pts) {
    let len = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      pts[i].len = len;
    }
    return pts;
  }

  function mount(canvas, knot, opts = {}) {
    const M = window.NusKnot3D && window.NusKnot3D.material;
    const ctx = canvas.getContext('2d');
    if (!M || !ctx || !knot) return null;

    let reduced = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      || /motion=reduce/.test(String(window.location && window.location.search));
    const debug = /strandDebug=1/.test(String(window.location && window.location.search));
    const onArrive = typeof opts.onArrive === 'function' ? opts.onArrive : () => {};
    const onRewound = typeof opts.onRewound === 'function' ? opts.onRewound : () => {};

    let W = 0, H = 0, dpr = 1;
    let state = 'idle';           // idle | unwinding | pointing | rewinding
    let target = null;            // { x, y, w, h } window CSS px
    let path = [], oldPath = [], blendAt = 0, control = null;
    let progress = 0, fromP = 0, toP = 0, moveAt = 0, moveMs = 1;
    let startInfo = null;         // the Knot's tail when fully open
    let running = false, frame = null, last = performance.now(), time = 0;
    let accent = [120, 144, 255], accentAt = 0;
    const pulses = [];
    let lastPulseAt = 0;
    let pointingSince = 0;        // when the tip settled; the breathing loop runs from here
    let arrived = false;

    function size() {
      W = window.innerWidth; H = window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    }

    function readAccent(now) {
      if (now - accentAt < 500) return;
      accentAt = now;
      const raw = getComputedStyle(canvas).getPropertyValue('--thread-accent');
      accent = M.parseColor(raw, [120, 144, 255]);
    }

    function tail(u) {
      const t = knot.getTailAnchor ? knot.getTailAnchor(u) : null;
      return t ? { x: t.x, y: t.y, z: t.z == null ? STRAND_Z : t.z, r: t.r || 5 } : null;
    }

    // The point on the (slightly expanded) target box nearest the Knot, along
    // the line from the box centre: the tip stops there, just short of the box.
    function targetAnchor(rect, from) {
      const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
      const hw = rect.w / 2 + GAP, hh = rect.h / 2 + GAP;
      let ux = from.x - cx, uy = from.y - cy;
      const d = Math.hypot(ux, uy) || 1;
      ux /= d; uy /= d;
      const tx = Math.abs(ux) > 1e-4 ? hw / Math.abs(ux) : Infinity;
      const ty = Math.abs(uy) > 1e-4 ? hh / Math.abs(uy) : Infinity;
      const t = Math.min(tx, ty, d - 4);
      return { x: cx + ux * t, y: cy + uy * t };
    }

    function layout() {
      size();
      const open = tail(1);
      const seam = tail(0);
      if (!open || !target) return false;
      startInfo = open;
      const A = { x: open.x, y: open.y };
      const B = targetAnchor(target, A);
      const dx = B.x - A.x, dy = B.y - A.y;
      const L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L;
      // Leave along the tail's own direction, arrive along the run, and bow
      // once toward the screen centre in between.
      let tdx = seam ? A.x - seam.x : ux, tdy = seam ? A.y - seam.y : uy;
      const tl = Math.hypot(tdx, tdy) || 1;
      tdx /= tl; tdy /= tl;
      let nx = -uy, ny = ux;
      const mid = { x: A.x + dx / 2, y: A.y + dy / 2 };
      const toCentre = { x: W / 2 - mid.x, y: H / 2 - mid.y };
      if (nx * toCentre.x + ny * toCentre.y < 0) { nx = -nx; ny = -ny; }
      const amp = clamp(L * 0.12, 14, 120);
      const lead = Math.min(L * 0.32, 96), land = Math.min(L * 0.3, 130);
      const c1 = { x: A.x + tdx * lead + nx * amp * 0.45, y: A.y + tdy * lead + ny * amp * 0.45 };
      const c2 = { x: B.x - ux * land + nx * amp * 0.7, y: B.y - uy * land + ny * amp * 0.7 };
      for (const c of [c1, c2]) { c.x = clamp(c.x, 10, W - 10); c.y = clamp(c.y, 10, H - 10); }
      control = { a: A, b: B, c1, c2 };
      const next = withLengths(cubic(A, c1, c2, B, []));
      oldPath = path.length ? path : [];
      path = next;
      blendAt = performance.now();
      if (debug) window.NusStrandDebug = { length: Math.round(next[next.length - 1].len), start: [Math.round(A.x), Math.round(A.y)], end: [Math.round(B.x), Math.round(B.y)], control: [c1, c2].map((c) => [Math.round(c.x), Math.round(c.y)]), samples: next.length, target };
      return true;
    }

    function mixedPath(now) {
      if (!oldPath.length || now - blendAt >= 300) { if (oldPath.length) oldPath = []; return path; }
      const t = smooth((now - blendAt) / 300), out = [];
      const n = Math.max(oldPath.length, path.length);
      for (let i = 0; i < n; i++) {
        const a = oldPath[Math.min(oldPath.length - 1, Math.round(i / Math.max(1, n - 1) * (oldPath.length - 1)))];
        const b = path[Math.min(path.length - 1, Math.round(i / Math.max(1, n - 1) * (path.length - 1)))];
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, len: (a.len || 0) + ((b.len || 0) - (a.len || 0)) * t });
      }
      return out;
    }

    function moveTo(p, ms, now) {
      fromP = progress; toP = p; moveAt = now; moveMs = Math.max(1, ms);
    }

    function totalLength() { return path.length ? path[path.length - 1].len : 0; }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawTarget(now, strength) {
      if (!target || strength <= 0) return;
      const r = target;
      const cx = (r.x + r.w / 2) * dpr, cy = (r.y + r.h / 2) * dpr;
      const breathe = 1 + 0.05 * Math.sin(now / 420);
      const ring = Math.max(14, Math.hypot(r.w, r.h) / 2 + 8) * breathe * dpr;
      ctx.save();
      ctx.globalAlpha = strength;
      ctx.lineWidth = 1.4 * dpr;
      ctx.strokeStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},0.55)`;
      roundRect((r.x - 4) * dpr, (r.y - 4) * dpr, (r.w + 8) * dpr, (r.h + 8) * dpr, 6 * dpr);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},${(0.28 + 0.12 * Math.sin(now / 300)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, ring, 0, TWO_PI);
      ctx.stroke();
      ctx.restore();
    }

    function drawDebug() {
      if (!debug || !control) return;
      ctx.save(); ctx.scale(dpr, dpr);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(76,220,164,.7)'; ctx.fillStyle = 'rgba(118,145,255,.9)';
      ctx.beginPath(); ctx.moveTo(control.a.x, control.a.y); ctx.lineTo(control.c1.x, control.c1.y); ctx.lineTo(control.c2.x, control.c2.y); ctx.lineTo(control.b.x, control.b.y); ctx.stroke();
      for (const p of [control.a, control.c1, control.c2, control.b]) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, TWO_PI); ctx.fill(); }
      if (target) { ctx.strokeStyle = 'rgba(255,94,94,.8)'; ctx.strokeRect(target.x, target.y, target.w, target.h); }
      ctx.font = '11px monospace'; ctx.fillStyle = '#fff';
      ctx.fillText(`strand ${state} p=${progress.toFixed(2)} len=${Math.round(totalLength())}`, 12, H - 14);
      ctx.restore();
    }

    let tipPoint = null;
    function draw(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
      size();
      readAccent(now);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Progress along the strand: a determinate ease so the tip arrives on
      // time, not asymptotically.
      const k = clamp((now - moveAt) / moveMs, 0, 1);
      progress = fromP + (toP - fromP) * (toP > fromP ? easeInOut(k) : easeOut(k));
      if (knot.setUnravel) knot.setUnravel(clamp(progress * 1.6, 0, 1));
      if (state === 'unwinding' && k >= 1 && !arrived) {
        arrived = true; state = 'pointing';
        // The tip light marks the arrival; the first travelling light leaves one period later.
        pointingSince = now; lastPulseAt = now; pulses.length = 0;
        onArrive();
      }
      if (state === 'rewinding' && k >= 1) {
        state = 'idle'; progress = 0; pulses.length = 0; lastPulseAt = 0; pointingSince = 0; tipPoint = null; target = null; path = []; oldPath = []; control = null;
        drawDebug();
        stop();
        onRewound();
        return;
      }

      const src = mixedPath(now);
      const total = src.length ? src[src.length - 1].len : 0;
      if (!src.length || progress <= 0.001 || !startInfo) { drawDebug(); loop(); return; }

      // The live tail: the Knot is still opening while the thread leaves it,
      // so the first JOIN px are dragged from the laid path to where the open
      // end actually is this frame.
      const live = tail() || startInfo;
      const base = src[0];
      const sdx = live.x - base.x, sdy = live.y - base.y;
      const startR = startInfo.r || 5, startZ = clamp(startInfo.z == null ? STRAND_Z : startInfo.z, -1, 1);
      const visible = progress * total;
      const list = [];
      for (let i = 0; i < src.length; i++) {
        const s = src[i];
        const L = s.len || 0;
        if (L > visible) break;
        const fs = smooth(1 - L / JOIN);
        const breathe = 0.1 * Math.sin(time * 0.8 + L * 0.007) * (1 - fs);
        list.push({
          x: s.x + sdx * fs, y: s.y + sdy * fs, L,
          tube: STRAND_TUBE + (startR - STRAND_TUBE) * fs,
          z: STRAND_Z + (startZ - STRAND_Z) * fs + breathe,
        });
      }
      if (list.length < 2) { drawDebug(); loop(); return; }
      for (let i = 0; i < list.length; i++) {
        const p = list[i], a = list[Math.max(0, i - 1)], b = list[Math.min(list.length - 1, i + 1)];
        p.ang = Math.atan2(b.y - a.y, b.x - a.x);
        p.s = M.lightSide(p.ang);
        p.sx = p.x * dpr; p.sy = p.y * dpr;
        p.persp = 1;
        p.len = Math.max(3, SAMPLE_STEP * 2.2) * dpr;
        p.tube *= dpr;
      }
      const set = M.sprites(accent, STRAND_TINT);
      M.drawTube(ctx, list, STRAND_TUBE * dpr, set);

      const head = list[list.length - 1];
      tipPoint = { x: head.x, y: head.y };

      // Lights. While unwinding one light rides just behind the tip, so the
      // eye follows the thread out; while pointing, lights leave the Knot on
      // a slow period and run to the tip.
      if (state === 'unwinding') {
        pulses.length = 0;
        pulses.push({ len: Math.max(0, visible - 14), lead: true });
      } else if (state === 'pointing') {
        // A light leaves the Knot every PULSE_PERIOD and runs to the tip at
        // PULSE_SPEED, so a settled pointer still reads as alive and directional.
        if (!lastPulseAt || now - lastPulseAt >= PULSE_PERIOD) { lastPulseAt = now; pulses.push({ at: now }); }
        for (let i = pulses.length - 1; i >= 0; i--) {
          const pulse = pulses[i];
          pulse.len = pulse.lead ? pulse.len : ((now - pulse.at) / 1000) * PULSE_SPEED;
          if (pulse.lead || pulse.len > visible + PULSE_HALF) pulses.splice(i, 1);
        }
      } else if (state === 'rewinding') {
        pulses.length = 0;
      }
      for (const pulse of pulses) {
        const lo = pulse.len - PULSE_HALF, hi = pulse.len + PULSE_HALF;
        const run = list.filter((p) => p.L >= lo && p.L <= hi);
        if (!run.length) continue;
        M.drawBright(ctx, run, STRAND_TUBE * dpr, set, (i) => 0.9 * (1 - Math.abs(run[i].L - pulse.len) / PULSE_HALF));
        let h = run[0];
        for (const p of run) if (Math.abs(p.L - pulse.len) < Math.abs(h.L - pulse.len)) h = p;
        M.drawLight(ctx, h.sx, h.sy, 11 * dpr, accent, 0.5);
      }
      // The tip itself always carries a small light, so it is findable on a
      // busy screen even between pulses.
      M.drawLight(ctx, head.sx, head.sy, (state === 'unwinding' ? 14 : 9) * dpr, accent, state === 'unwinding' ? 0.7 : 0.4);

      // Target ring and box once the tip has arrived (fades out on rewind).
      const targetStrength = state === 'pointing' ? 1 : (state === 'unwinding' ? smooth((progress - 0.9) / 0.1) : smooth((progress - 0.85) / 0.15));
      drawTarget(now, targetStrength);
      drawDebug();
      // A settled pointer breathes (ring, strand, travelling lights) for a
      // while, then holds still to spare the CPU. Retargeting restarts it.
      if (state === 'pointing' && now - blendAt >= 300 && (reduced || now - pointingSince >= POINTING_LOOP_MS)) { stop(); return; }
      loop();
    }

    function loop() { if (running) frame = requestAnimationFrame(draw); }
    function start() { if (running) return; running = true; last = performance.now(); frame = requestAnimationFrame(draw); }
    function stop() { running = false; if (frame) cancelAnimationFrame(frame); frame = null; }

    const onResize = () => { if (target && state !== 'idle') { layout(); draw(performance.now()); } };
    window.addEventListener('resize', onResize);

    return {
      // Unwind to a box (window CSS px). Retargeting while pointing crossfades
      // the path over 300ms and keeps the thread out.
      setTarget(rect, options = {}) {
        if (!rect) return this.rewind();
        target = { x: Number(rect.x) || 0, y: Number(rect.y) || 0, w: Math.max(1, Number(rect.w) || 1), h: Math.max(1, Number(rect.h) || 1) };
        if (options.task) canvas.dataset.task = String(options.task);
        accentAt = 0;
        if (!layout()) return false;
        const now = performance.now();
        arrived = false;
        if (state === 'pointing') {
          // Already out: stay out, the path blend carries the tip to the new box.
          moveTo(1, 1, now);
          arrived = true;
          pointingSince = now; lastPulseAt = now; pulses.length = 0;
          if (reduced) draw(now);
          else start();
          onArrive();
          return true;
        }
        state = 'unwinding';
        const L = totalLength();
        if (reduced) { moveTo(1, 1, now); draw(now + 1); stop(); return true; }
        moveTo(1, Math.min(800, UNWIND_MS + L * UNWIND_PER_PX), now);
        start();
        return true;
      },
      rewind() {
        if (state === 'idle') return;
        const now = performance.now();
        state = 'rewinding';
        arrived = false;
        if (reduced) { moveTo(0, 1, now); draw(now + 1); return; }
        moveTo(0, Math.min(600, REWIND_MS + totalLength() * REWIND_PER_PX), now);
        start();
      },
      setTask(task) { canvas.dataset.task = String(task || ''); accentAt = 0; },
      setReducedMotion(value) {
        reduced = !!value;
        if (reduced && state !== 'idle') { draw(Math.max(performance.now(), moveAt + moveMs)); stop(); }
      },
      getTip() { return tipPoint ? { x: tipPoint.x, y: tipPoint.y } : null; },
      getTarget() { return target ? { ...target } : null; },
      getState() { return state; },
      getProgress() { return progress; },
      relayout() { if (target) layout(); },
      // preview only: the page scrolls under a fixed overlay, so re-lay and repaint on scroll
      redraw(rect) {
        if (!target || state === 'idle') return;
        if (rect) target = { x: rect.x, y: rect.y, w: Math.max(1, rect.w), h: Math.max(1, rect.h) };
        layout(); oldPath = [];   // follow the page exactly, no crossfade
        if (frame) cancelAnimationFrame(frame); frame = null;   // one loop only: draw() queues the next frame itself
        draw(performance.now());
      },
      pause() { stop(); },
      resume() { if (state !== 'idle' && !reduced) start(); },
      destroy() { stop(); window.removeEventListener('resize', onResize); },
    };
  }

  window.NusStrand = { mount };
})();
