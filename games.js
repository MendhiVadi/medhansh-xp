// Games are loaded on demand the first time one is opened.
// Each game: (body, ctx) where ctx = { el, close, onClose(fn), isVisible(), isActive(), store, menu(bar, menus) }
(() => {
  const BAR = `<div class="menubar" style="background:#ece9d8;color:#000"></div>`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const loop = (ctx, step) => {
    // rAF loop that sleeps while the window is minimized or the tab is hidden
    let raf = 0, last = 0, dead = false, hidden = false;
    const frame = (t) => {
      if (dead) return;
      const dt = last ? Math.min(50, t - last) : 16; last = t;
      if (ctx.isVisible()) { step(dt, hidden); hidden = false; } else { last = 0; hidden = true; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    ctx.onClose(() => { dead = true; cancelAnimationFrame(raf); });
  };
  // rAF that only runs while started (e.g. the win cascade); sleeps while hidden like loop()
  const burst = (ctx, step) => {
    let raf = 0, last = 0, on = false, dead = false;
    const frame = (t) => {
      raf = 0; if (!on || dead) return;
      if (ctx.isVisible()) { const dt = last ? Math.min(50, t - last) : 16; last = t; step(dt); } else last = 0;
      if (on && !dead) raf = requestAnimationFrame(frame);
    };
    ctx.onClose(() => { dead = true; on = false; if (raf) cancelAnimationFrame(raf); raf = 0; });
    return {
      start() { if (on || dead) return; on = true; last = 0; raf = requestAnimationFrame(frame); },
      stop() { on = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    };
  };
  // debounced (one rAF) resize handler that ignores callbacks where the element size is unchanged
  const observeSize = (ctx, el, fn) => {
    let q = 0, lw = -1, lh = -1;
    observe(ctx, el, () => {
      if (q) return;
      q = requestAnimationFrame(() => {
        q = 0; const w = el.clientWidth, h = el.clientHeight;
        if (w === lw && h === lh) return;
        if (fn(w, h) !== false) { lw = w; lh = h; }
      });
    });
    ctx.onClose(() => { if (q) cancelAnimationFrame(q); q = 0; });
  };
  // pre-rendered card faces (13 ranks x nSuits) on one offscreen sheet for the win cascade
  const cardSheet = (cw, ch, SUITS, RANKS, nSuits) => {
    const cellW = Math.ceil(cw) + 1, cellH = Math.ceil(ch) + 1, sheet = document.createElement("canvas");
    sheet.width = cellW * 13; sheet.height = cellH * nSuits;
    const g = sheet.getContext("2d");
    for (let s = 0; s < nSuits; s++) for (let r = 1; r <= 13; r++) {
      const x = (r - 1) * cellW, y = s * cellH;
      g.fillStyle = "#fff"; g.fillRect(x, y, cw, ch); g.strokeStyle = "#333"; g.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
      g.fillStyle = s === 1 || s === 2 ? "#d00" : "#000"; g.textBaseline = "top"; g.textAlign = "left"; g.font = `bold ${cw * 0.2}px Arial`;
      g.fillText(RANKS[r], x + 3, y + 3); g.fillText(SUITS[s], x + 3, y + 3 + cw * 0.2);
      g.font = `${cw * 0.5}px Arial`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(SUITS[s], x + cw / 2, y + ch / 2);
    }
    return { sheet, cellW, cellH };
  };
  const fitCanvas = (cv, W, H) => {
    // keep the logical size, scale with CSS to fit the window body
    const box = cv.parentElement;
    const s = Math.min(box.clientWidth / W, box.clientHeight / H) || 1;
    cv.style.width = W * s + "px"; cv.style.height = H * s + "px";
  };
  const observe = (ctx, el, fn) => { const ro = new ResizeObserver(fn); ro.observe(el); ctx.onClose(() => ro.disconnect()); };
  const listen = (ctx, type, fn) => { addEventListener(type, fn); ctx.onClose(() => removeEventListener(type, fn)); };

  // ---- shared world leaderboard helper (ctx.sys.scores; every call may fail offline) ----
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const worldBoard = (ctx, game, local) => {
    const api = () => (ctx.sys && ctx.sys.scores) || null;
    const table = (rows, id) => {
      if (!rows.length) return `<small>No world scores yet</small>`;
      const td = "padding:0 6px;text-align:left";
      const body = rows.map((r, i) => {
        const info = [r.level != null ? "L" + esc(r.level) : "", r.time != null ? esc(r.time) + "s" : "", r.mode ? esc(r.mode) : ""].filter(Boolean).join(" ");
        const hl = id && r.id === id ? ";background:#ffd700;color:#000;font-weight:bold" : "";
        return `<tr style="${hl.slice(1)}"><td style="${td}">${i + 1}</td><td style="${td};max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name || "Anonymous")}</td><td style="${td};text-align:right">${esc(r.score)}</td><td style="${td}">${info}</td></tr>`;
      }).join("");
      return `<table style="margin:4px auto;border-collapse:collapse;font-size:11px;line-height:1.25;color:inherit"><tbody>${body}</tbody></table>`;
    };
    const fail = (el) => { if (el.isConnected) el.innerHTML = `<small>Offline &ndash; showing your best</small><br><small>${local()}</small>`; };
    const load = (el, id) => {
      const s = api(); if (!s) return fail(el);
      Promise.resolve().then(() => s.top(game, 10)).then((rows) => {
        if (!Array.isArray(rows)) throw new Error("bad");
        if (el.isConnected) el.innerHTML = table(rows, id);
      }).catch(() => fail(el));
    };
    return {
      view(el) { if (!el) return; el.innerHTML = "<small>Loading&hellip;</small>"; load(el, null); },
      post(el, score, extra) {
        if (!el) return;
        const s = api(); score = Math.round(Number(score));
        if (!s || !(score > 0) || score > 1e8) return fail(el);
        const x = {};
        if (extra && Number.isInteger(extra.level)) x.level = extra.level;
        if (extra && Number.isInteger(extra.time)) x.time = extra.time;
        if (extra && extra.mode) x.mode = String(extra.mode).slice(0, 20);
        el.innerHTML = "<small>Loading&hellip;</small>";
        Promise.resolve().then(() => s.submit(game, score, x)).then((r) => {
          load(el, typeof r === "string" ? r : r && r.id ? r.id : null);
        }).catch(() => fail(el));
      },
    };
  };

  // ---- tiny WebAudio blips (no audio files). One shared AudioContext, created on the first user gesture ----
  let AC = null;
  const audioUnlock = () => {
    if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; try { AC = new C(); } catch { return; } }
    if (AC.state === "suspended") AC.resume().catch(() => {});
  };
  const sound = (ctx) => {
    listen(ctx, "pointerdown", audioUnlock); listen(ctx, "keydown", audioUnlock);
    const last = {};
    const api = {
      on: () => ctx.store.lget("xp-game-sound") !== "0",
      toggle: () => ctx.store.lset("xp-game-sound", api.on() ? "0" : "1"),
      item: () => ({ label: "Sound", check: api.on(), act: api.toggle }),
      // freq Hz, dur seconds, optional glide target, delay seconds, key = per-sound rate limit
      blip(freq, dur = 0.06, type = "square", gain = 1, slide = 0, delay = 0, key = "") {
        if (!AC || AC.state !== "running" || !api.on() || ctx.store.lget("xp-mute") === "1") return;
        if (key) { const n = performance.now(); if (n - (last[key] || 0) < 30) return; last[key] = n; }
        const raw = ctx.store.lget("xp-vol"), v = raw == null || raw === "" || isNaN(+raw) ? 70 : clamp(+raw, 0, 100);
        if (!v) return;
        const t = AC.currentTime + delay, o = AC.createOscillator(), gn = AC.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
        gn.gain.setValueAtTime(0.12 * (v / 100) * gain, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(gn); gn.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
      },
      seq(freqs, step = 0.07, dur = 0.09, type = "square") { freqs.forEach((f, i) => api.blip(f, dur, type, 1, 0, i * step)); },
    };
    return api;
  };

  // =====================================================================
  //  Solitaire (Klondike, draw one or three)
  // =====================================================================
  function solitaire(body, ctx) {
    const SUITS = ["♠", "♥", "♦", "♣"], RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const red = (c) => c.s === 1 || c.s === 2;
    const snd = sound(ctx);
    body.classList.add("sol-body");
    body.innerHTML = BAR + `<div class="sol"><div class="sol-table"></div></div><div class="statusbar"><span class="score">Score: 0</span><span class="time">Time: 0</span></div>`;
    const sol = body.querySelector(".sol"), table = body.querySelector(".sol-table"), scoreEl = body.querySelector(".score"), timeEl = body.querySelector(".time");
    let S, history = [], score, secs, timer, won = false, drag = null, draw3 = ctx.store.lget("xp-sol-draw") === "3", layout = { cw: 71, ch: 96, gap: 10, H: 400 };
    let vegas = ctx.store.lget("xp-sol-vegas") === "1", pendingOff = null, autoRun = false, autoT = 0, hintT = 0, toastT = 0, casc = null;

    const wb = worldBoard(ctx, "solitaire", () => "No local best saved");
    const modeStr = () => (vegas ? "vegas" : "standard") + "-d" + (draw3 ? 3 : 1);
    const overlay = (html, style = "") => { sol.querySelector(".sol-win")?.remove(); sol.insertAdjacentHTML("beforeend", `<div class="sol-win" style="${style}">${html}</div>`); return sol.querySelector(".sol-win"); };
    function toast(text) {
      sol.querySelector(".sol-toast")?.remove(); clearTimeout(toastT);
      sol.insertAdjacentHTML("beforeend", `<div class="sol-toast" style="position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:210;background:#ffffe1;color:#000;border:1px solid #000;padding:4px 10px;font:12px Tahoma,sans-serif;pointer-events:none">${text}</div>`);
      toastT = setTimeout(() => sol.querySelector(".sol-toast")?.remove(), 1800);
    }
    function deal() {
      stopCascade(); clearInterval(autoT); autoRun = false; clearHint();
      const deck = [];
      for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ id: s * 13 + r, s, r, up: false });
      for (let i = deck.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; }
      S = { s: [], w: [], f: [[], [], [], []], t: [[], [], [], [], [], [], []] };
      for (let c = 0; c < 7; c++) for (let k = 0; k <= c; k++) { const card = deck.pop(); card.up = k === c; S.t[c].push(card); }
      S.s = deck; history = []; score = vegas ? -52 : 0; secs = 0; won = false; drag = null; pendingOff = null;
      sol.querySelector(".sol-win")?.remove(); timeEl.textContent = "Time: 0";
      clearInterval(timer); timer = setInterval(() => { if (!won && ctx.isVisible() && !sol.querySelector(".sol-lb")) timeEl.textContent = "Time: " + ++secs; }, 1000);
      snd.seq([392, 523], 0.05, 0.05);
      render();
    }
    const snap = () => { history.push(JSON.stringify({ S, score })); if (history.length > 100) history.shift(); };
    const pile = (id) => id === "s" ? S.s : id === "w" ? S.w : id[0] === "f" ? S.f[+id[1]] : S.t[+id[1]];
    const top = (p) => p[p.length - 1];
    function undo() {
      if (!history.length || won || autoRun || casc) return;
      const h = JSON.parse(history.pop()); S = h.S; score = h.score; drag = null; clearHint(); snd.blip(300, 0.05, "triangle"); render(true);
    }
    function setDraw(v) { draw3 = v; ctx.store.lset("xp-sol-draw", v ? "3" : "1"); render(); }
    function setVegas(v) { vegas = v; ctx.store.lset("xp-sol-vegas", v ? "1" : "0"); deal(); }
    function help() {
      const o = overlay(`<b>How to play</b><div style="margin:6px 0 10px">Build the four foundations up by suit, Ace to King.<br>Stack tableau cards downward, alternating colors.<br>Drag cards or runs between piles, or click a card to auto-move it.<br>Click the deck to draw; click the empty deck to recycle the waste.<br>F2 deals a new game, Ctrl+Z undoes, H shows a hint.<br>Vegas scoring: start at -52, +5 per card on a foundation.</div><button class="xpbtn">OK</button>`, "max-width:88%;text-align:left;line-height:1.5");
      o.querySelector("button").onclick = () => o.remove();
    }

    function canDrop(cards, id) {
      const c = cards[0], dest = pile(id), t = top(dest);
      if (id[0] === "f") return cards.length === 1 && (t ? t.s === c.s && c.r === t.r + 1 : c.r === 1);
      if (id[0] === "t") return t ? t.up && red(t) !== red(c) && c.r === t.r - 1 : c.r === 13;
      return false;
    }
    function move(from, idx, to, noSnap) {
      if (!noSnap) snap();
      const src = pile(from), cards = src.splice(idx);
      pile(to).push(...cards);
      if (vegas) { if (to[0] === "f") score += 5; else if (from[0] === "f") score -= 5; }
      else if (to[0] === "f") score += 10; else if (from === "w") score += 5; else if (from[0] === "f") score = Math.max(0, score - 15);
      const t = top(src); if (from[0] === "t" && t && !t.up) { t.up = true; if (!vegas) score += 5; }
      if (to[0] === "f") snd.blip(660 + cards[0].r * 30, 0.07, "square", 0.8); else snd.blip(420, 0.035, "triangle");
      clearHint(); render(true); checkWin();
      return true;
    }
    function autoMove(from, idx) {
      const src = pile(from), cards = src.slice(idx);
      if (cards.length === 1) for (let i = 0; i < 4; i++) if ("f" + i !== from && canDrop(cards, "f" + i)) return move(from, idx, "f" + i);
      // shuffling a run between columns only helps when it uncovers a face-down card
      if (from[0] === "t" && (idx === 0 || src[idx - 1].up)) return false;
      for (let i = 0; i < 7; i++) { const id = "t" + i; if (id !== from && canDrop(cards, id)) return move(from, idx, id); }
      return false;
    }
    function drawStock() {
      if (!S.s.length && !S.w.length) return;
      snap(); clearHint();
      if (S.s.length) { for (let n = draw3 ? 3 : 1; n-- && S.s.length;) { const c = S.s.pop(); c.up = true; S.w.push(c); } }
      else { S.s = S.w.reverse().map((c) => ({ ...c, up: false })); S.w = []; if (!vegas) score = Math.max(0, score - (draw3 ? 20 : 100)); }
      snd.blip(520, 0.03, "triangle");
      render(true);
    }
    function checkWin() {
      updateAuto();
      if (!S.f.every((f) => f.length === 13)) return;
      won = true; clearInterval(timer); clearInterval(autoT); autoRun = false; updateAuto();
      startCascade();
    }
    function showWin(first = true) {
      const o = overlay(`<b>You won!</b><br>Score ${score} in ${secs}s<div class="wl" style="min-width:230px"></div><button class="xpbtn">Deal again</button>`);
      o.querySelector("button").onclick = deal;
      if (first) wb.post(o.querySelector(".wl"), score, { time: secs, mode: modeStr() }); else wb.view(o.querySelector(".wl"));
    }
    function showWorld() {
      const o = overlay(`<b>World top 10</b><div class="wl sol-lb" style="min-width:230px"></div><button class="xpbtn">Close</button>`);
      o.querySelector("button").onclick = () => { if (won && !casc) showWin(false); else o.remove(); };
      wb.view(o.querySelector(".wl"));
    }

    // ---- hint: highlight one legal move ----
    function findHint() {
      const w = top(S.w);
      if (w) for (let j = 0; j < 4; j++) if (canDrop([w], "f" + j)) return { from: "w", idx: S.w.length - 1, to: "f" + j };
      for (let k = 0; k < 7; k++) { const c = top(S.t[k]); if (c && c.up) for (let j = 0; j < 4; j++) if (canDrop([c], "f" + j)) return { from: "t" + k, idx: S.t[k].length - 1, to: "f" + j }; }
      for (let k = 0; k < 7; k++) {
        const col = S.t[k];
        for (let i = 0; i < col.length; i++) {
          if (!col[i].up || i === 0 || col[i - 1].up) continue; // only runs that uncover a face-down card
          const run = col.slice(i);
          for (let d = 0; d < 7; d++) if (d !== k && canDrop(run, "t" + d)) return { from: "t" + k, idx: i, to: "t" + d };
        }
      }
      if (w) for (let d = 0; d < 7; d++) if (canDrop([w], "t" + d)) return { from: "w", idx: S.w.length - 1, to: "t" + d };
      return null;
    }
    function clearHint() {
      clearTimeout(hintT);
      for (const el of table.querySelectorAll("[data-hint]")) { el.style.outline = ""; el.style.outlineOffset = ""; el.removeAttribute("data-hint"); }
    }
    function hint() {
      if (won || autoRun || casc || drag) return;
      clearHint();
      const h = findHint();
      if (!h) { toast("No moves — try the deck"); return; }
      const src = table.querySelector(`.card[data-pile="${h.from}"][data-i="${h.idx}"]`), dests = table.querySelectorAll(`[data-pile="${h.to}"]`), dst = dests[dests.length - 1];
      for (const el of [src, dst]) if (el) { el.style.outline = "3px solid #ffeb3b"; el.style.outlineOffset = "1px"; el.setAttribute("data-hint", "1"); }
      snd.blip(880, 0.05, "sine", 0.7);
      hintT = setTimeout(clearHint, 1200);
    }

    // ---- auto-finish once everything is face-up and the deck is gone ----
    const canAuto = () => !won && !autoRun && !casc && S && !S.s.length && !S.w.length && S.t.every((col) => col.every((c) => c.up)) && !S.f.every((f) => f.length === 13);
    function updateAuto() {
      const b = sol.querySelector(".sol-auto");
      if (canAuto()) {
        if (b) return;
        sol.insertAdjacentHTML("beforeend", `<button class="xpbtn sol-auto" style="position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:120">Auto-finish</button>`);
        sol.querySelector(".sol-auto").onclick = autoFinish;
      } else b?.remove();
    }
    function autoFinish() {
      if (!canAuto()) return;
      snap(); autoRun = true; clearHint(); updateAuto();
      autoT = setInterval(() => {
        let moved = false;
        outer: for (let k = 0; k < 7; k++) {
          const col = S.t[k], c = top(col); if (!c) continue;
          for (let j = 0; j < 4; j++) if (canDrop([c], "f" + j)) { move("t" + k, col.length - 1, "f" + j, true); moved = true; break outer; }
        }
        if (!moved) { clearInterval(autoT); autoRun = false; if (!won) render(true); }
      }, 110);
    }

    // ---- win animation: classic bouncing-card cascade on a canvas overlay ----
    function startCascade() {
      const w = sol.clientWidth || 560, h = sol.clientHeight || 400, cv = document.createElement("canvas");
      cv.width = w; cv.height = h; cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:150;cursor:pointer";
      sol.appendChild(cv);
      cv.addEventListener("pointerdown", endCascade);
      casc = { cv, g: cv.getContext("2d"), w, h, n: 0, t: 0, sp: cardSheet(layout.cw, layout.ch, SUITS, RANKS, 4), pool: Array.from({ length: 52 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, s: 0, r: 0 })) };
      snd.seq([523, 659, 784, 1047], 0.12, 0.16, "triangle");
      cascLoop.start();
    }
    function cascStep(dt) {
      const c = casc; if (!c) return;
      const g = c.g, cw = layout.cw, ch = layout.ch, grav = 0.0011 * (c.h / 400);
      c.t -= dt;
      if (c.t <= 0 && c.n < 52) {
        const p = c.pool[c.n], k = c.n % 4; p.r = 13 - ((c.n / 4) | 0); p.s = k; c.n++;
        p.on = true; p.x = xOf(3 + k); p.y = layout.gap; p.vx = (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.22); p.vy = -Math.random() * 0.15; c.t = 280;
      }
      let live = 0;
      for (let i = 0; i < 52; i++) {
        const p = c.pool[i]; if (!p.on) continue;
        p.vy += grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > c.h - ch) { p.y = c.h - ch; p.vy = -p.vy * 0.8; }
        if (p.x < -cw || p.x > c.w) { p.on = false; continue; }
        live++;
        g.drawImage(c.sp.sheet, (p.r - 1) * c.sp.cellW, p.s * c.sp.cellH, c.sp.cellW, c.sp.cellH, p.x, p.y, c.sp.cellW, c.sp.cellH);
      }
      if (c.n >= 52 && !live) endCascade();
    }
    function stopCascade() { cascLoop.stop(); if (casc) { casc.cv.remove(); casc = null; } }
    function endCascade() { if (!casc) return; stopCascade(); showWin(); }
    const cascLoop = burst(ctx, cascStep);

    function computeLayout() {
      const W = table.clientWidth || 560, H = table.clientHeight || 400;
      const gap = Math.max(4, Math.min(12, W * 0.015));
      const cw = Math.min(80, (W - gap * 8) / 7), ch = cw * 1.36;
      layout = { cw, ch, gap, H };
      table.style.setProperty("--cw", cw + "px"); table.style.setProperty("--ch", ch + "px");
    }
    const xOf = (col) => layout.gap + col * (layout.cw + layout.gap);
    // anim: slide every card that changed position from where it was (FLIP, ~140ms transform transition)
    function render(anim) {
      let old = null;
      if (anim && table.firstChild) {
        const off = pendingOff; old = new Map();
        for (const el of table.children) {
          const id = el.dataset.id; if (id === undefined) continue;
          let x = parseFloat(el.style.left), y = parseFloat(el.style.top);
          if (off && off.els.includes(el)) { x += off.dx; y += off.dy; }
          old.set(id, [x, y]);
        }
      }
      pendingOff = null;
      computeLayout();
      const { cw, ch, gap, H } = layout, top0 = gap, tabY = gap * 2 + ch;
      const html = [];
      const slot = (id, x, y, label = "") => html.push(`<div class="slot" data-pile="${id}" style="left:${x}px;top:${y}px">${label}</div>`);
      const card = (c, id, i, x, y) => html.push(c.up
        ? `<div class="card ${red(c) ? "red" : ""}" data-id="${c.id}" data-pile="${id}" data-i="${i}" style="left:${x}px;top:${y}px"><span class="ci">${RANKS[c.r]}<br>${SUITS[c.s]}</span><span class="cc">${SUITS[c.s]}</span><span class="ci br">${RANKS[c.r]}<br>${SUITS[c.s]}</span></div>`
        : `<div class="card back" data-id="${c.id}" data-pile="${id}" data-i="${i}" style="left:${x}px;top:${y}px"></div>`);
      slot("s", xOf(0), top0, S.s.length ? "" : "↻");
      S.s.forEach((c, i) => i >= S.s.length - 3 && card(c, "s", i, xOf(0) + (i - S.s.length + 3) * 1, top0));
      slot("w", xOf(1), top0);
      const w0 = Math.max(0, S.w.length - (draw3 ? 3 : 1));
      S.w.forEach((c, i) => i >= w0 && card(c, "w", i, xOf(1) + (i - w0) * cw * 0.22, top0));
      S.f.forEach((f, k) => { slot("f" + k, xOf(3 + k), top0, "A"); f.forEach((c, i) => i >= f.length - 2 && card(c, "f" + k, i, xOf(3 + k), top0)); });
      S.t.forEach((col, k) => {
        slot("t" + k, xOf(k), tabY);
        const downs = col.filter((c) => !c.up).length, ups = col.length - downs;
        let dOff = ch * 0.12, uOff = ch * 0.27;
        const need = downs * dOff + Math.max(0, ups - 1) * uOff + ch, avail = H - tabY - gap;
        // squeeze the fan so the whole column fits in the table height
        if (need > avail && col.length > 1) { const f = Math.max(0.2, (avail - ch) / (need - ch)); dOff *= f; uOff *= f; }
        let y = tabY; col.forEach((c, i) => { card(c, "t" + k, i, xOf(k), y); y += c.up ? uOff : dOff; });
      });
      table.innerHTML = html.join("");
      scoreEl.textContent = "Score: " + score;
      if (old) {
        const moving = [];
        for (const el of table.children) {
          const o = old.get(el.dataset.id); if (!o) continue;
          const dx = o[0] - parseFloat(el.style.left), dy = o[1] - parseFloat(el.style.top);
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
          el.style.transition = "none"; el.style.transform = `translate(${dx}px,${dy}px)`; el.style.zIndex = 50; moving.push(el);
        }
        if (moving.length) {
          void table.offsetWidth; // commit the start positions before enabling the transition
          for (const el of moving) { el.style.transition = "transform 140ms ease-out"; el.style.transform = "translate(0,0)"; }
        }
      }
      updateAuto();
    }

    // ---- pointer interaction: click = auto move, drag = drop on a pile ----
    table.addEventListener("pointerdown", (e) => {
      if (won || drag || autoRun || casc || e.button !== 0) return;
      const el = e.target.closest(".card, .slot"); if (!el) return;
      const id = el.dataset.pile;
      if (id === "s") { drawStock(); return; }
      if (!el.classList.contains("card")) return;
      const i = +el.dataset.i, p = pile(id), c = p[i];
      if (!c.up) { if (id[0] === "t" && i === p.length - 1) { snap(); c.up = true; if (!vegas) score += 5; render(true); } return; }
      if (id[0] !== "t" && i !== p.length - 1) return; // only the top card of waste/foundations is playable
      const els = [...table.querySelectorAll(`.card[data-pile="${id}"]`)].filter((x) => +x.dataset.i >= i);
      drag = { id, i, els, x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false };
      table.setPointerCapture(e.pointerId);
    });
    table.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true; drag.dx = dx; drag.dy = dy;
      drag.els.forEach((el) => { el.style.transition = "none"; el.style.transform = `translate(${dx}px,${dy}px)`; el.classList.add("dragging"); });
    });
    table.addEventListener("pointerup", (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) { if (d.id[0] === "f" || !autoMove(d.id, d.i)) render(); return; }
      pendingOff = { els: d.els, dx: d.dx, dy: d.dy }; // animate from where the cards were dropped
      const under = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-pile]");
      const to = under?.dataset.pile;
      if (to && to !== d.id && canDrop(pile(d.id).slice(d.i), to)) move(d.id, d.i, to); else render(true);
    });
    table.addEventListener("pointercancel", () => { if (drag) { const d = drag; drag = null; pendingOff = d.moved ? { els: d.els, dx: d.dx, dy: d.dy } : null; render(true); } });

    ctx.menu(body.querySelector(".menubar"), [
      { label: "Game", items: () => [
        { label: "Deal", key: "F2", act: deal },
        { label: "Undo", key: "Ctrl+Z", disabled: !history.length || won || autoRun || !!casc, act: undo },
        { label: "Hint", key: "H", disabled: won || autoRun || !!casc, act: hint },
        { label: "Auto-finish", disabled: !canAuto(), act: autoFinish },
        "-",
        { label: "Draw One", check: !draw3, act: () => setDraw(false) },
        { label: "Draw Three", check: draw3, act: () => setDraw(true) },
        { label: "Vegas Scoring", check: vegas, act: () => setVegas(!vegas) },
        snd.item(),
        { label: "World Leaderboard…", act: showWorld },
        "-",
        { label: "Exit", act: ctx.close },
      ] },
      { label: "Help", items: [{ label: "How to play", act: help }] },
    ]);
    listen(ctx, "keydown", (e) => {
      if (!ctx.isActive()) return;
      if (casc && !["Shift", "Control", "Alt", "Meta"].includes(e.key)) { e.preventDefault(); endCascade(); return; }
      if (e.key === "F2") { e.preventDefault(); deal(); }
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat && e.key.toLowerCase() === "h") { e.preventDefault(); hint(); }
    });
    // a re-render mid-drag would detach the dragged cards; the drop re-renders anyway
    observeSize(ctx, table, () => { if (!S || drag) return false; render(); });
    ctx.onClose(() => { clearInterval(timer); clearInterval(autoT); clearTimeout(hintT); clearTimeout(toastT); });
    deal();
  }

  // =====================================================================
  //  Snake
  // =====================================================================
  function snake(body, ctx) {
    const N = 20, CELL = 20, W = N * CELL, SPEEDS = { Slow: 300, Normal: 240, Fast: 170 };
    const snd = sound(ctx);
    body.innerHTML = BAR + `<div class="game-hud"><span>Score: <b class="sc">0</b></span><span>Best: <b class="hi">0</b></span></div><div class="game-stage"><canvas width="${W}" height="${W}"></canvas><div class="game-msg"></div></div>`;
    body.classList.add("game-body");
    const cv = body.querySelector("canvas"), g = cv.getContext("2d"), msg = body.querySelector(".game-msg");
    const scEl = body.querySelector(".sc"), hiEl = body.querySelector(".hi");
    let best = Number(ctx.store.lget("xp-snake-best")) || 0; hiEl.textContent = best;
    let level = ctx.store.lget("xp-snake-speed"); if (!SPEEDS[level]) level = "Normal";
    let wrap = ctx.store.lget("xp-snake-wrap") === "1";
    let sn, dir, queue, food, bonus, obs, grow, score, state = "ready", acc = 0, speed, overAt = 0;
    const px = [], py = []; let pl = 0; // segment positions before the latest tick, for interpolation
    const savePrev = () => { pl = sn.length; for (let i = 0; i < pl; i++) { px[i] = sn[i].x; py[i] = sn[i].y; } };
    const wb = worldBoard(ctx, "snake", () => { const l = loadScores(); return l.length ? "Your top 5: " + l.join(", ") : "No local scores yet"; });
    const intro = "<b>SNAKE</b><br><small>Arrow keys / WASD or swipe<br>Space or tap to start</small>";
    const rnd = (n) => (Math.random() * n) | 0;
    const reset = () => {
      // random head and heading, kept far enough from every wall that the snake never starts facing one
      const hx = 5 + rnd(N - 10), hy = 5 + rnd(N - 10), d = [[1, 0], [-1, 0], [0, 1], [0, -1]][rnd(4)];
      dir = { x: d[0], y: d[1] }; sn = [0, 1, 2].map((i) => ({ x: hx - dir.x * i, y: hy - dir.y * i }));
      queue = []; obs = []; bonus = null; grow = 0; score = 0; speed = SPEEDS[level]; acc = 0; placeFood(); scEl.textContent = 0; savePrev();
    };
    const free = (pad = -1) => {
      const h = sn[0], out = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (sn.some((p) => p.x === x && p.y === y) || obs.some((p) => p.x === x && p.y === y) || (food && food.x === x && food.y === y) || (bonus && bonus.x === x && bonus.y === y)) continue;
        const dx = Math.abs(x - h.x), dy = Math.abs(y - h.y);
        if (pad >= 0 && Math.max(wrap ? Math.min(dx, N - dx) : dx, wrap ? Math.min(dy, N - dy) : dy) <= pad) continue;
        out.push({ x, y });
      }
      return out;
    };
    const placeFood = () => { food = null; const f = free(); food = f.length ? f[rnd(f.length)] : { x: -1, y: -1 }; };
    const spawn = () => { // occasional extras after eating
      if (!bonus && Math.random() < 0.2) { const f = free(); if (f.length) bonus = { ...f[rnd(f.length)], ttl: 5000 }; }
      if (score >= 10 && obs.length < 10 && Math.random() < 0.3) { const f = free(3); if (f.length) obs.push(f[rnd(f.length)]); }
    };
    const say = (t) => { msg.innerHTML = t; msg.style.display = t ? "" : "none"; };
    const start = () => { if (state === "over") reset(); if (state !== "run") snd.blip(520, 0.05, "square", 0.6); state = "run"; say(""); };
    const newGame = () => { reset(); state = "ready"; say(intro); };
    const pause = () => {
      if (state === "run") { state = "paused"; say("<b>Paused</b><br><small>Space or tap to resume</small>"); }
      else if (state === "paused") start();
    };
    function turn(x, y) {
      if (state === "over") { if (performance.now() - overAt < 600) return; start(); }
      const last = queue[queue.length - 1] || dir;
      if (last.x === -x && last.y === -y) return;
      if ((last.x !== x || last.y !== y) && queue.length < 3) queue.push({ x, y });
      if (state !== "run") start();
    }
    const loadScores = () => {
      try { const a = JSON.parse(ctx.store.lget("xp-snake-scores") || "[]"); return Array.isArray(a) ? a.map(Number).filter((n) => n > 0).slice(0, 5) : []; } catch { return []; }
    };
    function end(win) {
      state = "over"; overAt = performance.now(); const s = score;
      if (s > best) { best = s; ctx.store.lset("xp-snake-best", best); hiEl.textContent = best; }
      const list = loadScores(); if (s > 0) list.push(s);
      list.sort((a, b) => b - a); list.length = Math.min(5, list.length); ctx.store.lset("xp-snake-scores", JSON.stringify(list));
      const rank = s > 0 ? list.indexOf(s) : -1;
      const rows = list.map((v, i) => i === rank ? `<b style="font-size:13px;color:#ffd700">${i + 1}. ${v} &larr;</b>` : `${i + 1}. ${v}`).join(" &nbsp; ");
      if (win) snd.seq([523, 659, 784, 1047], 0.1, 0.12, "triangle"); else snd.blip(260, 0.45, "sawtooth", 1, 50);
      say(`<div><b>${win ? "YOU WIN!" : "GAME OVER"}</b><br>Score ${s}<br><small>${rows ? "<u>Your top 5</u><br>" + rows + "<br>" : ""}</small><b style="font-size:12px;color:#fff"><u>World top 10</u></b><div class="wl"></div><small>Press Space or tap to play again</small></div>`);
      if (s > 0) wb.post(msg.querySelector(".wl"), s); else msg.querySelector(".wl")?.remove();
    }
    function showWorld() {
      if (state === "run") pause();
      say(`<div><b>World top 10</b><div class="wl"></div><small>Press Space or tap to continue</small></div>`);
      wb.view(msg.querySelector(".wl"));
    }
    function tick() {
      if (queue.length) dir = queue.shift();
      savePrev();
      let hx = sn[0].x + dir.x, hy = sn[0].y + dir.y;
      if (wrap) { hx = (hx + N) % N; hy = (hy + N) % N; }
      const h = { x: hx, y: hy }, eat = hx === food.x && hy === food.y, eatB = !!bonus && hx === bonus.x && hy === bonus.y;
      // the tail cell is free to enter unless we grow this tick
      const stay = eat || eatB || grow > 0;
      if (hx < 0 || hy < 0 || hx >= N || hy >= N || obs.some((p) => p.x === hx && p.y === hy) || sn.some((p, i) => (stay || i < sn.length - 1) && p.x === hx && p.y === hy)) return end(false);
      sn.unshift(h);
      if (eatB) { bonus = null; score += 3; grow += 2; scEl.textContent = score; snd.seq([784, 988, 1175], 0.05, 0.07); return; }
      if (!eat) { if (grow > 0) grow--; else sn.pop(); return; }
      score++; scEl.textContent = score; snd.blip(660, 0.07, "square", 0.8);
      if (sn.length >= N * N - obs.length) return end(true);
      placeFood(); spawn(); speed = Math.max(Math.round(SPEEDS[level] * 0.4), speed * 0.965); // each apple shaves ~3.5% off the tick
    }
    function draw() {
      g.fillStyle = "#0b3d0b"; g.fillRect(0, 0, W, W);
      g.fillStyle = "#0e470e"; for (let y = 0; y < N; y++) for (let x = (y & 1); x < N; x += 2) g.fillRect(x * CELL, y * CELL, CELL, CELL);
      if (!wrap) { g.strokeStyle = "#2f7a2f"; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, W - 2); }
      g.fillStyle = "#6b7280"; for (const o of obs) { g.fillRect(o.x * CELL + 1, o.y * CELL + 1, CELL - 2, CELL - 2); g.fillStyle = "#9ca3af"; g.fillRect(o.x * CELL + 1, o.y * CELL + 1, CELL - 2, 3); g.fillStyle = "#6b7280"; }
      g.fillStyle = "#ff4136"; g.beginPath(); g.arc(food.x * CELL + 10, food.y * CELL + 10, 7, 0, 7); g.fill();
      if (bonus && (bonus.ttl > 1500 || ((bonus.ttl / 150) | 0) % 2)) { g.fillStyle = "#ffd700"; g.beginPath(); g.arc(bonus.x * CELL + 10, bonus.y * CELL + 10, 8, 0, 7); g.fill(); g.fillStyle = "#fff6b0"; g.beginPath(); g.arc(bonus.x * CELL + 8, bonus.y * CELL + 8, 2.5, 0, 7); g.fill(); }
      // slide every segment from where it was at the last tick toward where it is now
      const a = clamp(acc / speed, 0, 1), L = sn.length;
      let hx = 0, hy = 0;
      for (let i = L - 1; i >= 0; i--) {
        const p = sn[i], j = i < pl ? i : pl - 1, fx = px[j], fy = py[j];
        let x = p.x, y = p.y;
        if (Math.abs(fx - x) <= 1 && Math.abs(fy - y) <= 1) { x = fx + (x - fx) * a; y = fy + (y - fy) * a; } // wrapping segments just snap
        if (i === 0) { hx = x; hy = y; break; }
        g.fillStyle = i & 1 ? "#7fdb3b" : "#72cd30"; g.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      }
      // head with eyes looking along the heading
      const cx = hx * CELL + CELL / 2, cy = hy * CELL + CELL / 2;
      g.fillStyle = "#c8ff6a"; g.fillRect(hx * CELL + 1, hy * CELL + 1, CELL - 2, CELL - 2);
      for (let s = -1; s <= 1; s += 2) {
        const ex = cx + dir.x * 4 - dir.y * 4 * s, ey = cy + dir.y * 4 + dir.x * 4 * s;
        g.fillStyle = "#fff"; g.beginPath(); g.arc(ex, ey, 2.8, 0, 7); g.fill();
        g.fillStyle = "#000"; g.beginPath(); g.arc(ex + dir.x * 1.2, ey + dir.y * 1.2, 1.3, 0, 7); g.fill();
      }
    }
    loop(ctx, (dt, resumed) => {
      if (state === "run" && (resumed || document.hidden || !ctx.isActive())) pause();
      if (state === "run") { if (bonus && (bonus.ttl -= dt) <= 0) bonus = null; acc += dt; while (acc >= speed && state === "run") { acc -= speed; tick(); } }
      draw();
    });
    // pause as soon as the window loses focus or the tab is hidden
    const autoPause = () => { if (state === "run") pause(); };
    listen(ctx, "blur", autoPause); listen(ctx, "visibilitychange", () => { if (document.hidden) autoPause(); });
    const keys = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    listen(ctx, "keydown", (e) => {
      if (!ctx.isActive() || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (keys[k]) { e.preventDefault(); turn(...keys[k]); }
      else if (k === " ") { e.preventDefault(); if (e.repeat || (state === "over" && performance.now() - overAt < 600)) return; if (state === "run" || state === "paused") pause(); else start(); }
      else if (k === "F2") { e.preventDefault(); newGame(); }
    });
    let tx = null, ty = 0;
    const stage = cv.parentElement;
    stage.addEventListener("pointerdown", (e) => { tx = e.clientX; ty = e.clientY; });
    stage.addEventListener("pointerup", (e) => {
      if (tx === null) return;
      const dx = e.clientX - tx, dy = e.clientY - ty; tx = null;
      if (Math.hypot(dx, dy) < 20) { if (state === "over" && performance.now() - overAt < 600) return; if (state !== "run") start(); return; }
      Math.abs(dx) > Math.abs(dy) ? turn(Math.sign(dx), 0) : turn(0, Math.sign(dy));
    });
    stage.addEventListener("pointercancel", () => { tx = null; });
    ctx.menu(body.querySelector(".menubar"), [{ label: "Game", items: () => [
      { label: "New", key: "F2", act: newGame },
      { label: state === "paused" ? "Resume" : "Pause", key: "Space", disabled: state !== "run" && state !== "paused", act: pause },
      "-",
      { label: "Speed:", disabled: true },
      { label: "World Leaderboard…", act: showWorld },
      "-",
      ...Object.keys(SPEEDS).map((n) => ({ label: n, check: n === level, act: () => { level = n; speed = SPEEDS[n]; ctx.store.lset("xp-snake-speed", n); } })),
      "-",
      { label: "Wrap-around (no walls)", check: wrap, act: () => { wrap = !wrap; ctx.store.lset("xp-snake-wrap", wrap ? "1" : "0"); } },
      snd.item(),
      "-",
      { label: "Exit", act: ctx.close },
    ] }]);
    observe(ctx, stage, () => fitCanvas(cv, W, W));
    reset(); say(intro);
  }

  // =====================================================================
  //  Brick Breaker
  // =====================================================================
  function breakout(body, ctx) {
    const W = 480, H = 360, BH = 16, BTOP = 40, PW = 80, PY = H - 24, MAXP = 150;
    const COLORS = ["#e5410c", "#f2a900", "#ffd640", "#5ca50a", "#1e7ae6", "#8a4fd8"];
    const PU = { W: ["#1e7ae6", "W"], M: ["#e5410c", "M"], S: ["#5ca50a", "S"], L: ["#e0245e", "+"], C: ["#8a4fd8", "C"] };
    const PU_BAG = "WWWMMMSSCCL";
    const PATS = [
      () => 1, // full wall
      (r, c, R, C) => Math.abs(c - (C - 1) / 2) <= (r + 1) / R * C / 2 ? 1 : 0, // pyramid
      (r, c) => (r + c) % 2 ? 0 : 1, // checkerboard
      (r, c) => (r + c) % 3 ? 1 : 0, // diagonal stripes
      () => (Math.random() < 0.75 ? 1 : 0), // random gaps
      (r, c, R, C) => (r === 0 || r === R - 1 || c === 0 || c === C - 1 ? 2 : 1), // fortress with steel border
    ];
    body.innerHTML = BAR + `<div class="game-hud"><span>Score: <b class="sc">0</b></span><span>Lives: <b class="lv">3</b></span><span>Level: <b class="lvl">1</b></span></div><div class="game-stage"><canvas width="${W}" height="${H}"></canvas><div class="game-msg"></div></div>`;
    body.classList.add("game-body");
    const cv = body.querySelector("canvas"), g = cv.getContext("2d"), msg = body.querySelector(".game-msg");
    const $ = (s) => body.querySelector(s);
    const snd = sound(ctx);
    let best = Number(ctx.store.lget("xp-breakout-best")) || 0, bestLvl = Number(ctx.store.lget("xp-breakout-level")) || 0;
    const wb = worldBoard(ctx, "breakout", () => best ? "Best: " + best + " (level " + (bestLvl || 1) + ")" : "No local best yet");
    const intro = () => `<b>BRICK BREAKER</b><br><small>Move the mouse or use ← →<br>Click or Space to launch${best ? "<br>Best: " + best + " (level " + (bestLvl || 1) + ")" : ""}</small>`;
    const rnd = (n) => (Math.random() * n) | 0;
    const parts = Array.from({ length: MAXP }, () => ({ l: 0, x: 0, y: 0, vx: 0, vy: 0, c: "" }));
    let pp = 0, pad = { x: W / 2 - PW / 2, w: PW }, balls = [], pups = [], bricks = [], remain = 0, cols = 10;
    let score = 0, lives = 3, level = 1, state = "ready", kl = false, kr = false, widenT = 0, slowT = 0, stickyT = 0, bannerT = 0, overAt = 0;
    const say = (t) => { msg.innerHTML = t; msg.style.display = t ? "" : "none"; };
    const hud = () => { $(".sc").textContent = score; $(".lv").textContent = lives; $(".lvl").textContent = level; };
    const basePW = () => Math.max(50, PW - (level - 1) * 4);
    const baseSp = () => Math.min(0.6, 0.26 + level * 0.03);
    const burst = (x, y, c, n) => {
      for (let i = 0; i < n; i++) {
        const p = parts[pp], a = Math.random() * 6.283, v = 0.05 + Math.random() * 0.15; pp = (pp + 1) % MAXP;
        p.l = 350 + Math.random() * 250; p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 0.05; p.c = c;
      }
    };
    function build() {
      const R = Math.min(10, 4 + level), bw = W / (level >= 5 ? 12 : 10); cols = level >= 5 ? 12 : 10;
      const pat = PATS[rnd(level < 2 ? PATS.length - 1 : PATS.length)];
      const pS = Math.min(0.5, (level - 1) * 0.08), pT = level >= 3 ? Math.min(0.3, (level - 2) * 0.06) : 0, pU = level >= 4 ? 0.05 : 0;
      bricks = []; remain = 0;
      for (let r = 0; r < R; r++) for (let c = 0; c < cols; c++) {
        const k = pat(r, c, R, cols); if (!k) continue;
        let t = 0; const q = Math.random();
        if (k === 2) t = 2; else if (q < pU) t = 3; else if (q < pU + pT) t = 2; else if (q < pU + pT + pS) t = 1;
        const hp = t === 3 ? 99 : t + 1;
        bricks.push({ x: c * bw, y: BTOP + r * BH, w: bw, t, hp, max: hp, f: 0, alive: true, s: Math.random(), col: COLORS[r % 6] });
        if (t < 3) remain++;
      }
      if (!remain) { bricks.push({ x: 0, y: BTOP, w: bw, t: 0, hp: 1, max: 1, f: 0, alive: true, s: 0.5, col: COLORS[0] }); remain = 1; }
    }
    const resetBall = () => { balls = [{ x: pad.x + pad.w / 2, y: PY - 6, vx: 0, vy: 0, r: 6, stuck: true, off: pad.w / 2 }]; };
    function newGame() {
      score = 0; lives = 3; level = 1; pad.w = basePW(); widenT = slowT = stickyT = 0; pups.length = 0;
      for (const p of parts) p.l = 0;
      build(); resetBall(); hud(); state = "ready"; say(intro());
    }
    const pause = () => {
      if (state === "run") { state = "paused"; kl = kr = false; say("<b>Paused</b><br><small>Click or Space to resume</small>"); }
      else if (state === "paused") { state = "run"; say(""); }
    };
    function release() {
      let any = false;
      for (const b of balls) if (b.stuck) {
        if (!b.vx && !b.vy) { const a = (0.25 + Math.random() * 0.45) * (Math.random() < 0.5 ? -1 : 1), sp = baseSp(); b.vx = sp * Math.sin(a); b.vy = -sp * Math.cos(a); }
        b.stuck = false; b.y = PY - b.r - 1; any = true;
      }
      if (any) snd.blip(660, 0.05, "square", 0.6);
      return any;
    }
    function launch() {
      if (state === "paused") return pause();
      if (state === "over") { if (performance.now() - overAt > 600) newGame(); return; }
      if ((state === "ready" || state === "run") && release()) { state = "run"; say(""); }
    }
    function gameOver() {
      state = "over"; overAt = performance.now();
      const nb = score > best; if (nb) { best = score; ctx.store.lset("xp-breakout-best", best); }
      if (level > bestLvl) { bestLvl = level; ctx.store.lset("xp-breakout-level", bestLvl); }
      snd.seq([392, 330, 262, 196], 0.14, 0.18, "sawtooth");
      say(`<b>GAME OVER</b><br>Score ${score} &middot; Level ${level}<br><small>${nb ? "New best score!" : "Best: " + best}<br>Best level: ${bestLvl}</small><div class="wl"></div><small>Click or Space to play again</small>`);
      if (score > 0) wb.post(msg.querySelector(".wl"), score, { level }); else msg.querySelector(".wl")?.remove();
    }
    function showWorld() {
      if (state === "run") pause();
      say(`<div><b>World top 10</b><div class="wl"></div><small>Click or Space to continue</small></div>`);
      wb.view(msg.querySelector(".wl"));
    }
    function loseLife() {
      lives--; hud(); pups.length = 0; widenT = slowT = stickyT = 0; resetBall(); snd.blip(300, 0.4, "sawtooth", 1, 60);
      if (lives <= 0) gameOver(); else { state = "ready"; say("<small>Click to launch</small>"); }
    }
    function nextLevel() {
      level++; pups.length = 0; widenT = slowT = stickyT = 0; build(); resetBall(); hud(); state = "banner"; bannerT = 1500; snd.seq([523, 659, 784], 0.09, 0.1, "triangle");
      if (level > bestLvl) { bestLvl = level; ctx.store.lset("xp-breakout-level", bestLvl); }
      say(`<b>Level ${level}</b><br><small>Get ready</small>`);
    }
    function hitBrick(b) {
      if (b.t === 3) { b.f = 80; snd.blip(180, 0.05, "sawtooth", 0.7, 0, 0, "steel"); return; }
      if (--b.hp > 0) { b.f = 120; burst(b.x + b.w / 2, b.y + BH / 2, "#fff", 3); snd.blip(b.t === 2 ? 240 : 380, 0.05, b.t === 2 ? "sawtooth" : "triangle", 0.8, 0, 0, "dent"); return; }
      snd.blip(480 + b.t * 110 + (b.s * 80), 0.07, "square", 0.9, 0, 0, "brick");
      b.alive = false; remain--; score += Math.round([10, 20, 40][b.t] * (1 + (level - 1) * 0.25)); hud();
      burst(b.x + b.w / 2, b.y + BH / 2, b.col, 9);
      if (Math.random() < 0.12) pups.push({ x: b.x + b.w / 2, y: b.y + BH / 2, k: PU_BAG[rnd(PU_BAG.length)] });
    }
    function applyPU(k) {
      snd.seq([523, 659, 880], 0.05, 0.07, "triangle");
      if (k === "W") widenT = 12000;
      else if (k === "S") slowT = 10000;
      else if (k === "C") stickyT = 12000;
      else if (k === "L") { lives = Math.min(5, lives + 1); hud(); }
      else if (k === "M") {
        const src = balls.find((b) => !b.stuck) || balls[0];
        for (const da of [-0.45, 0.45]) {
          if (balls.length >= 6) break;
          const c = Math.cos(da), s = Math.sin(da), vx = src.vx || 0.01, vy = src.vy || -baseSp();
          balls.push({ x: src.x, y: src.y, vx: vx * c - vy * s, vy: vx * s + vy * c, r: 6, stuck: src.stuck, off: src.off });
        }
      }
    }
    // keep every ball off perfectly horizontal / vertical paths: at least 25% of its speed vertical and 14% horizontal
    function fixVel(b) {
      const sp = Math.hypot(b.vx, b.vy); if (sp < 1e-6) return;
      const minY = sp * 0.25, minX = sp * 0.14;
      let ay = Math.max(Math.abs(b.vy), minY), ax = Math.sqrt(Math.max(0, sp * sp - ay * ay));
      if (ax < minX) { ax = minX; ay = Math.sqrt(sp * sp - ax * ax); }
      b.vx = (b.vx < 0 ? -1 : b.vx > 0 ? 1 : Math.random() < 0.5 ? -1 : 1) * ax;
      b.vy = (b.vy > 0 ? 1 : -1) * ay;
    }
    // returns true when this ball should stop stepping (fell out, or caught by a sticky paddle)
    function stepBall(b, d) {
      const r = b.r;
      b.x += b.vx * d; b.y += b.vy * d;
      let wall = false;
      if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx); wall = true; } else if (b.x > W - r) { b.x = W - r; b.vx = -Math.abs(b.vx); wall = true; }
      if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy); wall = true; }
      if (wall) { snd.blip(300, 0.03, "square", 0.5, 0, 0, "wall"); fixVel(b); }
      if (b.vy > 0 && b.y + r >= PY && b.y < PY + 10 && b.x >= pad.x - r && b.x <= pad.x + pad.w + r) {
        const hit = clamp((b.x - (pad.x + pad.w / 2)) / (pad.w / 2), -1, 1), sp = Math.min(baseSp() * 1.5, Math.hypot(b.vx, b.vy) * 1.012);
        b.vx = sp * Math.sin(hit * 1.05); b.vy = -sp * Math.cos(hit * 1.05); b.y = PY - r; fixVel(b);
        snd.blip(200, 0.05, "triangle", 1, 0, 0, "pad");
        if (stickyT > 0) { b.stuck = true; b.off = b.x - pad.x; return true; }
      }
      // circle vs rect: nearest overlapping brick only, reflect on its surface normal and push the ball clear
      let hitB = null, hd = Infinity, hx = 0, hy = 0;
      for (const k of bricks) {
        if (!k.alive) continue;
        const dx = b.x - clamp(b.x, k.x, k.x + k.w), dy = b.y - clamp(b.y, k.y, k.y + BH), q = dx * dx + dy * dy;
        if (q < r * r && q < hd) { hitB = k; hd = q; hx = dx; hy = dy; }
      }
      if (hitB) {
        hitBrick(hitB);
        const len = Math.sqrt(hd);
        if (len > 0) {
          const nx = hx / len, ny = hy / len, dot = b.vx * nx + b.vy * ny;
          if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
          b.x += nx * (r - len + 0.01); b.y += ny * (r - len + 0.01);
        } else b.vy = b.y < hitB.y + BH / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
        fixVel(b);
      }
      return b.y > H + 10;
    }
    function update(dt) {
      if (kl !== kr) pad.x = clamp(pad.x + (kr ? 1 : -1) * 0.5 * dt, 0, W - pad.w);
      const want = widenT > 0 ? Math.min(150, basePW() * 1.6) : basePW();
      if (Math.abs(want - pad.w) > 0.5) { const c = pad.x + pad.w / 2; pad.w += (want - pad.w) * Math.min(1, dt * 0.01); pad.x = clamp(c - pad.w / 2, 0, W - pad.w); }
      for (const k of bricks) if (k.f > 0) k.f -= dt;
      for (const p of parts) if (p.l > 0) { p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.0006 * dt; }
      for (const b of balls) if (b.stuck) { b.x = pad.x + clamp(b.off, 0, pad.w); b.y = PY - b.r; }
      if (state === "banner") { bannerT -= dt; if (bannerT <= 0) { state = "ready"; say("<small>Click to launch</small>"); } return; }
      if (state !== "run") return;
      widenT = Math.max(0, widenT - dt); slowT = Math.max(0, slowT - dt); stickyT = Math.max(0, stickyT - dt);
      for (let i = pups.length - 1; i >= 0; i--) {
        const p = pups[i]; p.y += 0.09 * dt;
        if (p.y + 7 >= PY && p.y - 7 <= PY + 10 && p.x >= pad.x - 12 && p.x <= pad.x + pad.w + 12) { applyPU(p.k); pups.splice(i, 1); }
        else if (p.y > H + 10) pups.splice(i, 1);
      }
      const mult = slowT > 0 ? 0.65 : 1;
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i]; if (b.stuck) continue;
        const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt * mult / 3)), d = dt * mult / steps; // keep per-step travel well below the radius
        let lost = false;
        for (let s = 0; s < steps; s++) { if (stepBall(b, d)) { lost = b.y > H + 10; break; } }
        if (lost) balls.splice(i, 1);
      }
      if (!balls.length) loseLife(); else if (remain <= 0) nextLevel();
    }
    function crack(k, n) {
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const x = k.x + k.w * (0.2 + 0.3 * i + 0.15 * k.s);
        g.moveTo(x, k.y + 1); g.lineTo(x + 4, k.y + BH * 0.4); g.lineTo(x - 3, k.y + BH * 0.7); g.lineTo(x + 2, k.y + BH - 1);
      }
      g.stroke();
    }
    function draw() {
      const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, "#0a1f5c"); grd.addColorStop(1, "#000");
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      g.lineWidth = 1;
      for (const k of bricks) {
        if (!k.alive) continue;
        const x = k.x + 1, y = k.y + 1, w = k.w - 2, h = BH - 2, dmg = k.max - k.hp;
        if (k.t === 3) { g.fillStyle = "#2c2c34"; g.fillRect(x, y, w, h); g.strokeStyle = "#d4a017"; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); g.fillStyle = "#d4a017"; g.fillRect(x + 3, y + h / 2 - 1, w - 6, 2); }
        else if (k.t === 2) { g.fillStyle = "#8d97a3"; g.fillRect(x, y, w, h); g.fillStyle = "#cfd6de"; g.fillRect(x, y, w, 3); g.fillStyle = "#59626d"; g.fillRect(x, y + h - 2, w, 2); g.fillStyle = "#3d444c"; g.fillRect(x + 2, y + 5, 2, 2); g.fillRect(x + w - 4, y + 5, 2, 2); if (dmg) { g.fillStyle = `rgba(0,0,0,${0.12 * dmg})`; g.fillRect(x, y, w, h); } }
        else { g.fillStyle = k.col; g.fillRect(x, y, w, h); g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(x, y, w, 3); if (k.t === 1) { g.strokeStyle = "rgba(0,0,0,.55)"; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); if (dmg) { g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x, y, w, h); } } }
        if (dmg && k.t < 3) { g.strokeStyle = "rgba(0,0,0,.7)"; crack(k, dmg + (k.t === 1 ? 1 : 0)); }
        if (k.f > 0) { g.globalAlpha = Math.min(0.7, k.f / 120); g.fillStyle = "#fff"; g.fillRect(x, y, w, h); g.globalAlpha = 1; }
      }
      for (const p of parts) if (p.l > 0) { g.globalAlpha = Math.min(1, p.l / 300); g.fillStyle = p.c; g.fillRect(p.x, p.y, 3, 3); }
      g.globalAlpha = 1;
      g.font = "bold 9px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      for (const p of pups) {
        const [c, t] = PU[p.k]; g.fillStyle = c; g.fillRect(p.x - 8, p.y - 6, 16, 12);
        g.beginPath(); g.arc(p.x - 8, p.y, 6, 0, 7); g.arc(p.x + 8, p.y, 6, 0, 7); g.fill();
        g.fillStyle = "#fff"; g.fillText(t, p.x, p.y + 0.5);
      }
      g.fillStyle = stickyT > 0 ? "#c9a4ff" : "#c0c0c0"; g.fillRect(pad.x, PY, pad.w, 10); g.fillStyle = "#fff"; g.fillRect(pad.x, PY, pad.w, 2);
      g.fillStyle = slowT > 0 ? "#9fd8ff" : "#fff";
      for (const b of balls) { g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); }
      g.font = "10px sans-serif"; g.textAlign = "left"; g.fillStyle = "rgba(255,255,255,.85)";
      let tx = 6;
      for (const [n, t] of [["WIDE", widenT], ["SLOW", slowT], ["CATCH", stickyT]]) if (t > 0) { const s = n + " " + Math.ceil(t / 1000) + "s"; g.fillText(s, tx, H - 6); tx += g.measureText(s).width + 10; }
    }
    loop(ctx, (dt, resumed) => {
      if (state === "run" && (resumed || document.hidden || !ctx.isActive())) pause();
      if (state !== "paused") update(dt);
      draw();
    });
    const stage = cv.parentElement;
    // map client coords through the canvas's CSS-scaled rect back to logical pixels
    const track = (e) => { if (state === "paused") return; const r = cv.getBoundingClientRect(); pad.x = clamp((e.clientX - r.left) / r.width * W - pad.w / 2, 0, W - pad.w); };
    stage.addEventListener("pointermove", track);
    stage.addEventListener("pointerdown", (e) => { track(e); launch(); });
    // moving the mouse off the play area pauses the game (touch and pen keep playing)
    cv.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && state === "run") pause(); });
    listen(ctx, "keydown", (e) => {
      if (!ctx.isActive() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); kl = true; }
      else if (e.key === "ArrowRight") { e.preventDefault(); kr = true; }
      else if (e.key === " ") { e.preventDefault(); if (!e.repeat) launch(); }
      else if ((e.key === "p" || e.key === "P") && !e.repeat) pause();
      else if (e.key === "F2") { e.preventDefault(); newGame(); }
    });
    // key-up and blur always clear, so a key released while unfocused can't stick
    listen(ctx, "keyup", (e) => { if (e.key === "ArrowLeft") kl = false; else if (e.key === "ArrowRight") kr = false; });
    listen(ctx, "blur", () => { kl = kr = false; if (state === "run") pause(); });
    listen(ctx, "visibilitychange", () => { if (document.hidden && state === "run") pause(); });
    ctx.menu(body.querySelector(".menubar"), [{ label: "Game", items: () => [
      { label: "New Game", key: "F2", act: newGame },
      { label: state === "paused" ? "Resume" : "Pause", key: "P", disabled: state !== "run" && state !== "paused", act: pause },
      "-",
      snd.item(),
      { label: "World Leaderboard…", act: showWorld },
      "-",
      { label: "Exit", act: ctx.close },
    ] }]);
    observe(ctx, stage, () => fitCanvas(cv, W, H));
    build(); resetBall(); say(intro());
  }

  // =====================================================================
  //  3D Pinball - Space Cadet style (2D table)
  // =====================================================================
  function pinball(body, ctx) {
    const W = 400, H = 600, BR = 7, G = 820, MAXV = 1700, SUB = 1 / 300;
    const FL = 54, FRP = 8, FRT = 5, REST = 0.5, UP = -0.5, FSPD = 20;
    const LX = 376, LY = 556, MX = 376; // plunger lane ball rest position; MX mirrors x across the playfield
    const BX = [128, 248, 188], BY = [170, 170, 228], BRB = 17, NB = 3;
    const RX = [140, 188, 236], RY = 24, RR = 22; // top rollover lanes
    const SPX = 188, SPY = 100; // spinner
    const DTX = 44, DTY0 = 270, DTGAP = 30, DTLEN = 22; // drop target bank
    const RANKS = ["Cadet", "Ensign", "Lieutenant", "Captain", "Commander", "Admiral", "Fleet Admiral"];
    const EXTRA = [25000, 75000, 150000];
    const LEFT = ["KeyZ", "ShiftLeft", "ArrowLeft"], RIGHT = ["Slash", "ShiftRight", "KeyM", "ArrowRight"], PLUNGE = ["Space", "ArrowDown"];
    body.innerHTML = BAR + `<div class="game-hud"><span>Score: <b class="sc">0</b></span><span>Ball: <b class="bl">1/3</b></span><span>Multiplier: <b class="mu">x1</b></span><span>Best: <b class="bs">0</b></span></div><div class="game-stage"><canvas width="${W}" height="${H}"></canvas><div class="game-msg"></div><button class="xpbtn pb-launch" style="position:absolute;right:8px;bottom:8px;width:84px;height:84px;border-radius:50%;font:bold 14px Tahoma,sans-serif;z-index:5;display:none;touch-action:none">LAUNCH</button></div>`;
    body.classList.add("game-body");
    const cv = body.querySelector("canvas"), g = cv.getContext("2d"), msg = body.querySelector(".game-msg"), stage = cv.parentElement, btn = body.querySelector(".pb-launch");
    cv.style.imageRendering = "auto";
    const $ = (s) => body.querySelector(s);
    const elSc = $(".sc"), elBl = $(".bl"), elMu = $(".mu"), elBs = $(".bs");
    const snd = sound(ctx);
    let best = Number(ctx.store.lget("xp-pinball-best")) || 0;
    const wb = worldBoard(ctx, "pinball", () => best ? "Best: " + best : "No local best yet");
    const intro = () => `<b>SPACE CADET</b><br><small>Hold Space / ↓ to pull the plunger, release to launch<br>Flippers: Z / ← and / / M / →${best ? "<br>Best: " + best : ""}</small>`;
    const say = (t) => { msg.innerHTML = t; msg.style.display = t ? "" : "none"; };

    // ---- static geometry: flat Float64Array, stride 7 = x1,y1,x2,y2,restitution,kick,slingId (-1 wall, -2 plain sling edge) ----
    const wl = [];
    const addW = (x1, y1, x2, y2, e = 0.45, k = 0, id = -1) => wl.push(x1, y1, x2, y2, e, k, id);
    const AN = 28;
    for (let i = 0; i < AN; i++) {
      const a0 = Math.PI + Math.PI * i / AN, a1 = Math.PI + Math.PI * (i + 1) / AN;
      addW(200 + 188 * Math.cos(a0), 190 + 188 * Math.sin(a0), 200 + 188 * Math.cos(a1), 190 + 188 * Math.sin(a1), 0.3);
    }
    addW(12, 190, 12, 610); addW(12, 215, 72, 262, 0.3); addW(388, 190, 388, 610); addW(364, 140, 364, 600); addW(364, 564, 388, 564, 0.1);
    for (const m of [0, 1]) { // left side, then mirrored right side
      const X = (x) => (m ? MX - x : x);
      addW(X(46), 430, X(46), 490); addW(X(46), 490, X(120), 527, 0.3);
      addW(X(72), 466, X(72), 408, 0.3, 0, -2); addW(X(72), 466, X(116), 494, 0.3, 0, -2); addW(X(72), 408, X(116), 494, 0.5, 330, m);
    }
    const WL = new Float64Array(wl), WN = WL.length;

    // ---- pre-rendered table art ----
    const bg = document.createElement("canvas"); bg.width = W; bg.height = H;
    (() => {
      const b = bg.getContext("2d");
      const gr = b.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#050b2e"); gr.addColorStop(0.55, "#1b0a4a"); gr.addColorStop(1, "#0a0624");
      b.fillStyle = gr; b.fillRect(0, 0, W, H);
      let sd = 12345; const rnd = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
      for (let i = 0; i < 90; i++) { b.globalAlpha = 0.25 + rnd() * 0.7; b.fillStyle = "#fff"; const s = rnd() < 0.15 ? 2 : 1; b.fillRect(rnd() * W, rnd() * H, s, s); }
      b.globalAlpha = 1;
      const planet = (x, y, r, c0, c1) => { const rg = b.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r); rg.addColorStop(0, c0); rg.addColorStop(1, c1); b.fillStyle = rg; b.beginPath(); b.arc(x, y, r, 0, 7); b.fill(); };
      b.globalAlpha = 0.55; planet(300, 330, 36, "#ffb15c", "#5a2a0a"); planet(100, 360, 20, "#7fd0ff", "#0b3055"); b.globalAlpha = 1;
      b.strokeStyle = "rgba(255,200,120,.45)"; b.lineWidth = 2; b.beginPath(); b.ellipse(300, 330, 56, 10, -0.3, 0, 7); b.stroke();
      b.strokeStyle = "rgba(140,170,255,.5)"; b.lineWidth = 2;
      for (const x of [164, 212]) { b.beginPath(); b.moveTo(x, 10); b.lineTo(x, 42); b.stroke(); }
      b.fillStyle = "rgba(180,200,255,.6)"; b.font = "bold 22px 'Lucida Console',monospace"; b.textAlign = "center"; b.textBaseline = "middle";
      b.fillText("SPACE CADET", 188, 292);
      b.font = "10px sans-serif"; b.fillText("RANK UP", 188, 58); b.fillText("SPIN", SPX, SPY + 18);
      b.strokeStyle = "rgba(255,230,120,.5)"; b.lineWidth = 3;
      for (const [x, y] of [[300, 220], [300, 250], [300, 280]]) { b.beginPath(); b.moveTo(x - 10, y + 6); b.lineTo(x, y - 4); b.lineTo(x + 10, y + 6); b.stroke(); }
      b.lineCap = "round";
      for (let pass = 0; pass < 2; pass++) {
        b.strokeStyle = pass ? "#9db4ff" : "#2b3a8c"; b.lineWidth = pass ? 2 : 6;
        b.beginPath();
        for (let i = 0; i < WN; i += 7) { if (WL[i + 6] !== -1 || WL[i + 4] === 0.1) continue; b.moveTo(WL[i], WL[i + 1]); b.lineTo(WL[i + 2], WL[i + 3]); }
        b.stroke();
      }
      b.fillStyle = "rgba(120,150,255,.4)"; b.font = "9px sans-serif"; b.fillText("OUT", 29, 520); b.fillText("OUT", MX - 29, 520);
    })();

    // ---- dynamic state (all preallocated) ----
    const B = { x: LX, y: LY, vx: 0, vy: 0 };
    const fl = [{ px: 128, py: 528, s: 1, a: REST, w: 0, on: false }, { px: 248, py: 528, s: -1, a: REST, w: 0, on: false }];
    const bumpF = new Float64Array(NB), slingF = new Float64Array(2), slingCd = new Float64Array(2), dtAlive = [1, 1, 1], dtF = new Float64Array(3), lanes = [false, false, false];
    const kd = {};
    const ptrs = new Map();
    let nx = 0, ny = -1, hitVn = 0;
    let state = "ready", prev = "ready", score = 0, ball = 1, maxBalls = 3, mult = 1, rank = 0, extraIdx = 0, fresh = true, saverT = 0, pull = 0, held = false;
    let msgText = "", msgT = 0, dtReset = 0, spA = 0, spV = 0, spN = 0, spIn = false, stuckT = 0, overAt = 0, dirty = true, touchL = false, touchR = false, plungeTouch = false, pl = false, pr = false;
    const touchDev = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || "ontouchstart" in window;
    if (touchDev) btn.style.display = "";

    const hud = () => { elSc.textContent = score; elBl.textContent = Math.min(ball, maxBalls) + "/" + maxBalls; elMu.textContent = "x" + mult; elBs.textContent = Math.max(best, score); };
    const flash = (t, ms = 1500) => { msgText = t; msgT = ms; };
    function add(p) {
      score += p * mult; dirty = true;
      if (extraIdx < EXTRA.length && score >= EXTRA[extraIdx]) { extraIdx++; maxBalls++; flash("EXTRA BALL!", 2200); snd.seq([523, 659, 784, 1047], 0.08, 0.1, "triangle"); }
    }
    function serve(f) { B.x = LX; B.y = LY; B.vx = B.vy = 0; state = "ready"; fresh = f; pull = 0; held = false; stuckT = 0; }
    function newGame() {
      score = 0; ball = 1; maxBalls = 3; extraIdx = 0; mult = 1; rank = 0; saverT = 0; msgT = 0; dtReset = 0; spV = 0;
      lanes[0] = lanes[1] = lanes[2] = false; dtAlive[0] = dtAlive[1] = dtAlive[2] = 1;
      bumpF.fill(0); slingF.fill(0); slingCd.fill(0);
      serve(true); dirty = true; say(intro());
    }
    function launch() {
      if (state !== "ready") return;
      const p = Math.max(0.45, pull);
      B.vx = 0; B.vy = -(700 + 900 * p); B.y = LY; state = "play"; say("");
      if (fresh) { saverT = 5000; fresh = false; }
      snd.blip(140, 0.3, "sawtooth", 0.9, 700 + 500 * p);
    }
    function toReady() { B.x = LX; B.y = LY; B.vx = B.vy = 0; state = "ready"; pull = 0; held = false; }
    function gameOver() {
      state = "over"; overAt = performance.now();
      const nb = score > best; if (nb) { best = score; ctx.store.lset("xp-pinball-best", best); }
      dirty = true;
      say(`<b>GAME OVER</b><br>Score ${score}<br><small>${nb ? "New best score!" : "Best: " + best}</small><div class="wl"></div><small>Click or F2 for a new game</small>`);
      if (score > 0) wb.post(msg.querySelector(".wl"), score); else msg.querySelector(".wl")?.remove();
    }
    function drain() {
      if (saverT > 0) { saverT = 0; flash("BALL SAVED"); snd.seq([440, 660, 880], 0.07, 0.09, "triangle"); serve(false); return; }
      snd.seq([330, 247, 196, 147], 0.12, 0.16, "sawtooth");
      if (ball >= maxBalls) { gameOver(); return; }
      ball++; mult = 1; dtReset = 0; dtAlive[0] = dtAlive[1] = dtAlive[2] = 1; dirty = true;
      serve(true); flash("BALL " + ball, 1200);
    }
    const releaseAll = () => { for (const k in kd) kd[k] = false; ptrs.clear(); touchL = touchR = plungeTouch = false; };
    function pause() {
      if (state === "play" || state === "ready") { prev = state; state = "paused"; releaseAll(); held = false; pull = 0; say("<b>Paused</b><br><small>Click or P to resume</small>"); }
      else if (state === "paused") { state = prev; say(state === "ready" && ball === 1 && !score ? intro() : ""); }
    }
    function showWorld() {
      if (state === "play" || state === "ready") pause();
      say(`<div><b>World top 10</b><div class="wl"></div><small>Click or P to continue</small></div>`);
      wb.view(msg.querySelector(".wl"));
    }
    function help() {
      if (state === "play" || state === "ready") pause();
      stage.querySelector(".sol-win")?.remove();
      stage.insertAdjacentHTML("beforeend", `<div class="sol-win" style="text-align:left;line-height:1.5;max-width:88%"><b>How to play</b><div style="margin:6px 0 10px">Left flipper: Z, Left Shift or ←<br>Right flipper: /, M, Right Shift or →<br>Plunger: hold Space or ↓, release to launch<br>Touch: tap left/right half of the table, use the Launch button<br>Drop all 3 targets for a bonus multiplier.<br>Light all 3 top lanes to rank up.<br>Ball saver for the first 5 seconds. Extra balls at 25k, 75k and 150k.<br>F2 new game, P pause.</div><button class="xpbtn">OK</button></div>`);
      const o = stage.querySelector(".sol-win");
      o.addEventListener("pointerdown", (e) => e.stopPropagation());
      o.querySelector("button").onclick = () => { o.remove(); if (state === "paused") pause(); };
    }

    // ---- physics ----
    // ball vs capsule (radius rad at p1 tapering to rad2 at p2). Pushes the ball out, reflects relative to the surface velocity (sx,sy pivot, w angular speed)
    function colSeg(x1, y1, x2, y2, rad, rad2, e, sx, sy, w) {
      const dx = x2 - x1, dy = y2 - y1;
      let t = ((B.x - x1) * dx + (B.y - y1) * dy) / (dx * dx + dy * dy); t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = x1 + dx * t, py = y1 + dy * t, ex = B.x - px, ey = B.y - py, d2 = ex * ex + ey * ey, R = BR + rad + (rad2 - rad) * t;
      if (d2 >= R * R) return false;
      const d = Math.sqrt(d2);
      if (d < 1e-6) { nx = 0; ny = -1; } else { nx = ex / d; ny = ey / d; }
      B.x += nx * (R - d); B.y += ny * (R - d);
      let vsx = 0, vsy = 0;
      if (w) { const rx = px - sx, ry = py - sy; vsx = -w * ry; vsy = w * rx; }
      const vn = (B.vx - vsx) * nx + (B.vy - vsy) * ny; hitVn = vn;
      if (vn < 0) { const k = (1 + e) * vn; B.vx -= k * nx; B.vy -= k * ny; }
      return true;
    }
    function stepFlippers(h) {
      for (let i = 0; i < 2; i++) {
        const f = fl[i], tgt = f.on ? UP : REST;
        if (f.a === tgt) { f.w = 0; continue; }
        const d = tgt - f.a, mv = FSPD * h, sg = d < 0 ? -1 : 1;
        if (Math.abs(d) <= mv) { f.a = tgt; f.w = 0; } else { f.a += sg * mv; f.w = sg * FSPD * f.s; }
      }
    }
    function stepBall(h) {
      B.vy += G * h;
      let sp2 = B.vx * B.vx + B.vy * B.vy;
      if (sp2 > MAXV * MAXV) { const k = MAXV / Math.sqrt(sp2); B.vx *= k; B.vy *= k; }
      B.x += B.vx * h; B.y += B.vy * h;
      for (let i = 0; i < WN; i += 7) {
        if (colSeg(WL[i], WL[i + 1], WL[i + 2], WL[i + 3], 0, 0, WL[i + 4], 0, 0, 0) && WL[i + 5] > 0) {
          const id = WL[i + 6];
          if (hitVn < -80 && slingCd[id] <= 0) { B.vx += nx * WL[i + 5]; B.vy += ny * WL[i + 5]; slingF[id] = 130; slingCd[id] = 120; add(10); snd.blip(300, 0.06, "square", 0.8, 500, 0, "sling"); }
        }
      }
      for (let j = 0; j < NB; j++) {
        const dx = B.x - BX[j], dy = B.y - BY[j], R = BRB + BR, d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 0.01; nx = dx / d; ny = dy / d;
          B.x = BX[j] + nx * R; B.y = BY[j] + ny * R;
          const vn = B.vx * nx + B.vy * ny;
          if (vn < 0) { B.vx -= 2 * vn * nx; B.vy -= 2 * vn * ny; }
          B.vx += nx * 260; B.vy += ny * 260; bumpF[j] = 140; add(100);
          snd.blip(500 + j * 90, 0.07, "square", 0.9, 0, 0, "bump");
        }
      }
      for (let i = 0; i < 3; i++) if (dtAlive[i] && colSeg(DTX, DTY0 + DTGAP * i, DTX, DTY0 + DTGAP * i + DTLEN, 3, 3, 0.3, 0, 0, 0)) {
        dtAlive[i] = 0; dtF[i] = 150; add(200); snd.blip(700 + i * 120, 0.06, "triangle", 0.9, 0, 0, "tgt");
        if (!dtAlive[0] && !dtAlive[1] && !dtAlive[2]) {
          add(1000); if (mult < 5) mult++; dirty = true; dtReset = 900; flash("MULTIPLIER x" + mult); snd.seq([523, 659, 784, 1047], 0.07, 0.09, "triangle");
        }
      }
      for (let i = 0; i < 2; i++) {
        const f = fl[i], tx = f.px + f.s * FL * Math.cos(f.a), ty = f.py + FL * Math.sin(f.a);
        if (colSeg(f.px, f.py, tx, ty, FRP, FRT, 0.25, f.px, f.py, f.w) && hitVn < -250) snd.blip(120, 0.04, "triangle", 0.7, 0, 0, "fhit");
      }
      // spinner: a rollover gate that spins faster the harder the ball crosses it
      const inSp = Math.abs(B.x - SPX) < 26 && Math.abs(B.y - SPY) < 10;
      if (inSp && !spIn) spV += 14 + Math.sqrt(B.vx * B.vx + B.vy * B.vy) * 0.02;
      spIn = inSp;
      for (let k = 0; k < 3; k++) if (!lanes[k]) {
        const dx = B.x - RX[k], dy = B.y - RY;
        if (dx * dx + dy * dy < RR * RR) {
          lanes[k] = true; add(500); snd.blip(800 + k * 150, 0.07, "triangle", 0.9, 0, 0, "lane");
          if (lanes[0] && lanes[1] && lanes[2]) {
            rank = Math.min(RANKS.length - 1, rank + 1); add(2000 + rank * 500); flash("RANK UP: " + RANKS[rank].toUpperCase(), 2200);
            lanes[0] = lanes[1] = lanes[2] = false; snd.seq([392, 494, 587, 784, 988], 0.07, 0.1, "triangle");
          }
        }
      }
      sp2 = B.vx * B.vx + B.vy * B.vy;
      if (B.x > 366 && B.y > 530 && sp2 < 3600) { toReady(); return; } // fell back into the plunger lane
      stuckT = sp2 < 400 ? stuckT + h : 0;
      if (stuckT > 2.5) { B.vy = -260; B.vx = (Math.random() < 0.5 ? -1 : 1) * 160; stuckT = 0; }
      if (B.y > H + 8) drain();
    }
    const anyKey = (arr) => { for (let i = 0; i < arr.length; i++) if (kd[arr[i]]) return true; return false; };
    function update(dt) {
      const ts = dt / 1000;
      if (msgT > 0) msgT -= dt;
      for (let j = 0; j < NB; j++) if (bumpF[j] > 0) bumpF[j] -= dt;
      for (let j = 0; j < 2; j++) { if (slingF[j] > 0) slingF[j] -= dt; if (slingCd[j] > 0) slingCd[j] -= dt; }
      for (let j = 0; j < 3; j++) if (dtF[j] > 0) dtF[j] -= dt;
      if (saverT > 0 && state === "play") saverT = Math.max(0, saverT - dt);
      if (dtReset > 0) { dtReset -= dt; if (dtReset <= 0) { dtAlive[0] = dtAlive[1] = dtAlive[2] = 1; snd.blip(400, 0.05, "triangle", 0.6); } }
      const l = anyKey(LEFT) || touchL, r = anyKey(RIGHT) || touchR;
      fl[0].on = l; fl[1].on = r;
      if ((l && !pl) || (r && !pr)) snd.blip(150, 0.05, "triangle", 0.8, 90, 0, "flip");
      pl = l; pr = r;
      const hold = anyKey(PLUNGE) || plungeTouch;
      if (state === "ready") {
        if (hold) { pull = Math.min(1, pull + ts); held = true; }
        else if (held) { held = false; launch(); pull = 0; }
      } else { held = false; pull = 0; }
      if (spV > 0) { spA += spV * ts; spV -= spV * 1.2 * ts; if (spV < 0.4) spV = 0; const n = Math.floor(spA / Math.PI); if (n !== spN) { add(50 * Math.abs(n - spN)); spN = n; snd.blip(900, 0.02, "square", 0.3, 0, 0, "spin"); } }
      let n = Math.max(1, Math.ceil(ts / SUB)); if (n > 20) n = 20;
      const h = ts / n;
      for (let s = 0; s < n; s++) { stepFlippers(h); if (state === "play") stepBall(h); }
      if (state === "ready") { B.x = LX; B.y = LY + pull * 26; }
      if (dirty) { hud(); dirty = false; }
    }

    // ---- drawing ----
    function draw() {
      g.drawImage(bg, 0, 0);
      g.textAlign = "center"; g.textBaseline = "middle";
      for (let k = 0; k < 3; k++) { g.fillStyle = lanes[k] ? "#6ff" : "#173a5a"; g.beginPath(); g.arc(RX[k], RY, 7, 0, 7); g.fill(); g.strokeStyle = "#9db4ff"; g.lineWidth = 1; g.stroke(); }
      g.strokeStyle = "#ffd640"; g.lineWidth = 4; const sw = 22 * Math.abs(Math.cos(spA));
      g.beginPath(); g.moveTo(SPX - sw, SPY); g.lineTo(SPX + sw, SPY); g.stroke();
      g.fillStyle = "#888"; g.fillRect(SPX - 24, SPY - 2, 3, 4); g.fillRect(SPX + 21, SPY - 2, 3, 4);
      g.lineWidth = 6; g.lineCap = "round";
      for (let i = 0; i < 3; i++) { const y = DTY0 + DTGAP * i; g.strokeStyle = dtAlive[i] ? (dtF[i] > 0 ? "#fff" : "#ff5a3c") : "#3a2a3a"; g.beginPath(); g.moveTo(DTX, y); g.lineTo(DTX, y + (dtAlive[i] ? DTLEN : 6)); g.stroke(); }
      for (let j = 0; j < NB; j++) {
        const f = bumpF[j] > 0;
        g.fillStyle = f ? "#fff7a0" : "#e0245e"; g.beginPath(); g.arc(BX[j], BY[j], BRB, 0, 7); g.fill();
        g.strokeStyle = f ? "#ffd640" : "#ffb3c8"; g.lineWidth = 3; g.stroke();
        g.fillStyle = f ? "#ffb300" : "#9e0f3c"; g.beginPath(); g.arc(BX[j], BY[j], BRB - 7, 0, 7); g.fill();
      }
      for (let m = 0; m < 2; m++) {
        const o = m ? MX : 0, sg = m ? -1 : 1;
        g.fillStyle = slingF[m] > 0 ? "#fff7a0" : "#3a56d4"; g.strokeStyle = "#9db4ff"; g.lineWidth = 2;
        g.beginPath(); g.moveTo(o + sg * 72, 408); g.lineTo(o + sg * 72, 466); g.lineTo(o + sg * 116, 494); g.closePath(); g.fill(); g.stroke();
      }
      g.lineCap = "round";
      for (let i = 0; i < 2; i++) {
        const f = fl[i], c = Math.cos(f.a), s = Math.sin(f.a), tx = f.px + f.s * FL * c, ty = f.py + FL * s, mx = f.px + f.s * FL * 0.5 * c, my = f.py + FL * 0.5 * s;
        g.strokeStyle = "#ff9d2e"; g.lineWidth = FRP * 2; g.beginPath(); g.moveTo(f.px, f.py); g.lineTo(mx, my); g.stroke();
        g.lineWidth = FRP + FRT; g.beginPath(); g.moveTo(mx, my); g.lineTo(tx, ty); g.stroke();
        g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 2; g.beginPath(); g.moveTo(f.px, f.py - 3); g.lineTo(tx, ty - 2); g.stroke();
        g.fillStyle = "#333"; g.beginPath(); g.arc(f.px, f.py, 3, 0, 7); g.fill();
      }
      const py = 564 + pull * 26;
      g.strokeStyle = "#888"; g.lineWidth = 2; g.beginPath(); g.moveTo(LX - 6, py + 10); g.lineTo(LX + 6, py + 14); g.lineTo(LX - 6, py + 18); g.lineTo(LX + 6, py + 22); g.stroke();
      g.fillStyle = "#c0c0c0"; g.fillRect(LX - 9, py, 18, 6); g.fillStyle = "#e33"; g.fillRect(LX - 9, py, 18, 2);
      g.fillStyle = "#dfe6ff"; g.beginPath(); g.arc(B.x, B.y, BR, 0, 7); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(B.x - 2, B.y - 2, 2.2, 0, 7); g.fill();
      g.font = "bold 10px sans-serif";
      if (saverT > 0 && ((saverT / 250) | 0) % 2 === 0) { g.fillStyle = "#ffd640"; g.fillText("BALL SAVE", 188, 585); }
      g.textAlign = "left"; g.fillStyle = "rgba(255,255,255,.8)"; g.fillText(RANKS[rank], 20, 590);
      if (msgT > 0) {
        g.textAlign = "center"; g.globalAlpha = Math.min(1, msgT / 300); g.font = "bold 20px 'Lucida Console',monospace";
        g.fillStyle = "#000"; g.fillText(msgText, 201, 351); g.fillStyle = "#c8ff6a"; g.fillText(msgText, 200, 350); g.globalAlpha = 1;
      }
    }
    loop(ctx, (dt, resumed) => {
      if (state === "play" && (resumed || document.hidden || !ctx.isActive())) pause();
      if (state !== "paused") update(dt);
      draw();
    });

    // ---- input ----
    const isCode = (c) => LEFT.includes(c) || RIGHT.includes(c) || PLUNGE.includes(c);
    const syncTouch = () => { touchL = touchR = false; for (const s of ptrs.values()) if (s < 0) touchL = true; else touchR = true; };
    stage.addEventListener("pointerdown", (e) => {
      if (e.target === btn) return;
      if (state === "over") { if (performance.now() - overAt > 600) newGame(); return; }
      if (state === "paused") { pause(); return; }
      const r = cv.getBoundingClientRect();
      ptrs.set(e.pointerId, (e.clientX - r.left) / r.width < 0.5 ? -1 : 1); syncTouch();
      try { stage.setPointerCapture(e.pointerId); } catch {}
    });
    const pend = (e) => { if (ptrs.delete(e.pointerId)) syncTouch(); };
    stage.addEventListener("pointerup", pend); stage.addEventListener("pointercancel", pend);
    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (state === "over") { if (performance.now() - overAt > 600) newGame(); return; }
      if (state === "paused") { pause(); return; }
      plungeTouch = true; try { btn.setPointerCapture(e.pointerId); } catch {}
    });
    const bup = () => { plungeTouch = false; };
    btn.addEventListener("pointerup", bup); btn.addEventListener("pointercancel", bup);
    listen(ctx, "keydown", (e) => {
      if (!ctx.isActive() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isCode(e.code)) {
        e.preventDefault();
        if (state === "over") { if (e.code === "Space" && !e.repeat && performance.now() - overAt > 600) newGame(); return; }
        if (state === "paused") return;
        kd[e.code] = true;
      } else if (e.key === "F2") { e.preventDefault(); newGame(); }
      else if ((e.key === "p" || e.key === "P") && !e.repeat) pause();
    });
    listen(ctx, "keyup", (e) => { if (isCode(e.code)) kd[e.code] = false; });
    listen(ctx, "blur", () => { releaseAll(); if (state === "play") pause(); });
    listen(ctx, "visibilitychange", () => { if (document.hidden) { releaseAll(); if (state === "play") pause(); } });
    ctx.menu(body.querySelector(".menubar"), [
      { label: "Game", items: () => [
        { label: "New Game", key: "F2", act: newGame },
        { label: state === "paused" ? "Resume" : "Pause", key: "P", disabled: state !== "play" && state !== "ready" && state !== "paused", act: pause },
        "-",
        snd.item(),
        { label: "World Leaderboard…", act: showWorld },
        "-",
        { label: "Exit", act: ctx.close },
      ] },
      { label: "Help", items: [{ label: "Controls", act: help }] },
    ]);
    observe(ctx, stage, () => fitCanvas(cv, W, H));
    ctx.onClose(() => { if (score > best) ctx.store.lset("xp-pinball-best", score); });
    newGame();
  }

  // =====================================================================
  //  Spider Solitaire (1, 2 or 4 suits)
  // =====================================================================
  function spider(body, ctx) {
    const SUITS = ["♠", "♥", "♦", "♣"], RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const red = (c) => c.s === 1 || c.s === 2;
    const snd = sound(ctx);
    body.classList.add("sol-body");
    body.innerHTML = BAR + `<div class="sol"><div class="sol-table"></div></div><div class="statusbar"><span class="score">Score: 500</span><span class="time">Time: 0</span><span class="suits"></span></div>`;
    const sol = body.querySelector(".sol"), table = body.querySelector(".sol-table"), scoreEl = body.querySelector(".score"), timeEl = body.querySelector(".time"), suitsEl = body.querySelector(".suits");
    const sv = Number(ctx.store.lget("xp-spider-suits"));
    let nS = sv === 2 || sv === 4 ? sv : 1;
    let S, history = [], score = 500, secs = 0, timer, won = false, drag = null, layout = { cw: 50, ch: 68, gap: 8, H: 400 }, pendingOff = null, hintT = 0, toastT = 0, casc = null;

    const wb = worldBoard(ctx, "spider", () => "No local best saved");
    const modeStr = () => nS + "suit";
    const overlay = (html, style = "") => { sol.querySelector(".sol-win")?.remove(); sol.insertAdjacentHTML("beforeend", `<div class="sol-win" style="${style}">${html}</div>`); return sol.querySelector(".sol-win"); };
    function toast(text) {
      sol.querySelector(".sol-toast")?.remove(); clearTimeout(toastT);
      sol.insertAdjacentHTML("beforeend", `<div class="sol-toast" style="position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:210;background:#ffffe1;color:#000;border:1px solid #000;padding:4px 10px;font:12px Tahoma,sans-serif;pointer-events:none">${text}</div>`);
      toastT = setTimeout(() => sol.querySelector(".sol-toast")?.remove(), 1800);
    }
    const top = (p) => p[p.length - 1];
    const pile = (id) => id === "s" ? S.k : S.t[+id[1]];
    function deal() {
      stopCascade(); clearHint();
      const deck = [];
      for (let k = 0; k < 8; k++) for (let r = 1; r <= 13; r++) deck.push({ id: k * 13 + r, s: k % nS, r, up: false });
      for (let i = deck.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; }
      S = { t: [], k: [], d: [] };
      for (let c = 0; c < 10; c++) { const col = []; for (let n = c < 4 ? 6 : 5; n--;) col.push(deck.pop()); top(col).up = true; S.t.push(col); }
      S.k = deck; history = []; score = 500; secs = 0; won = false; drag = null; pendingOff = null;
      sol.querySelector(".sol-win")?.remove(); timeEl.textContent = "Time: 0"; suitsEl.textContent = nS + (nS === 1 ? " suit" : " suits");
      clearInterval(timer); timer = setInterval(() => { if (!won && ctx.isVisible() && ctx.isActive() && !sol.querySelector(".sol-lb")) timeEl.textContent = "Time: " + ++secs; }, 1000);
      snd.seq([392, 523], 0.05, 0.05);
      render();
    }
    const snap = () => { history.push(JSON.stringify({ S, score })); };
    function undo() {
      if (!history.length || won || casc) return;
      const h = JSON.parse(history.pop()); S = h.S; score = h.score; drag = null; clearHint(); snd.blip(300, 0.05, "triangle"); render(true);
    }
    function setSuits(n) { nS = n; ctx.store.lset("xp-spider-suits", String(n)); deal(); }
    function help() {
      const o = overlay(`<b>How to play</b><div style="margin:6px 0 10px">Build descending runs from King to Ace in one suit; each finished run leaves the table.<br>Any card can be placed on a card one rank higher; only same-suit runs move together.<br>Click the stock to deal a card onto every column (no column may be empty).<br>Click a card to auto-move it, or drag it.<br>F2 new game, Ctrl+Z undo, H hint.<br>Score: 500, -1 per move, +100 per run.</div><button class="xpbtn">OK</button>`, "max-width:88%;text-align:left;line-height:1.5");
      o.querySelector("button").onclick = () => o.remove();
    }

    // a run = consecutive face-up cards of one suit, descending, from index i to the end of the pile
    function isRun(p, i) {
      if (i < 0 || i >= p.length || !p[i].up) return false;
      for (let j = i + 1; j < p.length; j++) if (!p[j].up || p[j].s !== p[j - 1].s || p[j].r !== p[j - 1].r - 1) return false;
      return true;
    }
    function canDrop(cards, id) {
      if (id[0] !== "t") return false;
      const t = top(pile(id)); return !t || t.r === cards[0].r + 1;
    }
    // removes a K..A same-suit run from the end of a pile; returns true if one was removed
    function complete(p) {
      if (p.length < 13) return false;
      const b = p.length - 13, s = p[b].s;
      for (let j = 0; j < 13; j++) { const c = p[b + j]; if (!c.up || c.s !== s || c.r !== 13 - j) return false; }
      S.d.push(p.splice(b, 13)); score += 100;
      const t = top(p); if (t && !t.up) t.up = true;
      snd.seq([523, 659, 784, 1047], 0.06, 0.09, "triangle");
      return true;
    }
    function move(from, idx, to) {
      snap();
      const src = pile(from), cards = src.splice(idx), dst = pile(to);
      dst.push(...cards); score = Math.max(0, score - 1);
      const t = top(src); if (t && !t.up) t.up = true;
      snd.blip(420, 0.035, "triangle");
      complete(dst);
      clearHint(); render(true); checkWin();
      return true;
    }
    // pointless to move a run that already sits on its proper parent
    const joined = (p, i) => i > 0 && p[i - 1].up && p[i - 1].s === p[i].s && p[i - 1].r === p[i].r + 1;
    function autoMove(from, idx) {
      const src = pile(from); if (!isRun(src, idx) || joined(src, idx)) return false;
      const c = src[idx];
      let same = null, any = null, empty = null;
      for (let d = 0; d < 10; d++) {
        const id = "t" + d; if (id === from) continue;
        const t = top(S.t[d]);
        if (!t) { if (idx > 0 && !empty) empty = id; }
        else if (t.r === c.r + 1) { if (t.s === c.s) { if (!same) same = id; } else if (!any) any = id; }
      }
      const to = same || any || empty;
      return to ? move(from, idx, to) : false;
    }
    function dealStock() {
      if (!S.k.length || won || casc) return;
      if (S.t.some((p) => !p.length)) { toast("Fill all empty columns before dealing"); return; }
      snap(); clearHint();
      for (let i = 0; i < 10; i++) { const c = S.k.pop(); c.up = true; S.t[i].push(c); }
      snd.seq([440, 466, 494], 0.03, 0.04, "triangle");
      for (let i = 0; i < 10; i++) complete(S.t[i]);
      render(true); checkWin();
    }
    function checkWin() {
      if (S.d.length < 8) return;
      won = true; clearInterval(timer); startCascade();
    }
    function showWin(first = true) {
      const o = overlay(`<b>You won!</b><br>Score ${score} in ${secs}s<div class="wl" style="min-width:230px"></div><button class="xpbtn">Deal again</button>`);
      o.querySelector("button").onclick = deal;
      if (first) wb.post(o.querySelector(".wl"), score, { time: secs, mode: modeStr() }); else wb.view(o.querySelector(".wl"));
    }
    function showWorld() {
      const o = overlay(`<b>World top 10</b><div class="wl sol-lb" style="min-width:230px"></div><button class="xpbtn">Close</button>`);
      o.querySelector("button").onclick = () => { if (won && !casc) showWin(false); else o.remove(); };
      wb.view(o.querySelector(".wl"));
    }

    // ---- hint ----
    function findHint() {
      let best = null, bs = 0;
      for (let k = 0; k < 10; k++) {
        const p = S.t[k];
        for (let i = 0; i < p.length; i++) {
          if (!isRun(p, i) || joined(p, i)) continue;
          const c = p[i];
          for (let d = 0; d < 10; d++) {
            if (d === k) continue;
            const t = top(S.t[d]); let sc;
            if (!t) { if (i === 0) continue; sc = 1; }
            else if (t.r === c.r + 1) sc = t.s === c.s ? 10 : 5;
            else continue;
            if (i > 0 && !p[i - 1].up) sc += 4; else if (i === 0) sc += 3;
            if (sc > bs) { bs = sc; best = { from: "t" + k, idx: i, to: "t" + d }; }
          }
        }
      }
      if (best) return best;
      if (S.k.length && S.t.every((p) => p.length)) return { stock: true };
      return null;
    }
    function clearHint() {
      clearTimeout(hintT);
      for (const el of table.querySelectorAll("[data-hint]")) { el.style.outline = ""; el.style.outlineOffset = ""; el.removeAttribute("data-hint"); }
    }
    function hint() {
      if (won || casc || drag) return;
      clearHint();
      const h = findHint();
      if (!h) { toast("No moves available"); return; }
      let els;
      if (h.stock) { const s = table.querySelectorAll('[data-pile="s"]'); els = [s[s.length - 1]]; }
      else { const dests = table.querySelectorAll(`[data-pile="${h.to}"]`); els = [table.querySelector(`.card[data-pile="${h.from}"][data-i="${h.idx}"]`), dests[dests.length - 1]]; }
      for (const el of els) if (el) { el.style.outline = "3px solid #ffeb3b"; el.style.outlineOffset = "1px"; el.setAttribute("data-hint", "1"); }
      snd.blip(880, 0.05, "sine", 0.7);
      hintT = setTimeout(clearHint, 1200);
    }

    // ---- win animation: bouncing-card cascade on a canvas overlay (same style as Solitaire) ----
    function startCascade() {
      const w = sol.clientWidth || 560, h = sol.clientHeight || 400, cv = document.createElement("canvas");
      cv.width = w; cv.height = h; cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:150;cursor:pointer";
      sol.appendChild(cv);
      cv.addEventListener("pointerdown", endCascade);
      casc = { cv, g: cv.getContext("2d"), w, h, n: 0, t: 0, sp: cardSheet(layout.cw, layout.ch, SUITS, RANKS, nS), pool: Array.from({ length: 52 }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, s: 0, r: 0 })) };
      snd.seq([523, 659, 784, 1047], 0.12, 0.16, "triangle");
      cascLoop.start();
    }
    function cascStep(dt) {
      const c = casc; if (!c) return;
      const g = c.g, cw = layout.cw, ch = layout.ch, grav = 0.0011 * (c.h / 400);
      c.t -= dt;
      if (c.t <= 0 && c.n < 52) {
        const p = c.pool[c.n]; p.r = 13 - (((c.n / nS) | 0) % 13); p.s = c.n % nS; c.n++;
        p.on = true; p.x = xOf(c.n % 8); p.y = layout.gap; p.vx = (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.22); p.vy = -Math.random() * 0.15; c.t = 280;
      }
      let live = 0;
      for (let i = 0; i < 52; i++) {
        const p = c.pool[i]; if (!p.on) continue;
        p.vy += grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > c.h - ch) { p.y = c.h - ch; p.vy = -p.vy * 0.8; }
        if (p.x < -cw || p.x > c.w) { p.on = false; continue; }
        live++;
        g.drawImage(c.sp.sheet, (p.r - 1) * c.sp.cellW, p.s * c.sp.cellH, c.sp.cellW, c.sp.cellH, p.x, p.y, c.sp.cellW, c.sp.cellH);
      }
      if (c.n >= 52 && !live) endCascade();
    }
    function stopCascade() { cascLoop.stop(); if (casc) { casc.cv.remove(); casc = null; } }
    function endCascade() { if (!casc) return; stopCascade(); showWin(); }
    const cascLoop = burst(ctx, cascStep);

    function computeLayout() {
      const W = table.clientWidth || 560, H = table.clientHeight || 400;
      const gap = Math.max(3, Math.min(10, W * 0.012));
      const cw = Math.min(80, (W - gap * 11) / 10), ch = cw * 1.36;
      layout = { cw, ch, gap, H };
      table.style.setProperty("--cw", cw + "px"); table.style.setProperty("--ch", ch + "px");
    }
    const xOf = (col) => layout.gap + col * (layout.cw + layout.gap);
    function render(anim) {
      let old = null;
      if (anim && table.firstChild) {
        const off = pendingOff; old = new Map();
        for (const el of table.children) {
          const id = el.dataset.id; if (id === undefined) continue;
          let x = parseFloat(el.style.left), y = parseFloat(el.style.top);
          if (off && off.els.includes(el)) { x += off.dx; y += off.dy; }
          old.set(id, [x, y]);
        }
      }
      pendingOff = null;
      computeLayout();
      const { cw, ch, gap, H } = layout, top0 = gap, tabY = gap * 2 + ch;
      const html = [];
      const slot = (id, x, y, label = "") => html.push(`<div class="slot" data-pile="${id}" style="left:${x}px;top:${y}px">${label}</div>`);
      const card = (c, id, i, x, y) => html.push(c.up
        ? `<div class="card ${red(c) ? "red" : ""}" data-id="${c.id}" data-pile="${id}" data-i="${i}" style="left:${x}px;top:${y}px"><span class="ci">${RANKS[c.r]}<br>${SUITS[c.s]}</span><span class="cc">${SUITS[c.s]}</span><span class="ci br">${RANKS[c.r]}<br>${SUITS[c.s]}</span></div>`
        : `<div class="card back" data-id="${c.id}" data-pile="${id}" data-i="${i}" style="left:${x}px;top:${y}px"></div>`);
      // completed runs (left) and stock (right)
      slot("f", xOf(0), top0, "K");
      S.d.forEach((run, i) => card(run[12], "f", i, xOf(0) + i * cw * 0.2, top0));
      slot("s", xOf(9), top0, S.k.length ? "" : "↻");
      const stacks = Math.ceil(S.k.length / 10);
      for (let i = 0; i < stacks; i++) card({ id: "k" + i, up: false }, "s", i, xOf(9) - (stacks - 1 - i) * cw * 0.2, top0);
      S.t.forEach((col, k) => {
        slot("t" + k, xOf(k), tabY);
        const downs = col.filter((c) => !c.up).length, ups = col.length - downs;
        let dOff = ch * 0.1, uOff = ch * 0.25;
        const need = downs * dOff + Math.max(0, ups - 1) * uOff + ch, avail = H - tabY - gap;
        if (need > avail && col.length > 1) { const f = Math.max(0.15, (avail - ch) / (need - ch)); dOff *= f; uOff *= f; }
        let y = tabY; col.forEach((c, i) => { card(c, "t" + k, i, xOf(k), y); y += c.up ? uOff : dOff; });
      });
      table.innerHTML = html.join("");
      scoreEl.textContent = "Score: " + score;
      if (old) {
        const moving = [];
        for (const el of table.children) {
          const o = old.get(el.dataset.id); if (!o) continue;
          const dx = o[0] - parseFloat(el.style.left), dy = o[1] - parseFloat(el.style.top);
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
          el.style.transition = "none"; el.style.transform = `translate(${dx}px,${dy}px)`; el.style.zIndex = 50; moving.push(el);
        }
        if (moving.length) {
          void table.offsetWidth;
          for (const el of moving) { el.style.transition = "transform 140ms ease-out"; el.style.transform = "translate(0,0)"; }
        }
      }
    }

    // ---- pointer interaction: click = auto move, drag = drop on a pile ----
    const colAt = (e) => {
      const r = table.getBoundingClientRect(), { cw, gap } = layout;
      return "t" + clamp(Math.floor((e.clientX - r.left - gap / 2) / (cw + gap)), 0, 9);
    };
    table.addEventListener("pointerdown", (e) => {
      if (won || drag || casc || e.button !== 0) return;
      const el = e.target.closest(".card, .slot"); if (!el) return;
      const id = el.dataset.pile;
      if (id === "s") { dealStock(); return; }
      if (id[0] !== "t" || !el.classList.contains("card")) return;
      const i = +el.dataset.i, p = pile(id);
      if (!isRun(p, i)) return;
      const els = [...table.querySelectorAll(`.card[data-pile="${id}"]`)].filter((x) => +x.dataset.i >= i);
      drag = { id, i, els, x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false };
      table.setPointerCapture(e.pointerId);
    });
    table.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true; drag.dx = dx; drag.dy = dy;
      drag.els.forEach((el) => { el.style.transition = "none"; el.style.transform = `translate(${dx}px,${dy}px)`; el.classList.add("dragging"); });
    });
    table.addEventListener("pointerup", (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) { if (!autoMove(d.id, d.i)) render(); return; }
      pendingOff = { els: d.els, dx: d.dx, dy: d.dy };
      let to = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-pile]")?.dataset.pile;
      if (!to || to[0] !== "t") to = colAt(e);
      if (to !== d.id && canDrop(pile(d.id).slice(d.i), to)) move(d.id, d.i, to); else render(true);
    });
    table.addEventListener("pointercancel", () => { if (drag) { const d = drag; drag = null; pendingOff = d.moved ? { els: d.els, dx: d.dx, dy: d.dy } : null; render(true); } });

    ctx.menu(body.querySelector(".menubar"), [
      { label: "Game", items: () => [
        { label: "New Game", key: "F2", act: deal },
        "-",
        { label: "Difficulty: 1 Suit", check: nS === 1, act: () => setSuits(1) },
        { label: "Difficulty: 2 Suits", check: nS === 2, act: () => setSuits(2) },
        { label: "Difficulty: 4 Suits", check: nS === 4, act: () => setSuits(4) },
        "-",
        { label: "Undo", key: "Ctrl+Z", disabled: !history.length || won || !!casc, act: undo },
        { label: "Hint", key: "H", disabled: won || !!casc, act: hint },
        snd.item(),
        { label: "World Leaderboard…", act: showWorld },
        "-",
        { label: "Exit", act: ctx.close },
      ] },
      { label: "Help", items: [{ label: "How to play", act: help }] },
    ]);
    listen(ctx, "keydown", (e) => {
      if (!ctx.isActive()) return;
      if (casc && !["Shift", "Control", "Alt", "Meta"].includes(e.key)) { e.preventDefault(); endCascade(); return; }
      if (e.key === "F2") { e.preventDefault(); deal(); }
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat && e.key.toLowerCase() === "h") { e.preventDefault(); hint(); }
    });
    observeSize(ctx, table, () => { if (!S || drag) return false; render(); });
    ctx.onClose(() => { clearInterval(timer); clearTimeout(hintT); clearTimeout(toastT); });
    deal();
  }

  window.GAMES = { solitaire, snake, breakout, pinball, spider };
})();
