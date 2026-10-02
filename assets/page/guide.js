/* Setup, option A "Follow along" (picked 2026-09-30). Companion / Students tabs; numbered steps on the left
   auto-advance and a screen on the right shows each step where it happens. The Companion guide shows it as
   your own Jarvis: keys, your folders, voice actions, and pointing with the Knot's real thread.
   Facts: nus-desktop-day1 Companion window (Saved, Folders, Settings; Your keys rows; folders take PDF,
   Word, text, Markdown and calendar files), hotkeys, the live site's install notes, and the student app's
   Settings cards (renderer/index.html). Usage: NusGuide.mount(el)  (el is an empty .guide element) */
(function () {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const APPLE = '<svg class="os" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.37 12.64c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.29-3.52zM14.2 6.18c.6-.73 1.01-1.74.9-2.75-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.22z"/></svg>';
  const ext = (href, t) => `<a class="ext" href="https://${href}" target="_blank" rel="noopener">${t || href}</a>`;
  const K = (...k) => k.map((x) => `<kbd>${x}</kbd>`).join(" ");
  const KEYS = {
    typesafe: { name: "TypeSafe", role: "Jev, the voice reflexes", unlocks: "Voice actions. Jev, TypeSafe’s voice model, turns “open Notepad, type hello” into the clicks and keys.", get: ext("typesafe.ai"), where: "Companion window, <b>Your keys</b>, TypeSafe", note: "Only for voice actions. Everything else works without it." },
    gemini: { name: "Gemini", role: "Answers and speech fallback", unlocks: "Everyday answers, and a backup for hearing you.", get: ext("aistudio.google.com/apikey") + " (free key)", where: "Companion window, <b>Your keys</b>, Gemini", note: "The quickest one to get. Start here." },
    anthropic: { name: "Anthropic", role: "Claude for pointing", unlocks: "Pointing: press Ctrl+Shift+T on anything and Claude answers right there, or walks you through it.", get: ext("console.anthropic.com"), where: "Companion window, <b>Your keys</b>, Anthropic", note: "Have Claude Code installed? Skip this. NŪS finds it." },
    claude: { name: "Claude", role: "For the student app", unlocks: "Reading your syllabi, the Ask bar and the chat.", get: "Nothing, if Claude Code is installed: NŪS finds it. Otherwise an API key from " + ext("console.anthropic.com"), where: "Settings, the <b>AI provider</b> card", note: "Courses, tasks and the calendar work without it." },
    gemini2: { name: "Gemini", role: "For the built-in Companion", unlocks: "The Knot’s AI answers, and cloud speech backup.", get: ext("aistudio.google.com/apikey") + " (free key)", where: "Settings, the <b>Companion AI key</b> card", note: "Optional. Without it, screen guidance can still use your desktop Claude." },
  };
  const GUIDES = {
    companion: [
      { t: "Download and install", d: "Get NŪS Companion 0.1.2 for Windows. If Windows says it protected your PC, click <b>More info</b>, then <b>Run anyway</b>. It isn’t code-signed yet.", scene: "smart", dur: 6 },
      { t: "Add your keys", d: "In the Companion window, under <b>Your keys</b>: TypeSafe for voice actions, Gemini for answers, Anthropic for pointing. Have Claude Code? Skip Anthropic.", scene: "keys", dur: 8 },
      { t: "Give it your stuff", d: "This is what makes it your Jarvis. Under <b>Folders</b>, add your notes, docs and calendar: PDF, Word, text, Markdown and calendar files. It answers from them when they help.", scene: "folders", dur: 7 },
      { t: "Say it, it acts", d: `Hold ${K("Ctrl", "Alt", "Space")} and say “open Notepad, type hello”. Jev does it while you’re still talking. Say a few in a row and it offers to save them as a routine.`, scene: "voice", dur: 7.5 },
      { t: "Point at anything", d: `Press ${K("Ctrl", "Shift", "T")} on a button, an error or a slide. The Knot’s thread runs to that exact spot, and the answer lands right there.`, scene: "point", dur: 7 },
    ],
    students: [
      { t: "Download", d: `The Windows installer, or the ${APPLE}Mac beta for Apple silicon or Intel. On a Mac, if it won’t open: System Settings, Privacy &amp; Security, <b>Open Anyway</b>.`, scene: "dl", dur: 6 },
      { t: "No account needed", d: "It runs in local mode on your computer. You only make an account if you want Pro.", scene: "local", dur: 5 },
      { t: "Connect your AI", d: "In Settings, the <b>AI provider</b> card uses Claude: it’s found automatically if Claude Code is installed, otherwise paste an Anthropic API key. For the built-in Knot, add a free Gemini key in <b>Companion AI key</b>.", scene: "prov", dur: 7 },
      { t: "Import a syllabus", d: "Drop in the PDF and check what it read. Nothing is saved until you confirm. The Companion is already inside.", scene: "review", dur: 6 },
    ],
  };
  const NOTEPAD = `<div class="notepad"><div class="bar">Untitled - Notepad</div><div class="txt"></div></div>`;
  const WINCAP = (t) => `<div class="cap">${t}</div>`;

  function sceneHTML(name) {
    switch (name) {
      case "smart": return WINCAP("Windows, first launch") + `<div class="smart"><h4>Windows protected your PC</h4><p>Microsoft Defender SmartScreen prevented an unrecognized app from starting.</p><div class="more">More info</div><div class="row"><span class="run">Run anyway</span><span>Don’t run</span></div><div class="ring"></div></div>`;
      case "keys": return WINCAP("Companion window · Settings") + `<div class="gl keys-card"><div class="ey">01 / CONNECTIONS</div><h5>Your keys</h5><div class="m">Stored on this device. Saved keys are never shown here.</div>
        ${["typesafe", "gemini", "anthropic"].map((k) => `<div class="krow"><label>${KEYS[k].name}<small>${KEYS[k].role}</small></label><span class="badge">Not set</span><span class="get">Get a key ↗</span><div class="field"></div></div>`).join("")}<span class="save">Save keys</span></div>`;
      case "folders": return WINCAP("Companion window · Folders") + `<div class="gl fold"><h5>A little context goes a long way.</h5><div class="m">Add PDF, Word, text, Markdown, and calendar files.</div><span class="add">+ Add folder</span>
        <div class="frows">${[["Class notes", "48 files"], ["Resume and cover letters", "9 files"], ["Fall calendar", "1 file"]].map(([n, c]) => `<div class="frow"><span class="ic"></span><span><b>${n}</b><small>${c}</small></span><span class="tg"></span></div>`).join("")}</div>
        <div class="m foot">Up to 200 files per folder, 2 MB per file. Turn a folder off to stop using it.</div></div>`;
      case "voice": return WINCAP("Anywhere on your screen") + `<div class="voice"><div class="knotbox"><canvas></canvas></div><div class="caps">${K("Ctrl", "Alt", "Space")}</div><div class="gl say"><span class="dot"></span><span class="w"></span></div></div>${NOTEPAD}<div class="gl offer">Want me to save that as a routine?</div>`;
      case "point": return WINCAP("Ctrl+Shift+T on anything") + `<div class="doc"><div class="bar"><b></b>report-draft.docx</div><div class="body"><div class="ln m"></div><div class="ln"></div><div class="ln s"></div><div class="err">Error: the linked file was not found</div><div class="ln"></div><div class="ln m"></div></div></div>
        <div class="gl bub"><div class="k">Explain</div>The link points to a file that moved. Relink it from Insert, then Link.</div><div class="pknot"><canvas></canvas></div>`;
      case "map": return WINCAP("Companion window · Map") + `<div class="gl mapcard"><div class="mh"><b>A map of what you keep.</b><span>Your folders, routines, and conversations, connected.</span></div><svg class="graph" viewBox="0 0 560 250" aria-label="Map: the Knot in the middle, linked to folders, routines and conversations">
        ${[[280, 128, 0], [110, 60, 1], [120, 196, 1], [450, 58, 2], [470, 190, 3], [300, 30, 2], [285, 226, 3]].slice(1).map(([x, y], i) => `<line class="ed" style="--i:${i}" x1="280" y1="128" x2="${x}" y2="${y}"/>`).join("")}
        <circle class="hub" cx="280" cy="128" r="22"/><text class="hl" x="280" y="168" text-anchor="middle">THE KNOT · YOUR MEMORY</text>
        ${[[110, 60, "Class notes", "folder"], [120, 196, "Resume docs", "folder"], [450, 58, "Morning setup", "routine"], [470, 190, "Tuesday call", "conversation"], [300, 30, "Open my notes", "routine"], [285, 226, "Study plan chat", "conversation"]].map(([x, y, t, k], i) =>
          `<g class="nd ${k}" style="--i:${i}"><circle cx="${x}" cy="${y}" r="7"/><text x="${x + (x < 280 ? -12 : 12)}" y="${y + 4}" text-anchor="${x < 280 ? "end" : "start"}">${t}</text></g>`).join("")}
        </svg><div class="legend"><span class="folder">Folders</span><span class="routine">Routines</span><span class="conversation">Conversations</span></div></div>`;
      case "dl": return WINCAP("Pick your download") + `<div class="dl"><div class="b">Windows installer <small>Nus-Setup.exe</small></div><div class="b">${APPLE}Mac beta, Apple silicon <small>Nus-arm64.dmg</small></div><div class="b">${APPLE}Mac beta, Intel <small>Nus-x64.dmg</small></div><p class="note">Mac won’t open it? System Settings, Privacy &amp; Security, Open Anyway.</p></div>`;
      case "local": return WINCAP("First launch") + `<div class="gl profile"><span class="av">N</span><span><b>You</b><span>Local profile</span></span></div>`;
      case "prov": return WINCAP("NŪS for Students · Settings") + `<div class="cards">
        <div class="setcard hi"><div class="kick">AI provider</div><h6>Claude Code detected</h6><p>NŪS uses your own AI to read syllabi. Claude Code is detected automatically; otherwise paste an Anthropic API key.</p></div>
        <div class="setcard"><div class="kick">Companion AI key</div><h6>Gemini API key</h6><div class="inp">AIza…</div><span class="sv">Save key</span></div></div>`;
      case "review": return WINCAP("Check what it read") + `<div class="win"><div class="tb"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span>NŪS</span></div><img src="assets/app-review.webp" alt="NŪS for Students review screen: check what it read from a syllabus"></div>`;
    }
  }
  // scenes that hold a live Knot are built once and reset by hand; the rest are rebuilt to replay
  const KEEP = { voice: 1, point: 1 };
  function knotIn(el, sel) {
    const cv = el.querySelector(sel);
    if (!cv._knot && window.NusKnot3D) cv._knot = NusKnot3D.mount(cv, { ground: false, scale: 0.3, focusGate: false });
    const k = cv._knot; return (s) => k && k.setState && k.setState(s);
  }
  const PLAY = {
    async smart(el, w) { const d = el.querySelector(".smart"), ring = el.querySelector(".ring"), more = el.querySelector(".more"), run = el.querySelector(".run");
      const at = (t) => { ring.style.cssText = `opacity:1;left:${t.offsetLeft - 6}px;top:${t.offsetTop - 5}px;width:${t.offsetWidth + 12}px;height:${t.offsetHeight + 10}px`; };
      await w(500); at(more); await w(1300); d.classList.add("more-on"); await w(500); at(run); run.classList.add("hi"); },
    async keys(el, w) { for (const r of el.querySelectorAll(".krow")) { await w(350); r.classList.add("hi"); const f = r.querySelector(".field");
        for (let i = 0; i < 18; i++) { f.textContent += "•"; await w(35); } await w(250); const b = r.querySelector(".badge"); b.textContent = "Saved"; b.classList.add("ok"); r.classList.remove("hi"); } },
    async folders(el, w) { const add = el.querySelector(".add"); await w(500); add.classList.add("press"); await w(250); add.classList.remove("press");
      for (const r of el.querySelectorAll(".frow")) { r.classList.add("in"); await w(420); r.classList.add("on"); await w(250); } },
    async voice(el, w) { const st = knotIn(el, ".knotbox canvas"), caps = el.querySelectorAll(".caps kbd"), say = el.querySelector(".say .w"), np = el.querySelector(".notepad"), txt = np.querySelector(".txt"), offer = el.querySelector(".offer");
      say.textContent = ""; txt.textContent = ""; np.classList.remove("on"); offer.classList.remove("on"); st("idle");
      await w(400); caps.forEach((c) => c.classList.add("down")); st("listening");
      const s = "open notepad, new note, type hello"; for (let i = 1; i <= s.length; i++) { say.textContent = s.slice(0, i); await w(42); if (i === 13) np.classList.add("on"); }
      caps.forEach((c) => c.classList.remove("down")); st("thinking"); for (const ch of "hello") { txt.textContent += ch; await w(90); } st("ready");
      await w(900); offer.classList.add("on"); },
    async point(el, w, ctx) { const st = knotIn(el, ".pknot canvas"), err = el.querySelector(".err"), bub = el.querySelector(".bub");
      bub.classList.remove("on"); st("idle"); err.classList.remove("hot"); await w(600); st("thinking"); err.classList.add("hot"); await w(500);
      const strand = ctx.strandFor(el.querySelector(".pknot canvas"));
      if (strand) { await new Promise((res) => { ctx.onArrive = res; strand.setTarget(ctx.rect(err)); setTimeout(res, 1600); }); }
      st("ready"); bub.classList.add("on"); },
    async map(el, w) { el.querySelector(".mapcard").classList.remove("grown"); await w(200); el.querySelector(".mapcard").classList.add("grown"); },
  };

  function ProdTabs(root, onPick) {
    const seg = root.querySelector(".prod .seg"), pill = seg.querySelector(".pill"), btns = [...seg.querySelectorAll("button")];
    const place = (b) => { pill.style.left = b.offsetLeft + "px"; pill.style.width = b.offsetWidth + "px"; };
    btns.forEach((b) => b.addEventListener("click", () => { btns.forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); }); place(b); onPick(b.dataset.p); }));
    requestAnimationFrame(() => place(btns[0])); addEventListener("resize", () => place(btns.find((b) => b.classList.contains("on"))));
  }

  function mount(root) {
    root.innerHTML = `<div class="sec">
      <div class="head reveal"><div class="mono">Setup</div><h2 class="serif">Running in <em>ten minutes.</em></h2><p>Pick your app. Each step shows the screen it happens on.</p></div>
      <div class="prod reveal"><div class="seg" role="tablist" aria-label="Which app"><span class="pill" aria-hidden="true"></span><button type="button" role="tab" class="on" aria-selected="true" data-p="companion">NŪS Companion</button><button type="button" role="tab" aria-selected="false" data-p="students">NŪS for Students</button></div></div>
      <div class="fa reveal"><ol class="gsteps"></ol><div class="screen" aria-live="polite"></div></div></div>`;
    const list = root.querySelector(".gsteps"), screen = root.querySelector(".screen"), fa = root.querySelector(".fa");
    new ResizeObserver(() => screen.style.setProperty("--k", Math.min(1, screen.clientWidth / 660).toFixed(3))).observe(screen);
    // one fixed overlay for the Knot's thread (the Companion's own strand.js), following the page as it scrolls
    let cvs = document.createElement("canvas"); cvs.className = "guide-strand"; cvs.setAttribute("aria-hidden", "true"); document.body.appendChild(cvs);
    const ctx = { onArrive: null, strands: new Map(), rect: (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; },
      strandFor(knotCanvas) { if (!window.NusStrand || !knotCanvas._knot) return null; if (!this.strands.has(knotCanvas)) this.strands.set(knotCanvas, NusStrand.mount(cvs, knotCanvas._knot, { onArrive: () => { const f = ctx.onArrive; ctx.onArrive = null; f && f(); } })); return this.strands.get(knotCanvas); } };
    const rewindAll = () => ctx.strands.forEach((s) => s.getState() !== "idle" && s.rewind());
    let prod = "companion", i = 0, timer = 0, run = 0, paused = false, visible = false, ticking = false;
    addEventListener("scroll", () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; const err = screen.querySelector(".scene.on .err.hot");
      ctx.strands.forEach((s) => { if (s.getState() !== "idle" && s.redraw) s.redraw(err ? ctx.rect(err) : null); }); }); }, { passive: true });
    function build() {
      rewindAll(); const G = GUIDES[prod];
      list.innerHTML = G.map((s, k) => `<li><button type="button" style="--dur:${s.dur}s"><span class="n">${k + 1}</span><span><span class="ttl">${s.t}</span><span class="d">${s.d}</span></span><i></i></button></li>`).join("");
      screen.innerHTML = G.map((s) => `<div class="scene" data-s="${s.scene}">${sceneHTML(s.scene)}</div>`).join("");
      [...list.querySelectorAll("button")].forEach((b, k) => b.addEventListener("click", () => go(k, true)));
      go(0);
    }
    function go(k, user) {
      const G = GUIDES[prod]; i = k; const tok = ++run; rewindAll();
      [...list.querySelectorAll("button")].forEach((b, j) => { b.classList.toggle("on", j === i); b.setAttribute("aria-current", j === i ? "step" : "false"); const bar = b.querySelector("i"); bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; });
      const scenes = [...screen.querySelectorAll(".scene")]; scenes.forEach((s, j) => s.classList.toggle("on", j === i));
      const el = scenes[i], name = G[i].scene;
      if (!KEEP[name]) el.innerHTML = sceneHTML(name);
      const w = async (ms) => { await sleep(ms); if (tok !== run) throw 0; };
      if (visible && PLAY[name]) PLAY[name](el, w, ctx).catch(() => {});
      clearTimeout(timer); if (!reduce && !paused) timer = setTimeout(() => visible && go((i + 1) % G.length), (user ? G[i].dur * 1.6 : G[i].dur) * 1000);
    }
    fa.addEventListener("mouseenter", () => { paused = true; list.classList.add("paused"); clearTimeout(timer); });
    fa.addEventListener("mouseleave", () => { paused = false; list.classList.remove("paused"); if (!reduce) timer = setTimeout(() => go((i + 1) % GUIDES[prod].length), GUIDES[prod][i].dur * 1000); });
    new IntersectionObserver((es) => { const was = visible; visible = es[0].isIntersecting; if (visible && !was && !paused) go(i); if (!visible) { clearTimeout(timer); rewindAll(); } }, { threshold: 0.35 }).observe(screen);
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.12 });
    root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    ProdTabs(root, (p) => { prod = p; build(); });
    build();
  }
  window.NusGuide = { mount, KEYS, GUIDES, ProdTabs, ext, APPLE };
})();
