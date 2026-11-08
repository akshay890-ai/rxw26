/* Loaded in <head> so the saved theme is applied before first paint (no flash). */
(function () {
  var t = "light";
  try { t = localStorage.getItem("spy_theme") || "light"; } catch (e) {}
  document.documentElement.setAttribute("data-theme", t);
})();

function toggleTheme() {
  var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  var next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("spy_theme", next); } catch (e) {}
  return next;
}
