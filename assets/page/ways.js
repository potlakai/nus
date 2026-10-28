/* Two ways in, option A "The fork" (picked 2026-09-30). A small NŪS orb splits its strands into two
   equal product cards: NŪS Companion (a live desk with the real Knot) and NŪS for Students (the real app
   screens in a Mac-style window). Shared by index.html and twoways.html.
   Usage: NusWays.mountFork(el)  where el holds .gap and two article.card with .media and .copy */
(function () {
  // Optional host-driven entry. Existing option pages retain their original entry.
  const entryProgress = new WeakMap();
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMac = /Mac/.test(navigator.platform || navigator.userAgent) && !/iPhone|iPad/.test(navigator.userAgent);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const REL = "https://github.com/potlakai/nus-desktop/releases";
  const L = {
    companion: `${REL}/download/companion-v0.1.12/Nus-Companion-Setup.exe`,
    win: `${REL}/latest/download/Nus-Setup.exe`, macArm: `${REL}/download/v0.2.7/Nus-arm64.dmg`, macIntel: `${REL}/download/v0.2.7/Nus-x64.dmg`,
  };

  // "It did not install", then one question: what did you see. Each answer shows its fix right away.
  const SAW = [
    ["smartscreen", "Windows protected your PC", "Click <b>More info</b> on that screen. <b>Run anyway</b> shows up under it."],
    ["blocked", "Blocked, no Run anyway", "That is Smart App Control or S mode. They block apps that are not signed yet. Telling Pranav helps him see how often it happens."],
    ["antivirus", "My antivirus took it", "Restore it from your antivirus quarantine, or allow it, then run it again."],
    ["error", "An error message", "Type what it said below, so Pranav can fix it."],
    ["nothing", "Nothing happened", "Look for <b>Nus Companion</b> in the Start menu. Not there? Download it again, the file may have stopped partway."],
    ["other", "Something else", "Type what you saw below."],
  ];

  // the Apple mark on Mac downloads, so the Mac beta reads as a real way in
  const APPLE = '<svg class="os" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.37 12.64c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.29-3.52zM14.2 6.18c.6-.73 1.01-1.74.9-2.75-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.22z"/></svg>';

  /* ---------- the two products (shipped facts only) ---------- */
  function companionCopy() {
    return `<div class="who mono">For anyone on Windows</div>
      <h3 class="serif">NŪS Companion</h3>
      <p class="one">Your own Jarvis on Windows. It acts when you talk, points when you ask, and knows the notes you give it.</p>
      <ul>
        <li><span><b>Say it, it acts.</b> <span class="d">“Open Notepad, type hello.” Voice actions run on Jev.</span></span></li>
        <li><span><b>Point and ask.</b> <span class="d">Press Ctrl+Shift+T on anything. The answer shows up right there.</span></span></li>
        <li><span><b>Knows your stuff.</b> <span class="d">Add folders of notes, docs and your calendar. It answers from them when they help.</span></span></li>
        <li><span><b>Or keep it up top.</b> <span class="d">Island mode puts the Knot in a small bar at the top of your screen. Turn it on in Settings.</span></span></li>
      </ul>
      <div class="bottom">
        <div class="chips"><span class="chip hi">Free</span><span class="chip">Windows 10 and 11</span><span class="chip">Your own AI keys</span></div>
        <div class="acts"><a class="btn solid" href="${L.companion}" data-didit-dl>Download for Windows</a><a class="link" href="#setup" data-guide="companion">Setup guide</a></div>
        <details class="didit" data-didit>
          <summary>Did it install?</summary>
          <div class="didit-body">
            <p>Windows may stop it the first time, because Nūs is new and not signed yet. Two clicks get past it.</p>
            <ol class="didit-steps">
              <li><img src="assets/page/companion/smartscreen-1.svg" width="160" height="100" alt="Windows protected your PC, with More info circled" loading="lazy"><span>1. Click <b>More info</b>.</span></li>
              <li><img src="assets/page/companion/smartscreen-2.svg" width="160" height="100" alt="The same screen after More info, with Run anyway circled" loading="lazy"><span>2. Click <b>Run anyway</b>.</span></li>
            </ol>
            <p class="didit-h">Still stuck?</p>
            <ul class="didit-fixes">
              <li><b>Right file?</b> It is <b>Nus-Companion-Setup.exe</b>, about 200 MB. Not the Portable file, and not the .yml or .blockmap files.</li>
              <li><b>No Run anyway button?</b> Smart App Control or S mode blocks apps that are not signed yet. Turning those off is a big change to Windows, so we don’t ask you to.</li>
              <li><b>Antivirus took it?</b> Restore it from your antivirus quarantine, or allow it, then run it again.</li>
              <li><b>Nothing happened?</b> It installs in a few seconds without asking anything. Look for <b>Nus Companion</b> in the Start menu.</li>
              <li>It needs Windows 10 or 11, 64-bit.</li>
            </ul>
            <button type="button" class="didit-no" data-goatcounter-click="companion-did-not-install">It did not install</button>
            <div class="didit-ask" hidden>
              <p class="didit-h">What did you see?</p>
              <div class="didit-saw" role="group" aria-label="What did you see?">${SAW.map((s) => `<button type="button" data-saw="${s[0]}" aria-pressed="false">${s[1]}</button>`).join("")}</div>
              <p class="didit-tip" aria-live="polite" hidden></p>
              <label class="didit-say"><span>What did it say? (optional)</span><input type="text" maxlength="300" autocomplete="off"></label>
              <button type="button" class="didit-send">Tell Pranav</button>
            </div>
            <p class="didit-note" aria-live="polite" hidden></p>
          </div>
        </details>
        <div class="small">Version 0.1.12${isMac ? ". Windows only for now." : ""}</div>
      </div>`;
  }
  function studentsCopy() {
    const main = isMac ? `<a class="btn solid" href="${L.macArm}" data-macfix-dl>${APPLE}Download for Mac (beta)</a>` : `<a class="btn solid" href="${L.win}">Download for Windows</a>`;
    const alt = isMac ? `<a class="btn ghost" href="${L.macIntel}" data-macfix-dl>${APPLE}Intel Mac</a>` : `<a class="btn ghost" href="${L.macArm}" data-macfix-dl>${APPLE}Mac beta</a>`;
    return `<div class="who mono">For students</div>
      <h3 class="serif">NŪS for Students</h3>
      <p class="one">Your whole semester in one app. Drop in a syllabus, check what it read, and see what matters today.</p>
      <ul>
        <li><span><b>Syllabus in, semester mapped.</b> <span class="d">Nothing is saved until you check it.</span></span></li>
        <li><span><b>Today, Review, Map.</b> <span class="d">What’s next, what it read, how it all connects.</span></span></li>
        <li><span><b>The Companion is inside.</b> <span class="d">The same Knot, built in.</span></span></li>
      </ul>
      <div class="bottom">
        <div class="chips"><span class="chip hi">Free, or Pro $9.99/mo</span><span class="chip hi">Windows</span><span class="chip hi">${APPLE}Mac beta</span></div>
        <div class="acts">${main}${alt}<a class="link" href="#setup" data-guide="students">Setup guide</a></div>
        <details class="didit" data-macfix>
          <summary>Mac won’t open it?</summary>
          <div class="didit-body">
            <p>Drag Nus into Applications, then open it from there. The Mac beta is not notarized by Apple yet, so macOS blocks the first open. What does the message say?</p>
            <p><b>“Apple could not verify Nus”</b>: click <b>Done</b>. Open <b>System Settings</b>, then <b>Privacy &amp; Security</b>. Scroll down, click <b>Open Anyway</b> and enter your password.</p>
            <p><b>“Nus is damaged and can’t be opened”</b>: click <b>Cancel</b>, not Move to Trash. Open <b>Terminal</b> (in Applications, then Utilities) and type this, with a space at the end:</p>
            <div class="didit-cmd"><code>xattr -cr </code><button type="button" class="didit-copy">Copy</button></div>
            <p>Drag Nus from Applications into the Terminal window and press <b>Return</b>. Then open Nus again.</p>
            <p><b>“Not supported on this Mac”</b>: you have an Intel Mac. <a href="${L.macIntel}">Get the Intel version</a>.</p>
          </div>
        </details>
        <div class="small">No account needed unless you go Pro.</div>
      </div>`;
  }
  const VIEWS = [["Today", "What matters now", "assets/app-today.webp"], ["Review", "Check what it read", "assets/app-review.webp"], ["Map", "How it connects", "assets/app-map.webp"]];
  const SCENES = [["Say it", "Voice actions", 5.6], ["Point and ask", "Ctrl+Shift+T", 5.4], ["Your folders", "It knows them", 6.2], ["Island mode", "A bar up top", 10.4]];
  const tabRow = (items, label, cls) => `<div class="tabs ${cls}" role="tablist" aria-label="${label}">${items.map((t, i) => `<button type="button" role="tab" aria-selected="${!i}" class="${i ? "" : "on"}">${t[0]}<small>${t[1]}</small><i></i></button>`).join("")}</div>`;
  function studentsMedia() {
    return `<div class="appwin"><div class="tb"><div class="l"><i class="r"></i><i class="y"></i><i class="g"></i></div><span>NŪS</span></div>
      <div class="shots">${VIEWS.map((t, i) => `<img src="${t[2]}" alt="NŪS for Students, ${t[0]} view" class="${i ? "" : "on"}" loading="lazy">`).join("")}</div></div>
      ${tabRow(VIEWS, "Student app views", "")}`;
  }
  function companionMedia() {
    return `<div class="desk" aria-label="NŪS Companion on a desktop">
      <div class="appish"><div class="bar"><b></b>report-draft.docx</div><div class="body"><div class="ln m"></div><div class="ln"></div><div class="ln s"></div><div class="ln m"></div><div class="err">Error: the linked file was not found</div><div class="ln"></div><div class="ln s"></div></div></div>
      <div class="note"><div class="bar">Untitled - Notepad</div><div class="txt"></div></div>
      <div class="ring"></div>
      <svg class="cursor" viewBox="0 0 18 24" style="left:70%;top:80%;opacity:0" aria-hidden="true"><path d="M1 1 L1 19 L6 14.5 L9.5 22 L12.5 20.7 L9 13.3 L16 13.3 Z" fill="#fff" stroke="#111" stroke-width="1.2"/></svg>
      <div class="gl pill"><span class="dot"></span><span class="words"></span></div>
      <div class="gl keys"><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>T</kbd></div>
      <div class="gl bub b1"><div class="k">Explain</div>The link points to a file that moved. Relink it from Insert, then Link.</div>
      <div class="gl foldmini"><div class="mh">Your folders</div><div class="fr" style="--i:0"><i class="ic"></i><b>Class notes</b><i class="tg"></i></div><div class="fr" style="--i:1"><i class="ic"></i><b>Resume docs</b><i class="tg"></i></div><div class="fr" style="--i:2"><i class="ic"></i><b>Fall calendar</b><i class="tg"></i></div></div>
      <div class="dknot"><canvas></canvas></div>
      <div class="isl"><span class="isl-slot"><canvas></canvas></span><span class="isl-text"><b class="isl-word"></b><span class="isl-line"></span></span></div>
      <div class="gl islcard"><div class="k">Ask first</div>Click “Send”?<div class="h">This looks like it sends something.</div><div class="a"><span class="y">Yes</span><span>Not now</span></div></div></div>
      ${tabRow(SCENES, "What the Companion does", "cool")}`;
  }

  /* ---------- behaviours ---------- */
  function restartBar(b) { const i = b.querySelector("i"); i.style.animation = "none"; void i.offsetWidth; i.style.animation = ""; }
  function mountTabs(root) {
    const btns = [...root.querySelectorAll(".tabs button")], imgs = [...root.querySelectorAll(".shots img")], bar = root.querySelector(".tabs");
    let i = 0, timer = 0, paused = false; const DUR = 4500;
    function go(n, user) {
      i = (n + btns.length) % btns.length;
      btns.forEach((b, k) => { b.classList.toggle("on", k === i); b.setAttribute("aria-selected", k === i); });
      restartBar(btns[i]); imgs.forEach((im, k) => im.classList.toggle("on", k === i));
      clearTimeout(timer); if (!reduce && !paused) timer = setTimeout(() => go(i + 1), user ? DUR * 2 : DUR);
    }
    btns.forEach((b, k) => b.addEventListener("click", () => go(k, true)));
    root.addEventListener("mouseenter", () => { paused = true; bar.classList.add("paused"); clearTimeout(timer); });
    root.addEventListener("mouseleave", () => { paused = false; bar.classList.remove("paused"); if (!reduce) timer = setTimeout(() => go(i + 1), DUR / 2); });
    go(0);
  }
  function mountDesk(root) {
    const desk = root.querySelector(".desk"), q = (s) => desk.querySelector(s);
    const knot = window.NusKnot3D ? NusKnot3D.mount(q(".dknot canvas"), { ground: false, scale: 0.3, focusGate: false }) : null;
    const st = (s) => knot && knot.setState && knot.setState(s);
    const pill = q(".pill"), words = q(".words"), note = q(".note"), txt = q(".note .txt"), keys = q(".keys"), b1 = q(".b1"), b2 = q(".foldmini"), ring = q(".ring"), cur = q(".cursor"), err = q(".err");
    const btns = [...root.querySelectorAll(".tabs button")];
    let visible = false, run = 0; new IntersectionObserver((es) => (visible = es[0].isIntersecting), { threshold: 0.3 }).observe(desk);
    const on = (el, v) => el.classList.toggle("on", v);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    function tab(k) { btns.forEach((b, j) => { b.classList.toggle("on", j === k); b.setAttribute("aria-selected", j === k); }); btns[k].style.setProperty("--dur", SCENES[k][2] + "s"); restartBar(btns[k]); }
    // Island mode (Companion 0.1.8+): the same Knot docked at the left end of a black bar at the top centre.
    // Idle is the Knot alone; the state word and one line grow the bar to the right; cards drop below it.
    const isl = q(".isl"), islSlot = q(".isl-slot"), islWord = q(".isl-word"), islLine = q(".isl-line"), islCard = q(".islcard");
    let islKnot = null;
    const ISL_ACC = { listening: "#EF5350", thinking: "#8C96FF", acting: "#8C96FF" };
    function islFit() {   // the bar's width animates between measured sizes; its left edge never moves
      const was = isl.style.width; isl.classList.remove("wrap"); isl.style.width = "auto";
      if (isl.scrollWidth > isl.clientWidth + 1) isl.classList.add("wrap");
      const wd = isl.offsetWidth; isl.style.width = was; void isl.offsetWidth; isl.style.width = wd + "px";
    }
    function islSet(tone, word, line) {
      isl.dataset.state = tone; islWord.textContent = word || ""; islLine.textContent = line || "";
      isl.classList.toggle("has-text", !!(word || line)); isl.classList.toggle("has-line", !!line);
      if (ISL_ACC[tone]) islSlot.style.setProperty("--knot-accent", ISL_ACC[tone]); else islSlot.style.removeProperty("--knot-accent");
      if (islKnot) islKnot.setState(tone === "acting" ? "thinking" : tone);
      islFit();
    }
    function islCardAt() {   // like the app: left edge under the Knot, kept 8 px inside the screen
      const W = desk.clientWidth, bw = islCard.offsetWidth;
      islCard.style.left = Math.max(8, Math.min(W - bw - 8, isl.offsetLeft + isl.clientLeft + 3)) + "px"; islCard.style.top = isl.offsetTop + isl.offsetHeight + 7 + "px";
    }
    function islOn(v) {
      if (v && !islKnot && window.NusKnot3D) islKnot = NusKnot3D.mount(q(".isl-slot canvas"), { ground: false, scale: 0.27, focusGate: false });
      on(isl, v); desk.classList.toggle("docked", v);
      if (knot) v ? knot.pause() : knot.resume();
      if (islKnot) v ? islKnot.resume() : islKnot.pause();
    }
    function reset() { [pill, note, keys, b1, b2, ring, islCard].forEach((e) => on(e, false)); cur.style.opacity = 0; cur.style.left = "70%"; cur.style.top = "80%"; txt.textContent = ""; words.textContent = ""; st("idle");
      if (isl.classList.contains("on") || islKnot) { islSet("idle"); islOn(false); } islCard.classList.remove("pressed"); }
    // each scene checks its token, so clicking a tab cuts the current one short
    const scenes = [
      async (w, type) => { pill.querySelector(".dot").style.display = ""; on(pill, true); st("listening");
        await type(words, "open notepad, new note, type hello", 42); st("thinking"); await w(300); on(pill, false); on(note, true); st("ready"); await type(txt, "hello", 90); await w(1500); },
      async (w) => { const dr = desk.getBoundingClientRect(), er = err.getBoundingClientRect();
        cur.style.opacity = 1; await w(60); cur.style.left = ((er.left - dr.left + er.width * 0.6) / dr.width) * 100 + "%"; cur.style.top = ((er.top - dr.top + er.height * 0.5) / dr.height) * 100 + "%"; await w(950);
        on(keys, true); st("thinking"); ring.style.cssText = `left:${er.left - dr.left - 5}px;top:${er.top - dr.top - 5}px;width:${er.width + 10}px;height:${er.height + 10}px`; on(ring, true);
        await w(900); on(keys, false); on(b1, true); st("ready"); await w(2600); },
      async (w) => { st("thinking"); await w(300); on(b2, true); await w(1600); st("ready"); await w(3600); },
      async (w) => { islSet("idle"); islOn(true); await w(1700);
        const said = "You: email Sam the lab report";
        islSet("listening", "Listening", "You:"); for (let n = 5; n <= said.length; n++) { islLine.textContent = said.slice(0, n); islFit(); await w(40); } await w(350);
        islSet("thinking", "Thinking"); await w(700);
        islSet("acting", "Acting", "Writing the email"); await w(1300);
        islSet("acting", "Acting", "Ready to send"); await w(250); islCardAt(); on(islCard, true); await w(2300);
        islCard.classList.add("pressed"); await w(260); on(islCard, false);
        islSet("speaking", "Speaking", "Sent it to Sam."); await w(1700);
        islSet("idle"); await w(1600); },
    ];
    function play(k) {
      const tok = ++run;
      const w = async (ms) => { await sleep(ms); if (tok !== run) throw 0; };
      const type = async (el, s, ms) => { for (let n = 0; n <= s.length; n++) { el.textContent = s.slice(0, n); await w(ms); } };
      (async () => { try { let i = k; while (true) { while (!visible) await w(300); reset(); tab(i); await scenes[i](w, type); i = (i + 1) % scenes.length; } } catch (e) {} })();
    }
    btns.forEach((b, k) => b.addEventListener("click", () => play(k)));
    if (reduce) { tab(2); on(b2, true); return; }
    play(0);
  }

  /* ---------- the orb and its strands ---------- */
  function StrandField(host, opts) {
    const c = document.createElement("canvas"); c.className = "strands"; c.setAttribute("aria-hidden", "true"); host.prepend(c);
    const pen = NusDraw(c), N = 720, g = Math.PI * (3 - Math.sqrt(5)), P = [];   // one draw call a frame (gl2d.js)
    const tag = document.createElement("span"); tag.className = "orbtag"; tag.setAttribute("aria-hidden", "true"); tag.textContent = "NŪS"; c.after(tag);
    let tagAt = "";
    for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = g * i; P.push([Math.cos(t) * r, y, Math.sin(t) * r]); }
    const S = [];
    for (let i = 0; i < opts.per * 2; i++) S.push({ side: i % 2, s: Math.random(), sp: (Math.random() - 0.5) * 2, ox: 0, oy: 0, vx: 0, vy: 0 });
    let W = 1, H = 1, dpr = 1, angle = 0, grow = reduce ? 1 : 0, lean = 0, visible = false, last = performance.now();
    const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 }, w = [1, 1];
    // the canvas stops where the strands end (opts.bottom), so it never sits under the blurred cards
    function size() { const r = host.getBoundingClientRect(); W = r.width; H = opts.bottom ? Math.min(r.height, Math.max(1, opts.bottom())) : r.height; dpr = Math.min(1.5, devicePixelRatio || 1); c.width = W * dpr; c.height = H * dpr; c.style.height = H + "px"; }
    size(); new ResizeObserver(size).observe(host);
    new IntersectionObserver((es) => (visible = es[0].isIntersecting), { threshold: 0 }).observe(c);   // the canvas itself, which stops where the strands end
    addEventListener("pointermove", (e) => { if (!visible || document.hidden) return; const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now(), dt = Math.max(1, now - ptr.t) / 1000;
      ptr.vx = ptr.vx * 0.5 + ((x - ptr.x) / dt) * 0.5; ptr.vy = ptr.vy * 0.5 + ((y - ptr.y) / dt) * 0.5; ptr.x = x; ptr.y = y; ptr.t = now; }, { passive: true });
    const bez = (a, b, c2, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c2 + t * t * t * d; };
    const COL = [[176, 190, 255], [232, 204, 150]];
    NusMotion.loop(c, (now, dt) => {
      if (!visible || document.hidden) return;
      last = now;
      const st = opts.state();
      if (st.scrub) grow = reduce ? 1 : clamp(st.grow);
      else grow += ((reduce ? 1 : st.grow) - grow) * Math.min(1, dt * 2.2);
      lean += ((st.focus === 0 ? -1 : st.focus === 1 ? 1 : 0) - lean) * Math.min(1, dt * 4);
      for (let k = 0; k < 2; k++) { const want = !st.targets[k] ? 0 : st.focus < 0 ? 1 : st.focus === k ? 1.9 : 0.35; w[k] += (want - w[k]) * Math.min(1, dt * 5); }
      if (!reduce) angle += dt * 0.12;
      pen.begin(W, H, dpr);
      const O = st.orb, ox = O.x + lean * 12, oy = O.y, R = O.r, K = 14, damp = Math.exp(-5 * dt), rad = 120;
      for (const s of S) {
        const T = st.targets[s.side]; if (!T || w[s.side] < 0.02) continue;
        const dir = s.side ? 1 : -1, a0 = Math.PI / 2 - dir * (0.35 + 0.5 * ((s.sp + 1) / 2));
        const x0 = ox + Math.cos(a0) * R * 0.96, y0 = oy + Math.sin(a0) * R * 0.96, x3 = T.x + s.sp * T.w * 0.42, y3 = T.y;
        let x1 = x0 + dir * 30 + s.sp * 18, y1 = y0 + (y3 - y0) * 0.45, x2 = x3 - s.sp * 30, y2 = y3 - (y3 - y0) * 0.5;
        // the cursor parts the strands like hair, then they spring back
        const mx = bez(x0, x1, x2, x3, 0.5), my = bez(y0, y1, y2, y3, 0.5), dx = mx + s.ox - ptr.x, dy = my + s.oy - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < rad * rad && d2 > 1) { const d = Math.sqrt(d2), f = (1 - d / rad) ** 2; s.vx += (dx / d) * f * 2200 * dt + ptr.vx * f * 2 * dt; s.vy += (dy / d) * f * 2200 * dt + ptr.vy * f * 2 * dt; }
        s.vx = (s.vx - K * s.ox * dt) * damp; s.vy = (s.vy - K * s.oy * dt) * damp; s.ox += s.vx * dt; s.oy += s.vy * dt;
        x1 += s.ox; y1 += s.oy; x2 += s.ox; y2 += s.oy;
        const a = (0.05 + 0.16 * (1 - Math.abs(s.sp) * 0.6)) * Math.min(1, w[s.side]) * (0.6 + 0.4 * Math.min(2, w[s.side]));
        const col = COL[s.side]; pen.rgb(col[0], col[1], col[2]);
        pen.start(x0, y0, Math.min(0.7, a), 0.6);
        const steps = 26, end = clamp(grow * 1.15 - s.s * 0.15);
        for (let k = 1; k <= steps * end; k++) { const t = k / steps; pen.to(bez(x0, x1, x2, x3, t), bez(y0, y1, y2, y3, t)); }
        pen.stroke();
        if (grow > 0.98 && s.s < (w[s.side] > 1.2 ? 0.16 : 0.05)) {
          const t = ((now / 1000) * 0.28 + s.s * 7) % 1, bx = bez(x0, x1, x2, x3, t), by = bez(y0, y1, y2, y3, t), gl = Math.sin(Math.PI * t);
          pen.rgb(255, 248, 235); pen.glow(bx, by, 0, 6, 0.85 * gl);
        }
      }
      pen.rgb(120, 140, 220); pen.glow(ox, oy, R * 0.1, R * 1.6, 0.12);
      pen.rgb(238, 240, 250);
      const ca = Math.cos(angle), sa = Math.sin(angle), ct = Math.cos(0.32), stt = Math.sin(0.32);
      for (const p of P) {
        const x1 = p[0] * ca + p[2] * sa, z1 = -p[0] * sa + p[2] * ca, y2 = p[1] * ct - z1 * stt, z2 = p[1] * stt + z1 * ct, d = (z2 + 1) / 2, r = 0.5 + d * 1.1;
        pen.rect(ox + x1 * R - r / 2, oy + y2 * R - r / 2, r, r, 0.14 + 0.8 * d * d);
      }
      pen.end();
      // the label over the orb is a page element now; it only moves when the orb leans
      const at = `translate(${Math.round(ox * 2) / 2}px,${Math.round((oy - R - 22) * 2) / 2}px) translateX(-50%)`; if (at !== tagAt) tag.style.transform = tagAt = at;
    });
  }
  /* "Did it install?" under the Companion download (feedback collector 4). It opens by itself a moment
     after the download click. "It did not install" asks one question (what did you see?), shows that
     answer's fix, and "Tell Pranav" sends one note to the same intake feedback.html uses. The note keeps
     the old fixed first sentence so the brief still groups it; while that endpoint is not deployed (or
     cannot be reached) it opens the GitHub issues page. */
  const FEEDBACK_API = "https://xnpkplcjurzwanotmwwt.supabase.co/functions/v1/submit-feedback";
  const FEEDBACK_KEY = "sb_publishable_yBEA9loOsDI9E_HMFIVCRQ_PZvTD8rB";
  const ISSUES = "https://github.com/potlakai/nus-desktop/issues/new?title=";
  const DIDNT_NOTE = "Nūs Companion did not install (from the site's Did it install? box).";
  function siteId() {
    try { let id = localStorage.getItem("nus-site-id"); if (!id) { id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2); localStorage.setItem("nus-site-id", id); } return id; } catch (e) { return null; }
  }
  function mountDidIt(card) {
    const box = card.querySelector("[data-didit]"), dl = card.querySelector("[data-didit-dl]");
    if (!box) return;
    if (dl) dl.addEventListener("click", () => setTimeout(() => { box.open = true; }, 1200));
    const btn = box.querySelector(".didit-no"), note = box.querySelector(".didit-note"), ask = box.querySelector(".didit-ask");
    const chips = [...ask.querySelectorAll("[data-saw]")], tip = ask.querySelector(".didit-tip"), say = ask.querySelector(".didit-say input"), send = ask.querySelector(".didit-send");
    let saw = null;
    btn.addEventListener("click", () => { btn.hidden = true; ask.hidden = false; note.hidden = true; chips[0].focus({ preventScroll: true }); });
    chips.forEach((c) => c.addEventListener("click", () => {
      saw = SAW.find((s) => s[0] === c.dataset.saw);
      chips.forEach((o) => o.setAttribute("aria-pressed", String(o === c)));
      tip.innerHTML = saw[2]; tip.hidden = false;
    }));
    send.addEventListener("click", () => {
      const words = say.value.trim().slice(0, 300);
      const message = DIDNT_NOTE + " Saw: " + (saw ? saw[1] : "not picked") + "." + (words ? " They wrote: " + words : "");
      send.disabled = true; note.hidden = false; note.textContent = "Telling Pranav...";
      const ctrl = window.AbortController ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 6000) : null;
      fetch(FEEDBACK_API, { method: "POST", headers: { apikey: FEEDBACK_KEY, "content-type": "application/json" }, body: JSON.stringify({ source: "site", kind: "bug", message, install_id: siteId(), website: "" }), signal: ctrl ? ctrl.signal : undefined })
        .then((r) => { if (!r.ok) throw new Error("http " + r.status); ask.hidden = true; note.textContent = "Thanks. Pranav got your note. Only what you picked and typed was sent."; })
        .catch(() => { window.open(ISSUES + encodeURIComponent("Nūs Companion did not install" + (saw ? ": " + saw[1] : "")), "_blank", "noopener"); note.textContent = "Opened a GitHub issue page. Say what you saw and Pranav will help."; send.disabled = false; })
        .finally(() => { if (timer) clearTimeout(timer); });
    });
  }
  /* "Mac won't open it?" under the student downloads: opens a moment after a Mac download click, and
     Copy puts the Terminal command (with its trailing space) on the clipboard. */
  function mountMacFix(card) {
    const box = card.querySelector("[data-macfix]");
    if (!box) return;
    card.querySelectorAll("[data-macfix-dl]").forEach((a) => a.addEventListener("click", () => setTimeout(() => { box.open = true; }, 1200)));
    const copy = box.querySelector(".didit-copy"), code = box.querySelector(".didit-cmd code");
    copy.addEventListener("click", () => {
      const done = () => { copy.textContent = "Copied"; setTimeout(() => (copy.textContent = "Copy"), 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code.textContent).then(done, () => getSelection().selectAllChildren(code));
      else getSelection().selectAllChildren(code);
    });
  }
  const rel = (el, host) => { const a = el.getBoundingClientRect(), h = host.getBoundingClientRect(); return { x: a.left - h.left + a.width / 2, y: a.top - h.top, w: a.width }; };

  function mountFork(root) {
    const cards = [...root.querySelectorAll(".card")];
    cards[0].querySelector(".media").innerHTML = companionMedia(); cards[0].querySelector(".copy").innerHTML = companionCopy(); mountDidIt(cards[0]);
    cards[1].querySelector(".media").innerHTML = studentsMedia(); cards[1].querySelector(".copy").innerHTML = studentsCopy(); mountMacFix(cards[1]);
    mountDesk(cards[0]); mountTabs(cards[1].querySelector(".media"));
    let focus = -1, seen = 0;
    // a phone cannot hover: say what a finger can do
    if (matchMedia("(hover: none)").matches) { const p = root.querySelector(".head p"); if (p) p.textContent = p.textContent.replace("Hover one", "Tap one"); }
    cards.forEach((cd, k) => { cd.addEventListener("mouseenter", () => (focus = k)); cd.addEventListener("mouseleave", () => (focus = -1)); cd.addEventListener("focusin", () => (focus = k)); cd.addEventListener("focusout", () => (focus = -1)); });
    new IntersectionObserver((es) => { if (es[0].isIntersecting) seen = 1; }, { threshold: 0.25 }).observe(root.querySelector(".pair"));
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.15 });
    root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    StrandField(root, { per: 90, bottom: () => { const tops = cards.map((cd) => rel(cd.querySelector(".media"), root).y); return Math.abs(tops[0] - tops[1]) > 40 ? rel(cards[0], root).y : Math.min(...tops) + 60; }, /* stacked cards: the strands tuck in behind the first card */ state: () => ({ orb: { x: root.clientWidth / 2, y: root.querySelector(".gap").offsetTop + 96, r: 58 }, targets: cards.map((cd) => rel(cd.querySelector(".media"), root)), focus, grow: entryProgress.has(root) ? entryProgress.get(root) : seen, scrub: entryProgress.has(root) }) });
  }
  const setEntryProgress = (root, value) => value == null ? entryProgress.delete(root) : entryProgress.set(root, clamp(value));
  window.NusWays = { mountFork, mountTabs, mountDesk, StrandField, companionCopy, mountDidIt, mountMacFix, studentsCopy, companionMedia, studentsMedia, rel, setEntryProgress };
})();
