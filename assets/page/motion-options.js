/* Approved hero > lesson handoff A. data-review="hero" enables comparison controls. */
(() => {
  const review = document.currentScript.dataset.review === 'hero';
  const hero = document.querySelector('#hero');
  const track = document.querySelector('#track');
  const orb = document.querySelector('#orb');
  const head = document.querySelector('#next .next-head');
  const stage = document.querySelector('#aStage');
  const sheet = stage.querySelector('.mac');
  const knot = stage.querySelector('.knot');
  const caps = document.querySelector('.tcap');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search);
  const variants = {
    a: ['A · Follow the orb', 'The brass sphere travels into the lesson’s Knot.'],
    b: ['B · Follow the thread', 'A strand carries the eye from the orb into the lesson.'],
    c: ['C · Shared depth', 'The hero recedes as the lesson comes forward.'],
    original: ['Original', 'The approved base, for comparison.']
  };
  let mode = review && variants[params.get('option')] ? params.get('option') : 'a';
  const clamp = v => Math.min(1, Math.max(0, v));
  const smooth = (v, a, b) => { const t = clamp((v-a)/(b-a)); return t*t*(3-2*t); };
  const lerp = (a,b,t) => a+(b-a)*t;
  const canvas = document.createElement('canvas');
  canvas.className = 'nus-motion-bridge';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const pen = NusDraw(canvas);   // one draw call a frame (gl2d.js)
  let W, H, dpr, end, from, to, headDoc, stageDoc, sheetDoc, targetDoc, cropSide, pending = 0;
  // styles are only written when they change, so a settled page is never touched by scrolling
  const written = new Map();
  const put = (el, prop, value) => { let was = written.get(el); if (!was) written.set(el, was = {}); if (was[prop] !== value) el.style[prop] = was[prop] = value; };
  let interacting = false, drawn = false;

  // Shadow DOM keeps the review controls out of the approved page's styles.
  let select, detail, ui;
  if (review) {
  const controls = document.createElement('aside');
  controls.setAttribute('aria-label', 'Motion comparison');
  controls.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:100;pointer-events:none';
  ui = controls.attachShadow({mode:'open'});
  ui.innerHTML = `<style>
    :host{font:13px Inter,system-ui,sans-serif;color:#f1ecdf}
    .panel{box-sizing:border-box;max-width:670px;margin:auto;padding:12px 16px;border:1px solid #343a4b;border-radius:16px;background:rgba(6,8,16,.95);pointer-events:auto;box-shadow:0 8px 30px #0006}
    .row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    strong{font-size:12px;color:#b9c1d3;margin-right:auto}
    select,button,a{font:inherit;color:inherit;background:#151a29;border:1px solid #343a4b;border-radius:8px;padding:7px 10px;text-decoration:none;cursor:pointer}
    select{max-width:100%} button:hover,a:hover{border-color:#d1a75f}
    :focus-visible{outline:2px solid #d1a75f;outline-offset:3px}
    p{margin:9px 0 0;color:#b9c1d3;line-height:1.4;font-size:12px}
    .folded .extra,.folded p{display:none}
    @media(max-width:480px){.panel{padding:10px}.row{gap:7px}strong{width:100%}select{flex:1}p{font-size:11px}}
  </style><div class="panel"><div class="row"><strong>01 / Hero → Lesson</strong>
    <select aria-label="Motion option">${Object.entries(variants).map(([key,val])=>`<option value="${key}">${val[0]}</option>`).join('')}</select>
    <button class="extra" data-replay>Replay</button><button data-fold aria-expanded="true">Hide</button>
  </div><p aria-live="polite"></p><div class="row extra" style="margin-top:9px"><button data-hero>Hero</button><button data-lesson>Try the lesson</button><a href="index.html">Approved page</a><span style="font-size:11px;color:#b9c1d3">Scroll down, then back up.</span></div></div>`;
  document.body.append(controls);
  select = ui.querySelector('select'); detail = ui.querySelector('p');
  }
  // the hero orb stops drawing while it is faded out; it sits behind the lesson in its most expensive pose
  const orbActive = on => { if (typeof heroOrb !== 'undefined' && heroOrb.setActive) heroOrb.setActive(on); };
  function reset() {
    orbActive(true); written.clear();
    [orb,caps,head,sheet,knot].forEach(el => { el.style.opacity=''; el.style.transform=''; });
    hero.style.filter = '';
    if (drawn) { pen.begin(W,H,dpr); pen.end(); drawn = false; }
  }
  function choose() {
    reset();
    document.body.dataset.motionOption=mode;
    if (review) {
      select.value=mode;
      detail.textContent=variants[mode][1]+(reduced.matches ? ' Reduced motion: static handoff.' : '');
      params.set('option',mode);
      history.replaceState(null,'',`${location.pathname}?${params}`);
    }
    measure(); queue();
  }
  if (review) {
  select.addEventListener('change',()=>{mode=select.value; choose();});
  ui.querySelector('[data-replay]').addEventListener('click',()=>scrollTo({top:Math.max(0,from-H*.2),behavior:'instant'}));
  ui.querySelector('[data-hero]').addEventListener('click',()=>scrollTo({top:0,behavior:'instant'}));
  ui.querySelector('[data-lesson]').addEventListener('click',()=>scrollTo({top:stage.getBoundingClientRect().top+scrollY-H*.19,behavior:'instant'}));
  ui.querySelector('[data-fold]').addEventListener('click',e=>{
    const folded=ui.querySelector('.panel').classList.toggle('folded');
    e.target.textContent=folded?'Show':'Hide'; e.target.setAttribute('aria-expanded',String(!folded));
  });
  }
  // Once the visitor uses the lesson, scrolling never conceals its working UI.
  stage.addEventListener('pointerdown',()=>{interacting=true;queue();},{passive:true});
  stage.addEventListener('focusin',()=>{interacting=true;queue();});
  function layoutTop(el) { let top=0;for(let node=el;node;node=node.offsetParent)top+=node.offsetTop;return top; }
  function measure() {
    W=innerWidth; H=innerHeight; dpr=Math.min(1.5,devicePixelRatio||1);
    canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
    end=track.offsetTop+track.offsetHeight-H;
    from=end*.88;
    headDoc=layoutTop(head);stageDoc=layoutTop(stage);
    sheetDoc={x:stage.getBoundingClientRect().left+sheet.offsetLeft,y:layoutTop(sheet),w:sheet.offsetWidth,h:sheet.offsetHeight};
    const r=knot.getBoundingClientRect();
    targetDoc={x:r.left+r.width/2,y:layoutTop(knot)+knot.offsetHeight/2,r:knot.offsetWidth*.37};
    to=Math.max(from+H*.8,targetDoc.y-H*.73);
    cropSide=(4+Math.min(W,H)*.075)*2.2+24;
  }
  function sphere(t,cx,cy,scale,a) {
    const r=(4+Math.min(W,H)*.075)*scale, dot=1.4*scale;
    pen.rgb(209,167,95); pen.glow(cx,cy,0,cropSide*scale,.65*a);
    pen.rgb(214,172,102);
    for(let j=0;j<320;j++) {
      const y=1-j/319*2, rad=Math.sqrt(1-y*y), angle=j*Math.PI*(3-Math.sqrt(5))-1.2-t*.6;
      const x=Math.cos(angle)*rad, z=Math.sin(angle)*rad, depth=(z+1)/2;
      pen.rect(cx+x*r-dot/2,cy+y*r-dot/2,dot,dot,(.18+.82*depth*depth)*a);
    }
  }
  function cubic(a,b,c,d,t) { const u=1-t;return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y}; }
  function paint() {
    pending=0;
    if(mode==='original'||reduced.matches) { reset(); canvas.style.visibility='hidden'; return; }
    const y=scrollY, p=clamp((y-from)/(to-from));
    const enter=1-smooth((headDoc-y)/H,.5,.96);
    const sheetIn=1-smooth((stageDoc-y)/H,.30,.95);
    const visibleSheet=interacting?1:sheetIn;
    put(head,'opacity',String(enter));
    put(head,'transform',`translate3d(0,${(1-enter)*(mode==='c'?64:28)}px,0)`);
    // The window itself stays still and fully drawn, and a veil of page colour on this canvas lifts off it.
    // Fading or sliding the real window made the browser redraw the whole spreadsheet and its soft shadow on every scroll frame.
    let veil=0;
    if(mode==='c') { put(sheet,'opacity',String(visibleSheet)); put(sheet,'transform',`translate3d(0,${(1-visibleSheet)*80}px,0) scale(${1-(1-visibleSheet)*.035})`); }
    else { put(sheet,'opacity','1'); put(sheet,'transform','none'); veil=1-visibleSheet; }
    const fade=smooth(p,0,.24);
    const orbOpacity=mode==='a'?1-fade:1-smooth(p,.06,.34);
    put(orb,'opacity',String(orbOpacity)); orbActive(orbOpacity>.004);
    put(caps,'opacity',String(1-smooth(p,.04,.3)));
    hero.style.filter=mode==='c'?`blur(${smooth(p,0,.38)*3}px)`:'';
    const kr=1-smooth(p,.76,.98);
    put(knot,'opacity',interacting?'':String(mode==='a'?1-kr:sheetIn));
    const veilTop=sheetDoc.y-y, veiled=veil>.002&&veilTop<H+60&&veilTop+sheetDoc.h>-90, sphereOn=!(y<from||y>to+H*.25);
    // an idle full-screen overlay still costs compositing on 2x screens, so it is hidden when blank
    if(!sphereOn&&!veiled) { if(drawn){pen.begin(W,H,dpr);pen.end();drawn=false;} canvas.style.visibility='hidden'; return; }   // a blank canvas is left alone
    canvas.style.visibility=''; drawn=true; pen.begin(W,H,dpr);
    if(veiled) { pen.rgb(6,8,16); pen.rect(sheetDoc.x-44,veilTop-26,sheetDoc.w+88,sheetDoc.h+102,veil); }
    if(!sphereOn) { pen.end(); return; }
    const t=smooth(p,0,1), start={x:W*.19,y:H*.6+(mode==='b'?Math.min(0,end-y):0)};
    const dest={x:targetDoc.x,y:targetDoc.y-y};
    // The route stays at the right margin of the lesson copy.
    const bend={x:W*(W<640?.9:.83),y:H*.40};
    const pos=cubic(start,{x:lerp(start.x,bend.x,.8),y:H*.45},{x:dest.x,y:dest.y-H*.36},dest,t);
    if(W<640) {
      // Carry the sphere around the outside of the stacked phone headline.
      pos.x=p<.32?lerp(start.x,W-26,smooth(p,0,.32)):lerp(W-26,dest.x,smooth(p,.78,1));
      pos.y=p<.28?lerp(H*.6,H*.3,smooth(p,0,.28)):lerp(H*.3,dest.y,smooth(p,.28,1));
    }
    const a=smooth(p,0,.12)*(1-smooth(p,.84,1));
    if(mode==='a') {
      const initialR=4+Math.min(W,H)*.075;
      const radius=W<640?lerp(lerp(initialR,18,smooth(p,0,.22)),targetDoc.r,smooth(p,.84,1)):lerp(initialR,targetDoc.r,t);
      sphere(t,pos.x,pos.y,radius/initialR,a);
    }
    if(mode==='b') {
      // A thin combed bundle, drawn only as far as the scroll has travelled.
      pen.rgb(209,167,95);
      for(let strand=0;strand<7;strand++) {
        const spread=(strand-3)*1.7;
        for(let j=0;j<=64;j++) {
          const s=t*j/64;
          const v=cubic(start,{x:bend.x+spread,y:start.y+H*.2},{x:dest.x+spread,y:dest.y-H*.4},dest,s);
          if(j===0)pen.start(v.x,v.y,a*(strand===3?.55:.16),.65);else pen.to(v.x,v.y);
        }
        pen.stroke();
      }
      const tip=cubic(start,{x:bend.x,y:start.y+H*.2},{x:dest.x,y:dest.y-H*.4},dest,t);
      pen.rgb(241,236,223); pen.glow(tip.x,tip.y,0,14,a*.8);
    }
    pen.end();
  }
  const gate = NusMotion.observe([track, document.querySelector('#next')], () => {
    // Paint terminal values once on exit, including after a fast anchor jump.
    if (!pending && !document.hidden) pending = requestAnimationFrame(paint);
  });
  function queue() { if(!pending && gate.active && !document.hidden) pending=requestAnimationFrame(paint); }
  addEventListener('scroll',queue,{passive:true});
  addEventListener('resize',()=>{measure();queue();},{passive:true});
  reduced.addEventListener('change',choose);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(pending);pending=0;}else queue();});
  choose();
  NusMotion.onLayout(() => { measure(); queue(); });
  new ResizeObserver(()=>{measure();queue();}).observe(head);
  if(document.fonts)document.fonts.ready.then(()=>{measure();queue();});
})();
