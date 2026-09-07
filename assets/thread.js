// Nūs story strand. Content never becomes geometry: the page provides empty
// corridor anchors (one per section, each declaring a lane), and this
// renderer connects them with monotonic cubics, aiming at the heart of each
// section and passing behind its panels. Every path is checked against the
// declared obstacles before it is shown: a colliding run falls back to an
// outer rail, and whatever is still left is masked so text always wins.
// Lights leave the hero Knot, run the strand, and hurry with the scroll.
(() => {
  'use strict';

  const back = document.getElementById('thread-back');
  const front = document.getElementById('thread-front');
  if (!back || !front || !window.NusKnot3D) return;

  const M = window.NusKnot3D.material;
  const bctx = back.getContext('2d');
  const fctx = front.getContext('2d');
  if (!M || !bctx || !fctx) return;

  const reduced = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    || /motion=reduce/.test(location.search);
  const debug = /threadDebug=1/.test(location.search);
  const CLEARANCE = 16;
  const EDGE = 5;
  const PAGE_TUBE = 1.35;        // strand radius on the page, CSS px
  const JOIN_TUBE = 5.4;         // fallback radius where the strand leaves a Knot
  const PAGE_Z = -0.55;          // depth of the page strand, for lighting
  const SAMPLE_STEP = 3.2;       // px along the curve between slices
  const JOIN = 260;              // px over which the strand adopts a Knot's live tail
  const PULSE_SPEED = 240;       // px/s of a travelling light
  const PULSE_HURRY = 1.1;       // extra px per px scrolled down
  const PULSE_HALF = 48;         // px of strand lit around a light
  const PULSE_MAX = 4;
  const PULSE_PERIOD = 9000;     // ms, the Knot's own light period, used when it is paused
  const STAR_PARALLAX = 0.34;
  const TWO_PI = Math.PI * 2;

  let W = 0, VH = 0, dpr = 1, pageH = 0;
  let path = [], oldPath = [], blendAt = 0;
  let obstacles = [], anchors = [], reroutedSegments = 0, unresolvedSegments = 0, maskedSamples = 0;
  let startInfo = null, endInfo = null;
  let running = false, frame = null, last = performance.now(), time = 0, lastScroll = 0;
  let accent = [80, 108, 255];
  let resizeTimer = null;
  let stars = [], starKey = '';
  const pulses = [];
  let lastPulseAt = 0, prevBand = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (v) => { const x = clamp(v, 0, 1); return x * x * (3 - 2 * x); };
  const rectDoc = (el) => {
    const r = el.getBoundingClientRect();
    const sy = window.scrollY || 0;
    return { left:r.left, right:r.right, top:r.top + sy, bottom:r.bottom + sy, width:r.width, height:r.height };
  };
  // Layout position without CSS transforms, so reveal animations and hover
  // lifts never move a protected area (they are measured at rest).
  const layoutRect = (el) => {
    let x = 0, y = 0, e = el;
    while (e) {
      x += e.offsetLeft; y += e.offsetTop;
      const p = e.offsetParent;
      if (p) { x += p.clientLeft; y += p.clientTop; }
      e = p;
    }
    return { left:x, right:x + el.offsetWidth, top:y, bottom:y + el.offsetHeight, width:el.offsetWidth, height:el.offsetHeight };
  };
  const obstacleRect = (el) => (el.closest('.rv') ? layoutRect(el) : rectDoc(el));
  const expanded = (r, by) => ({ left:r.left-by, right:r.right+by, top:r.top-by, bottom:r.bottom+by });
  const inside = (p, r) => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;

  function canvasSize() {
    W = document.documentElement.clientWidth;
    VH = window.innerHeight;
    pageH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [back, front]) {
      const cw = Math.round(W * dpr), ch = Math.round(VH * dpr);
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      c.style.width = W + 'px'; c.style.height = VH + 'px';
    }
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--knot-accent');
    accent = M.parseColor(raw, [80, 108, 255]);
    makeStars();
  }

  // A sparse star field on the back layer, parallaxed at a third of the
  // scroll, so the plain ink between panels has some depth. Seeded, so a
  // relayout never reshuffles the sky.
  function makeStars() {
    const span = VH + pageH * STAR_PARALLAX;
    const key = W + 'x' + Math.round(span);
    if (key === starKey) return;
    starKey = key;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const n = Math.min(420, Math.round(W * span / 16000));
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: rnd() * W, y: rnd() * span,
        r: 0.45 + rnd() * 0.85 + (rnd() < 0.08 ? 0.7 : 0),
        a: 0.16 + rnd() * 0.36,
        sp: 0.35 + rnd() * 1.1, tw: rnd() * TWO_PI,
      });
    }
  }

  // Where a Knot's open end sits when fully unravelled: the path is laid
  // against that, and draw() only drags the join toward the live tail.
  function tailInfo(instance, fallback, end) {
    const t = instance && instance.getTailAnchor ? instance.getTailAnchor(1) : null;
    if (t) return { x:t.x, y:t.y + (window.scrollY || 0), z:t.z, r:t.r };
    const el = document.querySelector(fallback);
    if (!el) return { x:W * .5, y:end ? pageH - 120 : VH * .65, z:PAGE_Z, r:JOIN_TUBE };
    const r = rectDoc(el);
    return { x:r.left + r.width * .5, y:end ? r.top + r.height * .2 : r.top + r.height * .8, z:PAGE_Z, r:JOIN_TUBE };
  }
  function liveTail(instance, fallback) {
    const t = instance && instance.getTailAnchor ? instance.getTailAnchor() : null;
    return t ? { x:t.x, y:t.y + (window.scrollY || 0) } : fallback;
  }

  function lanePoint(el) {
    const r = rectDoc(el);
    const lane = el.dataset.lane || 'center';
    let x = r.left + r.width * .5;
    if (lane === 'left' || lane === 'outer-left') x = EDGE;
    if (lane === 'right' || lane === 'outer-right') x = W - EDGE;
    return { x:clamp(x, EDGE, W-EDGE), y:r.top + r.height * .5, lane, el };
  }

  // Samples are spaced by arc length, so a near-horizontal run is as dense
  // as a vertical drop and never breaks into dashes.
  function cubic(a, b, c, d, out, skipFirst) {
    const est = Math.hypot(b.x-a.x, b.y-a.y) + Math.hypot(c.x-b.x, c.y-b.y) + Math.hypot(d.x-c.x, d.y-c.y);
    const n = Math.max(3, Math.ceil(est / SAMPLE_STEP));
    for (let i = skipFirst ? 1 : 0; i <= n; i++) {
      const t = i / n, m = 1-t, t2=t*t, m2=m*m;
      out.push({
        x:m2*m*a.x + 3*m2*t*b.x + 3*m*t2*c.x + t2*t*d.x,
        y:m2*m*a.y + 3*m2*t*b.y + 3*m*t2*c.y + t2*t*d.y,
      });
    }
  }

  function directSegment(a, b) {
    const dy = Math.max(24, b.y - a.y);
    const out = [];
    cubic(a, {x:a.x,y:a.y+dy*.38}, {x:b.x,y:b.y-dy*.38}, b, out, false);
    return out;
  }

  function collisionCount(samples) {
    let hits = 0;
    for (let i=2; i<samples.length-2; i+=2) {
      for (const r of obstacles) if (inside(samples[i], r)) { hits++; break; }
    }
    return hits;
  }

  function railSegment(a, b, railX) {
    const dy = Math.max(80, b.y-a.y);
    const y1 = a.y + dy*.26, y2 = b.y - dy*.26;
    const p1={x:railX,y:y1}, p2={x:railX,y:y2};
    const out=[];
    cubic(a,{x:a.x,y:a.y+dy*.12},{x:railX,y:y1-dy*.08},p1,out,false);
    cubic(p1,{x:railX,y:y1+dy*.12},{x:railX,y:y2-dy*.12},p2,out,true);
    cubic(p2,{x:railX,y:y2+dy*.08},{x:b.x,y:b.y-dy*.12},b,out,true);
    return out;
  }

  function measure() {
    if (reduced) { back.hidden = front.hidden = true; return; }
    canvasSize();
    const obstacleSelector = [
      '[data-thread-obstacle]',
      'header .hero-copy', 'header .mind-node',
      'section h1', 'section h2', 'section h3', 'section p',
      'section a', 'section button', 'section img', 'section figure', 'section form'
    ].join(',');
    // Closed <details> content is skipped: browsers keep it laid out but it
    // is not visible until opened (the toggle event triggers a re-measure).
    const hidden = (el) => { const d = el.closest('details'); return d && !d.open && el.tagName !== 'SUMMARY'; };
    obstacles = Array.from(new Set(document.querySelectorAll(obstacleSelector)))
      .filter(el => el.offsetParent !== null && !hidden(el))
      .map(el => Object.assign(expanded(obstacleRect(el), W < 720 ? 12 : CLEARANCE), { label:el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') }));
    anchors = Array.from(document.querySelectorAll('[data-story-anchor]'))
      .filter(el => el.offsetParent !== null).map(lanePoint);

    startInfo = tailInfo(window.NusHeroKnot, '#hero-knot', false);
    endInfo = tailInfo(window.NusEndKnot, '#end-knot', true);

    // The Knots are the first and last points; anchors only shape the run
    // between them, so the strand can never overshoot the end Knot.
    const inner = anchors.filter(a => a.y > startInfo.y + 8 && a.y < endInfo.y - 8).sort((p, q) => p.y - q.y);
    const points = [startInfo, ...inner, endInfo];
    const next=[], segments=[];
    reroutedSegments = 0;
    unresolvedSegments = 0;
    maskedSamples = 0;
    for (let i=0; i<points.length-1; i++) {
      const a=points[i], b=points[i+1];
      if (b.y <= a.y+8) continue;
      const direct = directSegment(a, b);
      const directHits = collisionCount(direct);
      let best = direct, bestHits = directHits, candidate = 0;
      const tried = [directHits];
      if (directHits) {
        // Fall back to an outer rail, the nearer side first, keeping whichever
        // clears more content. What is still left is masked in draw().
        reroutedSegments++;
        const preferred = (a.x + b.x) * .5 < W * .5 ? EDGE : W - EDGE;
        const alternate = preferred === EDGE ? W - EDGE : EDGE;
        const first = railSegment(a, b, preferred), second = railSegment(a, b, alternate);
        const firstHits = collisionCount(first), secondHits = collisionCount(second);
        tried.push(firstHits, secondHits);
        if (firstHits <= secondHits) { best = first; bestHits = firstHits; candidate = 1; }
        else { best = second; bestHits = secondHits; candidate = 2; }
      }
      const hit = new Set();
      if (bestHits > 0) {
        unresolvedSegments++;
        maskedSamples += bestHits;
        for (let k=2; k<best.length-2; k+=2) for (const r of obstacles) if (inside(best[k], r)) hit.add(r.label);
      }
      segments.push({ i, from:[Math.round(a.x), Math.round(a.y)], to:[Math.round(b.x), Math.round(b.y)], candidate, hits:bestHits, candidates:tried, hit:Array.from(hit) });
      if (next.length && best.length) best.shift();
      next.push(...best);
    }
    let length=0;
    for(let i=0;i<next.length;i++){
      if(i) length+=Math.hypot(next[i].x-next[i-1].x,next[i].y-next[i-1].y);
      next[i].len=length;
    }
    oldPath=path;
    path=next;
    blendAt=performance.now();
    window.NusThreadDebug={reroutedSegments,unresolvedSegments,maskedSamples,anchors:anchors.length,obstacles:obstacles.length,stars:stars.length,length:Math.round(length),start:[Math.round(startInfo.x),Math.round(startInfo.y)],finish:[Math.round(endInfo.x),Math.round(endInfo.y)],segments};
  }

  function mixedPath(now) {
    if (!oldPath.length || now-blendAt>=300) return path;
    const t=clamp((now-blendAt)/300,0,1), out=[];
    const n=Math.max(oldPath.length,path.length);
    for(let i=0;i<n;i++){
      const a=oldPath[Math.min(oldPath.length-1,Math.floor(i/Math.max(1,n-1)*(oldPath.length-1)))];
      const b=path[Math.min(path.length-1,Math.floor(i/Math.max(1,n-1)*(path.length-1)))];
      out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,len:b.len||0});
    }
    return out;
  }

  // Stars are tiny squares (indistinguishable from discs at this size) drawn
  // without paths, and the twinkle is quantised so alpha changes stay few.
  function drawStars(scrollY) {
    const py = scrollY * STAR_PARALLAX;
    bctx.fillStyle = 'rgb(214,220,255)';
    let lastA = -1;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const y = s.y - py;
      if (y < -4 || y > VH + 4) continue;
      const a = Math.round(s.a * (0.6 + 0.4 * Math.sin(time * s.sp + s.tw)) * 20) / 20;
      if (a !== lastA) { bctx.globalAlpha = a; lastA = a; }
      const d = s.r * 2 * dpr;
      bctx.fillRect(s.x * dpr - d / 2, y * dpr - d / 2, d, d);
    }
    bctx.globalAlpha = 1;
  }

  function drawDebug(scrollY) {
    if (!debug) return;
    fctx.save(); fctx.scale(dpr,dpr);
    fctx.lineWidth=1;
    fctx.strokeStyle=unresolvedSegments?'rgba(255,94,94,.85)':'rgba(76,220,164,.65)';
    for(const r of obstacles)fctx.strokeRect(r.left,r.top-scrollY,r.right-r.left,r.bottom-r.top);
    fctx.fillStyle='rgba(118,145,255,.9)';
    for(const a of anchors){fctx.beginPath();fctx.arc(a.x,a.y-scrollY,4,0,TWO_PI);fctx.fill();}
    fctx.font='11px monospace';fctx.fillText('reroutes: '+reroutedSegments+' / unresolved: '+unresolvedSegments+' / masked: '+maskedSamples,16,90);
    fctx.restore();
  }

  function loop() { if (running) frame = requestAnimationFrame(draw); }

  function draw(now) {
    const dt=Math.min(.05,(now-last)/1000); last=now; time+=dt;
    const scrollY=window.scrollY||0;
    const dy=scrollY-lastScroll; lastScroll=scrollY;
    bctx.clearRect(0,0,back.width,back.height);
    fctx.clearRect(0,0,front.width,front.height);
    const src=mixedPath(now);
    const hero=window.NusHeroKnot, endKnot=window.NusEndKnot;
    const heroU=hero&&hero.getUnravel?hero.getUnravel():0;
    const alpha=clamp((heroU-.03)/.32,0,1);
    const total=path.length?path[path.length-1].len:0;
    if(!src.length||alpha<=0){pulses.length=0;drawStars(scrollY);drawDebug(scrollY);loop();return;}

    // The travelling lights: one leaves the hero Knot each time its own band
    // passes the open end (or on the same period while it is paused), runs the
    // strand, hurries with the scroll, and hands over to the end Knot.
    const band=hero&&hero.getBandPhase?hero.getBandPhase():0;
    const wrapped=band<prevBand-.5;
    prevBand=band;
    if(alpha>.2&&total>0&&pulses.length<PULSE_MAX&&(!pulses.length||(wrapped&&heroU>.4)||now-lastPulseAt>PULSE_PERIOD)){
      pulses.push({len:0});
      lastPulseAt=now;
    }
    const hurry=Math.max(0,dy)*PULSE_HURRY;
    for(let i=pulses.length-1;i>=0;i--){
      pulses[i].len+=dt*PULSE_SPEED+hurry;
      if(pulses[i].len>total){
        pulses.splice(i,1);
        if(endKnot&&endKnot.setBandPhase)endKnot.setBandPhase(1);
      }
    }

    const liveStart=liveTail(hero,startInfo), liveEnd=liveTail(endKnot,endInfo);
    const baseStart=src[0], baseEnd=src[src.length-1];
    const endLen=baseEnd.len||1;
    const sdx=liveStart.x-baseStart.x, sdy=liveStart.y-baseStart.y;
    const edx=liveEnd.x-baseEnd.x, edy=liveEnd.y-baseEnd.y;
    const startR=startInfo.r||JOIN_TUBE, endR=endInfo.r||JOIN_TUBE;
    const startZ=clamp(startInfo.z==null?PAGE_Z:startInfo.z,-1,1);
    const endZ=clamp(endInfo.z==null?PAGE_Z:endInfo.z,-1,1);
    const margin=120+JOIN;
    const list=[];
    for(let i=0;i<src.length;i++){
      const s=src[i];
      if(s.y<scrollY-margin||s.y>scrollY+VH+margin)continue;
      const L=s.len||0;
      const fs=smooth(1-L/JOIN), fe=smooth(1-(endLen-L)/JOIN);
      // A slow sway in depth so the strand breathes instead of sitting flat.
      const breathe=.14*Math.sin(time*.8+L*.007)*(1-fs)*(1-fe);
      list.push({
        x:s.x+sdx*fs+edx*fe,
        y:s.y+sdy*fs+edy*fe,
        L,
        tube:PAGE_TUBE+(startR-PAGE_TUBE)*fs+(endR-PAGE_TUBE)*fe,
        z:PAGE_Z+(startZ-PAGE_Z)*fs+(endZ-PAGE_Z)*fe+breathe,
      });
    }
    if(list.length){
      for(let i=0;i<list.length;i++){
        const p=list[i], a=list[Math.max(0,i-1)], b=list[Math.min(list.length-1,i+1)];
        p.ang=Math.atan2(b.y-a.y,b.x-a.x);
        p.s=M.lightSide(p.ang);
        p.sx=p.x*dpr; p.sy=(p.y-scrollY)*dpr;
        p.persp=1;
        p.len=Math.max(3,SAMPLE_STEP*2.2)*dpr;
        p.tube*=dpr;
      }
      const set=M.sprites(accent,.14);
      bctx.globalAlpha=alpha;
      M.drawTube(bctx,list,PAGE_TUBE*dpr,set);
      const first=list[0].L, lastL=list[list.length-1].L;
      for(const pulse of pulses){
        const lo=pulse.len-PULSE_HALF, hi=pulse.len+PULSE_HALF;
        if(first>hi||lastL<lo)continue;
        const run=list.filter(p=>p.L>=lo&&p.L<=hi);
        if(!run.length)continue;
        M.drawBright(bctx,run,PAGE_TUBE*dpr,set,(i)=>alpha*.9*(1-Math.abs(run[i].L-pulse.len)/PULSE_HALF));
        let head=run[0];
        for(const p of run)if(Math.abs(p.L-pulse.len)<Math.abs(head.L-pulse.len))head=p;
        bctx.globalAlpha=alpha;
        M.drawLight(bctx,head.sx,head.sy,12*dpr,accent,.5);
      }
      bctx.globalAlpha=1;
      // Absolute fail-safe: readable content always wins, including during the
      // 300ms path blend after a resize, image load, or FAQ expansion.
      bctx.save();
      bctx.globalCompositeOperation='destination-out';
      bctx.fillStyle='#000';
      for(const r of obstacles){
        const top=r.top-scrollY, height=r.bottom-r.top;
        if(top>VH||top+height<0)continue;
        bctx.fillRect(r.left*dpr,top*dpr,(r.right-r.left)*dpr,height*dpr);
      }
      bctx.restore();
    }
    drawStars(scrollY);
    drawDebug(scrollY);
    loop();
  }

  function schedule(){clearTimeout(resizeTimer);resizeTimer=setTimeout(measure,100);}
  function start(){if(running||reduced)return;running=true;last=performance.now();frame=requestAnimationFrame(draw);}
  function stop(){running=false;if(frame)cancelAnimationFrame(frame);frame=null;}

  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('load',schedule);
  document.addEventListener('toggle',schedule,true);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(schedule);
  if(window.ResizeObserver)new ResizeObserver(schedule).observe(document.body);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start();});

  measure(); start();
  window.NusThread={layout:measure,relayout:schedule,pause:stop,resume:start};
})();
