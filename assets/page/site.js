/* Page wiring, loaded last: Setup guide links open the matching Setup tab, download and Pro links carry
   GoatCounter click names (read by count.js and assets/attrib.js), and old #ideaform links reach the
   feedback page. */
(() => {
  const toFeedback = () => location.hash === "#ideaform" && location.replace("feedback.html");
  addEventListener("hashchange", toFeedback); if (toFeedback()) return;
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-guide]"); if (!a) return;
    const tab = document.querySelector(`#setup .prod button[data-p="${a.dataset.guide}"]`);
    if (tab && !tab.classList.contains("on")) tab.click();
  });
  const name = (a) => {
    const h = a.href, sec = (a.closest("section, footer") || {}).id || "nav";
    if (/Nus-Companion-Setup\.exe$/.test(h)) return `download-windows-companion-${sec}`;
    if (/Nus-Setup\.exe$/.test(h)) return `download-windows-${sec}`;
    if (/Nus-arm64\.dmg$/.test(h)) return `download-mac-${sec}`;
    if (/Nus-x64\.dmg$/.test(h)) return `download-mac-intel-${sec}`;
    if (/pro\.html$/.test(h)) return `pro-click-${sec}`;
    if (/feedback\.html$/.test(h)) return `feedback-${sec}`;
    return null;
  };
  document.querySelectorAll("a[href]").forEach((a) => { const n = name(a); if (n && !a.hasAttribute("data-goatcounter-click")) a.setAttribute("data-goatcounter-click", n); });
})();
