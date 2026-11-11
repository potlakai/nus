/* FAQ, option B "Ask it" (picked 2026-09-30). A Companion-style ask pill with the real Knot; typing filters the
   real-comment questions, highlights the words and opens the best match as a NŪS answer. All of them show when
   empty. Answers updated to shipped facts on 2026-09-30. Usage: NusFaq.mount(el)  (el is an empty .faqsec) */
(function () {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FEEDBACK = "feedback.html";
  const K = (...k) => k.map((x) => `<kbd>${x}</kbd>`).join(" ");
  const FAQ = [
    { q: "What happened to NŪS for Students?", k: "students student app semester syllabus stopped moved gone old desktop which download", a: "It has moved into <b>NŪS Companion</b>, and that is the one download now. If you already have NŪS for Students, it still opens and your semester stays on your computer, but it gets no more updates. Everything new ships in the Companion." },
    { q: "Is NŪS only for students?", k: "students only work everyone", a: "No. Students are where NŪS started. NŪS Companion works for anyone on Windows, and the bigger vision is one companion across school, work and life." },
    { q: "Is it local? What leaves my computer?", k: "local privacy private data server cloud leave", a: "Your notes, routines, transcripts and keys stay on your PC. A question, and the screenshot that goes with it, goes to an AI to be answered: through publik by default, or straight to your own provider if you switch to your own key in Settings. publik passes it on to the model and says it does not store it. The words of a voice command go to TypeSafe so Jev can pick the action. Folders you turn on share short excerpts the same way when they help answer. There is no NŪS server in between. publik also gets a count that the app was opened, with no content. The Companion opens with Sign in with publik. Signing in with Google is separate and optional: if you choose it, a few settings sync and this computer’s anonymous stats are linked to your account; you can unlink or delete it from the same card." },
    { q: "Do I need an AI key?", k: "key free api gemini nvidia claude code typesafe voice no key", a: "No. Sign in with publik and answers work with no key, and your first 100 or so asks are free. After that you can top up on publik, or switch to your own key in Settings: a free Gemini or Nvidia key, an Anthropic key, or Claude Code if it’s signed in on your computer. Simple asks like “open YouTube” or “a bit quieter” never use a key. The full set of voice actions uses a TypeSafe key." },
    { q: "Do I need an account?", k: "account sign in google login sync settings", a: "Yes, a free publik account. NŪS Companion opens with Sign in with publik, and it takes about a minute with email, Google or GitHub. That account is what lets it answer with no AI key. Separately, you can sign in with Google inside the app to sync a few settings, like your talk key and voice, to your other computers. That one is optional." },
    { q: "Is it only Jev?", k: "jev model ai gemini claude typesafe", a: "No. Jev is the reflexes: it picks one action from a fixed set, like opening an app. Answers, writing and pointing at your screen come from a bigger model: through publik with no key, or on your own key, such as Gemini, Nvidia or Claude, or from Claude Code." },
    { q: "What does it cost?", k: "cost price free pro money pay", a: "NŪS Companion is free to download. Sign in with publik and your first 100 or so asks are free. After that, answers draw on your publik balance, which you top up on publik, or you switch to your own key and that provider bills you directly (Gemini and Nvidia have free keys). Students Pro is closed to new sign-ups; if you have it, you can manage or cancel it on the <a href=\"pro.html\">Pro page</a>." },
    { q: "How do I set up Jev like in the video?", k: "setup jev voice video typesafe key", a: `Voice actions are in NŪS Companion. Install it, add a TypeSafe key in the Companion window under <b>Settings</b>, and hold ${K("Ctrl", "Alt")} to talk. Simple asks like “open YouTube” work with no key.` },
    { q: "What happens when it mishears?", k: "mishear wrong mistake undo error", a: "There’s no undo yet, so you fix it by hand. You can also type a command instead of saying it." },
    { q: "Is what I saw in the videos real?", k: "real fake video demo", a: "The voice actions, pointing and routines in our videos are in the released Companion. Anything not shipped yet is labeled as where NŪS is heading." },
    { q: "Why does Windows warn me when I install?", k: "windows warning smartscreen install unsafe virus signed", a: "The installers aren’t code-signed yet, so Windows SmartScreen asks first. Choose <b>More info</b>, then <b>Run anyway</b>." },
    { q: "It won’t install on Windows. What now?", k: "install installer windows failed not working blocked antivirus defender smart app control", a: "Check you ran <b>Nus-Companion-Setup.exe</b>, about 200 MB, not the Portable or .yml file. If your antivirus took it, restore it from quarantine and run it again. If there is no <b>Run anyway</b> button, Smart App Control or S mode is blocking apps that are not signed yet. It installs in a few seconds with no questions, so look for <b>Nus Companion</b> in the Start menu. Still stuck? Open <b>Did it install?</b> under the download and tell Pranav what you saw." },
    { q: "Is there a Mac version?", k: "mac apple macos macbook waitlist", a: "Not yet. NŪS Companion is Windows only today and the Mac build is being worked on now, with no date yet. Leave your email under <a href=\"#ways\">The way in</a> and you get one message when it is ready." },
    { q: "Is it open source?", k: "open source github code", a: "The older NŪS for Students app (NŪS Desktop) is open source on GitHub. NŪS Companion is a free download without published source for now." },
    { q: "My Mac says NŪS is damaged or can’t be opened.", k: "mac damaged trash open verify gatekeeper blocked malware xattr terminal", a: "That is the older NŪS for Students Mac beta, which Apple has not notarized. Drag Nus into Applications first. If it says Apple could not verify it: click <b>Done</b>, then <b>System Settings</b>, <b>Privacy &amp; Security</b>, <b>Open Anyway</b>. If it says it is damaged: click <b>Cancel</b>, open <b>Terminal</b>, type <code>xattr -cr </code> with a space at the end, drag Nus from Applications into the window, and press <b>Return</b>." },
  ];
  const plain = (h) => h.replace(/<[^>]+>/g, "");
  const STOP = ["is", "it", "the", "a", "an", "do", "does", "can", "how", "what", "i", "my", "to", "of", "on", "in", "there", "for"];
  function mount(root) {
    root.innerHTML = `<div class="sec">
      <div class="head reveal"><div class="mono">Questions</div><h2 class="serif">Asked under our videos, <em>answered here.</em></h2><p>Search them, or ask it like you’d ask the Knot.</p></div>
      <label class="ask reveal"><span class="fknot" aria-hidden="true"><canvas></canvas></span><span class="sr">Search the questions</span><input type="text" placeholder="What do you need help with?" autocomplete="off" spellcheck="false"><span class="count">${FAQ.length} questions</span></label>
      <div class="tries reveal" aria-label="Try"><button type="button">Is it free?</button><button type="button">Mac</button><button type="button">Is it local?</button><button type="button">Jev</button><button type="button">Won’t install</button></div>
      <div class="qlist reveal">${FAQ.map((f, i) => `<div class="qrow" data-i="${i}"><button type="button" class="qh" aria-expanded="false"><span class="qt">${f.q}</span><span class="pl" aria-hidden="true"></span></button>
        <div class="body"><div><div class="bub"><div class="k">NŪS</div><div class="ans">${f.a}</div></div></div></div></div>`).join("")}</div>
      <p class="none">Nothing matched. Ask us directly below.</p>
      <div class="more reveal"><div><b>Didn’t see yours?</b><p>Send it. The loudest questions get answered here, and the loudest requests get built first.</p></div><a class="fbtn" href="${FEEDBACK}">Ask a question</a></div></div>`;
    const input = root.querySelector(".ask input"), count = root.querySelector(".ask .count"), none = root.querySelector(".none"), rows = [...root.querySelectorAll(".qrow")];
    const cv = root.querySelector(".fknot canvas"), knot = window.NusKnot3D ? NusKnot3D.mount(cv) : null, st = (s) => knot && knot.setState && knot.setState(s);
    const open = (r, on) => { r.classList.toggle("open", on); r.querySelector(".qh").setAttribute("aria-expanded", on); };
    rows.forEach((r) => r.querySelector(".qh").addEventListener("click", () => open(r, !r.classList.contains("open"))));
    const words = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.includes(w));
    let t = 0;
    function run() {
      const ws = words(input.value.trim());
      if (!ws.length) { rows.forEach((r) => { r.classList.remove("hide"); r.querySelector(".qt").innerHTML = FAQ[+r.dataset.i].q; }); count.textContent = FAQ.length + " questions"; none.classList.remove("on"); st("idle"); return; }
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
    // the corner Knot asks here too: the best row for these words, and a way to open it with the list unfiltered
    window.NusFaq.find = (text) => {
      const flat = (x) => x.toLowerCase().replace(/[’']/g, "");   // so "wont" and "won't" both find "won’t"
      const vague = ["nus", "have", "has", "version", "get", "use", "need", "you", "your", "me", "be", "with", "about", "will", "if", "and", "or", "this", "that", "app", "work", "works"];
      const ws = words(flat(text)).filter((w) => !vague.includes(w)); if (!ws.length) return null;
      const best = rows.map((r) => { const f = FAQ[+r.dataset.i]; let s = 0;
        ws.forEach((w) => { if (flat(f.q).includes(w)) s += 3; if (f.k.includes(w)) s += 2; else if ((f.q + " " + plain(f.a)).toLowerCase().includes(w)) s += 1; }); return { r, s }; })
        .sort((a, b) => b.s - a.s)[0];
      return best.s >= 2 ? { row: best.r, open() { if (input.value) { input.value = ""; run(); } rows.forEach((x) => open(x, x === best.r)); } } : null;
    };
    input.addEventListener("input", run);
    root.querySelectorAll(".tries button").forEach((b) => b.addEventListener("click", () => { input.value = b.textContent; run(); input.focus({ preventScroll: true }); }));
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.1 });
    root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  }
  window.NusFaq = { mount };
})();
