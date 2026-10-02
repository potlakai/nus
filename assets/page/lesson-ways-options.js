/* Approved lesson > Two ways handoff B. data-review="lesson" enables comparisons. */
(() => {
  const review=document.currentScript.dataset.review==='lesson';
  const lesson=document.querySelector('#next'), stage=lesson.querySelector('#aStage');
  const knot=stage.querySelector('.knot'), knotCanvas=knot.querySelector('canvas');
  const status=lesson.querySelector('#aStatus');
  const ways=document.querySelector('#ways'), fork=ways.querySelector('.fork');
  const head=fork.querySelector('.head'), field=fork.querySelector('canvas.strands');
  const gap=fork.querySelector('.gap'), cards=[...fork.querySelectorAll('.card')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search);
  const variants={
    a:['A · The Knot carries on','The lesson’s Knot travels into the orb, then its strands open into both cards.'],
    b:['B · Follow its thread','A thread leaves the lesson’s Knot and leads into the two-way fork.'],
    c:['C · Open together','The lesson recedes as the orb, strands and two cards open in one continuous move.'],
    original:['Original','The approved section entry, with the chosen hero handoff A.']
  };
  let mode=review&&variants[params.get('connection')]?params.get('connection'):'b';
  let frame=0, W,H,dpr, start,end, headY, forkX, orbY, sourceY, sourceX, sourceSize, statusY, cardY;
  const clamp=v=>Math.min(1,Math.max(0,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=(v,a,b)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
  const top=el=>{let n=0;for(let e=el;e;e=e.offsetParent)n+=e.offsetTop;return n;};
  const layer=document.createElement('canvas');layer.className='nus-connection-bridge';layer.setAttribute('aria-hidden','true');document.body.append(layer);
  const ctx=layer.getContext('2d');
  let ui,select,calm;
  if(review){
  const controls=document.createElement('aside');controls.setAttribute('aria-label','Section connection comparison');
  controls.style.cssText='position:fixed;bottom:12px;left:12px;right:12px;z-index:100;pointer-events:none';
  ui=controls.attachShadow({mode:'open'});
  ui.innerHTML=`<style>
    :host{font:13px Inter,system-ui,sans-serif;color:#f1ecdf}
    .panel{box-sizing:border-box;max-width:730px;margin:auto;padding:12px 16px;border:1px solid #343a4b;border-radius:16px;background:rgba(6,8,16,.95);pointer-events:auto;box-shadow:0 8px 30px #0006}
    .row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}strong{font-size:12px;color:#b9c1d3;margin-right:auto}
    select,button,a{font:inherit;color:inherit;background:#151a29;border:1px solid #343a4b;border-radius:8px;padding:7px 10px;text-decoration:none;cursor:pointer}
    button:hover,a:hover{border-color:#d1a75f}:focus-visible{outline:2px solid #d1a75f;outline-offset:3px}
    p{margin:9px 0;color:#b9c1d3;line-height:1.4;font-size:12px}.folded .extra,.folded p{display:none}
    label{font-size:11px;color:#b9c1d3;display:flex;gap:5px;align-items:center}
    @media(max-width:480px){.panel{padding:10px}.row{gap:7px}strong{width:100%}select{flex:1;min-width:0}p{font-size:11px}}
  </style><div class="panel"><div class="row"><strong>02 / Lesson → Two ways in</strong>
    <select aria-label="Connection option">${Object.entries(variants).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('')}</select>
    <button class="extra" data-replay>Replay</button><button class="extra" data-handoff>Handoff</button><button data-fold aria-expanded="true">Hide</button></div>
    <p aria-live="polite"></p><div class="row extra"><button data-lesson>Try the lesson</button><button data-cards>See the cards</button><a href="index.html">Working page</a><label><input type="checkbox" data-calm>Calm handoff</label></div></div>`;
  document.body.append(controls);
  select=ui.querySelector('select');calm=ui.querySelector('[data-calm]');
  }
  const calmHandoff=()=>reduced.matches||(review&&calm.checked);
  function measure(){
    W=innerWidth;H=innerHeight;dpr=Math.min(1.5,devicePixelRatio||1);layer.width=Math.round(W*dpr);layer.height=Math.round(H*dpr);
    const k=knot.getBoundingClientRect(), f=fork.getBoundingClientRect();
    sourceX=k.left+k.width/2;sourceY=top(knot)+knot.offsetHeight/2;sourceSize=knot.offsetWidth;
    forkX=f.left+fork.clientWidth/2;orbY=top(gap)+96;headY=top(head);statusY=top(status);
    cardY=cards.map(top);
    start=sourceY-H*.62;end=Math.max(start+H*.55,orbY-H*.54);
  }
  function reset(){
    [head,field,stage,status,knot,...cards].forEach(el=>{el.style.opacity='';el.style.transform='';});
    cards.forEach(card=>card.removeAttribute('data-connection-entering'));
    NusWays.setEntryProgress(fork,null);ctx.clearRect(0,0,layer.width,layer.height);
  }
  function choose(){
    reset();document.body.dataset.connection=mode;
    if(review){
      select.value=mode;
      ui.querySelector('p').textContent=variants[mode][1]+(calmHandoff()?' Calm handoff: static entry.':'');
      params.set('connection',mode);history.replaceState(null,'',`${location.pathname}?${params}`);
    }
    measure();queue();
  }
  function curve(a,b,c,d,t){const u=1-t;return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};}
  function draw(){
    frame=0;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
    if(mode==='original'||calmHandoff()){reset();layer.style.visibility='hidden';return;}
    const y=scrollY,p=clamp((y-start)/(end-start));
    const entry=1-ease((headY-y)/H,.32,.89);
    head.style.opacity=String(entry);head.style.transform=`translate3d(0,${(1-entry)*24}px,0)`;
    const split=1-ease((cardY[0]-y)/H,.30,.91);
    const orbEntry=mode==='c'?entry:ease(p,.68,.98);
    if(mode==='a'&&y>=start) knot.style.opacity=String(1-ease(p,0,.12));
    else if(y>=start) knot.style.opacity='';
    field.style.opacity=String(orbEntry);
    field.style.transform=mode==='c'?`translate3d(0,${(1-entry)*24}px,0)`:'';
    NusWays.setEntryProgress(fork,split);
    cards.forEach((card,i)=>{
      const progress=W>980?split:1-ease((cardY[i]-y)/H,.38,.96);
      card.toggleAttribute('data-connection-entering',progress<.999);
      card.style.opacity=String(progress);
      card.style.transform=progress>=.999?'':`translate3d(${mode==='c'&&W>980?(i?1:-1)*(1-progress)*18:0}px,${(1-progress)*(mode==='c'?44:24)}px,0)`;   // translate + opacity only: scaling the blurred cards re-rasterises them every frame
    });
    // Keep controls fully readable. Only recede the window after it leaves view.
    const leave=ease(y,sourceY-H*.14,sourceY+H*.12);
    stage.style.opacity=mode==='c'?String(1-leave*.3):'';
    stage.style.transform=mode==='c'?`scale(${1-leave*.016})`:'';
    status.style.opacity=mode==='c'?String(1-ease(y,statusY-H*.1,statusY+H*.18)*.3):'';
    if(y<start-H*.15||y>end+H*.1||mode==='c'){layer.style.visibility='hidden';return;}
    layer.style.visibility='';
    const origin={x:sourceX,y:sourceY-y},dest={x:forkX,y:orbY-y};
    const side=W<640?W-26:Math.min(W-70,sourceX);
    const bend1={x:side,y:origin.y+H*.18},bend2={x:side,y:dest.y-H*.18};
    const t=ease(p,0,1),point=curve(origin,bend1,bend2,dest,t);
    const alpha=ease(p,0,.10)*(1-ease(p,.72,1));
    if(mode==='a'){
      const size=mix(sourceSize,116,t);
      ctx.globalAlpha=alpha;ctx.drawImage(knotCanvas,point.x-size/2,point.y-size/2,size,size);ctx.globalAlpha=1;
    }else{
      for(let lane=0;lane<6;lane++){
        const spread=(lane-2.5)*1.6;ctx.beginPath();
        for(let j=0;j<=80;j++){
          const s=t*j/80,v=curve(origin,{x:bend1.x+spread,y:bend1.y},{x:bend2.x+spread,y:bend2.y},dest,s);
          j?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y);
        }
        ctx.lineWidth=.65;ctx.strokeStyle=`rgba(176,190,255,${alpha*(lane===3?.55:.16)})`;ctx.stroke();
      }
      const glow=ctx.createRadialGradient(point.x,point.y,0,point.x,point.y,12);
      glow.addColorStop(0,`rgba(238,240,250,${alpha*.85})`);glow.addColorStop(1,'rgba(176,190,255,0)');
      ctx.fillStyle=glow;ctx.fillRect(point.x-12,point.y-12,24,24);
    }
  }
  const gate=NusMotion.observe([lesson,ways],()=>{if(!frame&&!document.hidden)frame=requestAnimationFrame(draw);});
  function queue(){if(!frame&&!document.hidden&&gate.active)frame=requestAnimationFrame(draw);}
  if(review){
  select.addEventListener('change',()=>{mode=select.value;choose();});calm.addEventListener('change',choose);
  ui.querySelector('[data-replay]').addEventListener('click',()=>scrollTo({top:Math.max(0,start-H*.17),behavior:'instant'}));
  ui.querySelector('[data-handoff]').addEventListener('click',()=>scrollTo({top:mix(start,end,.5),behavior:'instant'}));
  ui.querySelector('[data-lesson]').addEventListener('click',()=>scrollTo({top:top(stage)-H*.18,behavior:'instant'}));
  ui.querySelector('[data-cards]').addEventListener('click',()=>scrollTo({top:top(cards[0])-H*.1,behavior:'instant'}));
  ui.querySelector('[data-fold]').addEventListener('click',e=>{const folded=ui.querySelector('.panel').classList.toggle('folded');e.target.textContent=folded?'Show':'Hide';e.target.setAttribute('aria-expanded',String(!folded));});
  }
  addEventListener('scroll',queue,{passive:true});addEventListener('resize',()=>{measure();queue();},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else queue();});
  reduced.addEventListener('change',choose);
  new ResizeObserver(()=>{measure();queue();}).observe(lesson);
  NusMotion.onLayout(()=>{measure();queue();});
  choose();if(document.fonts)document.fonts.ready.then(()=>{measure();queue();});
})();
