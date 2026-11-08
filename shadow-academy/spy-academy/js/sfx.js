/* SFX: tiny synthesized sound engine (Web Audio, no audio files needed).
   Browsers only allow sound after a user gesture, so everything stays silent until the first click/tap/key. */
const SFX = (function () {
  let ctx = null, unlocked = false, scan = null;
  let muted = false;
  try { muted = localStorage.getItem("spy_mute") === "1"; } catch (e) {}

  function ac() {
    if (!unlocked) return null;
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function unlock() { unlocked = true; ac(); }
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, unlock, { once: true, passive: true });
  });

  function tone(freq, dur, type, vol, when, slideTo) {
    if (muted) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime + (when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol, cutoff) {
    if (muted) return;
    const c = ac(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff || 400;
    const g = c.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start();
  }

  return {
    tick: function () { tone(1500 + Math.random() * 500, 0.03, "square", 0.015); },
    click: function () { tone(700, 0.05, "square", 0.04); },
    thud: function () { noise(0.28, 0.5, 260); tone(95, 0.3, "sine", 0.18, 0, 40); },
    beep: function () { tone(880, 0.09, "square", 0.05); tone(1320, 0.12, "square", 0.05, 0.11); },
    success: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.28, "sine", 0.08, i * 0.11); });
    },
    deny: function () { tone(150, 0.25, "sawtooth", 0.06, 0, 90); },
    riser: function () { tone(80, 1.8, "sawtooth", 0.025, 0, 520); },
    boom: function () { noise(0.5, 0.55, 180); tone(70, 0.6, "sine", 0.2, 0, 28); },
    toast: function () { tone(1040, 0.08, "sine", 0.05); tone(1560, 0.1, "sine", 0.04, 0.07); },
    scanStart: function () {
      if (muted) return;
      const c = ac(); if (!c || scan) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(90, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(420, c.currentTime + 1.8);
      g.gain.value = 0.025;
      o.connect(g); g.connect(c.destination); o.start();
      scan = { o: o, g: g };
    },
    scanStop: function () {
      if (!scan || !ctx) { scan = null; return; }
      try {
        scan.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        scan.o.stop(ctx.currentTime + 0.1);
      } catch (e) {}
      scan = null;
    },
    isMuted: function () { return muted; },
    toggle: function () {
      muted = !muted;
      try { localStorage.setItem("spy_mute", muted ? "1" : "0"); } catch (e) {}
      if (muted) this.scanStop();
      return muted;
    }
  };
})();
