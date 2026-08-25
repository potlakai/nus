// The Nūs Knot, rendered for real: a 3D glass trefoil that tumbles slowly and
// carries a band of light around its own curve. Vanilla canvas 2D, no
// libraries, CSP-safe. Shared by the Companion overlay and the desktop hero.
//
// Look targets (from the concept board): glass-silver tube, calm directional
// light, monochrome at rest, subtle breathing presence. A thin orbit ring with
// a few drifting particles frames the mark. State tints the specular pass and
// glow through the host element's --knot-accent custom property.
(() => {
  'use strict';

  const TWO_PI = Math.PI * 2;

  // Classic trefoil: one continuous loop, no beginning, no end.
  function trefoilPoint(t) {
    return {
      x: Math.sin(t) + 2 * Math.sin(2 * t),
      y: Math.cos(t) - 2 * Math.cos(2 * t),
      z: -Math.sin(3 * t),
    };
  }

  function parseColor(raw, fallback) {
    const value = String(raw || '').trim();
    let m = value.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      const n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    m = value.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    return fallback;
  }

  // Per-state motion + tint. Rest is monochrome with a whisper of accent;
  // active states let the accent breathe through the glass.
  const STATES = {
    idle: { speed: 1, band: 1, tint: 0.12, glow: 0.35 },
    ready: { speed: 1.25, band: 1.3, tint: 0.3, glow: 0.5 },
    listening: { speed: 1.7, band: 1.9, tint: 0.62, glow: 0.75 },
    thinking: { speed: 2.4, band: 2.6, tint: 0.55, glow: 0.85 },
    spar: { speed: 1.7, band: 1.9, tint: 0.62, glow: 0.7 },
    speaking: { speed: 1.5, band: 2.4, tint: 0.5, glow: 0.8 },
  };

  function mount(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const segments = opts.segments || 200;
    // ground:false skips the dark radial backdrop so the mark floats directly
    // on whatever is behind it (the overlay); scale sets the drawn radius as a
    // fraction of the canvas, letting a host give the glow extra canvas margin.
    const drawGround = opts.ground !== false;
    const RATIO = opts.scale || 0.33;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let state = 'idle';
    let running = false;
    let frame = null;
    let time = Math.random() * 100;         // desync multiple instances
    let last = performance.now();
    // Smoothed motion params so state changes glide instead of snapping.
    let speed = STATES.idle.speed, tint = STATES.idle.tint, glow = STATES.idle.glow, band = STATES.idle.band;
    // Live voice level (0..1): instant attack, eased release. Modulates glow
    // and the inner light's travel speed so the mark visibly hears the user.
    let liveLevel = 0, level = 0;
    let bandTime = time;

    // Accent comes from CSS so themes and states stay in one place.
    function accent() {
      const raw = getComputedStyle(canvas.parentElement || canvas).getPropertyValue('--knot-accent');
      return parseColor(raw, [80, 108, 255]);
    }

    // The canvas size is cached and updated by a ResizeObserver: measuring
    // layout inside draw() forced a synchronous reflow at 60fps in BOTH
    // windows, and reassigning canvas.width clears the canvas (a visible
    // flash), so both only happen on genuine size changes now.
    let rectW = canvas.clientWidth || 0, rectH = canvas.clientHeight || 0;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rectW * dpr));
      const h = Math.max(1, Math.round(rectH * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      return dpr;
    }

    // Hoisted per-frame structures: 201 point objects and 18 run records were
    // reallocated every frame, giving the GC a constant sawtooth to chew on.
    const pts = new Array(segments + 1);
    for (let i = 0; i <= segments; i++) pts[i] = { sx: 0, sy: 0, z: 0, persp: 1, t: i / segments };
    const RUNS = 18;
    const runLen = Math.floor(segments / RUNS);
    const runs = new Array(RUNS);
    for (let rI = 0; rI < RUNS; rI++) {
      const from = rI * runLen;
      runs[rI] = { from, to: rI === RUNS - 1 ? segments : from + runLen, z: 0 };
    }

    let idleSkip = 0;
    function draw(now) {
      // Unfocused window: keep the Knot alive at a third of the frame cost.
      if (typeof document !== 'undefined' && !document.hasFocus() && (idleSkip = (idleSkip + 1) % 3)) {
        if (running) frame = requestAnimationFrame(draw);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = STATES[state] || STATES.idle;
      // Ease params toward the state's targets (~700ms settle).
      const k = 1 - Math.exp(-dt * 4.5);
      speed += (target.speed - speed) * k;
      tint += (target.tint - tint) * k;
      glow += (target.glow - glow) * k;
      band += (target.band - band) * k;
      time += dt * speed;
      if (liveLevel > level) level = liveLevel;
      else level += (liveLevel - level) * Math.min(1, dt * 5);
      bandTime += dt * band * (1 + level * 0.5);
      const glowE = Math.min(1.4, glow * (1 + level * 0.6));

      const dpr = resize();
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * RATIO;      // knot radius in px
      const tube = Math.max(2.2 * dpr, Math.min(W, H) * 0.052); // tube thickness
      const [ar, ag, ab] = accent();

      ctx.clearRect(0, 0, W, H);

      // Slow two-axis tumble: never a flat spin, always a tumbling knot.
      const rx = time * 0.26, ry = time * 0.17;
      const cosX = Math.cos(rx), sinX = Math.sin(rx);
      const cosY = Math.cos(ry), sinY = Math.sin(ry);
      const fov = 6.2;

      // --- orbit ring behind the knot: a tilted ellipse + drifting particles
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.42);
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 1.62, R * 0.58, 0, 0, TWO_PI);
      ctx.strokeStyle = `rgba(240, 237, 227, ${0.05 + glowE * 0.05})`;
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const a = time * 0.12 * (i % 2 ? 1 : -0.8) + i * 2.1;
        const px = Math.cos(a) * R * 1.62, py = Math.sin(a) * R * 0.58;
        const size = (1.1 + 0.5 * Math.sin(time * 0.8 + i * 2)) * dpr;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, TWO_PI);
        ctx.fillStyle = `rgba(214, 220, 255, ${0.28 + 0.18 * Math.sin(time + i * 3)})`;
        ctx.fill();
      }
      ctx.restore();

      // --- project the curve (into the persistent, preallocated points)
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * TWO_PI;
        const p = trefoilPoint(t);
        // normalize roughly into [-1,1]
        let x = p.x / 3, y = p.y / 3, z = p.z / 1.2;
        // rotate Y then X
        let x1 = x * cosY + z * sinY;
        let z1 = -x * sinY + z * cosY;
        let y1 = y * cosX - z1 * sinX;
        let z2 = y * sinX + z1 * cosX;
        const persp = fov / (fov - z2 * 1.6);
        const pt = pts[i];
        pt.sx = cx + x1 * R * persp;
        pt.sy = cy + y1 * R * persp;
        pt.z = z2;
        pt.persp = persp;
      }

      // --- depth-sorted RUNS of contiguous segments, far to near.
      // Sorting individual segments makes neighbors overdraw each other's
      // highlights with their own dark body (ladder stripes). Runs keep the
      // tube continuous; overdraw then happens only at true crossings, which
      // is exactly the occlusion we want.
      for (const run of runs) {
        let zSum = 0;
        for (let i = run.from; i <= run.to; i++) zSum += pts[i].z;
        run.z = zSum / (run.to - run.from + 1);
      }
      runs.sort((a, b) => a.z - b.z);

      // Soft dark ground behind the mark, like the reference's black backdrop:
      // keeps the glass legible over any screen content, fades to nothing.
      // Skipped when the host wants the mark integrated with the desktop.
      if (drawGround) {
        const ground = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, Math.min(W, H) * 0.5);
        ground.addColorStop(0, 'rgba(7, 9, 17, 0.78)');
        ground.addColorStop(0.72, 'rgba(7, 9, 17, 0.5)');
        ground.addColorStop(1, 'rgba(7, 9, 17, 0)');
        ctx.fillStyle = ground;
        ctx.fillRect(0, 0, W, H);
      }

      const bandPos = (bandTime * 0.11) % 1; // light travels the curve, faster with voice

      const mix = (a1, b1, f) => Math.round(a1 + (b1 - a1) * f);
      const D = [13, 15, 25];          // dark tube body
      const S = [201, 206, 220];       // silver glass wall

      // One continuous path through a run's points. trimPx pulls both ends
      // inward along the curve: the wide dark body is trimmed so it can never
      // reach across a joint and bite into the neighbor run's silver, while
      // the silver passes run full length and bridge the joint seamlessly.
      const runPath = (run, trimPx = 0) => {
        let from = run.from, to = run.to;
        if (trimPx > 0) {
          let acc = 0;
          while (from < to && acc < trimPx) {
            acc += Math.hypot(pts[from + 1].sx - pts[from].sx, pts[from + 1].sy - pts[from].sy);
            from++;
          }
          acc = 0;
          while (to > from && acc < trimPx) {
            acc += Math.hypot(pts[to].sx - pts[to - 1].sx, pts[to].sy - pts[to - 1].sy);
            to--;
          }
        }
        ctx.beginPath();
        ctx.moveTo(pts[from].sx, pts[from].sy);
        for (let i = from + 1; i <= to; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
      };
      // Depth-lit gradient along the run, so lighting ramps smoothly inside
      // one stroke instead of banding at chunk boundaries.
      const runGrad = (run, colorAt) => {
        const a = pts[run.from], b = pts[run.to];
        const grad = ctx.createLinearGradient(a.sx, a.sy, b.sx, b.sy);
        const litOf = (i) => 0.5 + pts[i].z * 0.5;
        grad.addColorStop(0, colorAt(litOf(run.from)));
        grad.addColorStop(0.5, colorAt(litOf(Math.floor((run.from + run.to) / 2))));
        grad.addColorStop(1, colorAt(litOf(run.to)));
        return grad;
      };

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const run of runs) {
        const midLit = 0.5 + run.z * 0.5;
        const w = tube * pts[Math.floor((run.from + run.to) / 2)].persp;

        // 1. occluding body (opaque, slightly depth-lit), end-trimmed
        runPath(run, w * 0.95);
        ctx.strokeStyle = runGrad(run, (lit) => `rgb(${D[0] + Math.round(lit * 9)}, ${D[1] + Math.round(lit * 10)}, ${D[2] + Math.round(lit * 13)})`);
        ctx.lineWidth = w * 1.72;
        ctx.stroke();

        // 2. glass wall: silver mixed up with nearness
        runPath(run);
        ctx.strokeStyle = runGrad(run, (lit) => {
          const f = 0.2 + lit * 0.62;
          return `rgb(${mix(D[0], S[0], f)}, ${mix(D[1], S[1], f)}, ${mix(D[2], S[2], f)})`;
        });
        ctx.lineWidth = w * 1.06;
        ctx.stroke();

        // 3. specular core, accent-tinted by state. Canvas shadow blur is the
        // slowest 2D op there is, so only near runs (where it reads) pay for it.
        runPath(run);
        if (midLit > 0.55) {
          ctx.shadowBlur = (7 + glowE * 16) * dpr * 0.7;
          ctx.shadowColor = `rgba(${Math.round(ar * 0.6 + 153)}, ${Math.round(ag * 0.6 + 153)}, 255, ${0.12 + glowE * 0.25})`;
        }
        ctx.strokeStyle = runGrad(run, (lit) => {
          const f = Math.min(1, 0.38 + lit * 0.55);
          const r = mix(mix(S[0], 255, f), ar, tint * 0.55);
          const g = mix(mix(S[1], 255, f), ag, tint * 0.55);
          const b2 = mix(mix(S[2], 255, f), ab, tint * 0.3);
          return `rgb(${r}, ${g}, ${b2})`;
        });
        ctx.lineWidth = w * 0.46;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 4. rim highlight on near runs
        if (midLit > 0.58) {
          runPath(run);
          const rim = (midLit - 0.58) / 0.42;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + rim * 0.5})`;
          ctx.lineWidth = Math.max(1, w * 0.15);
          ctx.stroke();
        }
      }

      // 5. the traveling light: a short bright arc that runs the curve,
      //    drawn last with a strong glow (the "light moving like a knot")
      const bandIdx = Math.floor(bandPos * segments);
      const half = Math.max(3, Math.floor(segments * 0.035));
      ctx.beginPath();
      let started = false;
      for (let o = -half; o <= half; o++) {
        const i = ((bandIdx + o) % segments + segments) % segments;
        if (!started) { ctx.moveTo(pts[i].sx, pts[i].sy); started = true; }
        else ctx.lineTo(pts[i].sx, pts[i].sy);
      }
      const bp = pts[bandIdx];
      const bLit = 0.5 + bp.z * 0.5;
      ctx.shadowBlur = (14 + glowE * 26) * dpr;
      ctx.shadowColor = `rgba(${mix(200, ar, tint)}, ${mix(210, ag, tint)}, 255, ${0.35 + glowE * 0.45})`;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + bLit * 0.5})`;
      ctx.lineWidth = tube * bp.persp * 0.4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (running) frame = requestAnimationFrame(draw);
    }

    function start() {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(draw);
    }
    function stop() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = null;
    }

    // Reduced motion: a single beautiful frame, breathed via CSS opacity only.
    // The visibility handler is named so destroy() can remove it: the old
    // anonymous listener outlived every remount and leaked stale closures.
    const onVisibility = () => { if (document.hidden) stop(); else start(); };
    if (reduced) {
      time = 2.35; // hand-picked 3/4 angle
      draw(performance.now());
      canvas.classList.add('knot-static');
    } else {
      start();
      document.addEventListener('visibilitychange', onVisibility);
    }

    const remeasure = () => {
      const rect = canvas.getBoundingClientRect();
      rectW = rect.width; rectH = rect.height;
      if (!running) draw(performance.now()); // keep the static frame crisp
    };
    let ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver((entries) => {
        const box = entries[entries.length - 1].contentRect;
        rectW = box.width; rectH = box.height;
        if (!running) draw(performance.now());
      });
      ro.observe(canvas);
    }
    window.addEventListener('resize', remeasure);

    return {
      setState(next) {
        if (!STATES[next]) next = 'idle';
        state = next;
        if (reduced) draw(performance.now()); // re-tint the static frame
      },
      setLevel(value) {
        if (reduced) return; // the static frame does not react to voice
        liveLevel = Math.max(0, Math.min(1, Number(value) || 0));
      },
      destroy() {
        stop();
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('resize', remeasure);
        if (ro) ro.disconnect();
      },
    };
  }

  window.NusKnot3D = { mount };
})();
