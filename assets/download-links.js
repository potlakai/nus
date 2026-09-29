/* Picks the download for the visitor's OS.
   Windows is the default and what the markup says. On a Mac the student tool
   buttons point at the Apple Silicon dmg, the secondary link becomes the Intel
   dmg, and the note under the final buttons explains Gatekeeper. Nūs Companion
   (data-dl="companion") is Windows only for now: its buttons keep their link and
   say so instead of swapping. attrib.js and goatcounter read the final href and
   data-goatcounter-click at click time, so Mac downloads are counted as
   download-mac-*. Both dmgs ship with every desktop release (Mac is a beta from
   v0.2.6), so releases/latest never 404s. */
(function () {
  var ua = navigator.userAgent || "";
  var plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
  var isMac = /mac/i.test(plat) && !/iPhone|iPad|iPod/.test(ua);
  if (!isMac) return;

  var base = "https://github.com/potlakai/nus-desktop/releases/latest/download/";
  var silicon = base + "Nus-arm64.dmg";
  var intel = base + "Nus-x64.dmg";
  document.documentElement.classList.add("is-mac");

  document.querySelectorAll('a[data-dl="installer"]').forEach(function (a) {
    a.href = silicon;
    // Buttons that already name the product ("The full student tool") keep it and gain the beta tag.
    if (/Download for Windows/.test(a.textContent)) a.textContent = "Download for Mac (beta)";
    else a.textContent = a.textContent.trim() + " (Mac beta)";
    // The Companion buttons step back on a Mac, so the student tool becomes the main button.
    a.classList.remove("ghost");
    a.classList.add("solid");
    var gc = a.getAttribute("data-goatcounter-click");
    if (gc) a.setAttribute("data-goatcounter-click", gc.replace("windows", "mac"));
  });

  document.querySelectorAll('a[data-dl="companion"]').forEach(function (a) {
    a.textContent = "Assistant: Windows only for now";
    a.classList.remove("solid");
    a.classList.add("ghost");
    a.setAttribute("title", "Nūs Companion runs on Windows today. The link still works if you have a Windows machine.");
  });

  document.querySelectorAll("[data-dl-step]").forEach(function (el) {
    el.innerHTML = 'The Mac beta of the student tool is for Apple Silicon (M1 and later). <a href="' + intel + '" data-goatcounter-click="download-mac-intel">Intel Macs use this one</a>.';
  });

  document.querySelectorAll("[data-dl-note]").forEach(function (el) {
    el.innerHTML = '<b>Mac beta:</b> <b>Nus-arm64.dmg</b> is for Apple Silicon; <a href="' + intel + '" data-goatcounter-click="download-mac-intel">Intel Macs use Nus-x64.dmg</a>. It is not notarized yet, so the first open says Apple could not verify it. Click <b>Done</b>, open <b>System Settings &rsaquo; Privacy &amp; Security</b>, and press <b>Open Anyway</b>. Nūs Companion is Windows only for now.';
  });
})();
