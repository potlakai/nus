/* Nūs acquisition attribution (privacy-preserving, first-touch).
 *
 * What this does:
 *  - If the URL carries a Growth OS campaign (?aid=...&utm_...&tok=...), the
 *    validated values are kept in this browser's localStorage for 30 days
 *    (first touch wins; a later campaign never overwrites an unexpired one).
 *  - Fires aggregate GoatCounter events (campaign/<utm_campaign> on arrival,
 *    download/<utm_campaign> on a download click). Path strings only; no
 *    per-user data ever leaves the browser.
 *  - After a download click, shows the "setup code" so the visitor can link
 *    their install inside the app (Settings → Have a setup code?), plus an
 *    optional nus-desktop://acquire deep link for already-installed users.
 *
 * What this never does: no cookies, no fingerprinting, no identity, no
 * student content. The token only labels which post/video a download came
 * from; forging one changes nothing but a marketing counter.
 */
(function () {
  "use strict";

  var STORE_KEY = "nus-acq";
  var TTL_DAYS = 30;
  var AID_RE = /^act-\d{8}-[a-f0-9]{7}$/;
  var UTM_RE = /^[a-z0-9_-]{1,60}$/;
  var TOK_RE = /^N1\.[A-Za-z0-9_-]{1,220}\.[a-f0-9]{10}$/;

  function readStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.exp || Date.now() > data.exp) {
        localStorage.removeItem(STORE_KEY);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function writeStore(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) { /* private mode etc.; attribution just degrades */ }
  }

  function gcCount(path) {
    var attempts = 0;
    (function fire() {
      if (window.goatcounter && typeof window.goatcounter.count === "function") {
        window.goatcounter.count({ path: path, event: true });
      } else if (attempts++ < 20) {
        setTimeout(fire, 300);
      }
    })();
  }

  function captureFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var aid = params.get("aid") || "";
    var tok = params.get("tok") || "";
    var source = params.get("utm_source") || "";
    var medium = params.get("utm_medium") || "";
    var campaign = params.get("utm_campaign") || "";
    if (!AID_RE.test(aid) || !TOK_RE.test(tok)) return null;
    if (!UTM_RE.test(source) || !UTM_RE.test(medium) || !UTM_RE.test(campaign)) return null;
    return {
      aid: aid,
      tok: tok,
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign,
      exp: Date.now() + TTL_DAYS * 86400000
    };
  }

  var incoming = captureFromUrl();
  var stored = readStore();
  if (incoming && !stored) {           // first touch wins
    writeStore(incoming);
    stored = incoming;
    gcCount("campaign/" + incoming.utm_campaign);
  }

  function buildPanel(acq) {
    var panel = document.createElement("div");
    panel.id = "nus-acq-panel";
    panel.setAttribute("role", "status");
    panel.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);" +
      "max-width:560px;width:calc(100% - 32px);background:#101014;color:#f5f5f2;" +
      "border:1px solid #2c2c33;border-radius:12px;padding:14px 16px;z-index:9999;" +
      "font-size:14px;line-height:1.5;box-shadow:0 12px 40px rgba(0,0,0,.5)";
    var code = acq.tok;
    panel.innerHTML =
      '<strong>Downloading Nūs?</strong> After installing, open ' +
      '<em>Settings → Have a setup code?</em> and paste this code so your install ' +
      "links back to where you found it (nothing personal is shared):" +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:8px">' +
      '<code id="nus-acq-code" style="flex:1;overflow-x:auto;white-space:nowrap;padding:6px 8px;' +
      'background:#1a1a20;border-radius:8px;font-size:12px"></code>' +
      '<button id="nus-acq-copy" type="button" style="padding:6px 12px;border-radius:8px;' +
      'border:1px solid #3a3a44;background:#22222a;color:#f5f5f2;cursor:pointer">Copy</button>' +
      '<button id="nus-acq-close" type="button" aria-label="Dismiss" style="padding:6px 10px;' +
      'border-radius:8px;border:none;background:transparent;color:#8a8a95;cursor:pointer">✕</button>' +
      "</div>" +
      '<div style="margin-top:6px;font-size:12px;color:#8a8a95">Already installed? ' +
      '<a id="nus-acq-deeplink" style="color:#b7b7ff" href="#">Link this download</a></div>';
    document.body.appendChild(panel);
    panel.querySelector("#nus-acq-code").textContent = code;
    panel.querySelector("#nus-acq-deeplink").href =
      "nus-desktop://acquire?tok=" + encodeURIComponent(code);
    panel.querySelector("#nus-acq-copy").addEventListener("click", function () {
      try { navigator.clipboard.writeText(code); this.textContent = "Copied"; } catch (e) {}
    });
    panel.querySelector("#nus-acq-close").addEventListener("click", function () {
      panel.remove();
    });
  }

  function onDownloadClick() {
    var acq = readStore();
    if (!acq) return;
    gcCount("download/" + acq.utm_campaign);
    if (!document.getElementById("nus-acq-panel")) buildPanel(acq);
  }

  function wire() {
    var selector = '[data-goatcounter-click^="download-"], a[href$="Nus-Setup.exe"], a[href$="Nus-Portable.exe"]';
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener("click", onDownloadClick);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }

  // Console-QA surface; also used by the local acceptance walkthrough.
  window.NusAttrib = { read: readStore, capture: captureFromUrl };
})();
