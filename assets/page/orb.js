/* NŪS Orb (vanilla). A particle sphere with combed strands that fan out of each node's side of the
   sphere and pinch into one bright point at the hub node. Touch is fluid: particles and strands part
   around the cursor, get pulled along with its motion, and spring back. Click = ripple, drag = spin.
   Usage: new NusOrb(containerEl, { nodes:[{label,x,y,weight}], centerX, centerY, radius }) */
(function () {
  function fib(n) {
    const ux = new Float32Array(n), uy = new Float32Array(n), uz = new Float32Array(n), g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = g * i;
      ux[i] = Math.cos(t) * r; uy[i] = y; uz[i] = Math.sin(t) * r;
    }
    return { ux, uy, uz };
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const DEF = {
    nodes: [
      { label: "Your voice", x: 0.36, y: 0.092, weight: 1 },
      { label: "Routines", x: 0.747, y: 0.309, weight: 3 },
      { label: "Your semester", x: 0.19, y: 0.492, weight: 1.6 },
      { label: "Assignment mode", x: 0.696, y: 0.509, weight: 0.8 },
    ],
    centerX: 0.485, centerY: 0.316, radius: 0.215,
    particles: 1700, strands: 460, speed: 0.1,
    touchRadius: 160, push: 1, flow: 1, click: 5,
    rgb: [238, 240, 250],
  };

  function NusOrb(el, opts) {
    const o = Object.assign({}, DEF, opts || {});
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
    el.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = rng(7);

    // particles
    const n = o.particles, S = fib(n);
    const ox = new Float32Array(n), oy = new Float32Array(n), vx = new Float32Array(n), vy = new Float32Array(n);
    const px = new Float32Array(n), py = new Float32Array(n), pd = new Float32Array(n), pr = new Float32Array(n);
    const sx = new Float32Array(n), sy = new Float32Array(n);
    for (let i = 0; i < n; i++) { const a = rand() * 6.283, d = 1.5 + rand() * 1.8; sx[i] = Math.cos(a) * d; sy[i] = Math.sin(a) * d; pr[i] = 0.75 + rand() * 0.6; }

    // strands: from each non-hub node's side of the sphere into the hub
    const nodes = o.nodes.map((n) => Object.assign({}, n));   // own copy, so a layout change never touches another orb
    let hub = 0; nodes.forEach((nd, i) => { if (nd.weight > nodes[hub].weight) hub = i; });
    const others = nodes.map((_, i) => i).filter((i) => i !== hub);
    const wSum = others.reduce((s, i) => s + nodes[i].weight, 0) || 1;
    const sFrom = [], sLon = [], sSpread = [], sBend = [];
    others.forEach((i) => {
      const k = Math.round((o.strands * nodes[i].weight) / wSum);
      for (let j = 0; j < k; j++) {
        sFrom.push(i);
        sLon.push((j / k) * 6.283 + (rand() - 0.5) * 0.3);
        sSpread.push((rand() - 0.5) * 2);      // where on the source side it leaves
        sBend.push(0.8 + rand() * 0.5);         // how wide it sweeps
      }
    });
    const m = sFrom.length;
    const qox = new Float32Array(m), qoy = new Float32Array(m), qvx = new Float32Array(m), qvy = new Float32Array(m);

    // labels
    let hover = -1;
    const labels = nodes.map((nd, i) => {
      const d = document.createElement("div");
      d.className = "orb-node";
      d.innerHTML = '<span class="orb-dot"></span><span class="orb-label"></span>';
      d.querySelector(".orb-label").textContent = nd.label;
      d.addEventListener("mouseenter", () => { hover = i; d.classList.add("on"); });
      d.addEventListener("mouseleave", () => { hover = -1; d.classList.remove("on"); });
      el.appendChild(d);
      return d;
    });

    let W = 1, H = 1, dpr = 1;
    function resize() {
      const r = el.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      labels.forEach((d, i) => { d.style.left = W * nodes[i].x + "px"; d.style.top = H * nodes[i].y + "px"; });
    }
    resize();
    new ResizeObserver(resize).observe(el);
    // narrow screens re-pose the orb: { centerX, centerY, radius, nodes:[{x,y}] } as fractions of the box
    this.setLayout = (p) => { ["centerX", "centerY", "radius"].forEach((k) => { if (p[k] != null) o[k] = p[k]; });
      if (p.nodes) p.nodes.forEach((n, i) => { if (nodes[i]) { nodes[i].x = n.x; nodes[i].y = n.y; } }); resize(); };

    // pointer
    const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, in: false, t: 0 };
    let dragging = false, spin = 0, lastX = 0, lastT = 0;
    const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, in: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom }; };
    addEventListener("pointermove", (e) => {
      const p = local(e), now = performance.now(), dt = Math.max(1, now - ptr.t) / 1000;
      if (ptr.in && p.in) { ptr.vx = ptr.vx * 0.55 + ((p.x - ptr.x) / dt) * 0.45; ptr.vy = ptr.vy * 0.55 + ((p.y - ptr.y) / dt) * 0.45; } else { ptr.vx = ptr.vy = 0; }
      ptr.x = p.x; ptr.y = p.y; ptr.in = p.in; ptr.t = now;
      if (dragging) { const d = Math.max(1, now - lastT) / 1000; spin = spin * 0.5 + ((p.x - lastX) / d) * 0.0022; lastX = p.x; lastT = now; }
    }, { passive: true });
    addEventListener("pointerdown", (e) => {
      const p = local(e); if (!p.in) return;
      const { R, cx, cy } = geo();
      if ((p.x - cx) ** 2 + (p.y - cy) ** 2 > (R * 1.2) ** 2) return;
      const rr = o.touchRadius * 1.8;
      for (let i = 0; i < n; i++) { const dx = px[i] - p.x, dy = py[i] - p.y, d = Math.hypot(dx, dy); if (d < rr && d > 0.01) { const f = (1 - d / rr) * o.click * 150; vx[i] += (dx / d) * f; vy[i] += (dy / d) * f; } }
      dragging = true; lastX = p.x; lastT = performance.now(); document.body.style.userSelect = "none"; el.classList.add("grabbing");
    });
    addEventListener("pointerup", () => { dragging = false; document.body.style.userSelect = ""; el.classList.remove("grabbing"); });
    document.addEventListener("pointerleave", () => { ptr.in = false; });

    let visible = true;
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(el);

    // story: 0 = hero, 1 = the transition has played (driven by scroll through setStory)
    let story = 0;
    this.setStory = (t) => { story = Math.min(1, Math.max(0, t)); };
    const sm = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    function phases() {
      const q = story;
      return { hide: sm(q, 0, 0.22), tasks: [0, 1, 2, 3].map((i) => sm(q, 0.14 + i * 0.07, 0.28 + i * 0.07)), power: sm(q, 0.16, 0.5),
        recomb: sm(q, 0.56, 0.86), grow: sm(q, 0.7, 0.98), you: sm(q, 0.34, 0.5) };
    }
    function geo() {
      const f = phases(), R0 = Math.min(H * o.radius, W * 0.3);
      return { cx: W * (o.centerX + (0.53 - o.centerX) * f.hide), cy: H * (o.centerY + (0.42 - o.centerY) * f.hide), R: R0 * (1 + 0.16 * f.power - 0.14 * f.recomb) };
    }
    const TASKS = ["Write for me", "Search for me", "Click for me", "Think for me"];
    const YOU = []; for (let j = 0; j < 320; j++) { const y = 1 - (j / 319) * 2, r = Math.sqrt(1 - y * y), t = j * Math.PI * (3 - Math.sqrt(5)); YOU.push([Math.cos(t) * r, y, Math.sin(t) * r]); }
    let lastHide = -1;
    const rgba = (a) => `rgba(${o.rgb[0]},${o.rgb[1]},${o.rgb[2]},${a})`;
    let angle = 0.6, last = performance.now(); const start = last;
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const p = reduce ? 1 : ease(Math.min(1, (now - start) / 1900));
      const { cx, cy, R } = geo();
      spin *= Math.exp(-1.6 * dt);
      angle += ((reduce ? 0 : o.speed) + spin) * dt;
      const ca = Math.cos(angle), sa = Math.sin(angle), ct = Math.cos(0.32), st = Math.sin(0.32);
      const rad = o.touchRadius, rad2 = rad * rad, K = 16, damp = Math.exp(-5.2 * dt), PUSH = o.push * 2600, DRAG = o.flow * 2.4;

      for (let i = 0; i < n; i++) {
        const x1 = S.ux[i] * ca + S.uz[i] * sa, z1 = -S.ux[i] * sa + S.uz[i] * ca;
        const y2 = S.uy[i] * ct - z1 * st, z2 = S.uy[i] * st + z1 * ct;
        const hx = cx + x1 * R, hy = cy + y2 * R;
        if (ptr.in) {
          const dx = hx + ox[i] - ptr.x, dy = hy + oy[i] - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < rad2 && d2 > 0.01) { const d = Math.sqrt(d2), f = (1 - d / rad) ** 2; vx[i] += (dx / d) * f * PUSH * dt + ptr.vx * f * DRAG * dt; vy[i] += (dy / d) * f * PUSH * dt + ptr.vy * f * DRAG * dt; }
        }
        vx[i] = (vx[i] - K * ox[i] * dt) * damp; vy[i] = (vy[i] - K * oy[i] * dt) * damp;
        ox[i] += vx[i] * dt; oy[i] += vy[i] * dt;
        const tx = hx + ox[i], ty = hy + oy[i];
        px[i] = p < 1 ? cx + sx[i] * R + (tx - cx - sx[i] * R) * p : tx;
        py[i] = p < 1 ? cy + sy[i] * R + (ty - cy - sy[i] * R) * p : ty;
        pd[i] = (z2 + 1) / 2;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const lineP = Math.max(0, (p - 0.3) / 0.7);

      // soft body glow behind the sphere
      const bg = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.25);
      bg.addColorStop(0, "rgba(120,140,220,0.07)"); bg.addColorStop(1, "rgba(120,140,220,0)");
      ctx.fillStyle = bg; ctx.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);

      // anchors on the sphere's rim, toward each node
      const A = nodes.map((nd) => { const tx = W * nd.x, ty = H * nd.y, dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy) || 1; return { a: Math.atan2(dy, dx), x: cx + (dx / d) * R, y: cy + (dy / d) * R, tx, ty }; });
      const f = phases();
      const Hx0 = A[hub].x + (cx + R - A[hub].x) * f.hide, Hy0 = A[hub].y + (cy - A[hub].y) * f.hide;
      const Y = { x: W * 0.19, y: H * 0.6 };
      const Hx = Hx0 + (Y.x - Hx0) * f.recomb, Hy = Hy0 + (Y.y - Hy0) * f.recomb;
      const hl = Math.hypot(cx - Hx, cy - Hy) || 1, hubIn = { x: (cx - Hx) / hl, y: (cy - Hy) / hl };
      const mix = (c, t) => [Math.round(o.rgb[0] + (c[0] - o.rgb[0]) * t), Math.round(o.rgb[1] + (c[1] - o.rgb[1]) * t), Math.round(o.rgb[2] + (c[2] - o.rgb[2]) * t)];
      const sc = mix([214, 172, 102], f.recomb), scol = (a) => `rgba(${sc[0]},${sc[1]},${sc[2]},${a})`;
      if (Math.abs(f.hide - lastHide) > 0.002) { labels.forEach((d) => { d.style.opacity = String(1 - f.hide); d.style.pointerEvents = f.hide > 0.5 ? "none" : ""; }); lastHide = f.hide; }

      // combed strands
      ctx.lineWidth = 0.6;
      for (let s = 0; s < m; s++) {
        const src = A[sFrom[s]];
        const lon = sLon[s] + angle, sl = Math.sin(lon), depth = (Math.cos(lon) + 1) / 2;
        // leave from a spread of points on the source side of the rim
        const la = src.a + sSpread[s] * 0.42;
        const x0 = cx + Math.cos(la) * R * 0.99, y0 = cy + Math.sin(la) * R * 0.99;
        // start heading into the sphere, swung left/right by the strand's longitude (the 3D sweep)
        const inx = (cx - x0) / R, iny = (cy - y0) / R, sw = sl * 1.05 * sBend[s];
        const t0x = inx * Math.cos(sw) - iny * Math.sin(sw), t0y = inx * Math.sin(sw) + iny * Math.cos(sw);
        const L = Math.hypot(Hx - x0, Hy - y0);
        let c1x = x0 + t0x * L * 0.62, c1y = y0 + t0y * L * 0.62;
        // arrive at the hub almost straight, a slight twist so the pinch has depth
        const tw = sl * 0.35;
        const t1x = hubIn.x * Math.cos(tw) - hubIn.y * Math.sin(tw), t1y = hubIn.x * Math.sin(tw) + hubIn.y * Math.cos(tw);
        let c2x = Hx + t1x * L * 0.42, c2y = Hy + t1y * L * 0.42;
        // keep control points inside the sphere so every strand stays inside it
        const clamp = (x, y) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), lim = R * 0.93; return d > lim ? [cx + (dx / d) * lim, cy + (dy / d) * lim] : [x, y]; };
        [c1x, c1y] = clamp(c1x, c1y); [c2x, c2y] = clamp(c2x, c2y);
        // springy middle: the cursor parts the strands like hair
        const mx = (x0 + 3 * c1x + 3 * c2x + Hx) / 8, my = (y0 + 3 * c1y + 3 * c2y + Hy) / 8;
        if (ptr.in) {
          const dx = mx + qox[s] - ptr.x, dy = my + qoy[s] - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < rad2 && d2 > 0.01) { const d = Math.sqrt(d2), f = (1 - d / rad) ** 2; qvx[s] += (dx / d) * f * PUSH * 0.8 * dt + ptr.vx * f * DRAG * dt; qvy[s] += (dy / d) * f * PUSH * 0.8 * dt + ptr.vy * f * DRAG * dt; }
        }
        qvx[s] = (qvx[s] - K * qox[s] * dt) * damp; qvy[s] = (qvy[s] - K * qoy[s] * dt) * damp;
        qox[s] += qvx[s] * dt; qoy[s] += qvy[s] * dt;
        const lit = hover === sFrom[s] || hover === hub;
        const a = (0.035 + 0.3 * depth * depth) * (lit ? 2 : hover >= 0 ? 0.45 : 1) * lineP * (1 + 0.8 * f.power * (1 - f.recomb) + 0.4 * f.recomb);
        ctx.strokeStyle = scol(Math.min(0.85, a));
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(c1x + qox[s] * 1.3, c1y + qoy[s] * 1.3, c2x + qox[s] * 1.3, c2y + qoy[s] * 1.3, Hx, Hy);
        ctx.stroke();
      }

      // particles, brighter toward the rim
      for (let i = 0; i < n; i++) {
        const d = pd[i], rx = (px[i] - cx) / R, ry = (py[i] - cy) / R, rim = Math.min(1, Math.max(0, (rx * rx + ry * ry - 0.6) / 0.4));
        const r = (0.5 + d * 1.2) * pr[i];
        ctx.fillStyle = rgba(Math.min(1, (0.16 + 0.84 * d * d + rim * 0.18) * (0.25 + 0.75 * p)));
        ctx.fillRect(px[i] - r / 2, py[i] - r / 2, r, r);
      }

      // the pinch point at the hub
      if (lineP > 0) {
        const g = ctx.createRadialGradient(Hx, Hy, 0, Hx, Hy, 22);
        g.addColorStop(0, scol(0.85 * lineP)); g.addColorStop(0.25, scol(0.28 * lineP)); g.addColorStop(1, scol(0));
        ctx.fillStyle = g; ctx.fillRect(Hx - 22, Hy - 22, 44, 44);
      }

      // links out to the node dots, with a light flowing in
      const tNow = now / 1000;
      A.forEach((an, i) => {
        const span = Math.hypot(an.x - an.tx, an.y - an.ty), ux = (an.x - cx) / R, uy = (an.y - cy) / R;
        const x1 = an.tx + Math.sign(an.x - an.tx) * span * 0.4, y1 = an.ty, x2 = an.x + ux * span * 0.4, y2 = an.y + uy * span * 0.4;
        const on = hover === i;
        ctx.lineWidth = on ? 1.1 : 0.8; ctx.strokeStyle = rgba((on ? 0.9 : 0.45) * lineP * (1 - f.hide));
        ctx.beginPath(); ctx.moveTo(an.tx, an.ty); ctx.bezierCurveTo(x1, y1, x2, y2, an.x, an.y); ctx.stroke();
        if (lineP >= 1 && f.hide < 0.98) {
          const t = (tNow * 0.22 + i * 0.29) % 1, u = 1 - t;
          const bx = u * u * u * an.tx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * an.x;
          const by = u * u * u * an.ty + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * an.y;
          const gl = Math.sin(Math.PI * t) * (on ? 1 : 0.75) * (1 - f.hide), g2 = ctx.createRadialGradient(bx, by, 0, bx, by, 7);
          g2.addColorStop(0, `rgba(255,255,255,${0.9 * gl})`); g2.addColorStop(1, rgba(0));
          ctx.fillStyle = g2; ctx.fillRect(bx - 7, by - 7, 14, 14);
        }
      });

      // the tasks that plug into the orb ("Most AI gets more capable")
      const mono = `500 ${Math.max(10, Math.min(12, W / 110))}px "JetBrains Mono", ui-monospace, monospace`;
      if (o.tasks !== false) TASKS.forEach((label, i) => {   // tasks:false replays only the re-comb (final CTA)
        const a = f.tasks[i] * (1 - f.recomb); if (a <= 0.01) return;
        const tx = W * 0.8, ty = H * (0.25 + i * 0.12);
        ctx.strokeStyle = `rgba(185,193,211,${0.5 * a})`; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(Hx0, Hy0); ctx.bezierCurveTo(Hx0 + (tx - Hx0) * 0.5, Hy0, Hx0 + (tx - Hx0) * 0.5, ty, tx, ty); ctx.stroke();
        ctx.fillStyle = `rgba(238,240,250,${a})`; ctx.beginPath(); ctx.arc(tx, ty, 3.5, 0, 6.283); ctx.fill();
        ctx.font = mono; ctx.fillStyle = `rgba(139,150,174,${0.95 * a})`; ctx.fillText(label.toUpperCase(), tx + 14, ty + 4);
      });

      // you: a small brass point that the strands pour into, then its own sphere
      if (f.you > 0) {
        const yr = 4 + f.grow * Math.min(W, H) * 0.075;
        const glow = ctx.createRadialGradient(Y.x, Y.y, 0, Y.x, Y.y, yr * 2.2 + 24);
        glow.addColorStop(0, `rgba(209,167,95,${(0.2 + 0.45 * f.recomb) * f.you})`); glow.addColorStop(1, "rgba(209,167,95,0)");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(Y.x, Y.y, yr * 2.2 + 24, 0, 6.283); ctx.fill();
        if (f.grow > 0.02) {
          const ya = -angle * 1.8, yc = Math.cos(ya), ys = Math.sin(ya);
          for (const q of YOU) { const x1 = q[0] * yc + q[2] * ys, z1 = -q[0] * ys + q[2] * yc, d = (z1 + 1) / 2;
            ctx.fillStyle = `rgba(214,172,102,${(0.18 + 0.82 * d * d) * f.grow})`; ctx.fillRect(Y.x + x1 * yr - 0.7, Y.y + q[1] * yr - 0.7, 1.4, 1.4); }
        }
        ctx.fillStyle = `rgba(222,184,118,${f.you})`; ctx.beginPath(); ctx.arc(Y.x, Y.y, 3.5 * (1 - f.grow) + 1, 0, 6.283); ctx.fill();
        ctx.font = mono; ctx.textAlign = "center"; ctx.fillStyle = `rgba(209,167,95,${0.95 * f.you})`; ctx.fillText("YOU", Y.x, Y.y + yr + 26); ctx.textAlign = "left";
      }
    }
    requestAnimationFrame(frame);
    labels.forEach((d, i) => setTimeout(() => d.classList.add("in"), 900 + i * 120));
  }
  window.NusOrb = NusOrb;
})();
