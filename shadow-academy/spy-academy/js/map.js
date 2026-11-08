/* Animated tactical map background: drifting grid, station nodes, arcs and data pulses.
   Pure canvas, no assets. Pauses when the tab is hidden; static if reduced motion is on. */
(function () {
  const cv = document.createElement("canvas");
  cv.id = "map";
  document.body.insertBefore(cv, document.body.firstChild);
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0;

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const R = rng(20261108);
  const names = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF", "HOTEL", "INDIA", "JULIET", "KILO", "LIMA", "MIKE", "NOVEMBER"];
  const nodes = names.map(n => ({ u: R(), v: R(), n: n, ph: R() * 6.28 }));
  const links = [];
  nodes.forEach((a, i) => {
    nodes.map((b, j) => ({ j: j, d: Math.pow(a.u - b.u, 2) + Math.pow(a.v - b.v, 2) }))
      .filter(o => o.j !== i).sort((x, y) => x.d - y.d).slice(0, 2)
      .forEach(o => {
        if (!links.some(l => (l.a === i && l.b === o.j) || (l.a === o.j && l.b === i))) {
          links.push({ a: i, b: o.j, t: R(), s: 0.05 + R() * 0.08, bend: (R() - 0.5) * 0.5 });
        }
      });
  });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduce) draw(0);
  }
  function palette() {
    return document.documentElement.getAttribute("data-theme") === "dark"
      ? { ink: "95,212,122", red: "255,77,87", a: 1.0 }
      : { ink: "29,27,22", red: "179,32,42", a: 0.9 };
  }
  function pt(n) { return { x: n.u * W, y: n.v * H }; }
  function ctrl(p, q, bend) {
    return { x: (p.x + q.x) / 2 - (q.y - p.y) * bend, y: (p.y + q.y) / 2 + (q.x - p.x) * bend };
  }

  function draw(t) {
    const P = palette();
    ctx.clearRect(0, 0, W, H);

    // drifting grid
    const g = 70, off = (t * 4) % g;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(" + P.ink + "," + (0.07 * P.a) + ")";
    ctx.beginPath();
    for (let x = -g + off; x < W + g; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = -g + off * 0.6; y < H + g; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    // arcs
    links.forEach(l => {
      const p = pt(nodes[l.a]), q = pt(nodes[l.b]), c = ctrl(p, q, l.bend);
      ctx.strokeStyle = "rgba(" + P.ink + "," + (0.16 * P.a) + ")";
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(c.x, c.y, q.x, q.y); ctx.stroke();
      // travelling pulse
      const u = (l.t + t * l.s) % 1, w = 1 - u;
      const x = w * w * p.x + 2 * w * u * c.x + u * u * q.x;
      const y = w * w * p.y + 2 * w * u * c.y + u * u * q.y;
      ctx.fillStyle = "rgba(" + P.red + ",.85)";
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 6.283); ctx.fill();
    });

    // nodes + pings + labels
    ctx.font = "10px 'Courier New', monospace";
    nodes.forEach(n => {
      const p = pt(n);
      const ping = ((t * 0.5 + n.ph) % 3) / 3;
      ctx.strokeStyle = "rgba(" + P.red + "," + (0.5 * (1 - ping)) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, 3 + ping * 22, 0, 6.283); ctx.stroke();
      ctx.fillStyle = "rgba(" + P.ink + "," + (0.55 * P.a) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(" + P.ink + "," + (0.4 * P.a) + ")";
      ctx.fillText(n.n, p.x + 8, p.y - 6);
    });

    // slow horizontal scan band
    const sy = ((t * 40) % (H + 200)) - 100;
    const grad = ctx.createLinearGradient(0, sy - 60, 0, sy + 60);
    grad.addColorStop(0, "rgba(" + P.red + ",0)");
    grad.addColorStop(0.5, "rgba(" + P.red + ",.06)");
    grad.addColorStop(1, "rgba(" + P.red + ",0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, sy - 60, W, 120);
  }

  let last = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (document.hidden || ts - last < 33) return;
    last = ts;
    draw(ts / 1000);
  }
  window.addEventListener("resize", resize);
  resize();
  if (!reduce) requestAnimationFrame(loop);
})();
