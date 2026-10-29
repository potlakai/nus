/* Feedback: one submit path for the whole site.
 *
 * - A floating "Feedback" pill on every page that loads this script. It opens a small panel with the form.
 * - Any element with data-nus-feedback-form gets the same form inline (the landing section, feedback.html).
 *   Add data-hide-pill to it and the pill steps aside while that form is on screen.
 * - Notes go to the submit-feedback function. If the server cannot be reached, the note is kept in this
 *   browser and sent again the next time a page with this script loads.
 * - Diagnostics are only the page path and a ?src= / ?ref= label. No user agent, no ids, no fingerprinting.
 * - Presets from the URL: ?kind=bug|idea|other picks the chip, ?why=uninstall asks why they left.
 */
(function () {
  "use strict";
  if (window.NusFeedback) return;

  var API = "https://xnpkplcjurzwanotmwwt.supabase.co/functions/v1/submit-feedback";
  var CONTACT = "pranavfromthegrowth@gmail.com";   // the contact the privacy page already lists
  var QUEUE_KEY = "nus-feedback-unsent";
  var QUEUE_MAX = 10, QUEUE_DAYS = 30, MAX_LEN = 3000;
  var BRAND = document.body && document.body.classList.contains("theme-paper") ? "Nūs" : "NŪS";

  // load the stylesheet that sits next to this script, so each page only needs the one script tag
  var me = document.currentScript;
  if (me && me.src && !document.querySelector("link[data-nus-feedback]")) {
    var css = document.createElement("link");
    css.rel = "stylesheet"; css.href = me.src.replace(/feedback\.js(\?.*)?$/, "feedback.css?v=3"); css.setAttribute("data-nus-feedback", "");
    document.head.appendChild(css);
  }

  /* ---------- URL presets and diagnostics ---------- */
  var params = new URLSearchParams(location.search);
  var clean = function (v) { return String(v || "").toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 40); };
  var KINDS = { bug: 1, idea: 1, other: 1 };
  var presetKind = KINDS[clean(params.get("kind"))] ? clean(params.get("kind")) : null;
  var why = clean(params.get("why"));
  if (why === "uninstall" && !presetKind) presetKind = "other";
  function diagnostics() {
    var d = { page: (location.pathname || "/").slice(0, 120) };
    var ref = clean(params.get("src") || params.get("ref")) || (why === "uninstall" ? "uninstall" : "");
    if (ref) d.ref = ref;
    return d;
  }

  /* ---------- storage (every access guarded: private mode, blocked storage) ---------- */
  function readQueue() {
    try {
      var list = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      var cutoff = Date.now() - QUEUE_DAYS * 86400000;
      return Array.isArray(list) ? list.filter(function (x) { return x && x.body && x.t > cutoff; }) : [];
    } catch (e) { return []; }
  }
  function writeQueue(list) {
    try { if (list.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-QUEUE_MAX))); else localStorage.removeItem(QUEUE_KEY); return true; }
    catch (e) { return false; }
  }
  function keep(body) {
    var list = readQueue().filter(function (x) { return x.body.message !== body.message; });
    list.push({ body: body, t: Date.now() });
    return writeQueue(list);
  }

  /* ---------- the one submit path ---------- */
  // resolves to "ok" | "bad" (400, will never send) | "limited" (429) | "down" (404, 5xx, network, timeout)
  function send(body) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : null;
    return fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        if (r.ok) return "ok";
        if (r.status === 429) return "limited";
        if (r.status === 400) return "bad";
        return "down";
      }, function () { return "down"; })
      .then(function (s) { if (timer) clearTimeout(timer); return s; });
  }

  // try any notes kept from an earlier visit, oldest first; stop at the first one that cannot go yet
  var flushing = false;
  function flush() {
    if (flushing || !window.fetch) return;
    var list = readQueue();
    if (!list.length) return;
    flushing = true;
    var sent = 0;
    (function next() {
      if (!list.length) return done();
      send(list[0].body).then(function (s) {
        if (s === "ok" || s === "bad") { if (s === "ok") sent++; list.shift(); writeQueue(list); next(); }
        else done();
      });
    })();
    function done() {
      flushing = false; writeQueue(list);
      if (!sent) return;
      toast(sent === 1 ? "Your earlier note reached Pranav." : "Your earlier notes reached Pranav.");
      if (!list.length) [].forEach.call(document.querySelectorAll(".nfb-fallback"), function (el) {   // nothing is waiting any more
        el.hidden = true; var st = el.parentNode.querySelector(".nfb-status"); if (st) { st.textContent = ""; st.className = "nfb-status"; }
      });
    }
  }

  function copy(text, btn) {
    var ok = function () { var was = btn.textContent; btn.textContent = "Copied"; setTimeout(function () { btn.textContent = was; }, 1800); };
    function legacy() {
      var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { btn.textContent = "Select and copy the note above"; }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, legacy); else legacy();
  }

  /* ---------- the form ---------- */
  var uid = 0;
  var PLACEHOLDER = { bug: "What happened, and what did you expect?", idea: "I wish it could...", other: "Anything at all." };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  function buildForm(host, where) {
    var n = ++uid, kind = presetKind || "idea";
    var ask = why === "uninstall" ? "What made you uninstall? One line helps." : "What should " + BRAND + " do better?";
    host.classList.add("nfb");
    host.innerHTML =
      '<form class="nfb-form" novalidate>' +
        '<div class="nfb-kinds" role="group" aria-label="What kind of note">' +
          '<button type="button" class="nfb-kind" data-kind="bug">Bug</button>' +
          '<button type="button" class="nfb-kind" data-kind="idea">Idea</button>' +
          '<button type="button" class="nfb-kind" data-kind="other">Something else</button>' +
        "</div>" +
        '<label class="nfb-label" for="nfb-msg-' + n + '">' + esc(ask) + "</label>" +
        '<textarea class="nfb-msg" id="nfb-msg-' + n + '" name="message" rows="4" maxlength="' + MAX_LEN + '" required></textarea>' +
        '<label class="nfb-label" for="nfb-email-' + n + '">Want a reply? Leave an email <span class="nfb-opt">(optional)</span></label>' +
        '<input class="nfb-email" id="nfb-email-' + n + '" name="email" type="email" autocomplete="email" inputmode="email" maxlength="200" placeholder="you@example.com">' +
        '<div class="nfb-hp" aria-hidden="true"><label for="nfb-web-' + n + '">Leave this empty</label><input id="nfb-web-' + n + '" name="website" type="text" tabindex="-1" autocomplete="off"></div>' +
        '<div class="nfb-row"><button type="submit" class="nfb-send" data-goatcounter-click="feedback-send-' + where + '">Send</button><span class="nfb-hint">Pranav reads every note.</span></div>' +
        '<p class="nfb-status" role="status" aria-live="polite"></p>' +
        '<div class="nfb-fallback" hidden>' +
          '<blockquote class="nfb-kept"></blockquote>' +
          '<div class="nfb-actions"><button type="button" class="nfb-copy">Copy note</button><a class="nfb-mail" href="mailto:' + CONTACT + '?subject=' + encodeURIComponent(BRAND + " feedback") + '">Email ' + CONTACT + "</a></div>" +
        "</div>" +
      "</form>" +
      '<div class="nfb-done" hidden tabindex="-1"><p class="nfb-done-title">Sent. Pranav reads every note.</p><p class="nfb-done-sub"></p><button type="button" class="nfb-again">Send another</button></div>';

    var form = host.querySelector(".nfb-form"), msg = host.querySelector(".nfb-msg"), email = host.querySelector(".nfb-email");
    var hp = host.querySelector('[name="website"]'), status = host.querySelector(".nfb-status"), sendBtn = host.querySelector(".nfb-send");
    var fb = host.querySelector(".nfb-fallback"), kept = host.querySelector(".nfb-kept"), doneBox = host.querySelector(".nfb-done");
    var chips = [].slice.call(host.querySelectorAll(".nfb-kind")), lastNote = "";

    function setKind(k) {
      kind = k;
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-kind") === k)); });
      msg.placeholder = why === "uninstall" && k === "other" ? "It did not fit because..." : PLACEHOLDER[k];
    }
    chips.forEach(function (c) { c.addEventListener("click", function () { setKind(c.getAttribute("data-kind")); }); });
    setKind(kind);

    function say(text, tone) { status.textContent = text; status.className = "nfb-status" + (tone ? " is-" + tone : ""); }

    msg.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : sendNow(); } });
    host.querySelector(".nfb-copy").addEventListener("click", function () { copy(lastNote, this); });
    host.querySelector(".nfb-again").addEventListener("click", function () { doneBox.hidden = true; form.hidden = false; msg.focus(); });
    form.addEventListener("submit", function (e) { e.preventDefault(); sendNow(); });

    function sendNow() {
      var text = msg.value.trim(), mail = email.value.trim();
      if (!text) { say("Write a few words first.", "warn"); msg.focus(); return; }
      if (text.length > MAX_LEN) { say("That is a bit long. Keep it under " + MAX_LEN + " characters.", "warn"); msg.focus(); return; }
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { say("That email does not look right. Fix it, or leave it empty.", "warn"); email.focus(); return; }
      var body = { source: "site", kind: kind, message: text, website: hp.value, diagnostics: diagnostics() };
      if (mail) body.email = mail;
      fb.hidden = true; sendBtn.disabled = true; say("Sending...");
      send(body).then(function (s) {
        sendBtn.disabled = false;
        if (s === "ok") {
          msg.value = ""; email.value = ""; say("");
          host.querySelector(".nfb-done-sub").textContent = mail ? "If it needs an answer, the reply goes to " + mail + "." : "Thank you for taking the time.";
          form.hidden = true; doneBox.hidden = false; doneBox.focus();
          return;
        }
        if (s === "bad") { say("That did not go through. Check the note is there and under " + MAX_LEN + " characters, then try again.", "warn"); return; }
        // limited or down: keep the note, say so plainly, offer a manual route
        var saved = keep(body);
        lastNote = text; kept.textContent = text; msg.value = "";
        say(s === "limited"
          ? "That is a lot of notes in one hour, so this one did not send yet." + (saved ? " It is saved on this device and will go next time you open the site." : "")
          : "It did not send: the server is not reachable right now." + (saved ? " Your note is saved on this device and will send next time you open the site." : " Copy it so it is not lost."), "warn");
        fb.hidden = false;
      });
    }
    return { focus: function () { msg.focus(); } };
  }

  /* ---------- pill + panel ---------- */
  var pill, panel, panelForm, toastEl;
  function buildWidget() {
    var wrap = document.createElement("div");
    wrap.className = "nfb nfb-widget";
    wrap.style.visibility = "hidden";   // feedback.css reveals it, so the pill never flashes unstyled
    wrap.innerHTML =
      '<button type="button" class="nfb-pill" aria-expanded="false" aria-controls="nfb-panel" data-goatcounter-click="feedback-pill">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z"/></svg>Feedback</button>' +
      '<div class="nfb-panel" id="nfb-panel" role="dialog" aria-modal="false" aria-labelledby="nfb-panel-title" hidden>' +
        '<div class="nfb-head"><div><p class="nfb-title" id="nfb-panel-title">Tell Pranav</p><p class="nfb-sub">Bugs, ideas, anything. It goes straight to him.</p></div>' +
        '<button type="button" class="nfb-close" aria-label="Close feedback">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="nfb-body"></div>' +
      "</div>" +
      '<p class="nfb-toast" role="status" aria-live="polite" hidden></p>';
    document.body.appendChild(wrap);
    pill = wrap.querySelector(".nfb-pill"); panel = wrap.querySelector(".nfb-panel"); toastEl = wrap.querySelector(".nfb-toast");
    panelForm = buildForm(panel.querySelector(".nfb-body"), "panel");
    pill.addEventListener("click", function () { panel.hidden ? open() : close(true); });
    wrap.querySelector(".nfb-close").addEventListener("click", function () { close(true); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { e.preventDefault(); close(true); } });
    document.addEventListener("pointerdown", function (e) { if (!panel.hidden && !wrap.contains(e.target)) close(false); });
  }
  function open() {
    panel.hidden = false; pill.setAttribute("aria-expanded", "true"); pill.parentNode.classList.remove("nfb-away"); document.documentElement.classList.add("nfb-open");
    panelForm.focus();
  }
  function close(returnFocus) {
    panel.hidden = true; pill.setAttribute("aria-expanded", "false"); document.documentElement.classList.remove("nfb-open");
    if (returnFocus) pill.focus();
  }
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text; toastEl.hidden = false;
    setTimeout(function () { toastEl.hidden = true; }, 6000);
  }

  function init() {
    buildWidget();
    var hiders = [];
    [].forEach.call(document.querySelectorAll("[data-nus-feedback-form]"), function (el) {
      buildForm(el, el.getAttribute("data-nus-feedback-form") || "inline");
      if (el.hasAttribute("data-hide-pill")) hiders.push(el);
    });
    // the pill steps aside while an inline form is on screen, so the two never stack on a phone
    if (hiders.length && window.IntersectionObserver) {
      var seen = new Set();
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
        pill.parentNode.classList.toggle("nfb-away", seen.size > 0 && panel.hidden);
      });
      hiders.forEach(function (el) { io.observe(el); });
    }
    setTimeout(flush, 1500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.NusFeedback = { send: send, flush: flush, open: function () { if (panel) open(); } };
})();
