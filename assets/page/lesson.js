/* First time / Next time / Later, option A "Try it yourself", v2: the lesson runs in a real-looking
   spreadsheet inside a Mac-style window, guided by the actual NŪS Companion pieces: the chrome Knot
   (companion/knot3d.js), its thread (companion/strand.js), the glass guide bubble and the
   "Remember this for next time?" chip, all copied from nus-desktop-day1's renderer.
   Round 1: the Knot thinks, the thread unwinds to AutoSum, the bubble explains. Keep it.
   Round 2: the Knot shows the saved hint ("Spreadsheet: 1 saved") and a faint ring. Round 3: nothing.
   Usage: new NusLesson(sectionEl)  (needs #aStage, #aStatus, .step cards and #strandLayer) */
(function () {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SHEETS = [
    { file: "Trips.xlsx", head: ["Trip", "Cost"], rows: [["Lisbon", 420], ["Kyoto", 910], ["Denver", 260], ["Oaxaca", 380]], unit: "$", dp: 0, fmt: "Currency" },
    { file: "Groceries.xlsx", head: ["Item", "Price"], rows: [["Oat milk", 4.2], ["Rice", 6.5], ["Apples", 3.8], ["Coffee", 9.9]], unit: "$", dp: 2, fmt: "Currency" },
    { file: "Study hours.xlsx", head: ["Day", "Hours"], rows: [["Mon", 2.5], ["Tue", 1.5], ["Wed", 3], ["Thu", 2]], unit: "", dp: 1, fmt: "Number" },
  ];
  const HELP = ["full", "hint", "none"];
  const COLS = ["A", "B", "C", "D", "E", "F", "G"], ROWS = 10;
  const fmt = (v, s) => s.unit + v.toLocaleString("en-US", { minimumFractionDigits: s.dp, maximumFractionDigits: s.dp });
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

  const I = {
    paste: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 4.5h6v2.5H9z"/><path d="M9 11h6M9 14.5h4"/></svg>',
    sort: '<svg viewBox="0 0 24 24"><path d="M7 5v14M4 16l3 3 3-3"/><path d="M13 7h7M13 12h5M13 17h3"/></svg>',
    filter: '<svg viewBox="0 0 24 24"><path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 20h16"/><rect x="6" y="11" width="3" height="7"/><rect x="11" y="6" width="3" height="12"/><rect x="16" y="13" width="3" height="5"/></svg>',
    sigma: '<svg viewBox="0 0 24 24"><path d="M17 5H6.5l6 7-6 7H17"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>',
    center: '<svg viewBox="0 0 24 24"><path d="M4 6h16M7 10h10M4 14h16M7 18h10"/></svg>',
    wrap: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h13a3 3 0 010 6h-4m0 0l2-2m-2 2l2 2M4 18h5"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 4v11M8 8l4-4 4 4"/><path d="M6 12v6a2 2 0 002 2h8a2 2 0 002-2v-6"/></svg>',
    doc: '<svg viewBox="0 0 16 16"><rect x="2.5" y="1.5" width="11" height="13" rx="1.5" fill="#2f9e6a" stroke="none"/><path d="M5 5h6M5 8h6M5 11h6M8 5v6" stroke="#dff5ea" stroke-width="1"/></svg>',
  };

  function buildWindow() {
    const w = document.createElement("div");
    w.className = "mac";
    w.innerHTML = `
      <div class="mac-title">
        <div class="lights" aria-hidden="true"><i class="r"></i><i class="y"></i><i class="g"></i></div>
        <div class="mac-name"><span class="doc">${I.doc}</span><span data-file></span><span class="edited">Edited</span></div>
        <div class="mac-right" aria-hidden="true"><span class="ico">${I.share}</span></div>
      </div>
      <div class="ribbon-tabs" aria-hidden="true"><span class="on">Home</span><span>Insert</span><span>Draw</span><span>Page Layout</span><span>Formulas</span><span>Data</span><span>Review</span><span>View</span></div>
      <div class="ribbon" role="group" aria-label="Spreadsheet tools" tabindex="-1">
        <button type="button" class="rb big" data-t="Paste">${I.paste}<span>Paste</span></button>
        <div class="sep"></div>
        <div class="grp font">
          <div class="row"><span class="sel w1">Aptos</span><span class="sel w2">12</span></div>
          <div class="row"><button type="button" class="rb sm" data-t="Bold"><b>B</b></button><button type="button" class="rb sm" data-t="Italic"><i>I</i></button><button type="button" class="rb sm" data-t="Underline"><u>U</u></button><span class="swatch"></span></div>
        </div>
        <div class="sep"></div>
        <div class="grp align"><div class="row"><span class="ico">${I.left}</span><span class="ico">${I.center}</span><span class="ico">${I.wrap}</span></div><div class="row"><span class="sel w3" data-numfmt></span><span class="ico txt">$</span><span class="ico txt">%</span></div></div>
        <div class="sep"></div>
        <button type="button" class="rb big" data-t="AutoSum">${I.sigma}<span>AutoSum</span></button>
        <button type="button" class="rb big" data-t="Sort">${I.sort}<span>Sort</span></button>
        <button type="button" class="rb big" data-t="Filter">${I.filter}<span>Filter</span></button>
        <div class="sep"></div>
        <button type="button" class="rb big" data-t="Chart">${I.chart}<span>Chart</span></button>
      </div>
      <div class="fbar"><span class="namebox">B6</span><span class="fx" aria-hidden="true">fx</span><span class="formula" data-formula></span></div>
      <div class="gridwrap">
        <table class="grid" aria-label="Spreadsheet">
          <thead><tr><th class="corner"></th>${COLS.map((c) => `<th class="ch${c === "B" ? " hot" : ""}">${c}</th>`).join("")}</tr></thead>
          <tbody>${Array.from({ length: ROWS }, (_, r) => `<tr><th class="rh${r === 5 ? " hot" : ""}">${r + 1}</th>${COLS.map((c) => `<td data-c="${c}${r + 1}"></td>`).join("")}</tr>`).join("")}</tbody>
        </table>
        <div class="selbox" aria-hidden="true"><i></i></div>
        <svg class="ants" aria-hidden="true"><rect/></svg>
      </div>
      <div class="sheetbar"><span class="tab on">Sheet1</span><span class="plus" aria-hidden="true">+</span><span class="grow"></span><span class="status" data-status>Ready</span><span class="zoom" aria-hidden="true">100%</span></div>`;
    return w;
  }

  function NusLesson(root) {
    const stage = root.querySelector("#aStage"), status = root.querySelector("#aStatus");
    const steps = [...root.querySelectorAll(".step")], strandCanvas = document.getElementById("strandLayer");
    const win = buildWindow(); stage.prepend(win);
    const $ = (s) => win.querySelector(s), cell = (id) => win.querySelector(`[data-c="${id}"]`);
    const bubble = stage.querySelector(".gb"), chip = stage.querySelector(".keep"), khint = stage.querySelector(".khint"), hring = stage.querySelector(".hring");
    const knotEl = stage.querySelector(".knot canvas");

    // the real Companion Knot and its thread
    const knot = window.NusKnot3D ? NusKnot3D.mount(knotEl, { ground: false, scale: 0.285, focusGate: false }) : null;
    let arriveCb = null;
    const strand = window.NusStrand && knot ? NusStrand.mount(strandCanvas, knot, { onArrive() { const f = arriveCb; arriveCb = null; f && f(); } }) : null;
    const knotState = (s) => knot && knot.setState && knot.setState(s);
    // off screen the thread stops drawing (it would stretch to a button far off the page), and picks up on return
    let ticking = false, away = false;
    new IntersectionObserver((es) => { away = !es[0].isIntersecting; strandCanvas.style.visibility = away ? "hidden" : "";
      if (!strand) return; if (away) strand.pause(); else if (strand.getState() !== "idle") { strand.resume(); strand.redraw(rectOf(target())); place(); } }, { rootMargin: "120px" }).observe(stage);
    addEventListener("scroll", () => { if (!away && !ticking && strand && strand.getState() !== "idle") { ticking = true; requestAnimationFrame(() => { ticking = false; strand.redraw(rectOf(target())); place(); }); } }, { passive: true });
    addEventListener("resize", () => requestAnimationFrame(() => { place(); markSelection(); }));

    let r = 0, start = 0, times = [], busy = false, revealed = false, tick = 0, sheet = SHEETS[0];
    const target = () => $('[data-t="AutoSum"]');

    // glass pieces sit where the app puts them: the bubble by the thread tip, the chips by the Knot
    function place() {
      const sr = stage.getBoundingClientRect(), tr = target().getBoundingClientRect();
      // the thread arrives from the Knot at the lower right, so the bubble opens on the other side
      if (sr.width < 700) { bubble.style.left = "12px"; const r7 = cell("A7").getBoundingClientRect(); bubble.style.top = `${r7.top - sr.top + 2}px`; }   // phones: under the ribbon, over the empty rows
      else { bubble.style.left = `${Math.max(12, tr.left - sr.left - bubble.offsetWidth - 14)}px`; bubble.style.top = `${tr.top - sr.top + tr.height / 2 - bubble.offsetHeight / 2}px`; }
      hring.style.left = `${tr.left - sr.left - 4}px`; hring.style.top = `${tr.top - sr.top - 4}px`;
      hring.style.width = `${tr.width + 8}px`; hring.style.height = `${tr.height + 8}px`;
    }
    function show(el, on) { el.classList.toggle("on", on); el.setAttribute("aria-hidden", on ? "false" : "true"); }

    function loadSheet() {
      sheet = SHEETS[r];
      $("[data-file]").textContent = sheet.file; $("[data-numfmt]").textContent = sheet.fmt;
      win.querySelectorAll(".grid td").forEach((td) => { td.textContent = ""; td.className = ""; });
      cell("A1").textContent = sheet.head[0]; cell("B1").textContent = sheet.head[1]; cell("A1").className = cell("B1").className = "hd";
      sheet.rows.forEach((row, i) => { cell("A" + (i + 2)).textContent = row[0]; const b = cell("B" + (i + 2)); b.textContent = fmt(row[1], sheet); b.className = "num"; });
      cell("A6").textContent = "Total"; cell("A6").className = "hd"; cell("B6").className = "num tot";
      $("[data-formula]").textContent = ""; $("[data-status]").textContent = "Ready";
      win.classList.remove("summing");
      win.querySelectorAll(".rb").forEach((b) => (b.disabled = false));
      requestAnimationFrame(markSelection);
    }
    // layout offsets, not screen rects, so the window's scale-in can't throw the boxes off
    function box(id) { const c = cell(id), t = c.closest("table"); return { x: t.offsetLeft + c.offsetLeft, y: t.offsetTop + c.offsetTop, w: c.offsetWidth, h: c.offsetHeight }; }
    function markSelection() {
      const b6 = box("B6"), b2 = box("B2"), b5 = box("B5"), h = b5.y + b5.h - b2.y;
      $(".selbox").style.cssText = `left:${b6.x - 1}px;top:${b6.y - 1}px;width:${b6.w + 1}px;height:${b6.h + 1}px`;
      const ants = $(".ants"); ants.style.cssText = `left:${b2.x}px;top:${b2.y}px;width:${b2.w}px;height:${h}px`;
      const rc = ants.querySelector("rect"); rc.setAttribute("x", 1); rc.setAttribute("y", 1); rc.setAttribute("width", b2.w - 2); rc.setAttribute("height", h - 2);
    }

    function renderSteps() {
      steps.forEach((s, i) => { s.classList.toggle("on", i === r); s.classList.toggle("done", times[i] != null); s.toggleAttribute("aria-current", i === r); });
    }
    function say(html) { status.innerHTML = html; }
    function begin() { if (!start && revealed && !busy) { start = performance.now(); clock(); } }
    function clock() {
      cancelAnimationFrame(tick);
      const t = steps[r].querySelector(".t");
      (function f() { if (!start) return; t.textContent = ((performance.now() - start) / 1000).toFixed(1) + " s"; tick = requestAnimationFrame(f); })();
    }

    async function help() {
      const mode = HELP[r];
      place();
      if (mode === "full") {
        knotState("thinking");
        await wait(650);
        arriveCb = () => { knotState("ready"); place(); show(bubble, true); };
        // started after the visitor already scrolled past: hold it until the lesson is back on screen
        if (strand) { strand.setTarget(rectOf(target())); if (away) strand.pause(); } else arriveCb();
      } else if (mode === "hint") {
        knotState("ready");
        show(khint, true); await wait(350); show(hring, true);
        setTimeout(() => knotState("idle"), 1200);
      } else knotState("idle");
    }
    function rectOf(el) { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }
    function clearHelp() {
      show(bubble, false); show(hring, false); show(khint, false);
      if (strand && strand.getState() !== "idle") strand.rewind();
      knotState("idle");
    }

    function round(focus) {
      busy = false; start = 0; loadSheet(); renderSteps(); show(chip, false);
      steps[r].querySelector(".t").textContent = "";
      say(r === 0 ? "Your turn: total the Cost column." : r === 1 ? "New sheet, same job." : "Last one. No help this time.");
      if (revealed) help();
      if (focus) $(".ribbon").focus({ preventScroll: true });   // into the app, without lighting any one button
    }

    win.addEventListener("pointerenter", begin);
    win.addEventListener("focusin", begin);
    win.addEventListener("click", (e) => {
      const b = e.target.closest(".rb"); if (!b || busy || !revealed) return;
      begin();
      if (b.dataset.t !== "AutoSum") { b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); return; }
      finish();
    });

    async function finish() {
      busy = true; cancelAnimationFrame(tick);
      const secs = (performance.now() - start) / 1000; times[r] = secs; start = 0;
      steps[r].querySelector(".t").textContent = secs.toFixed(1) + " s";
      win.querySelectorAll(".rb").forEach((x) => (x.disabled = true));
      clearHelp();
      // what the app does: formula in the bar, marching ants round the range, then the value
      const f = "=SUM(B2:B5)", fb = $("[data-formula]"), b6 = cell("B6");
      win.classList.add("summing");
      for (let i = 1; i <= f.length; i++) { fb.textContent = f.slice(0, i); b6.textContent = f.slice(0, i); if (!reduce) await wait(22); }
      await wait(380);
      win.classList.remove("summing");
      const sum = sheet.rows.reduce((s, x) => s + x[1], 0), row6 = b6.parentElement;
      row6.classList.remove("hit"); void row6.offsetWidth; row6.classList.add("hit");
      $("[data-status]").textContent = "Sum: " + fmt(sum, sheet);
      if (reduce) b6.textContent = fmt(sum, sheet);
      else { const t0 = performance.now(); await new Promise((res) => (function step(now) { const k = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - k, 3); b6.textContent = fmt(k < 1 ? sum * e : sum, sheet); if (k < 1) requestAnimationFrame(step); else res(); })(t0)); }
      renderSteps();
      if (r === 0) {
        await wait(250); show(chip, true);
        say(`Done in <b>${secs.toFixed(1)} s</b>. Keep it and see what next time looks like.`);
        chip.querySelector(".yes").focus({ preventScroll: true });
      } else if (r === 1) {
        say(`Done in <b>${secs.toFixed(1)} s</b>.<br><button type="button" class="cta" data-go>Later</button>`);
        status.querySelector("[data-go]").focus({ preventScroll: true });
      } else {
        say(`<span class="times">${times.map((t, i) => `<span><em>${["First", "Next", "Later"][i]}</em> ${t.toFixed(1)} s</span>`).join('<span class="arr">→</span>')}</span>You did the last one alone. That’s the point.<br><button type="button" class="cta" data-again>Try again</button>`);
        status.querySelector("[data-again]").focus({ preventScroll: true });
      }
    }
    status.addEventListener("click", (e) => {
      if (e.target.closest("[data-go]")) { r++; round(true); }
      if (e.target.closest("[data-again]")) { r = 0; times = []; steps.forEach((s) => (s.querySelector(".t").textContent = "")); round(true); }
    });
    chip.querySelector(".yes").addEventListener("click", () => { chip.querySelector("span").textContent = "Kept for next time."; setTimeout(() => { r = 1; round(true); }, reduce ? 0 : 650); });
    chip.querySelector(".no").addEventListener("click", () => { show(chip, false); say(`Skipped. <button type="button" class="cta" data-go>Next time</button>`); status.querySelector("[data-go]").focus({ preventScroll: true }); });

    round(false);
    // wake up when the window is on screen: it settles in, the Knot thinks, the thread goes out
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect(); stage.classList.add("in");
      setTimeout(() => { revealed = true; markSelection(); help(); }, reduce ? 0 : 700);
    }, { threshold: 0.6 });
    io.observe(win);
  }
  window.NusLesson = NusLesson;
})();
