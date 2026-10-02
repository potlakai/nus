/* NusDraw: draws the page's strands, dots and glows. A whole frame goes to the screen in a handful of WebGL2
   draw calls, because stroking each strand as its own Canvas 2D path is what made the page slow (Firefox most
   of all). The same calls fall back to Canvas 2D when WebGL2 is missing or the URL has ?gl=0, so the old
   drawing stays available for comparison.
   Usage: const d = NusDraw(canvas); d.begin(W, H, dpr); d.rgb(r, g, b); d.curve(...); d.rect(...); d.end();
   Coordinates are CSS pixels. Colours are 0 to 255, alpha 0 to 1. Shapes land in the order they are called. */
(() => {
  const STRIDE = 36;      // one shape: ax ay bx by | width e0 e1 alpha | r g b kind
  const CSTRIDE = 52;     // one curve: p0 p1 | p2 p3 | width tEnd - alpha | r g b -
  const CSEG = 56;        // pieces a curve is cut into, on the graphics chip
  const LINE = 0, RECT = 1, GLOW = 2, DISC = 3, PILL = 4;
  const PAINT = 0, RUB = 1, CURVES = 2;   // a frame is a list of runs of these
  const HEAD = `#version 300 es
precision highp float;
`;
  // cov() is how much of a pixel a band of half-width h covers, so a 0.6 px strand stays a soft hairline
  const COV = `float cov(float v, float h) { return clamp(min(v + 0.5, h) - max(v - 0.5, -h), 0.0, 1.0); }
`;
  const VS = HEAD + `layout(location=0) in vec2 corner;
layout(location=1) in vec4 ab;
layout(location=2) in vec4 par;
layout(location=3) in vec4 cm;
uniform vec2 res; uniform float dpr;
out vec2 uv; out vec2 hs; out vec2 ex; out vec4 col; out float rad; flat out int kind;
void main() {
  kind = int(cm.w * 255.0 + 0.5);
  vec2 a = ab.xy * dpr, pos;
  if (kind < 2) {
    vec2 b = ab.zw * dpr, d = b - a; float len = length(d);
    vec2 dir = len > 1e-5 ? d / len : vec2(1.0, 0.0), nrm = vec2(-dir.y, dir.x);
    hs = vec2(len * 0.5, par.x * dpr * 0.5);
    uv = corner * (hs + vec2(kind == 1 ? 1.0 : 0.0, 1.0));
    pos = (a + b) * 0.5 + dir * uv.x + nrm * uv.y;
  } else if (kind == 4) {
    hs = ab.zw * dpr;
    uv = corner * (hs + 1.0);
    pos = a + uv;
  } else {
    hs = ab.zw * dpr;
    uv = corner * (hs.x + 1.0);
    pos = a + uv;
  }
  ex = par.yz; col = vec4(cm.rgb, par.w); rad = par.x * dpr;
  gl_Position = vec4(pos.x / res.x * 2.0 - 1.0, 1.0 - pos.y / res.y * 2.0, 0.0, 1.0);
}`;
  const FS = HEAD + COV + `in vec2 uv; in vec2 hs; in vec2 ex; in vec4 col; in float rad; flat in int kind;
out vec4 o;
void main() {
  float a;
  if (kind == 0) a = cov(uv.y, hs.y);
  else if (kind == 1) a = cov(uv.y, hs.y) * cov(uv.x, hs.x);
  else if (kind == 2) {
    float t = clamp((length(uv) - hs.y) / max(hs.x - hs.y, 1e-4), 0.0, 1.0);
    a = ex.x < 0.0 ? 1.0 - t : (t < ex.x ? mix(1.0, ex.y, t / ex.x) : mix(ex.y, 0.0, (t - ex.x) / (1.0 - ex.x)));
    // a faint glow has only a few levels to fade through; a little noise keeps it from showing as rings
    a = max(0.0, a + (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / (255.0 * max(col.a, 0.004)));
  } else if (kind == 3) a = clamp(hs.x + 0.5 - length(uv), 0.0, 1.0);
  else {
    vec2 q = abs(uv) - hs + rad;
    a = clamp(0.5 - (length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad), 0.0, 1.0);
  }
  a *= col.a;
  o = vec4(col.rgb * a, a);
}`;
  // a cubic strand: the chip walks along it and widens it into a ribbon, so the page only sends four points
  const CVS = HEAD + `layout(location=0) in vec2 tv;
layout(location=1) in vec4 p01;
layout(location=2) in vec4 p23;
layout(location=3) in vec4 par;
layout(location=4) in vec4 cm;
uniform vec2 res; uniform float dpr;
out float v; out float hw; out vec4 col;
void main() {
  vec2 a = p01.xy * dpr, b = p01.zw * dpr, c = p23.xy * dpr, d = p23.zw * dpr;
  float t = tv.x * par.y, u = 1.0 - t;
  vec2 pos = u * u * u * a + 3.0 * u * u * t * b + 3.0 * u * t * t * c + t * t * t * d;
  vec2 tg = 3.0 * u * u * (b - a) + 6.0 * u * t * (c - b) + 3.0 * t * t * (d - c);
  if (dot(tg, tg) < 1e-6) tg = d - a;
  if (dot(tg, tg) < 1e-6) tg = vec2(1.0, 0.0);
  hw = par.x * dpr * 0.5; v = tv.y * (hw + 1.0);
  pos += normalize(vec2(-tg.y, tg.x)) * v;
  col = vec4(cm.rgb, par.w);
  gl_Position = vec4(pos.x / res.x * 2.0 - 1.0, 1.0 - pos.y / res.y * 2.0, 0.0, 1.0);
}`;
  const CFS = HEAD + COV + `in float v; in float hw; in vec4 col;
out vec4 o;
void main() { float a = cov(v, hw) * col.a; o = vec4(col.rgb * a, a); }`;

  function program(gl, vs, fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  }
  const GL_OPTS = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false };
  // one throwaway context decides for the whole page, so a real canvas is never left without a way to draw
  let webgl = !/[?&]gl=0(&|$)/.test(location.search);
  if (webgl) try {
    const gl = document.createElement('canvas').getContext('webgl2', GL_OPTS);
    webgl = !!gl && !!program(gl, VS, FS) && !!program(gl, CVS, CFS);
    const lose = gl && gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
  } catch (e) { webgl = false; }

  // a growable block of per-shape data: floats, with the colour bytes in the last four of each record
  function store(stride) {
    const s = { cap: 2048, n: 0, f: null, u8: null };
    const fit = () => { const next = new ArrayBuffer(s.cap * stride); if (s.u8) new Uint8Array(next).set(s.u8); s.f = new Float32Array(next); s.u8 = new Uint8Array(next); };
    fit();
    s.room = () => { if (s.n === s.cap) { s.cap *= 2; fit(); } };
    return s;
  }

  function glDrawer(canvas) {
    const gl = canvas.getContext('webgl2', GL_OPTS);
    if (!gl) return null;
    const Q = store(STRIDE), C = store(CSTRIDE), runs = [];   // runs: kind, first, count, ...
    let quads, curves, lost = false, dpr = 1, cr = 255, cg = 255, cb = 255, px = 0, py = 0, pa = 0, pw = 1, run = -1, runFrom = 0;
    function part(vs, fs, corners, stride, attrs) {
      const prog = program(gl, vs, fs); if (!prog) return null;
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const fixed = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, fixed); gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      for (let i = 1; i <= attrs; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribDivisor(i, 1); }
      return { prog, vao, buf, stride, attrs, verts: corners.length / 2, res: gl.getUniformLocation(prog, 'res'), dpr: gl.getUniformLocation(prog, 'dpr') };
    }
    function init() {
      quads = part(VS, FS, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), STRIDE, 3);
      const strip = new Float32Array((CSEG + 1) * 4); for (let k = 0; k <= CSEG; k++) { strip[k * 4] = strip[k * 4 + 2] = k / CSEG; strip[k * 4 + 1] = -1; strip[k * 4 + 3] = 1; }
      curves = part(CVS, CFS, strip, CSTRIDE, 4);
      if (!quads || !curves) { lost = true; return; }
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.clearColor(0, 0, 0, 0);
    }
    init();
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', () => { lost = false; init(); });
    function close() { if (run < 0) return; const count = (run === CURVES ? C.n : Q.n) - runFrom; if (count > 0) runs.push(run, runFrom, count); run = -1; }
    function open(kind) { if (kind !== run) { close(); run = kind; runFrom = kind === CURVES ? C.n : Q.n; } }
    function put(ax, ay, bx, by, w, e0, e1, a, kind, rub) {
      open(rub ? RUB : PAINT); Q.room();
      const f = Q.f, i = Q.n * (STRIDE / 4), j = Q.n * STRIDE + 32, u8 = Q.u8;
      f[i] = ax; f[i + 1] = ay; f[i + 2] = bx; f[i + 3] = by; f[i + 4] = w; f[i + 5] = e0; f[i + 6] = e1; f[i + 7] = a;
      u8[j] = cr; u8[j + 1] = cg; u8[j + 2] = cb; u8[j + 3] = kind; Q.n++;
    }
    function send(p, s, from, count) {
      gl.useProgram(p.prog); gl.bindVertexArray(p.vao); gl.bindBuffer(gl.ARRAY_BUFFER, p.buf);
      const at = from * p.stride, last = p.attrs;
      for (let i = 1; i < last; i++) gl.vertexAttribPointer(i, 4, gl.FLOAT, false, p.stride, at + (i - 1) * 16);
      gl.vertexAttribPointer(last, 4, gl.UNSIGNED_BYTE, true, p.stride, at + (last - 1) * 16);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, p.verts, count);
    }
    return {
      webgl: true,
      begin(W, H, ratio) { Q.n = C.n = 0; runs.length = 0; run = -1; dpr = ratio; },
      rgb(r, g, b) { cr = r; cg = g; cb = b; },
      line(x0, y0, x1, y1, a, w) { if (a > 0) put(x0, y0, x1, y1, w, 0, 0, a, LINE); },
      // a cubic strand; tEnd < 1 draws only the first part of it
      curve(x0, y0, x1, y1, x2, y2, x3, y3, a, w, tEnd) {
        const end = tEnd == null ? 1 : Math.min(1, tEnd); if (!(a > 0) || !(end > 0)) return;
        open(CURVES); C.room();
        const f = C.f, i = C.n * (CSTRIDE / 4), j = C.n * CSTRIDE + 48, u8 = C.u8;
        f[i] = x0; f[i + 1] = y0; f[i + 2] = x1; f[i + 3] = y1; f[i + 4] = x2; f[i + 5] = y2; f[i + 6] = x3; f[i + 7] = y3; f[i + 8] = w; f[i + 9] = end; f[i + 10] = 0; f[i + 11] = a;
        u8[j] = cr; u8[j + 1] = cg; u8[j + 2] = cb; u8[j + 3] = 0; C.n++;
      },
      start(x, y, a, w) { px = x; py = y; pa = a; pw = w; },
      to(x, y) { if (pa > 0) put(px, py, x, y, pw, 0, 0, pa, LINE); px = x; py = y; },
      stroke() {},
      rect(x, y, w, h, a) { if (a > 0) put(x, y + h / 2, x + w, y + h / 2, h, 0, 0, a, RECT); },
      disc(x, y, r, a) { if (a > 0) put(x, y, r, 0, 0, 0, 0, a, DISC); },
      // a rounded box that rubs out what was drawn under it, by the fraction a
      erase(x, y, w, h, r, a) { if (a > 0) put(x + w / 2, y + h / 2, w / 2, h / 2, Math.min(r, w / 2, h / 2), 0, 0, a, PILL, true); },
      // a radial fade from alpha a at radius r0 to nothing at r1, with an optional middle stop (tm, am)
      glow(x, y, r0, r1, a, tm, am) { if (a > 0) put(x, y, r1, r0, 0, tm == null ? -1 : tm, tm == null ? 0 : am / a, a, GLOW); },
      end() {
        close();
        if (lost) return;
        gl.viewport(0, 0, canvas.width, canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
        for (const [p, s] of [[quads, Q], [curves, C]]) {
          if (!s.n) continue;
          gl.useProgram(p.prog); gl.uniform2f(p.res, canvas.width, canvas.height); gl.uniform1f(p.dpr, dpr);
          gl.bindBuffer(gl.ARRAY_BUFFER, p.buf); gl.bufferData(gl.ARRAY_BUFFER, s.u8.subarray(0, s.n * p.stride), gl.STREAM_DRAW);
        }
        for (let i = 0; i < runs.length; i += 3) {
          // painting is canvas source-over; rubbing out is canvas destination-out
          if (runs[i] === RUB) gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          if (runs[i] === CURVES) send(curves, C, runs[i + 1], runs[i + 2]); else send(quads, Q, runs[i + 1], runs[i + 2]);
        }
      },
    };
  }

  // the Canvas 2D calls the page used before, behind the same interface
  function c2dDrawer(canvas) {
    const ctx = canvas.getContext('2d');
    let cr = 255, cg = 255, cb = 255, css = 'rgb(255,255,255)', fill = '', strokeCss = '';
    const useFill = () => { if (fill !== css) ctx.fillStyle = fill = css; };
    const useStroke = () => { if (strokeCss !== css) ctx.strokeStyle = strokeCss = css; };
    return {
      webgl: false,
      begin(W, H, dpr) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1; },
      rgb(r, g, b) { if (r !== cr || g !== cg || b !== cb) { cr = r; cg = g; cb = b; css = `rgb(${r},${g},${b})`; } },
      line(x0, y0, x1, y1, a, w) { if (!(a > 0)) return; useStroke(); ctx.globalAlpha = a; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); },
      curve(x0, y0, x1, y1, x2, y2, x3, y3, a, w, tEnd) {
        if (!(a > 0)) return;
        useStroke(); ctx.globalAlpha = a; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0);
        if (tEnd == null || tEnd >= 1) ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        else for (let k = 1; k <= 26; k++) { const t = tEnd * k / 26, u = 1 - t, b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t; ctx.lineTo(b0 * x0 + b1 * x1 + b2 * x2 + b3 * x3, b0 * y0 + b1 * y1 + b2 * y2 + b3 * y3); }
        ctx.stroke();
      },
      start(x, y, a, w) { useStroke(); ctx.globalAlpha = a; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); },
      to(x, y) { ctx.lineTo(x, y); },
      stroke() { ctx.stroke(); },
      rect(x, y, w, h, a) { if (!(a > 0)) return; useFill(); ctx.globalAlpha = a; ctx.fillRect(x, y, w, h); },
      disc(x, y, r, a) { if (!(a > 0)) return; useFill(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); },
      erase(x, y, w, h, r, a) { if (!(a > 0)) return; ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = a; ctx.fillStyle = '#000'; fill = ''; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; },
      glow(x, y, r0, r1, a, tm, am) {
        if (!(a > 0)) return;
        const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
        g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`); if (tm != null) g.addColorStop(tm, `rgba(${cr},${cg},${cb},${am})`); g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.globalAlpha = 1; ctx.fillStyle = g; fill = ''; ctx.fillRect(x - r1, y - r1, r1 * 2, r1 * 2);
      },
      end() { ctx.globalAlpha = 1; },
    };
  }

  window.NusDraw = (canvas) => (webgl && glDrawer(canvas)) || c2dDrawer(canvas);
  window.NusDraw.webgl = webgl;
})();
