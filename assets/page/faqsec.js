/* FAQ, option B "Ask it" (picked 2026-09-30). A Companion-style ask pill with the real Knot; typing filters the
   ten real-comment questions, highlights the words and opens the best match as a NŪS answer. All ten show when
   empty. Answers updated to shipped facts on 2026-09-30. Usage: NusFaq.mount(el)  (el is an empty .faqsec) */
(function () {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FEEDBACK = "feedback.html";
  const K = (...k) => k.map((x) => `<kbd>${x}</kbd>`).join(" ");
  const FAQ = [
    { q: "Which one should I download?", k: "download which companion students choose pick", a: "If you want help with anything on your computer, get <b>NŪS Companion</b>. If you’re a student and want your semester organized, get <b>NŪS for Students</b>. The Companion is already inside it." },
    { q: "Is NŪS only for students?", k: "students only work everyone", a: "No. Students are where NŪS starts. NŪS Companion works for anyone on Windows, and the bigger vision is one companion across school, work and life." },
    { q: "Is it local? What leaves my computer?", k: "local privacy private data server cloud leave", a: "Your notes, routines, transcripts and keys stay on your PC. The words of a voice command go to TypeSafe so Jev can pick the action, and questions go to the AI provider you chose, on your own key. Folders you turn on share short excerpts the same way when they help answer. There is no NŪS server in between, and the Companion has no account." },
    { q: "Is it only Jev?", k: "jev model ai gemini claude typesafe", a: "No. Jev is the reflexes: it picks one action from a fixed set, like opening an app. Answers and writing come from a bigger model on your own key, such as Gemini or Claude. Pointing at your screen uses Claude." },
    { q: "What does it cost?", k: "cost price free pro money pay", a: "NŪS Companion is free. NŪS for Students is free, with <b>Pro at $9.99 a month</b> if you hit the limits. AI providers are separate and bill you directly on your own key, so check their pricing." },
    { q: "How do I set up Jev like in the video?", k: "setup jev voice video typesafe key", a: `Voice actions are in NŪS Companion, a separate free download from the student app. Install it, add a TypeSafe key in the Companion window under <b>Your keys</b>, and hold ${K("Ctrl", "Alt", "Space")} to talk.` },
    { q: "What happens when it mishears?", k: "mishear wrong mistake undo error", a: "There’s no undo yet, so you fix it by hand. You can also type a command instead of saying it." },
    { q: "Is what I saw in the videos real?", k: "real fake video demo", a: "The voice actions, pointing and routines in our videos are in the released Companion. Anything not shipped yet is labeled as where NŪS is heading." },
    { q: "Why does Windows warn me when I install?", k: "windows warning smartscreen install unsafe virus signed", a: "The installers aren’t code-signed yet, so Windows SmartScreen asks first. Choose <b>More info</b>, then <b>Run anyway</b>." },
    { q: "Is it open source? Is there a Mac version?", k: "open source github mac apple macos", a: "NŪS for Students (the NŪS Desktop app) is open source on GitHub, and its <b>Mac beta is out</b> for Apple silicon and Intel. NŪS Companion is a free download without published source, and it’s Windows only for now." },
  ];
  const plain = (h) => h.replace(/<[^>]+>/g, "");
  const STOP = ["is", "it", "the", "a", "an", "do", "does", "can", "how", "what", "i", "my", "to", "of", "on", "in", "there", "for"];
  function mount(root) {
    root.innerHTML = `<div class="sec">
      <div class="head reveal"><div class="mono">Questions</div><h2 class="serif">What people <em>asked.</em></h2><p>The questions that came up most under our videos. Ask it like you’d ask the Knot.</p></div>
      <label class="ask reveal"><span class="fknot" aria-hidden="true"><canvas></canvas></span><span class="sr">Search the questions</span><input type="text" placeholder="What do you need help with?" autocomplete="off" spellcheck="false"><span class="count">10 questions</span></label>
      <div class="tries reveal" aria-label="Try"><button type="button">Is it free?</button><button type="button">Mac</button><button type="button">Is it local?</button><button type="button">Jev</button><button type="button">Windows warning</button></div>
      <div class="qlist reveal">${FAQ.map((f, i) => `<div class="qrow" data-i="${i}"><button type="button" class="qh" aria-expanded="false"><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="qt">${f.q}</span><span class="pl" aria-hidden="true"></span></button>
        <div class="body"><div><div class="bub"><div class="k">NŪS</div><div class="ans">${f.a}</div></div></div></div></div>`).join("")}</div>
      <p class="none">Nothing matched. Ask us directly below.</p>
      <div class="more reveal"><div><b>Didn’t see yours?</b><p>Send it. The loudest questions get answered here, and the loudest requests get built first.</p></div><a class="fbtn" href="${FEEDBACK}">Ask a question</a></div></div>`;
    const input = root.querySelector(".ask input"), count = root.querySelector(".ask .count"), none = root.querySelector(".none"), rows = [...root.querySelectorAll(".qrow")];
    const cv = root.querySelector(".fknot canvas"), knot = window.NusKnot3D ? NusKnot3D.mount(cv, { ground: false, scale: 0.34, focusGate: false }) : null, st = (s) => knot && knot.setState && knot.setState(s);
    const open = (r, on) => { r.classList.toggle("open", on); r.querySelector(".qh").setAttribute("aria-expanded", on); };
    rows.forEach((r) => r.querySelector(".qh").addEventListener("click", () => open(r, !r.classList.contains("open"))));
    const words = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.includes(w));
    let t = 0;
    function run() {
      const ws = words(input.value.trim());
      if (!ws.length) { rows.forEach((r) => { r.classList.remove("hide"); r.querySelector(".qt").innerHTML = FAQ[+r.dataset.i].q; }); count.textContent = "10 questions"; none.classList.remove("on"); st("idle"); return; }
      st("thinking");
      const scored = rows.map((r) => { const f = FAQ[+r.dataset.i], hay = (f.q + " " + f.k + " " + plain(f.a)).toLowerCase(); let s = 0;
        ws.forEach((w) => { if (f.q.toLowerCase().includes(w)) s += 3; if (f.k.includes(w)) s += 2; else if (hay.includes(w)) s += 1; }); return { r, s, f }; });
      let shown = 0;
      scored.forEach(({ r, s, f }) => { const hit = s > 0; r.classList.toggle("hide", !hit); if (hit) shown++; open(r, false);
        let qt = f.q; ws.forEach((w) => { qt = qt.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>"); }); r.querySelector(".qt").innerHTML = qt; });
      const best = scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s)[0];
      count.textContent = shown ? `${shown} ${shown === 1 ? "answer" : "answers"}` : "No match"; none.classList.toggle("on", !shown);
      clearTimeout(t); t = setTimeout(() => { if (best) { open(best.r, true); st("ready"); } else st("idle"); }, reduce ? 0 : 350);
    }
    input.addEventListener("input", run);
    root.querySelectorAll(".tries button").forEach((b) => b.addEventListener("click", () => { input.value = b.textContent; run(); input.focus({ preventScroll: true }); }));
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.1 });
    root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  }
  window.NusFaq = { mount };
})();
