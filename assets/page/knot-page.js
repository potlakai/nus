/* The Knot in the corner of the landing page. It runs the Companion's own engine and does what the Companion does:
   ask it for something, and it flies to the real control on this page, lassos it and says why.
   There is no AI here and nothing you type leaves the page: it matches your words against the asks below and the FAQ.
   Needs knot-site.js and, for typed questions, NusFaq.find. */
(function () {
  if (!window.NusKnot3D) return;
  const $ = (s) => document.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMac = /Mac/.test(navigator.platform || "") && !(navigator.maxTouchPoints > 1);
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const clampTo = (v, a, b) => Math.min(b, Math.max(a, v));
  // fixed names only, never what was typed
  const count = (id) => { try { if (window.goatcounter && goatcounter.count) goatcounter.count({ path: "knot-" + id, title: "Knot: " + id, event: true }); } catch (e) {} };
  const pillEl = () => { const p = $(".nfb-pill"); return p && !p.closest(".nfb-away") ? p : null; };

  /* what it can find. el() is looked up when asked, because most sections build themselves. */
  const FIND = {
    download: isMac
      ? { el: () => $(".fork .card.stu [data-macwait] input[type=email]"), say: "The Companion is Windows only for now. Leave your email here and you get one message when the Mac build is ready." }
      : { el: () => $(".fork .card:not(.stu) [data-didit-dl]"), say: "The Companion. Free, for Windows 10 and 11.", enter: "download it" },
    students: { el: () => $(".fork .card:not(.stu) [data-didit-dl]"), say: "NŪS for Students has moved into the Companion. This is the one download now.", enter: "download it" },
    mac: { el: () => $(".fork .card.stu [data-macwait] input[type=email]"), say: "The Mac build is in the works. Leave your email here and you get one message when it is ready." },
    cost: { el: () => $("#pricing .head h2"), tight: true, aim: .24, say: "The Companion is free. The AI runs on your own key, billed by the provider." },
    setup: { el: () => $("#setup .head h2"), say: "Five steps. Each one shows the screen it happens on." },
    pranav: { el: () => pillEl() || $("#feedback .nfb-msg"), say: "Tell Pranav here. It goes straight to him.", stay: () => !!pillEl(), get enter() { return pillEl() ? "open it" : ""; } },
    questions: { el: () => $("#faq .ask"), say: "Everything else people asked is here. Search it." },
  };
  const WORDS = [
    [/\b(tour|show me around|around|what can you do|what do you do|show off)\b/, "tour"],
    [/\b(mac|macbook|macos|apple)\b/, "mac"],
    [/\b(student|students|school|college|class|classes|homework|syllabus)\b/, "students"],
    [/\b(cost|costs|price|prices|pricing|pay|free|money|pro|subscription|paid|how much)\b/, "cost"],
    [/\b(set ?up|set it up|get started|start|how do i use|tutorial|guide)\b/, "setup"],
    [/\b(feedback|bug|bugs|broken|issue|problem|report|contact|pranav|founder|suggest|suggestion)\b/, "pranav"],
    [/\b(download|install|get it|get nus|companion|windows|exe)\b/, "download"],
  ];
  const TROUBLE = /(won.?t|can.?t|cannot|fail|error|damaged|warn|blocked|virus|unsafe|not working|mishear)/;
  const TOUR = [
    { go: "setup", say: "Setup first. Pick your app and each step shows the screen it happens on." },
    { go: "cost", say: "Both apps are free. You bring your own AI key for the bigger asks." },
    { go: "questions", say: "Stuck on something? Everything people asked is searchable here." },
    { go: "download", say: isMac ? "That’s the tour. On a Mac, this is the one to get." : "That’s the tour. This is the one to get." },
  ];
  const CHIPS = [["download", "Get the free download"], ["cost", "What does it cost?"], ["private", "Is my data private?"], ["tour", "Show me around"], ["pranav", "Tell Pranav something"]];

  function start() {
    const box = document.createElement("div"); box.className = "pk-box";
    box.innerHTML = '<button type="button" class="pk-knot" aria-label="Ask the Knot where anything is on this page" aria-expanded="false" aria-controls="pkAsk"><canvas></canvas><span class="pk-hit"></span></button>';
    const ask = document.createElement("div"); ask.className = "pk-ask"; ask.id = "pkAsk";
    ask.innerHTML = '<div class="pk-say" role="status" aria-live="polite"></div>' +
      '<p class="pk-note">Here I only know this page. The Companion does this on your whole screen.</p>' +
      '<div class="pk-chips">' + CHIPS.map(([id, label]) => `<button type="button" class="pk-chip" data-ask="${id}">${label}</button>`).join("") + "</div>" +
      '<form class="pk-line" autocomplete="off"><input type="text" maxlength="120" aria-label="What do you need help with?" placeholder="What do you need help with?" spellcheck="false">' +
      '<button type="submit" class="pk-send" aria-label="Ask"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button></form>';
    const hint = document.createElement("div"); hint.className = "pk-hint"; hint.setAttribute("aria-hidden", "true"); hint.textContent = "What do you need help with?";
    const bub = document.createElement("div"); bub.className = "pk-bub"; bub.setAttribute("role", "status");
    bub.innerHTML = '<div class="k"></div><div class="t"></div><div class="h"></div>';
    const thread = document.createElement("canvas"); thread.className = "pk-thread"; thread.setAttribute("aria-hidden", "true");
    const ring = document.createElement("div"); ring.className = "pk-ring"; ring.setAttribute("aria-hidden", "true");
    document.body.append(thread, ring, box, ask, hint, bub);

    const btn = box.querySelector(".pk-knot"), input = ask.querySelector("input"), say = ask.querySelector(".pk-say");
    const knot = NusKnot3D.mount(box.querySelector("canvas"), { thread });
    if (!knot || !knot.strand) { [box, ask, hint, bub, thread, ring].forEach((n) => n.remove()); return; }
    const strand = knot.strand;

    let mode = "home";    // home | open | run | hold | drag
    let runId = 0, heldAt = 0, holdTimer = 0, keyboard = false, cancelScroll = null;
    const setExpanded = (on) => btn.setAttribute("aria-expanded", on ? "true" : "false");
    const showHint = (on) => hint.classList.toggle("on", on);
    const clearHelp = () => { bub.classList.remove("on"); ring.classList.remove("on"); };
    let restTimer = 0, leaning = false;
    const rest = () => { clearTimeout(restTimer); restTimer = setTimeout(() => { if (mode === "home" && !leaning && !knot.isTravelling()) knot.sleep(); else rest(); }, 5000); };

    /* ---------- the ask line ---------- */
    function openAsk(typeNow) {
      mode = "open"; showHint(false); say.textContent = ""; ask.classList.add("on"); setExpanded(true); knot.resetPose(); knot.setState("ready"); count("open");
      if (typeNow) input.focus({ preventScroll: true });
    }
    function closeAsk(focusKnot) {
      ask.classList.remove("on"); setExpanded(false);
      if (mode === "open") { mode = "home"; knot.setState("idle"); rest(); }
      if (focusKnot) btn.focus({ preventScroll: true });
    }

    /* ---------- what you asked ---------- */
    function understand(text) {
      const q = text.toLowerCase().replace(/ū/g, "u").trim();
      if (!q) return null;
      if (/^(hi|hey|hello|yo|sup)\b/.test(q)) return { reply: "Hi. Ask me where anything is on this page, and I’ll take you there." };
      if (/\b(what is|what's|whats|what are) (nus|this|it)\b|^nus\??$/.test(q)) return { reply: "It does the busywork you ask for and teaches you the rest. Want to see the free download?" };
      const faq = window.NusFaq && NusFaq.find ? NusFaq.find(q) : null;
      if (TROUBLE.test(q) && faq) return { faq };
      for (const [re, id] of WORDS) if (re.test(q)) return id === "tour" ? { tour: true } : { go: id };
      if (faq) return { faq };
      return { reply: "I can’t find that on this page. Try one of these, or tell Pranav.", miss: true };
    }
    function askFor(what) {
      if (!what) return;
      if (what.reply) { say.textContent = what.reply; knot.gesture("nudge"); count(what.miss ? "miss" : "reply"); return; }
      input.value = ""; closeAsk();
      if (what.tour) { count("tour"); tour(); return; }
      if (what.faq) { count("faq"); guide({ el: () => what.faq.row.querySelector(".qh"), prepare: () => what.faq.open(), kicker: "Answered", say: "Opened the answer for you.", hint: true }); return; }
      count(what.go); guide(Object.assign({ hint: true }, FIND[what.go]));
    }
    function chip(id) {
      if (id === "tour") return { tour: true };
      if (id === "private") { const faq = window.NusFaq && NusFaq.find ? NusFaq.find("is it local privacy") : null; return faq ? { faq } : { go: "questions" }; }
      return { go: id };
    }

    /* ---------- going there ---------- */
    const scrollRange = (top) => clampTo(top, 0, Math.max(0, document.documentElement.scrollHeight - innerHeight));
    const aimFor = (el, at) => { const r = el.getBoundingClientRect(); return scrollRange(scrollY + r.top + r.height / 2 - innerHeight * (at || .46)); };
    function glide(to, ms) {
      return new Promise((done) => {
        const from = scrollY;
        if (reduce || Math.abs(to - from) < 2) { scrollTo({ top: to, behavior: "instant" }); done(true); return; }
        const t0 = performance.now(); let raf = 0;
        cancelScroll = () => { cancelAnimationFrame(raf); cancelScroll = null; done(false); };
        const step = (now) => {
          const u = Math.min(1, (now - t0) / ms), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
          scrollTo({ top: from + (to - from) * e, behavior: "instant" });
          if (u < 1) raf = requestAnimationFrame(step); else { cancelScroll = null; done(true); }
        };
        raf = requestAnimationFrame(step);
      });
    }
    // the page moves things as it scrolls, so look again once it has stopped and correct what is left
    async function bringIntoView(el, id, at) {
      const dist = Math.abs(aimFor(el, at) - scrollY);
      if (!(await glide(aimFor(el, at), clampTo(300 + dist * 0.06, 380, 700)))) return false;
      for (let i = 0; i < 3; i++) {
        await wait(70);
        if (id !== runId) return false;
        const off = aimFor(el, at) - scrollY;
        if (Math.abs(off) < 18) break;
        if (!(await glide(scrollY + off, 220))) return false;
      }
      // sections fade and slide in as they arrive: wait until the control has stopped moving, or the lasso lands where it was
      let last = el.getBoundingClientRect();
      for (let i = 0, still = 0; i < 24 && still < 2 && !reduce; i++) {
        await wait(60);
        if (id !== runId) return false;
        const now = el.getBoundingClientRect();
        still = Math.abs(now.top - last.top) + Math.abs(now.left - last.left) + Math.abs(now.width - last.width) < .5 ? still + 1 : 0;
        last = now;
      }
      return true;
    }
    // beside the control, in the first corner that is on screen and clear of it
    function landingFor(r) {
      const W = innerWidth, H = innerHeight, m = 52, dx = 66, dy = 46;
      const spots = [[r.right + dx, r.bottom + dy], [r.left - dx, r.bottom + dy], [r.right + dx, r.top - dy], [r.left - dx, r.top - dy]];
      for (const [x, y] of spots) if (x > m && x < W - m && y > m && y < H - m) return { x, y };
      return { x: clampTo(r.right + dx, m, W - m), y: clampTo(r.bottom + dy, m, H - m) };
    }
    function placeBubble(r, spot) {
      const b = bub.getBoundingClientRect(), W = innerWidth, H = innerHeight, gap = 18;
      let x = clampTo(r.left + r.width / 2 - b.width / 2, 12, W - b.width - 12);
      let y = r.top - b.height - gap;
      if (y < 12) y = r.bottom + gap;
      // keep clear of the Knot where it landed
      const hits = spot.x + 56 > x && spot.x - 56 < x + b.width && spot.y + 50 > y && spot.y - 50 < y + b.height;
      if (hits) x = spot.x < W / 2 ? Math.min(W - b.width - 12, spot.x + 62) : Math.max(12, spot.x - 62 - b.width);
      bub.style.translate = `${Math.round(x)}px ${Math.round(clampTo(y, 12, H - b.height - 12))}px`;
    }
    function lassoOn(el, tight) {
      return new Promise((done) => {
        let b = el.getBoundingClientRect();
        if (tight) { const words = document.createRange(); words.selectNodeContents(el); b = words.getBoundingClientRect(); }   // a headline's box is as wide as the page; go round its words
        const r = { x: b.left, y: b.top, w: b.width, h: b.height }, spot = landingFor(b);
        // reduced motion: nothing flies. A still ring marks the control and the Knot stays home.
        if (reduce) {
          ring.style.cssText = `left:${b.left - 8}px;top:${b.top - 8}px;width:${b.width + 16}px;height:${b.height + 16}px`;
          ring.classList.add("on");
          done({ rect: b, spot: { x: -999, y: -999 } });
          return;
        }
        let finished = false; const finish = () => { if (!finished) { finished = true; done({ rect: b, spot }); } };
        strand.arrive(finish); setTimeout(finish, reduce ? 0 : 2400);
        strand.lasso(r, spot);
      });
    }
    function saidBy(item, skipped) {
      bub.querySelector(".k").textContent = item.kicker || "Found it";
      bub.querySelector(".t").textContent = item.say;
      const screens = Math.round(skipped / innerHeight), lines = [];
      if (item.hint && screens >= 1) lines.push(`One ask. ${screens} ${screens === 1 ? "screen" : "screens"} of scrolling skipped.`);
      if (item.hint && keyboard && item.enter) lines.push(`Press Enter to ${item.enter}.`);
      bub.querySelector(".h").textContent = lines.join(" ");
    }
    // one stop: think, go there, lasso, explain. Resolves false if it could not.
    async function stop(item, id) {
      const el = item.el();
      if (!el) return false;
      const y0 = scrollY;
      if (item.prepare) item.prepare();
      const rising = el.closest(".reveal"); if (rising) rising.classList.add("in");   // start its entrance now, so it is done when we arrive
      knot.setState("thinking");
      if (!(item.stay && item.stay()) && !(await bringIntoView(el, id, item.aim))) return false;
      if (id !== runId) return false;
      const { rect, spot } = await lassoOn(el, item.tight);
      if (id !== runId) return false;
      saidBy(item, Math.abs(scrollY - y0));
      knot.setState("ready"); knot.gesture("done");
      placeBubble(rect, spot);
      bub.classList.add("on");
      heldAt = scrollY; mode = "hold";
      return true;
    }
    async function guide(item) {
      const id = ++runId; mode = "run"; showHint(false); clearTimeout(holdTimer);
      const ok = await stop(item, id);
      if (id !== runId) return;
      if (!ok) { goHome(); return; }
      const el = item.el();
      if (keyboard && el && el.matches("a,button,textarea")) el.focus({ preventScroll: true });
      holdTimer = setTimeout(goHome, 14000);
    }
    async function tour() {
      const id = ++runId; showHint(false); clearTimeout(holdTimer); keyboard = false;
      for (let i = 0; i < TOUR.length; i++) {
        mode = "run"; clearHelp();
        const s = TOUR[i], ok = await stop(Object.assign({}, FIND[s.go], { say: s.say, kicker: `${i + 1} of ${TOUR.length}` }), id);
        if (id !== runId) return;
        if (!ok) { goHome(); return; }
        if (i < TOUR.length - 1) { await wait(2600); if (id !== runId) return; }
      }
      holdTimer = setTimeout(goHome, 14000);
    }
    // you scrolled, clicked away or pressed Esc: everything winds in and it flies back
    function goHome() {
      runId++; clearTimeout(holdTimer); if (cancelScroll) cancelScroll();
      clearHelp();
      mode = "home"; knot.setState("idle"); strand.flyHome(); rest();
    }

    /* ---------- touching it ---------- */
    let press = null;
    btn.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      btn.setPointerCapture(e.pointerId);
      press = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, vx: 0, vy: 0, dragged: false };
    });
    btn.addEventListener("pointermove", (e) => {
      if (!press) return;
      const now = performance.now(), dt = Math.max(1, now - press.t);
      if (!press.dragged && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) return;
      if (!press.dragged) {
        press.dragged = true;
        if (mode === "hold" || mode === "run") { runId++; clearTimeout(holdTimer); if (cancelScroll) cancelScroll(); clearHelp(); strand.rewind(); }
        closeAsk(); mode = "drag"; showHint(false); btn.classList.add("held"); knot.setState("ready"); knot.resetPose(); knot.cancelTravel(); count("drag");
      }
      press.vx = (e.clientX - press.lx) / dt * 1000; press.vy = (e.clientY - press.ly) / dt * 1000; press.lx = e.clientX; press.ly = e.clientY; press.t = now;
      strand.placeAt({ x: clampTo(e.clientX, 10, innerWidth - 10), y: clampTo(e.clientY, 10, innerHeight - 10) });
      knot.setDrag({ vx: press.vx, vy: press.vy });
    });
    function letGo() {
      if (!press) return;
      const p = press; press = null;
      if (!p.dragged) return;
      btn.classList.remove("held"); knot.setDrag(null);
      mode = "home"; knot.setState("idle");
      strand.flyHome({ v0: { x: clampTo(p.vx, -2400, 2400) * .35, y: clampTo(p.vy, -2400, 2400) * .35 } }); rest();
      btn.dataset.dragged = "1"; setTimeout(() => { delete btn.dataset.dragged; }, 60);
    }
    btn.addEventListener("pointerup", letGo); btn.addEventListener("pointercancel", letGo);
    btn.addEventListener("click", (e) => {
      if (btn.dataset.dragged) return;
      const r = btn.getBoundingClientRect();
      knot.gesture("poke", { dx: (e.clientX - (r.left + r.width / 2)) / (r.width / 2) || 0, dy: (e.clientY - (r.top + r.height / 2)) / (r.height / 2) || 0 });
      if (mode === "hold" || mode === "run") { goHome(); return; }
      if (mode === "open") { closeAsk(true); return; }
      keyboard = e.detail === 0;
      openAsk(matchMedia("(hover:hover)").matches || keyboard);
    });
    // it wakes when you come close and leans toward you
    btn.addEventListener("pointerenter", (e) => { if (mode === "home" && e.pointerType === "mouse") { knot.setState("ready"); showHint(false); } });
    btn.addEventListener("pointerleave", (e) => { if (mode === "home" && e.pointerType === "mouse") { knot.setState("idle"); rest(); } });
    let leanFrame = 0;
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || leanFrame) return;
      leanFrame = requestAnimationFrame(() => {
        leanFrame = 0;
        if (mode !== "home" || !box.classList.contains("in") || knot.isTravelling()) { if (leaning) { leaning = false; knot.resetPose(); } return; }
        const r = btn.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy);
        if (d < 320 && d > 24) { leaning = true; clearTimeout(restTimer); const k = .3 * (1 - d / 320) / d; knot.setPose({ leanX: dx * k, leanY: dy * k }); }
        else if (leaning) { leaning = false; knot.resetPose(); rest(); }
      });
    }, { passive: true });

    /* ---------- the ask line's controls ---------- */
    ask.addEventListener("click", (e) => {
      const c = e.target.closest(".pk-chip"); if (!c) return;
      keyboard = e.detail === 0;
      askFor(chip(c.dataset.ask));
    });
    ask.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      keyboard = true;
      askFor(understand(input.value));
    });

    /* ---------- letting go of it ---------- */
    addEventListener("keydown", (e) => {
      if (e.key === "Escape") { if (mode === "hold" || mode === "run") { goHome(); btn.focus({ preventScroll: true }); } else if (mode === "open") closeAsk(true); return; }
      if (mode === "run" && /^(Arrow|Page|Home|End| )/.test(e.key) && e.target !== input) goHome();
    });
    const tookOver = () => { if (mode === "run") goHome(); };
    addEventListener("wheel", tookOver, { passive: true });
    addEventListener("touchmove", tookOver, { passive: true });
    addEventListener("pointerdown", (e) => {
      if (box.contains(e.target) || ask.contains(e.target)) return;
      if (mode === "open") closeAsk();
      else if (mode === "hold" || mode === "run") goHome();
    });
    addEventListener("scroll", () => {
      showHint(false);
      if (mode === "hold" && Math.abs(scrollY - heldAt) > 50) goHome();
    }, { passive: true });
    addEventListener("resize", () => {
      if (mode === "hold" || mode === "run") { runId++; clearTimeout(holdTimer); if (cancelScroll) cancelScroll(); clearHelp(); mode = "home"; knot.setState("idle"); }
      strand.resetHome();
    });

    /* ---------- where it sits ---------- */
    // the pill steps aside while the feedback form is on screen: the Knot drops into its place
    const widget = $(".nfb-widget");
    if (widget) { const sync = () => box.classList.toggle("low", widget.classList.contains("nfb-away")); new MutationObserver(sync).observe(widget, { attributes: true, attributeFilter: ["class"] }); sync(); }
    // the lesson has its own Knot on stage: one Knot on screen at a time
    const stage = document.getElementById("aStage");
    if (stage && window.IntersectionObserver) new IntersectionObserver((es) => {
      es.forEach((en) => { box.classList.toggle("duck", en.isIntersecting); if (en.isIntersecting) { showHint(false); if (mode === "open") closeAsk(); } });
    }, { threshold: .08 }).observe(stage);

    /* ---------- how it arrives: it flies in from the edge, once, then settles above the pill ---------- */
    setTimeout(() => {
      box.classList.add("in");
      if (reduce) { knot.gesture("arrive"); return; }
      const r = btn.getBoundingClientRect();
      strand.placeAt({ x: innerWidth + 90, y: r.top + r.height / 2 - 120 });
      knot.setState("ready");
      strand.flyHome({ onDone() {
        if (mode !== "home") return;
        knot.setState("idle"); knot.gesture("arrive");
        let seen = false; try { seen = sessionStorage.getItem("pkHint") === "1"; sessionStorage.setItem("pkHint", "1"); } catch (e) {}
        if (!seen && scrollY < innerHeight * .5) { showHint(true); setTimeout(() => showHint(false), 5200); }
        rest();
      } });
    }, reduce ? 300 : 1500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
