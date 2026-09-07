// Nūs story strand. Content never becomes geometry: the page provides empty
// corridor anchors, and this renderer connects them with monotonic cubics.
// Every path is checked against declared obstacles before it is shown.
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
  const PAGE_TUBE = 1.35;
  const START_TUBE = 5.4;
  const SAMPLE_STEP = 3.2;
  const TWO_PI = Math.PI * 2;

  let W = 0, VH = 0, dpr = 1, pageH = 0;
  let path = [], oldPath = [], blendAt = 0;
  let obstacles = [], anchors = [], reroutedSegments = 0, unresolvedSegments = 0, maskedSamples = 0;
  let running = false, frame = null, last = performance.now(), time = 0, band = -120;
  let accent = [80, 108, 255];
  let resizeTimer = null;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rectDoc = (el) => {
    const r = el.getBoundingClientRect();
    const sy = window.scrollY || 0;
    return { left:r.left, right:r.right, top:r.top + sy, bottom:r.bottom + sy, width:r.width, height:r.height };
  };
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
  }

  function hostPoint(instance, fallback, end) {
    const live = instance && instance.getTailAnchor ? instance.getTailAnchor() : null;
    if (live) return { x:live.x, y:live.y + (window.scrollY || 0) };
    const el = document.querySelector(fallback);
    if (!el) return { x:W * .5, y:end ? pageH - 120 : VH * .65 };
    const r = rectDoc(el);
    return { x:r.left + r.width * .5, y:end ? r.top + r.height * .25 : r.bottom - r.height * .12 };
  }

  function lanePoint(el) {
    const r = rectDoc(el);
    const lane = el.dataset.lane || 'center';
    let x = r.left + r.width * .5;
    if (lane === 'left') x = EDGE;
    if (lane === 'right') x = W - EDGE;
    if (lane === 'outer-left') x = EDGE;
    if (lane === 'outer-right') x = W - EDGE;
    return { x:clamp(x, EDGE, W-EDGE), y:r.top + r.height * .5, lane, el };
  }

  function cubic(a, b, c, d, out, skipFirst) {
    const span = Math.max(1, Math.abs(d.y - a.y));
    const n = Math.max(3, Math.ceil(span / SAMPLE_STEP));
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
    obstacles = Array.from(new Set(document.querySelectorAll(obstacleSelector)))
      .filter(el => el.offsetParent !== null)
      .map(el => expanded(rectDoc(el), W < 720 ? 12 : CLEARANCE));
    anchors = Array.from(document.querySelectorAll('[data-story-anchor]'))
      .filter(el => el.offsetParent !== null).map(lanePoint);

    const start = hostPoint(window.NusHeroKnot, '#hero-knot', false);
    const finish = hostPoint(window.NusEndKnot, '#end-knot', true);
    const points = [start, ...anchors, finish].sort((a,b) => a.y-b.y);
    const next=[];
    reroutedSegments = 0;
    unresolvedSegments = 0;
    maskedSamples = 0;
    for (let i=0; i<points.length-1; i++) {
      const a=points[i], b=points[i+1];
      if (b.y <= a.y+8) continue;
      let seg=directSegment(a,b);
      if (collisionCount(seg)) {
        reroutedSegments++;
        const preferred=(a.x+b.x)*.5 < W*.5 ? EDGE : W-EDGE;
        const alternate=preferred===EDGE ? W-EDGE : EDGE;
        const first=railSegment(a,b,preferred);
        const second=railSegment(a,b,alternate);
        const firstHits=collisionCount(first), secondHits=collisionCount(second);
        seg=firstHits<=secondHits?first:second;
        // Any remaining samples are removed by the obstacle mask in draw().
        // They are tracked for debug, but never become visible collisions.
        maskedSamples+=Math.min(firstHits,secondHits);
      }
      if (next.length && seg.length) seg.shift();
      next.push(...seg);
    }
    let length=0;
    for(let i=0;i<next.length;i++){
      if(i) length+=Math.hypot(next[i].x-next[i-1].x,next[i].y-next[i-1].y);
      next[i].len=length;
    }
    oldPath=path;
    path=next;
    blendAt=performance.now();
    window.NusThreadDebug={reroutedSegments,unresolvedSegments,maskedSamples,anchors:anchors.length,obstacles:obstacles.length};
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

  function draw(now) {
    const dt=Math.min(.05,(now-last)/1000); last=now; time+=dt;
    const scrollY=window.scrollY||0;
    bctx.clearRect(0,0,back.width,back.height);
    fctx.clearRect(0,0,front.width,front.height);
    const src=mixedPath(now);
    if(!src.length){if(running)frame=requestAnimationFrame(draw);return;}

    const heroU=window.NusHeroKnot&&window.NusHeroKnot.getUnravel?window.NusHeroKnot.getUnravel():0;
    const alpha=clamp((heroU-.03)/.32,0,1);
    const heroTail=hostPoint(window.NusHeroKnot,'#hero-knot',false);
    const endTail=hostPoint(window.NusEndKnot,'#end-knot',true);
    const baseStart=src[0], baseEnd=src[src.length-1];
    const endLen=baseEnd.len||1;
    const list=[];
    for(let i=0;i<src.length;i++){
      const s=src[i];
      if(s.y<scrollY-90||s.y>scrollY+VH+90)continue;
      const fromStart=clamp(1-(s.len||0)/190,0,1);
      const fromEnd=clamp(1-(endLen-(s.len||0))/190,0,1);
      const x=s.x+(heroTail.x-baseStart.x)*fromStart+(endTail.x-baseEnd.x)*fromEnd;
      const y=s.y+(heroTail.y-baseStart.y)*fromStart+(endTail.y-baseEnd.y)*fromEnd;
      const prev=src[Math.max(0,i-1)], next=src[Math.min(src.length-1,i+1)];
      const ang=Math.atan2(next.y-prev.y,next.x-prev.x);
      const cssTube=PAGE_TUBE+(START_TUBE-PAGE_TUBE)*fromStart;
      list.push({sx:x*dpr,sy:(y-scrollY)*dpr,z:-.55,persp:1,ang,s:M.lightSide(ang),len:Math.max(3,SAMPLE_STEP*2.2)*dpr,tube:cssTube*dpr});
    }
    if(list.length){
      const set=M.sprites(accent,.14);
      bctx.globalAlpha=alpha;
      M.drawTube(bctx,list,PAGE_TUBE*dpr,set);
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
      band+=dt*210;
      const total=path.length?path[path.length-1].len:0;
      if(total&&band>total+180)band=-180;
    }
    drawDebug(scrollY);
    if(running)frame=requestAnimationFrame(draw);
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
  window.NusThread={layout:measure,relayout:schedule};
})();
