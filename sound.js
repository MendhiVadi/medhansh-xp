// Windows-style sound scheme, synthesized at runtime (no audio files). One AudioContext, shared with the games.
(() => {
  const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const volume = () => { if (read("xp-mute") === "1") return 0; const v = parseInt(read("xp-vol"), 10); return (v >= 0 && v <= 100 ? v : 70) / 100; };
  let ac = null, bus = null, echo = null, noiseBuf = null;

  function context() {
    if (ac) return ac;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { ac = new C(); } catch { return null; }
    bus = ac.createDynamicsCompressor(); bus.connect(ac.destination);
    // a short filtered echo gives the chimes their roomy feel
    const d = ac.createDelay(1), fb = ac.createGain(), lp = ac.createBiquadFilter();
    d.delayTime.value = 0.17; fb.gain.value = 0.32; lp.type = "lowpass"; lp.frequency.value = 2600;
    echo = ac.createGain(); echo.gain.value = 0.5;
    echo.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(bus);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = noiseBuf.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ac;
  }
  const unlock = () => { const c = context(); if (c && c.state === "suspended") c.resume().catch(() => {}); };
  addEventListener("pointerdown", unlock, true); addEventListener("keydown", unlock, true);
  // browsers keep audio suspended until the first gesture; a sound asked for before that is dropped, not played late
  const whenRunning = (fn) => {
    const c = context(); if (!c) return;
    if (c.state === "running") return fn();
    if (navigator.userActivation?.isActive) c.resume().then(fn).catch(() => {});
  };

  function tone(t, f, dur, { type = "sine", gain = 0.2, attack = 0.004, slide = 0, wet = 0, lp = 0, detune = 0 } = {}) {
    const v = volume(); if (!v) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain * v, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = o;
    if (lp) { const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; o.connect(fl); out = fl; }
    out.connect(g); g.connect(bus);
    if (wet) { const s = ac.createGain(); s.gain.value = wet; g.connect(s); s.connect(echo); }
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(t, dur, { gain = 0.2, lp = 4000, hp = 0, attack = 0.002, wet = 0, sweep = 0 } = {}) {
    const v = volume(); if (!v) return;
    const s = ac.createBufferSource(), g = ac.createGain(), fl = ac.createBiquadFilter();
    s.buffer = noiseBuf; s.loop = true; fl.type = "lowpass"; fl.frequency.setValueAtTime(lp, t);
    if (sweep) fl.frequency.exponentialRampToValueAtTime(Math.max(40, sweep), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain * v, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl);
    if (hp) { const h = ac.createBiquadFilter(); h.type = "highpass"; h.frequency.value = hp; fl.connect(h); h.connect(g); } else fl.connect(g);
    g.connect(bus);
    if (wet) { const w = ac.createGain(); w.gain.value = wet; g.connect(w); w.connect(echo); }
    s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.03);
  }
  // a bell: the fundamental plus two quick, slightly sharp overtones
  const bell = (t, f, dur, gain = 0.2, wet = 0.5) => { tone(t, f, dur, { gain, wet }); tone(t, f * 2.01, dur * 0.55, { gain: gain * 0.35, wet }); tone(t, f * 3.98, dur * 0.25, { gain: gain * 0.12, wet }); };
  // a pad: two detuned, softened triangles with a slow swell
  const pad = (t, f, dur, gain = 0.08) => { for (const d of [-7, 7]) tone(t, f, dur, { type: "triangle", gain, attack: 0.28, detune: d, lp: 1500, wet: 0.7 }); };
  const brass = (t, f, dur, gain = 0.14) => { tone(t, f, dur, { type: "sawtooth", gain, attack: 0.015, lp: 2600, wet: 0.4 }); tone(t, f * 2, dur * 0.7, { type: "square", gain: gain * 0.18, lp: 3200, wet: 0.3 }); };
  const click = (t, gain = 0.1, f = 2600) => { noise(t, 0.018, { gain, lp: 7000, hp: 900 }); tone(t, f, 0.018, { gain: gain * 0.5 }); };

  const SCHEME = {
    startup(t) { [233, 311, 466].forEach((f) => pad(t, f, 2.6, 0.06)); [[311, 0, 1], [466, 0.2, 1], [622, 0.42, 1.1], [831, 0.64, 1.3], [698, 1.02, 1.8]].forEach(([f, d, l]) => bell(t + d, f, l, 0.17)); },
    logon(t) { [[415, 0, 0.7], [622, 0.16, 0.8], [932, 0.32, 1.1]].forEach(([f, d, l]) => bell(t + d, f, l, 0.15)); },
    logoff(t) { [[932, 0, 0.7], [622, 0.18, 0.8], [415, 0.36, 1.2]].forEach(([f, d, l]) => bell(t + d, f, l, 0.15)); },
    shutdown(t) { [156, 233, 311].forEach((f) => pad(t, f, 2.2, 0.06)); [[831, 0, 0.9], [622, 0.26, 0.9], [466, 0.52, 1], [311, 0.8, 1.7]].forEach(([f, d, l]) => bell(t + d, f, l, 0.16)); },
    ding(t) { bell(t, 1047, 0.5, 0.15); bell(t + 0.09, 1319, 0.7, 0.13); },
    exclaim(t) { bell(t, 784, 0.5, 0.17); bell(t + 0.14, 659, 0.7, 0.15); },
    critical(t) { for (const [f, d] of [[220, 0], [196, 0.17]]) { tone(t + d, f, 0.42, { type: "square", gain: 0.11, lp: 1100, wet: 0.5 }); tone(t + d, f * 1.5, 0.42, { type: "triangle", gain: 0.09, lp: 1400, wet: 0.5 }); } },
    notify(t) { tone(t, 659, 0.3, { gain: 0.14, wet: 0.6 }); tone(t + 0.13, 880, 0.3, { gain: 0.13, wet: 0.6 }); tone(t + 0.26, 1047, 0.45, { gain: 0.12, wet: 0.6 }); },
    balloon(t) { tone(t, 330, 0.09, { gain: 0.14, slide: 660 }); bell(t + 0.07, 1319, 0.4, 0.09); },
    minimize(t) { tone(t, 900, 0.13, { gain: 0.07, slide: 280, wet: 0.2 }); noise(t, 0.12, { gain: 0.03, lp: 2500, sweep: 400 }); },
    restore(t) { tone(t, 280, 0.13, { gain: 0.07, slide: 900, wet: 0.2 }); noise(t, 0.12, { gain: 0.03, lp: 500, sweep: 2500 }); },
    maximize(t) { tone(t, 420, 0.1, { gain: 0.06, slide: 840, wet: 0.2 }); },
    menu(t) { click(t, 0.07, 1900); },
    start(t) { click(t, 0.09, 1500); click(t + 0.045, 0.05, 2100); },
    recycle(t) { for (let i = 0; i < 5; i++) noise(t + i * 0.055 + Math.random() * 0.02, 0.05, { gain: 0.1, lp: 3500 + Math.random() * 2500, hp: 700 }); },
    tada(t) { [[523, 0, 0.2], [659, 0.1, 0.2], [784, 0.2, 0.2], [1047, 0.3, 0.9]].forEach(([f, d, l]) => brass(t + d, f, l)); [523, 659, 784].forEach((f) => brass(t + 0.3, f, 0.9, 0.07)); noise(t + 0.3, 0.8, { gain: 0.05, lp: 9000, hp: 4000, wet: 0.5 }); },
    levelup(t) { [523, 659, 784, 1047, 1319].forEach((f, i) => bell(t + i * 0.075, f, 0.45, 0.11, 0.4)); },
    lose(t) { [392, 330, 262, 196].forEach((f, i) => tone(t + i * 0.14, f, 0.26, { type: "sawtooth", gain: 0.09, lp: 900 })); },
    post(t) { tone(t, 1000, 0.16, { type: "square", gain: 0.05 }); },
    flick(t) { noise(t, 0.035, { gain: 0.1, lp: 5200, hp: 1400 }); },
    place(t) { noise(t, 0.05, { gain: 0.11, lp: 1500 }); tone(t, 170, 0.05, { gain: 0.08, type: "triangle" }); },
    flip(t) { noise(t, 0.05, { gain: 0.07, lp: 3400, hp: 900, sweep: 6500 }); },
    shuffle(t) { for (let i = 0; i < 9; i++) noise(t + i * 0.042, 0.03, { gain: 0.08, lp: 4800, hp: 1100 }); },
    tick(t) { click(t, 0.05, 1200); },
    boom(t) { noise(t, 0.55, { gain: 0.34, lp: 1800, sweep: 90, wet: 0.5 }); tone(t, 150, 0.55, { gain: 0.3, slide: 36, type: "triangle" }); },
    pop(t) { noise(t, 0.16, { gain: 0.14, lp: 1100, sweep: 120 }); tone(t, 110, 0.14, { gain: 0.1, slide: 48, type: "triangle" }); },
    laser(t) { tone(t, 1500, 0.09, { type: "square", gain: 0.035, slide: 340 }); },
    powerup(t) { [523, 784, 1047, 1568].forEach((f, i) => tone(t + i * 0.05, f, 0.13, { type: "triangle", gain: 0.1, wet: 0.3 })); },
    bumper(t) { tone(t, 520, 0.09, { type: "square", gain: 0.06, slide: 780, lp: 3000 }); noise(t, 0.03, { gain: 0.06, lp: 6000, hp: 1500 }); },
    plunger(t) { noise(t, 0.28, { gain: 0.11, lp: 700, sweep: 3200 }); tone(t, 130, 0.28, { type: "sawtooth", gain: 0.07, slide: 620, lp: 1800 }); },
    tilt(t) { tone(t, 140, 0.6, { type: "sawtooth", gain: 0.14, lp: 800 }); tone(t, 148, 0.6, { type: "square", gain: 0.06, lp: 600 }); },
  };

  window.XPS = {
    // system sounds obey the Sounds setting; force plays regardless (the games have their own switch). Both obey volume and mute.
    play(name, force) {
      if (!force && read("xp-sounds") === "0") return;
      const fn = SCHEME[name]; if (!fn || !volume()) return;
      whenRunning(() => { try { fn(ac.currentTime + 0.005); } catch (e) { console.error("sound " + name, e); } });
    },
    // freq Hz, dur seconds, wave, relative gain, optional glide target Hz, start delay seconds
    blip(freq, dur = 0.06, type = "square", gain = 1, slide = 0, delay = 0) {
      if (!volume()) return;
      whenRunning(() => { try { tone(ac.currentTime + delay, freq, dur, { type, gain: 0.12 * gain, slide, attack: 0.002 }); } catch {} });
    },
    names: Object.keys(SCHEME),
  };
})();
