/* SPY ACADEMY: shared app logic (no build step, plain JS) */
const KEY = "spy_academy_v1";
const DAY_MS = 24 * 3600 * 1000;
const XP_PER_LEVEL = 200;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
}
function state() {
  const s = load();
  if (!s.done) s.done = {};
  return s;
}
function pad2(n) { return String(n).padStart(2, "0"); }
function localDateKey(d) {
  d = d instanceof Date ? d : new Date(d);
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
function today() { return localDateKey(new Date()); }
function dayDiff(a, b) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

function isDone(day) { const s = state(); return !!(s.done[day] && s.done[day].completed); }
function isUnlocked(day) { return day === 1 || isDone(day - 1); }
function doneCount() { return Object.values(state().done).filter(d => d.completed).length; }
function currentDay() { for (let d = 1; d <= TOTAL_DAYS; d++) if (!isDone(d)) return d; return TOTAL_DAYS; }
function doneToday() {
  const t = today();
  return Object.values(state().done).some(r => r.completed && r.date && localDateKey(r.date) === t);
}
function rankFor(n) {
  let r = RANKS[0].name;
  RANKS.forEach(x => { if (n >= x.at) r = x.name; });
  return r;
}
function rankName() { return rankFor(doneCount()); }
function nextRank() {
  const n = doneCount();
  return RANKS.find(x => x.at > n) || null;
}
function esc(t) {
  return String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return ""; }
}

/* ---------- XP / level ---------- */
/* XP is always computed from saved progress, so it can't be farmed by ticking and unticking boxes.
   10 XP per ticked task, +50 for completing a mission, +25 if finished inside the 24h clock. */
function xpOf(rec) {
  if (!rec) return 0;
  let x = (rec.tasks || []).filter(Boolean).length * 10;
  if (rec.completed) { x += 50; if (rec.inTime) x += 25; }
  return x;
}
function totalXP() { return Object.values(state().done).reduce((a, r) => a + xpOf(r), 0); }
function xpUpTo(n) {
  const s = state();
  let x = 0;
  for (let d = 1; d <= n; d++) x += xpOf(s.done[d]);
  return x;
}
function levelInfo() {
  const xp = totalXP();
  return { xp: xp, level: Math.floor(xp / XP_PER_LEVEL) + 1, into: xp % XP_PER_LEVEL, need: XP_PER_LEVEL };
}

/* ---------- streak (consecutive calendar days with a completed mission) ---------- */
function streakNow() {
  const s = state();
  if (!s.streak || !s.streak.last) return 0;
  return dayDiff(s.streak.last, today()) <= 1 ? s.streak.count : 0;
}
function streakAtRisk() {
  const s = state();
  return !!(s.streak && s.streak.last && s.streak.last !== today() && dayDiff(s.streak.last, today()) === 1);
}
function bumpStreak(st) {
  const t = today();
  const sk = st.streak || { count: 0, last: null, best: 0 };
  if (sk.last !== t) {
    sk.count = (sk.last && dayDiff(sk.last, t) === 1) ? sk.count + 1 : 1;
    sk.last = t;
  }
  sk.best = Math.max(sk.best || 0, sk.count);
  st.streak = sk;
}

/* ---------- badges ---------- */
const BADGES = [
  { id: "first", ico: "🎯", name: "First Blood", desc: "Complete Day 1" },
  { id: "p1", ico: "👁️", name: "Sharp Eye", desc: "Finish Phase I" },
  { id: "p2", ico: "🧠", name: "People Reader", desc: "Finish Phase II" },
  { id: "p3", ico: "🤝", name: "Silver Tongue", desc: "Finish Phase III" },
  { id: "p4", ico: "🔐", name: "Quiet Channel", desc: "Finish Phase IV" },
  { id: "p5", ico: "👻", name: "Ghost Protocol", desc: "Finish Day 30" },
  { id: "elite1", ico: "🎖️", name: "Elite Initiate", desc: "Finish Days 31-42" },
  { id: "elite2", ico: "🔍", name: "Chief Analyst", desc: "Finish Days 43-54" },
  { id: "master", ico: "👑", name: "Director", desc: "Finish all 60 days" },
  { id: "streak3", ico: "🔥", name: "On Fire", desc: "3-day streak" },
  { id: "streak7", ico: "⚡", name: "Iron Will", desc: "7-day streak" },
  { id: "streak14", ico: "🛡️", name: "Unbreakable", desc: "14-day streak" },
  { id: "streak30", ico: "🏆", name: "Legend", desc: "30-day streak" },
  { id: "clock", ico: "⏱️", name: "Beat the Clock", desc: "5 missions inside 24h" },
  { id: "wordsmith", ico: "📝", name: "Wordsmith", desc: "A 300+ character report" },
  { id: "night", ico: "🦉", name: "Night Owl", desc: "Finish a mission 12am-5am" },
  { id: "early", ico: "🌅", name: "Early Bird", desc: "Finish a mission 5am-8am" }
];
function earnedBadges(st) {
  st = st || state();
  const dn = d => !!(st.done[d] && st.done[d].completed);
  const all = (a, b) => { for (let i = a; i <= b; i++) if (!dn(i)) return false; return true; };
  const recs = Object.values(st.done).filter(r => r.completed);
  const best = (st.streak && st.streak.best) || 0;
  const ok = {
    first: dn(1), p1: all(1, 6), p2: all(7, 12), p3: all(13, 18), p4: all(19, 24), p5: all(25, 30),
    elite1: all(31, 42), elite2: all(43, 54), master: all(55, 60),
    streak3: best >= 3, streak7: best >= 7, streak14: best >= 14, streak30: best >= 30,
    clock: recs.filter(r => r.inTime).length >= 5,
    wordsmith: recs.some(r => (r.report || "").length >= 300),
    night: recs.some(r => r.hour != null && r.hour < 5),
    early: recs.some(r => r.hour != null && r.hour >= 5 && r.hour < 8)
  };
  return BADGES.filter(b => ok[b.id]).map(b => b.id);
}

/* ---------- mission lifecycle ---------- */
function startMission(day) {
  const st = state();
  const r = st.done[day] || { tasks: [], report: "", completed: false };
  if (!r.startedAt) r.startedAt = Date.now();
  st.done[day] = r;
  save(st);
  return r.startedAt;
}
function completeMission(day, tasks, report) {
  const before = { rank: rankName(), badges: earnedBadges(), level: levelInfo().level };
  const st = state();
  const r = st.done[day] || {};
  const now = new Date();
  r.tasks = tasks;
  r.report = report;
  r.completed = true;
  r.date = now.toISOString();
  r.hour = now.getHours();
  r.inTime = !!(r.startedAt && Date.now() <= r.startedAt + DAY_MS);
  st.done[day] = r;
  bumpStreak(st);
  save(st);
  const after = { rank: rankName(), badges: earnedBadges(), level: levelInfo().level };
  return {
    missionXP: xpOf(r),
    inTime: r.inTime,
    streak: streakNow(),
    promoted: after.rank !== before.rank ? after.rank : null,
    leveled: after.level > before.level ? after.level : null,
    newBadges: BADGES.filter(b => after.badges.includes(b.id) && !before.badges.includes(b.id))
  };
}

/* ---------- reminders ---------- */
function getRemind() { const s = state(); return (s.settings && s.settings.remind) || null; }
function setRemind(obj) {
  const s = state();
  s.settings = s.settings || {};
  s.settings.remind = obj;
  save(s);
}
/* Daily calendar reminder (.ics): works in any calendar app, even when this site is closed. */
function buildICS(time, count) {
  const parts = String(time || "19:00").split(":").map(Number);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0] || 0, parts[1] || 0, 0);
  if (start <= now) start.setDate(start.getDate() + 1);
  const f = d => d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "T" + pad2(d.getHours()) + pad2(d.getMinutes()) + "00";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Shadow Academy//Mission Reminder//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", "UID:shadow-academy-" + Date.now() + "@local", "DTSTAMP:" + stamp,
    "DTSTART:" + f(start), "DURATION:PT30M", "RRULE:FREQ=DAILY;COUNT=" + Math.max(1, count),
    "SUMMARY:Shadow Academy: today's mission",
    "DESCRIPTION:Open your Shadow Academy site\\, begin today's mission and file your report.",
    "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:Mission time\\, Agent.", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n") + "\r\n";
}
/* In-browser reminder: only fires while a Shadow Academy tab is open. */
function reminderLoop() {
  const check = () => {
    const r = getRemind();
    if (!r || !r.on || !("Notification" in window) || Notification.permission !== "granted") return;
    const now = new Date();
    if ((pad2(now.getHours()) + ":" + pad2(now.getMinutes())) < r.time) return;
    if (r.last === today()) return;
    r.last = today();
    setRemind(r);
    if (doneToday() || doneCount() >= TOTAL_DAYS) return;
    const d = currentDay();
    try { new Notification("Shadow Academy: mission waiting", { body: "Day " + d + " // " + MISSIONS[d - 1].code + ". Begin when ready, Agent." }); } catch (e) {}
    toast("Mission waiting: <b>Day " + d + "</b>");
  };
  check();
  setInterval(check, 30000);
}

/* ---------- header ---------- */
function renderHeader(active) {
  const s = state();
  const links = [
    ["dashboard.html", "Dashboard", "dashboard"],
    ["control.html", "Control", "control"],
    ["handbook.html", "Handbook", "handbook"],
    ["archive.html", "Archive", "archive"]
  ].map(l => `<a href="${l[0]}" class="${active === l[2] ? "on" : ""}">${l[1]}</a>`).join("");
  const who = s.codename ? `<span class="meta" style="color:inherit;opacity:.75">AGENT ${esc(s.codename)} // ${esc(rankName())}</span>` : "";
  const h = document.createElement("div");
  h.innerHTML = `
    <header class="top">
      <div class="brand">&#9670; <span class="glitch" data-text="SHADOW ACADEMY">SHADOW ACADEMY</span></div>
      <nav>${links}</nav>
      ${who}
      <div class="controls">
        <button class="ctrl" id="themeBtn" title="Switch light / dark theme"></button>
        <button class="ctrl" id="muteBtn" title="Mute or unmute sound"></button>
      </div>
    </header>
    <div class="ticker"><span>TOP SECRET &#9679; EYES ONLY &#9679; DESTROY AFTER READING &#9679; TRUST NO ONE &#9679; OBSERVE EVERYTHING &#9679; REVEAL NOTHING &#9679; TOP SECRET &#9679; EYES ONLY &#9679; DESTROY AFTER READING &#9679;</span></div>`;
  document.body.prepend(...h.children);
}
function controls() {
  const mb = document.getElementById("muteBtn"), tb = document.getElementById("themeBtn");
  if (!mb || !tb) return;
  const paint = () => {
    mb.textContent = SFX.isMuted() ? "🔇 MUTED" : "🔊 SOUND";
    tb.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀ LIGHT" : "☾ DARK";
  };
  mb.addEventListener("click", () => { SFX.toggle(); paint(); SFX.click(); });
  tb.addEventListener("click", () => { toggleTheme(); paint(); SFX.click(); });
  paint();
}

/* ---------- typewriter ---------- */
function typewriter(el, speed, cb) {
  const text = el.getAttribute("data-type") || el.textContent;
  el.textContent = "";
  el.classList.add("tw");
  let i = 0;
  const t = setInterval(() => {
    el.textContent += text.charAt(i++);
    if (i % 2 === 0) SFX.tick();
    if (i >= text.length) {
      clearInterval(t);
      el.classList.add("done");
      if (cb) cb();
    }
  }, speed || 28);
}
function runTypewriters() {
  const els = [...document.querySelectorAll("[data-type]")];
  let delay = 300;
  els.forEach(el => {
    const txt = el.getAttribute("data-type") || "";
    el.textContent = "";
    setTimeout(() => typewriter(el, 24), delay);
    delay += txt.length * 24 + 250;
  });
}

/* ---------- cinematic title card (letterbox bars, REC, timecode) ---------- */
function titleCard(o, done) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { if (done) done(); return; }
  const el = document.createElement("div");
  el.className = "titlecard";
  el.innerHTML = `<i class="bar top"></i><i class="bar bot"></i>
    <div class="tc-rec">&#9679; REC</div><div class="tc-time">00:00:00:00</div>
    <div class="tc-body"><div class="tc-kicker">${esc(o.kicker || "")}</div><div class="tc-title"></div><div class="tc-sub">${esc(o.sub || "")}</div><div class="tc-skip">tap to skip</div></div>`;
  document.body.appendChild(el);
  document.body.classList.add("tc-on");
  const title = o.title || "", t0 = performance.now();
  const tEl = el.querySelector(".tc-title"), clk = el.querySelector(".tc-time");
  let i = 0, ended = false;
  const typer = setInterval(() => { tEl.textContent = title.slice(0, ++i); if (i % 2 === 0) SFX.tick(); if (i >= title.length) clearInterval(typer); }, 45);
  const frames = setInterval(() => {
    const ms = performance.now() - t0;
    clk.textContent = "00:00:" + pad2(Math.floor(ms / 1000)) + ":" + pad2(Math.floor((ms % 1000) / 1000 * 24));
  }, 40);
  SFX.riser();
  function end() {
    if (ended) return;
    ended = true;
    clearInterval(typer); clearInterval(frames);
    SFX.boom();
    el.classList.add("out");
    document.body.classList.remove("tc-on");
    setTimeout(() => el.remove(), 750);
    if (done) done();
  }
  setTimeout(end, o.ms || 2400);
  el.addEventListener("click", end);
  document.addEventListener("keydown", end, { once: true });
}
function titleCardOnce(key, o, done) {
  let seen = false;
  try { seen = !!sessionStorage.getItem("tc_" + key); sessionStorage.setItem("tc_" + key, "1"); } catch (e) {}
  if (seen) { if (done) done(); } else titleCard(o, done);
}

/* ---------- fx ---------- */
function pageTransitions() {
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.classList.contains("locked")) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("http")) return;
    e.preventDefault();
    SFX.click();
    document.body.classList.add("leaving");
    setTimeout(() => { location.href = href; }, 320);
  });
}
function crosshair() {
  if (matchMedia("(hover:none)").matches) return;
  const x = document.createElement("div");
  x.id = "xhair";
  document.body.appendChild(x);
  document.addEventListener("mousemove", e => {
    x.style.left = e.clientX + "px";
    x.style.top = e.clientY + "px";
    x.classList.add("on");
  });
  document.addEventListener("mouseover", e => {
    x.classList.toggle("big", !!e.target.closest("a,button,label,.redact"));
  });
}
function redactions() {
  document.querySelectorAll(".redact").forEach(r => r.addEventListener("click", () => { r.classList.toggle("open"); SFX.click(); }));
}
function toast(html) {
  let w = document.querySelector(".toast-wrap");
  if (!w) { w = document.createElement("div"); w.className = "toast-wrap"; document.body.appendChild(w); }
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = html;
  w.appendChild(t);
  SFX.toast();
  setTimeout(() => { t.style.transition = "opacity .4s"; t.style.opacity = "0"; setTimeout(() => t.remove(), 450); }, 2600);
}
/* overlay(title, html message, primary label, primary action, [secondary label, secondary action]) */
function overlay(title, msg, btnText, onClick, btn2Text, onClick2) {
  const o = document.createElement("div");
  o.className = "overlay";
  o.innerHTML = `<div class="stamp ok slam" style="--sd:.1s">${title}</div><p>${msg}</p>
    <div class="ov-btns"><button class="btn" data-b="1">${btnText}</button>${btn2Text ? `<button class="btn ghost" data-b="2">${btn2Text}</button>` : ""}</div>`;
  o.querySelector('[data-b="1"]').addEventListener("click", () => { o.remove(); if (onClick) onClick(); });
  const b2 = o.querySelector('[data-b="2"]');
  if (b2) b2.addEventListener("click", () => { o.remove(); if (onClick2) onClick2(); });
  document.body.appendChild(o);
  setTimeout(() => SFX.thud(), 330);
  setTimeout(() => SFX.success(), 650);
}

/* ---------- guard + boot ---------- */
function boot(page) {
  const s = state();
  if (page !== "index" && !s.codename) { location.replace("index.html"); return false; }
  renderHeader(page);
  controls();
  pageTransitions();
  crosshair();
  redactions();
  if (page !== "index") reminderLoop();
  return true;
}
