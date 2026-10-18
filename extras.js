// Extra desktop apps: Calculator, Media Player, My Pictures (+ Picture and Fax Viewer), Task Manager.
// Each app: (body, ctx) like games.js. Exposed as window.EXTRAS = { calculator, mediaplayer, pictures, taskmgr }.
(() => {
  const BAR = `<div class="menubar" style="background:#ece9d8;color:#000"></div>`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const listen = (ctx, target, type, fn, opt) => { target.addEventListener(type, fn, opt); ctx.onClose(() => target.removeEventListener(type, fn, opt)); };
  const every = (ctx, ms, fn) => { const id = setInterval(fn, ms); ctx.onClose(() => clearInterval(id)); return id; };
  const observe = (ctx, el, fn) => { if (!window.ResizeObserver) return; const ro = new ResizeObserver(fn); ro.observe(el); ctx.onClose(() => ro.disconnect()); };
  const mmss = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  // rAF loop that sleeps while the window is minimized / tab hidden. step(dt, rawDt)
  const loop = (ctx, step) => {
    let raf = 0, last = 0, dead = false;
    const frame = (t) => {
      if (dead) return;
      const raw = last ? t - last : 0; last = t;
      if (ctx.isVisible() && !document.hidden) { if (raw) step(Math.min(50, raw), raw); } else last = 0;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    ctx.onClose(() => { dead = true; cancelAnimationFrame(raf); });
  };

  // ---- one shared stylesheet, injected on first use ----
  const css = () => {
    if (document.getElementById("x-extras-css")) return;
    const st = document.createElement("style"); st.id = "x-extras-css";
    st.textContent = `
.x-root{display:flex;flex-direction:column;height:100%;min-height:0;font:11px Tahoma,sans-serif;color:#000}
.x-calc{flex:1;min-height:0;background:#ece9d8;padding:6px;display:flex;flex-direction:column;gap:5px}
.x-calc .disp{background:#fff;border:2px inset #fff;border-color:#7f9db9 #fff #fff #7f9db9;text-align:right;font:18px "Lucida Console",monospace;padding:3px 5px;height:26px;line-height:26px;overflow:hidden;white-space:nowrap}
.x-calc .row0{display:flex;gap:4px;align-items:stretch}
.x-calc .mind{width:34px;border:1px solid #7f9db9;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold}
.x-calc .row0 button{flex:1}
.x-calc .grid{flex:1;min-height:0;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(4,1fr);gap:4px}
.x-calc button{font:bold 11px Tahoma,sans-serif;padding:0;min-width:0;border:1px solid #003c74;border-radius:3px;background:linear-gradient(#fff,#ecebe6 86%,#d6d0c5);cursor:pointer}
.x-calc button:hover{box-shadow:inset 0 0 0 2px #f8b330}.x-calc button:active{background:#e3e3db}
.x-calc .r{color:#c00}.x-calc .b{color:#0000c8}
.x-wmp{flex:1;min-height:0;display:flex;flex-direction:column;background:#0a1f44;color:#cfe3ff}
.x-wmp .main{flex:1;min-height:0;display:flex}
.x-wmp .vis{flex:1;min-width:0;position:relative;background:#000}
.x-wmp canvas{display:block;width:100%;height:100%;cursor:pointer}
.x-wmp .np{position:absolute;left:8px;bottom:6px;right:8px;color:#8fd0ff;font:bold 12px Tahoma;text-shadow:0 0 4px #000;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.x-wmp .pl{width:150px;flex-shrink:0;background:linear-gradient(#17356b,#0a1f44);border-left:1px solid #3a63a8;overflow:auto}
.x-wmp .pl div{padding:4px 6px;display:flex;gap:6px;cursor:default;border-bottom:1px solid #1d3f7a;white-space:nowrap}
.x-wmp .pl div span:nth-child(2){flex:1;overflow:hidden;text-overflow:ellipsis}
.x-wmp .pl div:hover{background:#244a8f}.x-wmp .pl div.on{background:#3b78d8;color:#fff;font-weight:bold}
.x-wmp .ctl{flex-shrink:0;padding:5px 8px 7px;background:linear-gradient(#5d8fd8,#2b5aa8 45%,#1a3f86);border-top:1px solid #9dc1f5}
.x-wmp .seek{width:100%;margin:0 0 4px}
.x-wmp .btns{display:flex;align-items:center;gap:4px}
.x-wmp .btns button{width:28px;height:28px;border-radius:50%;border:1px solid #0a2a66;background:radial-gradient(circle at 50% 30%,#e9f3ff,#8fb8ee 60%,#4d82cf);color:#06285a;font-size:12px;cursor:pointer;padding:0}
.x-wmp .btns button.big{width:36px;height:36px;font-size:15px}
.x-wmp .btns button.on{background:radial-gradient(circle at 50% 30%,#fff7c8,#ffd35a 60%,#e8a010)}
.x-wmp .btns button:active{filter:brightness(.85)}
.x-wmp .tm{font:bold 12px Tahoma;margin-left:6px;color:#fff;min-width:80px}
.x-wmp .vol{width:70px;margin-left:auto}
.x-pics{flex:1;min-height:0;display:flex;flex-direction:column;background:#fff;position:relative}
.x-pics .grid{flex:1;overflow:auto;padding:8px;display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start}
.x-pics .th{width:96px;padding:4px;border:1px solid transparent;text-align:center;cursor:default}
.x-pics .th .im{width:86px;height:72px;margin:0 auto 3px;background:#fff;border:1px solid #aca899;box-shadow:2px 2px 3px #0003;display:flex;align-items:center;justify-content:center;overflow:hidden}
.x-pics .th img{max-width:100%;max-height:100%;object-fit:cover;width:100%;height:100%}
.x-pics .th span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1px 2px}
.x-pics .th.sel{background:#d5e4fb;border-color:#7da2ce}.x-pics .th.sel span{background:#316ac5;color:#fff}
.x-pics .vw{flex:1;min-height:0;overflow:auto;background:#3c3c3c;display:flex}
.x-pics .vw .wrap{position:relative;margin:auto;flex-shrink:0}
.x-pics .vw img{position:absolute;left:50%;top:50%;transform-origin:center;max-width:none}
.x-pics .drop{position:absolute;inset:0;border:3px dashed #316ac5;background:#316ac522;pointer-events:none;display:none;z-index:5}
.x-pics.dragging .drop{display:block}
.x-pics .empty{margin:auto;color:#666;text-align:center;padding:20px}
.x-tm{flex:1;min-height:0;background:#ece9d8;padding:6px 6px 0;display:flex;flex-direction:column}
.x-tm .tabs{display:flex;gap:1px;padding-left:2px;position:relative;top:1px}
.x-tm .tabs button{font:11px Tahoma;padding:3px 10px;border:1px solid #919b9c;border-bottom:none;border-radius:3px 3px 0 0;background:#f4f3ee;cursor:pointer}
.x-tm .tabs button.on{background:#fcfcfe;font-weight:bold;padding-top:4px}
.x-tm .pg{flex:1;min-height:0;border:1px solid #919b9c;background:#fcfcfe;padding:8px;display:flex;flex-direction:column;gap:6px;overflow:auto}
.x-tm .list{flex:1;min-height:0;background:#fff;border:1px solid #7f9db9;overflow:auto}
.x-tm table{width:100%;border-collapse:collapse}
.x-tm th{text-align:left;font-weight:normal;padding:2px 6px;background:linear-gradient(#fff,#ece9d8);border:1px solid #d6d3c3;position:sticky;top:0}
.x-tm td{padding:2px 6px;white-space:nowrap}
.x-tm tr.sel td{background:#316ac5;color:#fff}
.x-tm .acts{display:flex;gap:6px;justify-content:flex-end}
.x-tm .acts button{min-width:80px}
.x-tm fieldset{border:1px solid #d0d0bf;padding:4px 8px 6px;margin:0}
.x-tm legend{padding:0 3px}
.x-tm .gr{display:flex;gap:6px}
.x-tm canvas{background:#000;border:1px inset #888;display:block}
.x-tm .nums{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px}
.x-tm .nums div{display:flex;justify-content:space-between}
.x-tm .foot{flex-shrink:0}
`;
    document.head.appendChild(st);
  };
  const mkBar = (ctx, body, menus) => ctx.menu(body.querySelector(".menubar"), menus);

  // =====================================================================
  //  Calculator (Standard)
  // =====================================================================
  function calculator(body, ctx) {
    css();
    body.innerHTML = BAR + `<div class="x-root"><div class="x-calc"><div class="disp">0</div><div class="row0"><div class="mind"></div>
      <button data-a="back" class="r">Backspace</button><button data-a="ce" class="r">CE</button><button data-a="c" class="r">C</button></div><div class="grid"></div></div></div>`;
    const dispEl = body.querySelector(".disp"), mind = body.querySelector(".mind");
    let disp = "0", acc = null, op = null, fresh = true, err = false, mem = 0, hasMem = false, lastOp = null, lastB = null;
    const val = () => parseFloat(disp) || 0;
    const fmt = (n) => {
      n = Number(n.toPrecision(12)); let s = String(n);
      if (n !== 0 && (Math.abs(n) >= 1e21 || Math.abs(n) < 1e-7)) s = n.toExponential();
      return s;
    };
    const show = () => { dispEl.textContent = disp; dispEl.style.fontSize = disp.length > 14 && !err ? "13px" : err ? "12px" : "18px"; mind.textContent = hasMem ? "M" : ""; };
    const setErr = (m) => { disp = m; err = true; acc = null; op = null; lastOp = null; fresh = true; show(); };
    const clr = () => { disp = "0"; acc = null; op = null; fresh = true; err = false; lastOp = null; show(); };
    const calc = (a, o, b) => {
      if (o === "/" && b === 0) { setErr("Cannot divide by zero"); return null; }
      const r = o === "+" ? a + b : o === "-" ? a - b : o === "*" ? a * b : a / b;
      if (!isFinite(r)) { setErr("Overflow"); return null; }
      return r;
    };
    const unary = (f) => { if (err) return; const r = f(val()); if (r == null) return; if (!isFinite(r)) return setErr("Cannot divide by zero"); disp = fmt(r); fresh = true; show(); };
    const A = {
      digit(d) { if (err) clr(); if (fresh) { disp = d; fresh = false; } else if (disp === "0") disp = d; else if (disp.replace(/[-.]/g, "").length < 16) disp += d; show(); },
      dot() { if (err) clr(); if (fresh) { disp = "0."; fresh = false; } else if (!disp.includes(".")) disp += "."; show(); },
      back() { if (err || fresh) return; disp = disp.length > 1 && !(disp.length === 2 && disp[0] === "-") ? disp.slice(0, -1) : "0"; show(); },
      ce() { if (err) return clr(); disp = "0"; fresh = true; show(); },
      c: clr,
      bin(o) {
        if (err) return;
        if (op && !fresh) { const r = calc(acc, op, val()); if (r == null) return; acc = r; disp = fmt(r); } else if (!op) acc = val();
        op = o; fresh = true; lastOp = null; show();
      },
      eq() {
        if (err) return;
        let r;
        if (op) { const b = val(); r = calc(acc, op, b); if (r == null) return; lastOp = op; lastB = b; op = null; acc = null; }
        else if (lastOp) { r = calc(val(), lastOp, lastB); if (r == null) return; }
        else { fresh = true; return; }
        disp = fmt(r); fresh = true; show();
      },
      sign() { if (err) return; if (val() !== 0 || disp.includes(".")) disp = disp[0] === "-" ? disp.slice(1) : "-" + disp; show(); },
      pct() { unary((v) => (op ? acc * v / 100 : 0)); },
      inv() { if (err) return; if (val() === 0) return setErr("Cannot divide by zero"); unary((v) => 1 / v); },
      sqrt() { if (err) return; if (val() < 0) return setErr("Invalid input for function"); unary(Math.sqrt); },
      mc() { mem = 0; hasMem = false; show(); },
      mr() { if (!hasMem) return; if (err) clr(); disp = fmt(mem); fresh = true; show(); },
      ms() { if (err) return; mem = val(); hasMem = true; fresh = true; show(); },
      mp() { if (err) return; mem += val(); hasMem = true; fresh = true; show(); },
    };
    const rows = [
      [["MC", "mc", "r"], ["7", "d7", "b"], ["8", "d8", "b"], ["9", "d9", "b"], ["÷", "o/", "r"]],
      [["MR", "mr", "r"], ["4", "d4", "b"], ["5", "d5", "b"], ["6", "d6", "b"], ["×", "o*", "r"]],
      [["MS", "ms", "r"], ["1", "d1", "b"], ["2", "d2", "b"], ["3", "d3", "b"], ["−", "o-", "r"]],
      [["M+", "mp", "r"], ["0", "d0", "b"], ["±", "sign", "b"], [".", "dot", "b"], ["+", "o+", "r"]],
    ];
    const extra = [["√", "sqrt", "b"], ["%", "pct", "b"], ["1/x", "inv", "b"], ["=", "eq", "r"]];
    const grid = body.querySelector(".grid");
    grid.style.gridTemplateColumns = "repeat(6,1fr)";
    const mk = ([l, a, c]) => `<button data-a="${a}" class="${c}">${esc(l)}</button>`;
    grid.innerHTML = rows.map((r, i) => r.map(mk).join("") + mk(extra[i])).join("");
    const run = (a) => {
      if (a[0] === "d") A.digit(a[1]); else if (a[0] === "o") A.bin(a[1]); else A[a]?.();
    };
    body.addEventListener("click", (e) => { const b = e.target.closest("button[data-a]"); if (b) run(b.dataset.a); });
    const KEYS = { "+": "o+", "-": "o-", "*": "o*", "/": "o/", Enter: "eq", "=": "eq", Backspace: "back", Escape: "c", Delete: "ce", ".": "dot", ",": "dot", "%": "pct", r: "inv", "@": "sqrt", F9: "sign" };
    listen(ctx, window, "keydown", (e) => {
      if (!ctx.isActive() || !ctx.isVisible() || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      let a = null;
      if (e.ctrlKey && !e.altKey) { a = { l: "mc", r: "mr", m: "ms", p: "mp" }[e.key.toLowerCase()] || null; }
      else if (e.metaKey || e.altKey) return;
      else if (/^[0-9]$/.test(e.key)) a = "d" + e.key; else a = KEYS[e.key] || null;
      if (a) { e.preventDefault(); run(a); }
    });
    const copy = () => { try { navigator.clipboard?.writeText(dispEl.textContent).catch(() => {}); } catch {} };
    const paste = async () => {
      try {
        const t = (await navigator.clipboard.readText()).trim().replace(/,/g, "");
        if (!/^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(t)) return;
        disp = fmt(parseFloat(t)); err = false; fresh = false; show();
      } catch {}
    };
    mkBar(ctx, body, [
      { label: "Edit", items: [{ label: "Copy", key: "Ctrl+C", act: copy }, { label: "Paste", key: "Ctrl+V", act: paste }] },
      { label: "View", items: [{ label: "Standard", check: true }, { label: "Scientific", disabled: true }] },
      { label: "Help", items: [{ label: "About Calculator", act: () => ctx.sys?.msg?.("About Calculator", "Windows Calculator<br>Standard mode.") }] },
    ]);
    listen(ctx, window, "copy", (e) => { if (ctx.isActive() && ctx.isVisible() && !getSelection().toString()) { e.clipboardData?.setData("text/plain", dispEl.textContent); e.preventDefault(); } });
    listen(ctx, window, "paste", (e) => {
      if (!ctx.isActive() || !ctx.isVisible() || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      const t = (e.clipboardData?.getData("text") || "").trim().replace(/,/g, "");
      if (/^-?\d*\.?\d+(e[+-]?\d+)?$/i.test(t)) { disp = fmt(parseFloat(t)); err = false; fresh = false; show(); e.preventDefault(); }
    });
    ctx.setTitle?.("Calculator");
    show();
  }

  // =====================================================================
  //  Windows Media Player (procedural WebAudio tracks, no audio files)
  // =====================================================================
  const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10], HMIN = [0, 2, 3, 5, 7, 8, 11];
  const TRACKS = [
    { name: "Bliss Horizon (Lo-Fi Synth)", artist: "Procedural Hills", bpm: 78, root: 57, scale: MAJ, prog: [0, 5, 3, 4], bars: 24, kick: "x.....x...x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.xx", bass: "x.....x.x.......", bassWave: "triangle", lead: "sine", dens: 0.45, pad: true, swing: 0.28 },
    { name: "Luna Chiptune", artist: "8-bit Moon", bpm: 140, root: 57, scale: MIN, prog: [0, 5, 2, 6], bars: 40, kick: "x.......x.x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "x.xxx.xxx.xxx.xx", bassWave: "square", bassLen: 1, lead: "square", dens: 0.7, arp: true },
    { name: "Dial-Up Dreams", artist: "56k Orchestra", bpm: 100, root: 52, scale: DOR, prog: [0, 3, 0, 4], bars: 28, kick: "x...x...x..x....", snare: "....x.......x..x", hat: "..x...x...x...x.", bass: "x..x..x.x..x..x.", bassWave: "sawtooth", lead: "sawtooth", dens: 0.5, pad: true, chirp: true },
    { name: "Start Menu Shuffle", artist: "Taskbar Trio", bpm: 112, root: 60, scale: MAJ, prog: [0, 3, 4, 3], bars: 30, kick: "x.....x...x...x.", snare: "....x.......x...", hat: "x.xxx.xxx.xxx.xx", bass: "x..x..x.x..x..x.", bassWave: "triangle", lead: "triangle", dens: 0.6, swing: 0.33 },
    { name: "Clippy's Lament", artist: "Office Assistant", bpm: 66, root: 55, scale: HMIN, prog: [0, 5, 3, 4], bars: 20, kick: "x.......x.......", snare: "........x.......", hat: "x...x...x...x...", bass: "x.......x.......", bassWave: "sine", bassLen: 4, lead: "triangle", dens: 0.4, pad: true },
  ];
  TRACKS.forEach((t) => { t.total = t.bars * 4 * 60 / t.bpm; });
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const hash = (i, s) => { let x = (i * 374761393 + s * 668265263) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

  function mediaplayer(body, ctx) {
    css();
    body.innerHTML = BAR + `<div class="x-root"><div class="x-wmp"><div class="main"><div class="vis"><canvas></canvas><div class="np"></div></div><div class="pl"></div></div>
      <div class="ctl"><input class="seek" type="range" min="0" max="1000" value="0"><div class="btns">
      <button class="shuf" title="Shuffle">&#8644;</button><button class="rep" title="Repeat">&#8635;</button><button class="stop" title="Stop">&#9632;</button>
      <button class="prev" title="Previous">&#9198;</button><button class="play big" title="Play">&#9654;</button><button class="next" title="Next">&#9197;</button>
      <button class="mute" title="Mute">&#128266;</button><span class="tm">00:00 / 0:00</span><input class="vol" type="range" min="0" max="100"></div></div></div></div>`;
    const $ = (s) => body.querySelector(s);
    const cv = $("canvas"), g2 = cv.getContext("2d"), npEl = $(".np"), plEl = $(".pl"), seek = $(".seek"), tmEl = $(".tm"), volEl = $(".vol");
    const playBtn = $(".play"), muteBtn = $(".mute");
    let AC = null, master = null, analyser = null, trackGain = null, noiseBuf = null, timer = 0;
    let cur = 0, playing = false, started = false, t0 = 0, nextI = 0, shuffle = false, repeat = false, mode = "bars", dragging = false;
    let vol = parseInt(ctx.store.lget("xp-vol"), 10); if (!(vol >= 0 && vol <= 100)) vol = 70;
    let muted = ctx.store.lget("xp-mute") === "1";
    volEl.value = vol;
    const tr = () => TRACKS[cur];
    const sd = () => 60 / tr().bpm / 4;

    plEl.innerHTML = TRACKS.map((t, i) => `<div data-i="${i}"><span>${i + 1}.</span><span title="${esc(t.artist)}">${esc(t.name)}</span><span>${mmss(t.total)}</span></div>`).join("");
    const paintList = () => {
      plEl.querySelectorAll("div").forEach((d, i) => d.classList.toggle("on", i === cur));
      npEl.textContent = `${tr().name} - ${tr().artist}`;
      ctx.setTitle?.(`${tr().name} - Windows Media Player`);
    };
    const gainVal = () => (muted ? 0 : vol / 100) * 0.9;
    const applyVol = () => { if (master) master.gain.setTargetAtTime(gainVal(), AC.currentTime, 0.02); muteBtn.classList.toggle("on", muted); muteBtn.innerHTML = muted ? "&#128263;" : "&#128266;"; };
    const ensureAC = () => {
      if (!AC) {
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
        try { AC = new C(); } catch { return false; }
        master = AC.createGain(); analyser = AC.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.78;
        master.connect(analyser); analyser.connect(AC.destination);
        noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        applyVol();
      }
      return true;
    };

    // ---- synth voices ----
    const note = (dest, t, f, dur, type, gain, o = {}) => {
      const osc = AC.createOscillator(), g = AC.createGain(); osc.type = type; osc.frequency.setValueAtTime(f, t);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + (o.att || 0.006)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(dest); osc.start(t); osc.stop(t + dur + 0.03);
    };
    const noise = (dest, t, dur, gain, type, freq) => {
      const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    };
    const stepTime = (i) => { const T = tr(); return t0 + i * sd() + (T.swing && (i & 1) ? sd() * T.swing : 0); };
    function playStep(T, i, t, dest) {
      const bar = i >> 4, s = i & 15, ch = T.prog[bar % T.prog.length], step = 60 / T.bpm / 4;
      const deg = (d) => T.root + T.scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
      if (bar >= 1) {
        if (T.kick[s] === "x") note(dest, t, 140, 0.18, "sine", 0.9, { slide: 40 });
        if (T.snare[s] === "x") { noise(dest, t, 0.14, 0.35, "bandpass", 1800); note(dest, t, 200, 0.08, "triangle", 0.2); }
      }
      if (T.hat[s] === "x") noise(dest, t, 0.04, bar >= 1 ? 0.16 : 0.08, "highpass", 7000);
      if (bar >= 1 && T.bass[s] === "x") note(dest, t, mtof(deg(ch) - 12), step * (T.bassLen || 2), T.bassWave, 0.32);
      if (s === 0 && T.pad) [0, 2, 4].forEach((k) => note(dest, t, mtof(deg(ch + k)), step * 16, "sine", 0.07, { att: 0.5 }));
      if (T.arp && s % 2 === 0) note(dest, t, mtof(deg(ch + [0, 2, 4, 7][(s >> 1) % 4]) + 12), step * 1.6, "square", 0.07);
      if ((bar & 7) >= 2 && s % 2 === 0 && hash(i, 1) < T.dens) {
        const pick = [0, 2, 4, 5, 7, 9][Math.floor(hash(i, 2) * 6)];
        note(dest, t, mtof(deg(ch + pick) + 12), step * (1 + Math.floor(hash(i, 3) * 3)), T.lead, 0.14, { att: T.lead === "sine" ? 0.03 : 0.008 });
      }
      if (T.chirp && s === 0 && bar % 4 === 3) { noise(dest, t, 0.6, 0.1, "bandpass", 1200); note(dest, t, 600, 0.5, "square", 0.04, { slide: 2400 }); }
    }
    const sched = () => {
      const T = tr(), total = T.bars * 16, end = AC.currentTime + 0.15;
      while (nextI < total && stepTime(nextI) < end) {
        const t = stepTime(nextI); if (t >= AC.currentTime - 0.05) playStep(T, nextI, t, trackGain); nextI++;
      }
    };
    const elapsed = () => (started && AC ? clamp(AC.currentTime - t0, 0, tr().total) : 0);
    const killTrack = () => { clearInterval(timer); timer = 0; if (trackGain) { try { trackGain.disconnect(); } catch {} trackGain = null; } };
    function startTrack(idx, pos = 0) {
      if (!ensureAC()) return ctx.sys?.msg?.("Windows Media Player", "Audio is not available in this browser.");
      killTrack(); cur = idx; AC.resume().catch(() => {});
      trackGain = AC.createGain(); trackGain.connect(master);
      t0 = AC.currentTime + 0.06 - pos; nextI = Math.floor(pos / sd()); started = true; playing = true;
      timer = setInterval(sched, 25); sched(); paintList(); paintBtns();
    }
    const play = () => { if (!ensureAC()) return; if (!started) startTrack(cur); else if (!playing) { AC.resume().catch(() => {}); playing = true; paintBtns(); } else { AC.suspend().catch(() => {}); playing = false; paintBtns(); } };
    const stop = () => { killTrack(); started = false; playing = false; if (AC) AC.suspend().catch(() => {}); paintBtns(); tick(); };
    const go = (idx, auto) => {
      if (shuffle && TRACKS.length > 1) { do { idx = Math.floor(Math.random() * TRACKS.length); } while (idx === cur); }
      idx = (idx + TRACKS.length) % TRACKS.length;
      if (auto && !repeat && !shuffle && idx === 0) { stop(); cur = 0; paintList(); return; }
      if (started || auto) startTrack(idx); else { cur = idx; paintList(); tick(); }
    };
    const prev = () => { if (elapsed() > 3 && started) startTrack(cur); else go(cur - 1); };
    function paintBtns() {
      playBtn.innerHTML = playing ? "&#10074;&#10074;" : "&#9654;"; playBtn.title = playing ? "Pause" : "Play";
      $(".shuf").classList.toggle("on", shuffle); $(".rep").classList.toggle("on", repeat);
    }
    function tick() {
      const e = elapsed(), T = tr();
      tmEl.textContent = `${String(Math.floor(e / 60)).padStart(2, "0")}:${String(Math.floor(e % 60)).padStart(2, "0")} / ${mmss(T.total)}`;
      if (!dragging) seek.value = started ? Math.round(e / T.total * 1000) : 0;
      if (ctx.store.lget("xp-mute") === "1" !== muted) { muted = !muted; applyVol(); }
      if (started && playing && e >= T.total - 0.02) go(cur + 1, true);
    }
    every(ctx, 200, tick);

    body.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b === playBtn) play(); else if (b.classList.contains("stop")) stop(); else if (b.classList.contains("next")) go(cur + 1);
      else if (b.classList.contains("prev")) prev();
      else if (b.classList.contains("shuf")) { shuffle = !shuffle; paintBtns(); } else if (b.classList.contains("rep")) { repeat = !repeat; paintBtns(); }
      else if (b === muteBtn) { muted = !muted; ctx.store.lset("xp-mute", muted ? "1" : "0"); applyVol(); }
    });
    plEl.addEventListener("click", (e) => { const d = e.target.closest("[data-i]"); if (d && +d.dataset.i !== cur) { if (started) startTrack(+d.dataset.i); else { cur = +d.dataset.i; paintList(); tick(); } } });
    plEl.addEventListener("dblclick", (e) => { const d = e.target.closest("[data-i]"); if (d) startTrack(+d.dataset.i); });
    seek.addEventListener("input", () => { dragging = true; });
    seek.addEventListener("change", () => { dragging = false; if (started) startTrack(cur, seek.value / 1000 * tr().total * 0.999); });
    volEl.addEventListener("input", () => { vol = +volEl.value; ctx.store.lset("xp-vol", vol); if (vol > 0 && muted) { muted = false; ctx.store.lset("xp-mute", "0"); } applyVol(); });
    cv.addEventListener("click", () => { mode = mode === "bars" ? "scope" : "bars"; });

    // ---- visualizer ----
    const fb = new Uint8Array(128), tb = new Uint8Array(256);
    loop(ctx, () => {
      const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const gr = g2.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#02061a"); gr.addColorStop(1, "#0b2a5e");
      g2.fillStyle = gr; g2.fillRect(0, 0, W, H);
      const live = analyser && started && playing;
      if (mode === "bars") {
        if (live) analyser.getByteFrequencyData(fb); else fb.fill(0);
        const n = 32, bw = W / n;
        for (let i = 0; i < n; i++) {
          const v = fb[Math.floor(i * 0.9 + 1)] / 255, h = v * (H - 30);
          const c = g2.createLinearGradient(0, H, 0, H - h - 1); c.addColorStop(0, "#1aff6a"); c.addColorStop(0.7, "#d8ff3a"); c.addColorStop(1, "#ff7a1a");
          g2.fillStyle = c; g2.fillRect(i * bw + 1, H - h - 2, bw - 2, h + 2);
        }
      } else {
        if (live) analyser.getByteTimeDomainData(tb); else tb.fill(128);
        g2.strokeStyle = "#5fd0ff"; g2.lineWidth = 2; g2.shadowColor = "#5fd0ff"; g2.shadowBlur = 8; g2.beginPath();
        for (let i = 0; i < tb.length; i++) { const x = i / (tb.length - 1) * W, y = H / 2 + (tb[i] - 128) / 128 * (H * 0.4); i ? g2.lineTo(x, y) : g2.moveTo(x, y); }
        g2.stroke(); g2.shadowBlur = 0;
      }
    });

    mkBar(ctx, body, [
      { label: "File", items: [{ label: "Close", act: () => ctx.close() }] },
      { label: "View", items: () => [{ label: "Bars and Waves: Bars", check: mode === "bars", act: () => (mode = "bars") }, { label: "Bars and Waves: Scope", check: mode === "scope", act: () => (mode = "scope") }] },
      { label: "Play", items: () => [{ label: playing ? "Pause" : "Play", act: play }, { label: "Stop", act: stop }, "-", { label: "Previous", act: prev }, { label: "Next", act: () => go(cur + 1) }, "-",
        { label: "Shuffle", check: shuffle, act: () => { shuffle = !shuffle; paintBtns(); } }, { label: "Repeat", check: repeat, act: () => { repeat = !repeat; paintBtns(); } }] },
      { label: "Help", items: [{ label: "About Windows Media Player", act: () => ctx.sys?.msg?.("Windows Media Player", "All music is generated live in your browser with WebAudio.<br>No audio files are used.") }] },
    ]);
    ctx.onClose(() => { killTrack(); started = false; playing = false; if (AC) { try { AC.close(); } catch {} AC = null; } });
    paintList(); paintBtns(); applyVol(); tick();
  }

  // =====================================================================
  //  My Pictures + Picture and Fax Viewer
  // =====================================================================
  function pictures(body, ctx) {
    css();
    body.innerHTML = BAR + `<div class="x-root"><div class="x-pics"><div class="toolbar"></div><div class="main" style="flex:1;min-height:0;display:flex;flex-direction:column"></div><div class="statusbar"></div><div class="drop"></div></div></div>
      <input type="file" accept="image/*" multiple style="display:none">`;
    const root = body.querySelector(".x-pics"), tb = root.querySelector(".toolbar"), main = root.querySelector(".main"), sb = root.querySelector(".statusbar"), fileIn = body.querySelector("input[type=file]");
    const items = (ctx.sys?.photos || []).map((p) => ({ src: p.src, title: p.title || "Picture", user: false }));
    let view = "grid", sel = 0, idx = 0, rot = 0, fit = true, show = 0;

    const stopShow = () => { clearInterval(show); show = 0; };
    const openIn = () => fileIn.click();
    const addFiles = (files) => {
      let n = 0;
      for (const f of files || []) if (f.type && f.type.startsWith("image/")) { items.push({ src: URL.createObjectURL(f), title: f.name, user: true }); n++; }
      if (n) { if (view === "grid") { sel = items.length - 1; render(); } else paintStatus(); }
    };
    fileIn.addEventListener("change", () => { addFiles(fileIn.files); fileIn.value = ""; });
    root.addEventListener("dragover", (e) => { e.preventDefault(); root.classList.add("dragging"); });
    root.addEventListener("dragleave", (e) => { if (e.target === root || !root.contains(e.relatedTarget)) root.classList.remove("dragging"); });
    root.addEventListener("drop", (e) => { e.preventDefault(); root.classList.remove("dragging"); addFiles(e.dataTransfer?.files); });
    ctx.onClose(() => { stopShow(); items.forEach((it) => it.user && URL.revokeObjectURL(it.src)); });

    const paintStatus = () => {
      sb.innerHTML = view === "grid" ? `<span>${items.length} object(s)</span><span>${items[sel] ? esc(items[sel].title) : ""}</span>`
        : `<span>${idx + 1} of ${items.length}</span><span>${esc(items[idx]?.title)}</span>${show ? "<span>Slide show: press Esc to stop</span>" : ""}`;
    };
    function renderGrid() {
      stopShow(); ctx.setTitle?.("My Pictures");
      tb.innerHTML = `<button class="o">Open picture from your computer...</button><span class="muted" style="margin-left:6px">or drag pictures here</span>`;
      main.innerHTML = items.length ? `<div class="grid">${items.map((it, i) => `<div class="th${i === sel ? " sel" : ""}" data-i="${i}" title="${esc(it.title)}"><div class="im"><img src="${esc(it.src)}" alt="" draggable="false"></div><span>${esc(it.title)}</span></div>`).join("")}</div>`
        : `<div class="empty">This folder is empty.<br>Open or drop pictures to view them.</div>`;
    }
    function applyImg() {
      const area = main.querySelector(".vw"), img = main.querySelector(".vw img"), wrap = main.querySelector(".wrap"); if (!area || !img || !img.naturalWidth) return;
      const nw = img.naturalWidth, nh = img.naturalHeight, odd = rot % 2 !== 0, aw = area.clientWidth - 16, ah = area.clientHeight - 16;
      const sc = fit ? Math.min(1, (odd ? ah : aw) / nw, (odd ? aw : ah) / nh) : 1;
      const w = nw * sc, h = nh * sc;
      img.style.width = w + "px"; img.style.height = h + "px";
      img.style.transform = `translate(-50%,-50%) rotate(${rot * 90}deg)`;
      wrap.style.width = (odd ? h : w) + "px"; wrap.style.height = (odd ? w : h) + "px";
      const fb = tb.querySelector(".fit"); if (fb) fb.textContent = fit ? "Actual Size" : "Best Fit";
    }
    function renderViewer() {
      const it = items[idx]; ctx.setTitle?.(`Picture and Fax Viewer - ${it.title}`);
      tb.innerHTML = `<button class="pv">&#9664; Previous</button><button class="nx">Next &#9654;</button><button class="fit">${fit ? "Actual Size" : "Best Fit"}</button><button class="rl">&#8634; Rotate Left</button><button class="rr">&#8635; Rotate Right</button><button class="ss">${show ? "Stop Slide Show" : "Slide Show"}</button><button class="del"${it.user ? "" : " disabled"}>Delete</button><button class="bk">Back to folder</button>`;
      main.innerHTML = `<div class="vw"><div class="wrap"><img alt="${esc(it.title)}" src="${esc(it.src)}"></div></div>`;
      const img = main.querySelector("img"); img.addEventListener("load", applyImg); if (img.complete) applyImg();
    }
    function render() { if (view === "grid") renderGrid(); else renderViewer(); paintStatus(); }
    const open = (i) => { if (!items[i]) return; idx = i; rot = 0; view = "viewer"; render(); };
    const back = () => { stopShow(); view = "grid"; sel = clamp(idx, 0, Math.max(0, items.length - 1)); render(); };
    const step = (d) => { if (!items.length) return; idx = (idx + d + items.length) % items.length; rot = 0; renderViewer(); paintStatus(); };
    const toggleShow = () => {
      if (show) { stopShow(); } else if (items.length > 1) show = setInterval(() => step(1), 3000);
      renderViewer(); paintStatus();
    };
    const del = () => {
      const it = items[idx]; if (!it) return;
      if (!it.user) return ctx.sys?.msg?.("Picture and Fax Viewer", "Only pictures you added can be deleted.");
      URL.revokeObjectURL(it.src); items.splice(idx, 1);
      if (!items.length) return back();
      idx = Math.min(idx, items.length - 1); renderViewer(); paintStatus();
    };

    tb.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || b.disabled) return; const c = b.className;
      if (c === "o") openIn(); else if (c === "pv") step(-1); else if (c === "nx") step(1);
      else if (c === "fit") { fit = !fit; applyImg(); } else if (c === "rl") { rot = (rot + 3) % 4; applyImg(); } else if (c === "rr") { rot = (rot + 1) % 4; applyImg(); }
      else if (c === "ss") toggleShow(); else if (c === "del") del(); else if (c === "bk") back();
    });
    main.addEventListener("click", (e) => { const t = e.target.closest(".th"); if (t) { sel = +t.dataset.i; main.querySelectorAll(".th").forEach((x) => x.classList.toggle("sel", x === t)); paintStatus(); } });
    main.addEventListener("dblclick", (e) => { const t = e.target.closest(".th"); if (t) open(+t.dataset.i); });
    observe(ctx, main, () => { if (view === "viewer") applyImg(); });
    listen(ctx, window, "keydown", (e) => {
      if (!ctx.isActive() || !ctx.isVisible() || e.ctrlKey || e.altKey || e.metaKey) return;
      const k = e.key;
      if (view === "viewer") {
        if (k === "ArrowRight" || k === "ArrowDown" || k === "PageDown") { step(1); e.preventDefault(); }
        else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp") { step(-1); e.preventDefault(); }
        else if (k === "Escape" && show) { stopShow(); renderViewer(); paintStatus(); e.preventDefault(); }
        else if (k === "Delete") del();
      } else if (items.length) {
        const cols = Math.max(1, Math.floor((main.clientWidth - 8) / 104));
        const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[k];
        if (d) { sel = clamp(sel + d, 0, items.length - 1); renderGrid(); paintStatus(); main.querySelector(".th.sel")?.scrollIntoView({ block: "nearest" }); e.preventDefault(); }
        else if (k === "Enter") open(sel);
      }
    });
    mkBar(ctx, body, [
      { label: "File", items: [{ label: "Open picture from your computer...", act: openIn }, "-", { label: "Close", act: () => ctx.close() }] },
      { label: "View", items: () => [{ label: "Thumbnails", check: view === "grid", act: () => view === "viewer" && back() },
        { label: "Slide Show", disabled: items.length < 2, act: () => { if (view !== "viewer") open(sel); if (!show) toggleShow(); } }] },
      { label: "Help", items: [{ label: "About Picture and Fax Viewer", act: () => ctx.sys?.msg?.("Picture and Fax Viewer", "Pictures you open stay in your browser and are never uploaded.") }] },
    ]);
    render();
  }

  // =====================================================================
  //  Task Manager
  // =====================================================================
  function taskmgr(body, ctx) {
    css();
    body.innerHTML = BAR + `<div class="x-root"><div class="x-tm"><div class="tabs"><button class="on" data-t="app">Applications</button><button data-t="perf">Performance</button></div>
      <div class="pg app"><div class="list"><table><thead><tr><th>Task</th><th style="width:90px">Status</th></tr></thead><tbody></tbody></table></div>
        <div class="acts"><button class="xpbtn end">End Task</button><button class="xpbtn sw">Switch To</button><button class="xpbtn nw">New Task...</button></div></div>
      <div class="pg perf" style="display:none">
        <fieldset><legend>CPU Usage</legend><div class="gr"><canvas class="cpuM" width="46" height="80"></canvas><canvas class="cpuG" width="300" height="80" style="flex:1;min-width:0;height:80px"></canvas></div></fieldset>
        <fieldset><legend>Page File Usage</legend><div class="gr"><canvas class="pfM" width="46" height="80"></canvas><canvas class="pfG" width="300" height="80" style="flex:1;min-width:0;height:80px"></canvas></div></fieldset>
        <fieldset><legend>Totals</legend><div class="nums"><div><span>Processes</span><b class="nP"></b></div><div><span>Commit Charge Total (K)</span><b class="nC"></b></div>
          <div><span>Threads</span><b class="nT"></b></div><div><span>Commit Charge Limit (K)</span><b class="nL"></b></div>
          <div><span>Handles</span><b class="nH"></b></div><div><span>Commit Charge Peak (K)</span><b class="nK"></b></div></div></fieldset></div></div>
      <div class="statusbar foot"></div></div>`;
    const $ = (s) => body.querySelector(s);
    const tbody = $("tbody"), foot = $(".foot");
    let tab = "app", selKey = null, sig = "", wins = [];
    const N = 60, cpuH = [], pfH = [];
    let peak = 0, cpuNow = 0, commit = 0, limit = 1;
    const sysWins = () => { try { return ctx.sys?.windows?.() || []; } catch { return []; } };
    const procs = () => wins.length + 3;

    function renderApps() {
      wins = sysWins();
      if (selKey && !wins.some((w) => w.key === selKey)) selKey = null;
      const s = JSON.stringify(wins.map((w) => [w.key, w.title, w.minimized])) + selKey;
      if (s === sig) return; sig = s;
      tbody.innerHTML = wins.map((w) => `<tr data-k="${esc(w.key)}"${w.key === selKey ? ' class="sel"' : ""}><td>${esc(w.title)}</td><td>${w.minimized ? "Minimized" : "Running"}</td></tr>`).join("");
    }
    tbody.addEventListener("click", (e) => { const r = e.target.closest("tr"); if (r) { selKey = r.dataset.k; sig = ""; renderApps(); } });
    tbody.addEventListener("dblclick", (e) => { const r = e.target.closest("tr"); if (r) ctx.sys?.focus?.(r.dataset.k); });
    const newTask = () => {
      const v = (window.prompt("Type the name of a program, and Windows will open it for you.", "") || "").trim().toLowerCase(); if (!v) return;
      const m = wins.find((w) => w.key.toLowerCase() === v || (w.title || "").toLowerCase() === v);
      try { ctx.sys.open(m ? m.key.replace(/[#:_-]\d+$/, "") : v); } catch { ctx.sys?.msg?.("Windows cannot find '" + esc(v) + "'", "Make sure you typed the name correctly, and then try again."); }
      setTimeout(renderApps, 150);
    };
    body.querySelector(".acts").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.classList.contains("nw")) return newTask();
      if (!selKey) return;
      if (b.classList.contains("end")) { const k = selKey; selKey = null; ctx.sys?.close?.(k); setTimeout(renderApps, 100); } else if (b.classList.contains("sw")) ctx.sys?.focus?.(selKey);
    });
    body.querySelector(".tabs").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return; tab = b.dataset.t;
      body.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
      $(".app").style.display = tab === "app" ? "" : "none"; $(".perf").style.display = tab === "perf" ? "" : "none";
      if (tab === "perf") drawAll();
    });

    // ---- graphs ----
    function graph(cv, data, line) {
      const g = cv.getContext("2d"), W = cv.width = cv.clientWidth || cv.width, H = cv.height;
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H); g.strokeStyle = "#0a6a0a"; g.lineWidth = 1; g.beginPath();
      const off = (performance.now() / 1000 * 4) % 12;
      for (let y = 0; y < H; y += 12) { g.moveTo(0, y + .5); g.lineTo(W, y + .5); }
      for (let x = W - off; x > 0; x -= 12) { g.moveTo(Math.round(x) + .5, 0); g.lineTo(Math.round(x) + .5, H); }
      g.stroke();
      if (!data.length) return;
      const px = (i) => W - (data.length - 1 - i) * (W / (N - 1)), py = (v) => H - 1 - clamp(v, 0, 100) / 100 * (H - 2);
      g.beginPath(); g.moveTo(px(0), H); data.forEach((v, i) => g.lineTo(px(i), py(v))); g.lineTo(px(data.length - 1), H); g.closePath();
      g.fillStyle = "#0a5a0a88"; g.fill();
      g.strokeStyle = line; g.lineWidth = 1.5; g.beginPath(); data.forEach((v, i) => (i ? g.lineTo(px(i), py(v)) : g.moveTo(px(i), py(v)))); g.stroke();
    }
    function meter(cv, pct, label) {
      const g = cv.getContext("2d"), W = cv.width, H = cv.height;
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      const segs = Math.floor((H - 16) / 4), on = Math.round(pct / 100 * segs);
      for (let i = 0; i < segs; i++) { g.fillStyle = i < on ? "#00ff00" : "#064006"; g.fillRect(8, H - 16 - (i + 1) * 4 + 1, W - 16, 3); }
      g.fillStyle = "#00ff00"; g.font = "10px Tahoma"; g.textAlign = "center"; g.fillText(label, W / 2, H - 4);
    }
    function drawAll() {
      if (tab !== "perf") return;
      graph($(".cpuG"), cpuH, "#00ff00"); graph($(".pfG"), pfH, "#00ff00");
      meter($(".cpuM"), cpuNow, Math.round(cpuNow) + " %"); meter($(".pfM"), pfH[pfH.length - 1] || 0, Math.round(commit / 1024) + " MB");
      $(".nP").textContent = procs(); $(".nT").textContent = procs() * 6 + 40; $(".nH").textContent = procs() * 190 + 1800;
      $(".nC").textContent = Math.round(commit).toLocaleString(); $(".nL").textContent = Math.round(limit).toLocaleString(); $(".nK").textContent = Math.round(peak).toLocaleString();
    }

    // ---- real-ish measurement: main-thread load from rAF frame-time jitter ----
    const recent = []; let extra = 0, total = 0, lastSample = performance.now(), drift = 0;
    loop(ctx, (dt, raw) => {
      if (raw > 1000) return;
      recent.push(raw); if (recent.length > 90) recent.shift();
      const base = Math.max(4, Math.min(...recent));
      extra += Math.max(0, raw - base); total += raw;
    });
    function sample() {
      if (!ctx.isVisible()) return;
      const load = total > 0 ? extra / total * 100 : 0;
      cpuNow = clamp(load * 1.5 + 1 + Math.random() * 2, 0, 100); extra = total = 0; lastSample = performance.now();
      const pm = performance.memory;
      if (pm && pm.usedJSHeapSize) { commit = pm.usedJSHeapSize / 1024; limit = pm.jsHeapSizeLimit / 1024; pfH.push(clamp(pm.usedJSHeapSize / pm.totalJSHeapSize * 100, 0, 100)); }
      else { drift += (Math.random() - 0.5) * 600; drift = clamp(drift, -4000, 4000); commit = 48000 + wins.length * 3500 + drift; limit = 262144; pfH.push(commit / limit * 100 * 1.8); }
      peak = Math.max(peak, commit);
      cpuH.push(cpuNow); if (cpuH.length > N) cpuH.shift(); if (pfH.length > N) pfH.shift();
      foot.innerHTML = `<span>Processes: ${procs()}</span><span>CPU Usage: ${Math.round(cpuNow)}%</span><span>Commit Charge: ${Math.round(commit / 1024)}M / ${Math.round(limit / 1024)}M</span>`;
      drawAll();
    }
    every(ctx, 1000, () => { if (!ctx.isVisible()) return; renderApps(); sample(); });
    loop(ctx, () => { if (tab === "perf") { graph($(".cpuG"), cpuH, "#00ff00"); graph($(".pfG"), pfH, "#00ff00"); } });
    mkBar(ctx, body, [
      { label: "File", items: [{ label: "New Task (Run...)", act: newTask }, "-", { label: "Exit Task Manager", act: () => ctx.close() }] },
      { label: "View", items: [{ label: "Refresh Now", act: () => { sig = ""; renderApps(); sample(); } }] },
      { label: "Help", items: [{ label: "About Task Manager", act: () => ctx.sys?.msg?.("Windows Task Manager", "CPU load is estimated from browser frame-time jitter.") }] },
    ]);
    ctx.setTitle?.("Windows Task Manager");
    renderApps(); sample();
  }

  window.EXTRAS = { calculator, mediaplayer, pictures, taskmgr };
})();
