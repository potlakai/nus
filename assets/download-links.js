/* Marks the download buttons on a Mac.
   NŪS for Students stopped on 2026-11-10, so there is one download: Nūs Companion, Windows only for now.
   The markup carries the Windows link. On a Mac every download button (data-dl) turns into a link to the
   Mac waitlist on the home page, and the notes say so. */
(function () {
  var ua = navigator.userAgent || "";
  var plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
  var isMac = /mac/i.test(plat) && !/iPhone|iPad|iPod/.test(ua);
  if (!isMac) return;

  document.documentElement.classList.add("is-mac");
  var waitlist = "index.html#ways";

  document.querySelectorAll("a[data-dl]").forEach(function (a) {
    a.href = waitlist;
    a.textContent = "On a Mac? Get told when it’s ready";
    a.setAttribute("data-goatcounter-click", "mac-waitlist-link");
    a.setAttribute("title", "Nūs Companion runs on Windows today. The Mac build is in the works.");
  });

  document.querySelectorAll("[data-dl-step], [data-dl-note]").forEach(function (el) {
    el.innerHTML = 'Nūs Companion is Windows only for now. The Mac build is in the works: <a href="' + waitlist + '" data-goatcounter-click="mac-waitlist-link">leave your email</a> and you get one message when it is ready.';
  });
})();
