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
  // where the suit symbols sit on a number card, in percent of the card (standard pip layout)
  const PIPS = {
    2: [[50, 19], [50, 81]], 3: [[50, 19], [50, 50], [50, 81]], 4: [[31, 19], [69, 19], [31, 81], [69, 81]], 5: [[31, 19], [69, 19], [50, 50], [31, 81], [69, 81]],
    6: [[31, 19], [69, 19], [31, 50], [69, 50], [31, 81], [69, 81]], 7: [[31, 19], [69, 19], [50, 34], [31, 50], [69, 50], [31, 81], [69, 81]],
    8: [[31, 19], [69, 19], [50, 34], [31, 50], [69, 50], [50, 66], [31, 81], [69, 81]],
    9: [[31, 17], [69, 17], [31, 39], [69, 39], [50, 50], [31, 61], [69, 61], [31, 83], [69, 83]],
    10: [[31, 17], [69, 17], [50, 28], [31, 39], [69, 39], [31, 61], [69, 61], [50, 72], [31, 83], [69, 83]],
  };
  const FIGURE = { 11: "♞", 12: "♛", 13: "♚" };
  const cardFace = (c, RANKS, SUITS) => {
    const r = RANKS[c.r], s = SUITS[c.s];
    const mid = c.r > 10 ? `<span class="cfig"><i>${FIGURE[c.r]}</i><u>${s}</u></span>` : c.r === 1 ? `<span class="cace">${s}</span>` : PIPS[c.r].map(([x, y]) => `<i class="pip${y > 50 ? " dn" : ""}" style="left:${x}%;top:${y}%">${s}</i>`).join("");
    return `<span class="ci">${r}<br>${s}</span>${mid}<span class="ci br">${r}<br>${s}</span>`;
  };
  // pre-rendered card faces (13 ranks x nSuits) on one offscreen sheet for the win cascade
  const cardSheet = (cw, ch, SUITS, RANKS, nSuits) => {
    const cellW = Math.ceil(cw) + 1, cellH = Math.ceil(ch) + 1, sheet = document.createElement("canvas");
    sheet.width = cellW * 13; sheet.height = cellH * nSuits;
    const g = sheet.getContext("2d");
    for (let s = 0; s < nSuits; s++) for (let r = 1; r <= 13; r++) {
      const x = (r - 1) * cellW, y = s * cellH;
      g.fillStyle = "#fff"; g.fillRect(x, y, cw, ch); g.strokeStyle = "#333"; g.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
      g.fillStyle = s === 1 || s === 2 ? "#d00" : "#000"; g.textBaseline = "top"; g.textAlign = "left"; g.font = `bold ${cw * 0.17}px Arial`;
      g.fillText(RANKS[r], x + 3, y + 3); g.fillText(SUITS[s], x + 3, y + 3 + cw * 0.18);
      g.textAlign = "center"; g.textBaseline = "middle";
      if (r === 1 || r > 10) { g.font = `${cw * 0.5}px Arial`; g.fillText(r > 10 ? FIGURE[r] : SUITS[s], x + cw / 2, y + ch / 2); }
      else { g.font = `${cw * 0.2}px Arial`; for (const [px, py] of PIPS[r]) g.fillText(SUITS[s], x + cw * px / 100, y + ch * py / 100); }
    }
    return { sheet, cellW, cellH };
  };
  const fitCanvas = (cv, W, H) => {
    // keep the logical coordinates, scale with CSS to fit the window body, and match the backing store to the real pixels so it stays sharp
    const box = cv.parentElement;
    const s = Math.min(box.clientWidth / W, box.clientHeight / H) || 1;
    cv.style.width = W * s + "px"; cv.style.height = H * s + "px";
    const k = Math.min(3, Math.max(1, s * (window.devicePixelRatio || 1))), bw = Math.round(W * k), bh = Math.round(H * k);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    cv.getContext("2d").setTransform(bw / W, 0, 0, bh / H, 0, 0);
  };
  const observe = (ctx, el, fn) => { const ro = new ResizeObserver(fn); ro.observe(el); ctx.onClose(() => ro.disconnect()); };
  const listen = (ctx, type, fn) => { addEventListener(type, fn); ctx.onClose(() => removeEventListener(type, fn)); };
  // a key belongs to the game unless it was typed into a field, or pressed somewhere outside its window (Start menu, tray...)
  const mine = (ctx, e) => { const t = e.target; if (!t?.closest || t === document.body || t === document.documentElement) return true; return ctx.el.contains(t) && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable; };

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

  // ---- game sounds: the shared synth in sound.js, behind each game's own Sound switch ----
  const sound = (ctx) => {
    const last = {};
    const limited = (key) => { if (!key) return false; const n = performance.now(); if (n - (last[key] || 0) < 30) return true; last[key] = n; return false; };
    const api = {
      on: () => ctx.store.lget("xp-game-sound") !== "0",
      toggle: () => ctx.store.lset("xp-game-sound", api.on() ? "0" : "1"),
      item: () => ({ label: "Sound", check: api.on(), act: api.toggle }),
      // freq Hz, dur seconds, optional glide target, delay seconds, key = per-sound rate limit
      blip(freq, dur = 0.06, type = "square", gain = 1, slide = 0, delay = 0, key = "") {
        if (!api.on() || limited(key)) return;
        window.XPS?.blip(freq, dur, type, gain, slide, delay);
      },
      seq(freqs, step = 0.07, dur = 0.09, type = "square") { freqs.forEach((f, i) => api.blip(f, dur, type, 1, 0, i * step)); },
      fx(name, key = "") { if (api.on() && !limited(key)) window.XPS?.play(name, true); },
    };
    return api;
  };

  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const career = (ctx, game, r) => ctx.sys?.career?.record(game, r);
  // ---- a title screen with a progress bar while the game "loads". Space or a click skips it ----
  function splash(game, { title, sub, art, bg, ms = 1300 }) {
    return (body, ctx) => {
      body.classList.add("splash-body");
      body.innerHTML = `<div class="splash" style="background:${bg}"><div class="splash-art">${art}</div><b>${title}</b><small>${sub}</small><div class="xp-progress"><i style="animation-duration:${ms}ms"></i></div><span class="skip-hint">Press Space to skip</span></div>`;
      body.querySelector(".splash").addEventListener("pointerdown", () => ctx.skipWait());
      ctx.wait(ms).then(() => { if (!ctx.alive()) return; body.classList.remove("splash-body"); body.innerHTML = ""; game(body, ctx); });
    };
  }
  // ---- pick a level already reached; locked ones stay greyed out ----
  function levelPicker(stage, title, names, reached, pick) {
    stage.querySelector(".sol-win")?.remove();
    stage.insertAdjacentHTML("beforeend", `<div class="sol-win lvl-pick"><b>${title}</b><div class="lvl-grid">${names.map((n, i) => `<button class="xpbtn" data-l="${i + 1}" ${i + 1 > reached ? "disabled" : ""} title="${i + 1 > reached ? "Reach this level to unlock it" : n}">${i + 1}. ${i + 1 > reached ? "Locked" : n}</button>`).join("")}</div><button class="xpbtn lvl-x">Cancel</button></div>`);
    const o = stage.querySelector(".sol-win");
    o.addEventListener("pointerdown", (e) => e.stopPropagation());
    o.addEventListener("pointerup", (e) => e.stopPropagation());
    o.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b || b.disabled) return; o.remove(); if (b.dataset.l) pick(+b.dataset.l); });
  }
  // ---- card games: fly the cards in from the deck one at a time; Space cuts it short ----
  function dealFx(ctx, snd, els, from, step, done) {
    if (!els.length || reduced() || !Element.prototype.animate) return done();
    const anims = els.map((el, i) => el.animate([{ transform: `translate(${from[0] - parseFloat(el.style.left)}px,${from[1] - parseFloat(el.style.top)}px)` }, { transform: "translate(0,0)" }], { duration: 170, delay: i * step, easing: "ease-out", fill: "backwards" }));
    let n = 0;
    const tick = setInterval(() => { if (++n >= els.length || !ctx.alive()) clearInterval(tick); else if (n % 2) snd.fx("flick"); }, step);
    ctx.wait(els.length * step + 170).then(() => { clearInterval(tick); anims.forEach((a) => { try { a.finish(); } catch {} }); done(); });
  }
  // ---- card backs, shared by Solitaire and Spider ----
  const BACKS = [["weave", "Blue Weave"], ["crimson", "Crimson"], ["fish", "Aquarium"], ["castle", "Castle"], ["robot", "Robot"], ["stars", "Night Sky"]];
  const paintBack = (ctx, table) => { const b = ctx.store.lget("xp-card-back"); table.dataset.back = BACKS.some(([k]) => k === b) ? b : "weave"; };
  function deckPicker(ctx, table, overlay) {
    const o = overlay(`<b>Select Card Back</b><div class="deck-grid">${BACKS.map(([k, n]) => `<button class="deck-pick ${table.dataset.back === k ? "on" : ""}" data-b="${k}" title="${n}" aria-label="${n}"><span class="card back" data-b="${k}"></span></button>`).join("")}</div><button class="xpbtn">OK</button>`);
    o.addEventListener("click", (e) => {
      const b = e.target.closest("[data-b]");
      if (b) { ctx.store.lset("xp-card-back", b.dataset.b); paintBack(ctx, table); o.querySelectorAll(".deck-pick").forEach((x) => x.classList.toggle("on", x.dataset.b === b.dataset.b)); }
      else if (e.target.closest(".xpbtn")) o.remove();
    });
  }
  function statsDialog(ctx, game, overlay) {
    const g = ctx.sys?.career?.read?.().games[game] || {}, pct = g.played ? Math.round((g.won || 0) / g.played * 100) : 0;
    const o = overlay(`<b>Statistics</b><table class="stat-t"><tr><td>Games played</td><td>${g.played || 0}</td></tr><tr><td>Games won</td><td>${g.won || 0} (${pct}%)</td></tr><tr><td>Current streak</td><td>${g.streak || 0}</td></tr><tr><td>Longest streak</td><td>${g.bestStreak || 0}</td></tr><tr><td>Best score</td><td>${g.bestScore || 0}</td></tr><tr><td>Fastest win</td><td>${g.bestTime ? g.bestTime + "s" : "—"}</td></tr></table><button class="xpbtn">OK</button>`);
    o.querySelector("button").onclick = () => o.remove();
  }

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
    let dealing = false, dealRun = 0, passes = 0, played = false;
    paintBack(ctx, table);

    const wb = worldBoard(ctx, "solitaire", () => "No local best saved");
    const modeStr = () => (vegas ? "vegas" : "standard") + "-d" + (draw3 ? 3 : 1);
    const overlay = (html, style = "") => { sol.querySelector(".sol-win")?.remove(); sol.insertAdjacentHTML("beforeend", `<div class="sol-win" style="${style}">${html}</div>`); return sol.querySelector(".sol-win"); };
    function toast(text) {
      sol.querySelector(".sol-toast")?.remove(); clearTimeout(toastT);
      sol.insertAdjacentHTML("beforeend", `<div class="sol-toast" style="position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:210;background:#ffffe1;color:#000;border:1px solid #000;padding:4px 10px;font:12px Tahoma,sans-serif;pointer-events:none">${text}</div>`);
      toastT = setTimeout(() => sol.querySelector(".sol-toast")?.remove(), 1800);
    }
    // a game abandoned after a move counts as a loss, like the real statistics
    const forfeit = () => { if (played && !won) career(ctx, "solitaire", { won: false, mode: modeStr(), pts: 1 }); played = false; };
    function deal() {
      forfeit();
      stopCascade(); clearInterval(autoT); autoRun = false; clearHint();
      const deck = [];
      for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ id: s * 13 + r, s, r, up: false });
      for (let i = deck.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; }
      S = { s: [], w: [], f: [[], [], [], []], t: [[], [], [], [], [], [], []] };
      for (let c = 0; c < 7; c++) for (let k = 0; k <= c; k++) { const card = deck.pop(); card.up = k === c; S.t[c].push(card); }
      S.s = deck; history = []; score = vegas ? -52 : 0; secs = 0; won = false; drag = null; pendingOff = null; passes = 0;
      sol.querySelector(".sol-win")?.remove(); timeEl.textContent = "Time: 0";
      // standard scoring loses 2 points every 10 seconds; the clock starts once the cards are down
      clearInterval(timer); timer = setInterval(() => { if (dealing || won || !ctx.isVisible() || sol.querySelector(".sol-lb")) return; timeEl.textContent = "Time: " + ++secs; if (!vegas && secs % 10 === 0 && score > 0) { score = Math.max(0, score - 2); scoreEl.textContent = "Score: " + score; } }, 1000);
      snd.fx("shuffle");
      render();
      const run = ++dealRun; dealing = true;
      const els = [...table.querySelectorAll('.card[data-pile^="t"]')].sort((a, b) => (+a.dataset.i - +b.dataset.i) || (+a.dataset.pile[1] - +b.dataset.pile[1]));
      dealFx(ctx, snd, els, [xOf(0), layout.gap], 38, () => { if (run === dealRun) dealing = false; });
    }
    const snap = () => { played = true; history.push(JSON.stringify({ S, score, passes })); if (history.length > 100) history.shift(); };
    const pile = (id) => id === "s" ? S.s : id === "w" ? S.w : id[0] === "f" ? S.f[+id[1]] : S.t[+id[1]];
    const top = (p) => p[p.length - 1];
    function undo() {
      if (!history.length || won || autoRun || casc || dealing) return;
      const h = JSON.parse(history.pop()); S = h.S; score = h.score; passes = h.passes; drag = null; clearHint(); snd.blip(300, 0.05, "triangle"); render(true);
    }
    function setDraw(v) { draw3 = v; ctx.store.lset("xp-sol-draw", v ? "3" : "1"); deal(); }
    function setVegas(v) { vegas = v; ctx.store.lset("xp-sol-vegas", v ? "1" : "0"); deal(); }
    function help() {
      const o = overlay(`<b>How to play</b><div style="margin:6px 0 10px">Build the four foundations up by suit, Ace to King.<br>Stack tableau cards downward, alternating colors.<br>Drag cards or runs between piles, or click a card to auto-move it.<br>Click the deck to draw; click the empty deck to recycle the waste.<br>F2 deals a new game, Ctrl+Z undoes, H shows a hint, Space skips the deal.<br>Standard: +10 foundation, +5 from the waste or a card turned over, -2 every 10 seconds, -100 per recycle after the first (Draw Three: -20 after the third), and a time bonus for winning.<br>Vegas: start at -52, +5 per card on a foundation, 1 pass in Draw One, 3 in Draw Three.</div><button class="xpbtn">OK</button>`, "max-width:88%;text-align:left;line-height:1.5");
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
      if (to[0] === "f") { snd.fx("place"); snd.blip(660 + cards[0].r * 30, 0.07, "triangle", 0.6); } else snd.fx("place");
      clearHint(); render(true); checkWin();
      return true;
    }
    function autoMove(from, idx) {
      const src = pile(from), cards = src.slice(idx);
      if (cards.length === 1 && from[0] !== "f") for (let i = 0; i < 4; i++) if (canDrop(cards, "f" + i)) return move(from, idx, "f" + i);
      // shuffling a run between columns only helps when it uncovers a face-down card
      if (from[0] === "t" && (idx === 0 || src[idx - 1].up)) return false;
      for (let i = 0; i < 7; i++) { const id = "t" + i; if (id !== from && canDrop(cards, id)) return move(from, idx, id); }
      return false;
    }
    function drawStock() {
      if (!S.s.length && !S.w.length) return;
      if (!S.s.length && vegas && passes >= (draw3 ? 2 : 0)) { toast(`Vegas allows ${draw3 ? "three passes" : "one pass"} through the deck`); snd.fx("menu"); return; }
      snap(); clearHint();
      if (S.s.length) { for (let n = draw3 ? 3 : 1; n-- && S.s.length;) { const c = S.s.pop(); c.up = true; S.w.push(c); } snd.fx("flick"); }
      else {
        // the first recycle is free in Draw One, the first three in Draw Three; each one after that costs points
        S.s = S.w.reverse().map((c) => ({ ...c, up: false })); S.w = []; passes++; snd.fx("shuffle");
        if (!vegas && passes > (draw3 ? 3 : 1)) score = Math.max(0, score - (draw3 ? 20 : 100));
      }
      render(true);
    }
    function checkWin() {
      updateAuto();
      if (!S.f.every((f) => f.length === 13)) return;
      won = true; played = false; clearInterval(timer); clearInterval(autoT); autoRun = false; updateAuto();
      // the classic time bonus rewards fast wins (standard scoring only; nothing under 30 seconds)
      if (!vegas && secs >= 30) score += Math.round(700000 / secs);
      scoreEl.textContent = "Score: " + score;
      career(ctx, "solitaire", { won: true, score, time: secs, mode: modeStr(), pts: draw3 ? 80 : 50 });
      snd.fx("tada");
      startCascade();
    }
    function showWin(first = true) {
      const o = overlay(`<b>You Won!</b>Score ${score} in ${secs}s<div class="wl" style="min-width:230px"></div><button class="xpbtn">Deal again</button>`);
      o.querySelector("button").onclick = deal;
      if (first) wb.post(o.querySelector(".wl"), score, { time: secs, mode: modeStr() }); else wb.view(o.querySelector(".wl"));
    }
    function showWorld() {
      const o = overlay(`<b>World top 10</b><div class="wl sol-lb" style="min-width:230px"></div><button class="xpbtn">Close</button>`);
      o.querySelector("button").onclick = () => { if (won && !casc) showWin(false); else o.remove(); };
      wb.view(o.querySelector(".wl"));
    }

    // ---- hint: highlight one legal move ----
    ctx.el.__g = { get S() { return S; }, set S(v) { S = v; render(); }, get score() { return score; }, get secs() { return secs; }, set secs(v) { secs = v; }, get won() { return won; }, get dealing() { return dealing; }, get passes() { return passes; }, get casc() { return casc; }, canDrop, move, drawStock, autoMove, checkWin, undo, render };
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
      if (won || autoRun || casc || drag || dealing) return;
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
      cascLoop.start();
    }
    function cascStep(dt) {
      const c = casc; if (!c) return;
      const g = c.g, cw = layout.cw, ch = layout.ch, grav = 0.0011 * (c.h / 400);
      c.t -= dt;
      if (c.t <= 0 && c.n < 52) {
        const p = c.pool[c.n], k = c.n % 4; p.r = 13 - ((c.n / 4) | 0); p.s = S.f[k]?.[0]?.s ?? k; c.n++;
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
          old.set(id, [x, y, el.classList.contains("back")]);
        }
      }
      pendingOff = null;
      computeLayout();
      const { cw, ch, gap, H } = layout, top0 = gap, tabY = gap * 2 + ch;
      const html = [];
      const slot = (id, x, y, label = "") => html.push(`<div class="slot" data-pile="${id}" style="left:${x}px;top:${y}px">${label}</div>`);
      const card = (c, id, i, x, y) => html.push(c.up
        ? `<div class="card ${red(c) ? "red" : ""}" data-id="${c.id}" data-pile="${id}" data-i="${i}" style="left:${x}px;top:${y}px">${cardFace(c, RANKS, SUITS)}</div>`
        : `<div class="card back" data-id="${c.id}" data-pile="${id}" data-i="${i}" style="left:${x}px;top:${y}px"></div>`);
      slot("s", xOf(0), top0, S.s.length ? "" : vegas && passes >= (draw3 ? 2 : 0) ? "✕" : "↻");
      S.s.forEach((c, i) => i >= S.s.length - 3 && card(c, "s", i, xOf(0) + (i - S.s.length + 3) * 1, top0));
      slot("w", xOf(1), top0);
      const w0 = Math.max(0, S.w.length - (draw3 ? 3 : 1));
      S.w.forEach((c, i) => i >= w0 && card(c, "w", i, xOf(1) + (i - w0) * cw * 0.22, top0));
      S.f.forEach((f, k) => { slot("f" + k, xOf(3 + k), top0, "A"); f.forEach((c, i) => i >= f.length - 2 && card(c, "f" + k, i, xOf(3 + k), top0)); });
      // a card turned face up since the last render flips over
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
          if (o[2] && !el.classList.contains("back")) el.classList.add("flipin");
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
      if (dealing) { ctx.skipWait(); return; }
      if (won || drag || autoRun || casc || e.button !== 0) return;
      const el = e.target.closest(".card, .slot"); if (!el) return;
      const id = el.dataset.pile;
      if (id === "s") { drawStock(); return; }
      if (!el.classList.contains("card")) return;
      const i = +el.dataset.i, p = pile(id), c = p[i];
      if (!c.up) { if (id[0] === "t" && i === p.length - 1) { snap(); c.up = true; if (!vegas) score += 5; snd.fx("flip"); render(true); } return; }
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
      if (to && to !== d.id && !(d.id[0] === "f" && to[0] === "f") && canDrop(pile(d.id).slice(d.i), to)) move(d.id, d.i, to); else { snd.blip(170, 0.06, "triangle", 0.6); render(true); }
    });
    table.addEventListener("pointercancel", () => { if (drag) { const d = drag; drag = null; pendingOff = d.moved ? { els: d.els, dx: d.dx, dy: d.dy } : null; render(true); } });

    ctx.menu(body.querySelector(".menubar"), [
      { label: "Game", items: () => [
        { label: "Deal", key: "F2", act: deal },
        { label: "Undo", key: "Ctrl+Z", disabled: !history.length || won || autoRun || !!casc, act: undo },
        { label: "Hint", key: "H", disabled: won || autoRun || !!casc, act: hint },
        { label: "Auto-finish", disabled: !canAuto(), act: autoFinish },
        "-",
        { label: "Deck…", act: () => deckPicker(ctx, table, overlay) },
        { label: "Draw One", check: !draw3, act: () => setDraw(false) },
        { label: "Draw Three", check: draw3, act: () => setDraw(true) },
        { label: "Vegas Scoring", check: vegas, act: () => setVegas(!vegas) },
        snd.item(),
        "-",
        { label: "Statistics…", act: () => statsDialog(ctx, "solitaire", overlay) },
        { label: "World Leaderboard…", act: showWorld },
        "-",
        { label: "Exit", act: ctx.close },
      ] },
      { label: "Help", items: [{ label: "How to play", act: help }] },
    ]);
    listen(ctx, "keydown", (e) => {
      if (!ctx.isActive() || !mine(ctx, e)) return;
      if (casc && !["Shift", "Control", "Alt", "Meta"].includes(e.key)) { e.preventDefault(); endCascade(); return; }
      if (e.key === "F2") { e.preventDefault(); deal(); }
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat && e.key.toLowerCase() === "h") { e.preventDefault(); hint(); }
    });
    // a re-render mid-drag would detach the dragged cards; the drop re-renders anyway
    observeSize(ctx, table, () => { if (!S || drag) return false; render(); });
    ctx.onClose(() => { forfeit(); clearInterval(timer); clearInterval(autoT); clearTimeout(hintT); clearTimeout(toastT); });
    deal();
  }

  // =====================================================================
  //  Snake (a level campaign through ten mazes, or classic endless)
  // =====================================================================
  function snake(body, ctx) {
    const N = 20, CELL = 20, W = N * CELL, SPEEDS = { Slow: 280, Normal: 220, Fast: 160 };
    // wall rectangles as inclusive [x1, y1, x2, y2]. Row 10 from x=2 to x=8 stays clear for the spawn.
    const MAZES = [
      ["Open Field", []],
      ["Two Bars", [[4, 5, 15, 5], [4, 14, 15, 14]]],
      ["Four Pillars", [[5, 5, 6, 6], [13, 5, 14, 6], [5, 13, 6, 14], [13, 13, 14, 14]]],
      ["Crossroads", [[10, 2, 10, 7], [10, 12, 10, 17], [13, 10, 17, 10]]],
      ["Zigzag", [[7, 0, 7, 7], [12, 12, 12, 19], [16, 0, 16, 7]]],
      ["The Room", [[6, 5, 8, 5], [11, 5, 13, 5], [6, 14, 8, 14], [11, 14, 13, 14], [6, 5, 6, 8], [6, 11, 6, 14], [13, 5, 13, 8], [13, 11, 13, 14]]],
      ["Staircase", [[2, 2, 5, 2], [5, 2, 5, 5], [5, 5, 8, 5], [8, 5, 8, 7], [11, 12, 11, 14], [11, 14, 14, 14], [14, 14, 14, 17], [14, 17, 17, 17]]],
      ["Spiral", [[3, 3, 16, 3], [16, 3, 16, 16], [3, 16, 16, 16], [3, 13, 3, 16], [6, 6, 13, 6], [13, 6, 13, 13], [6, 13, 13, 13], [6, 12, 6, 13]]],
      ["Comb", [[6, 0, 6, 8], [10, 0, 10, 8], [14, 0, 14, 8], [8, 11, 8, 19], [12, 11, 12, 19], [16, 11, 16, 19]]],
      ["Citadel", [[2, 2, 7, 2], [2, 2, 2, 7], [12, 2, 17, 2], [17, 2, 17, 7], [2, 17, 7, 17], [2, 12, 2, 17], [12, 17, 17, 17], [17, 12, 17, 17], [9, 7, 10, 8], [9, 12, 10, 13]]],
    ];
    const snd = sound(ctx);
    body.innerHTML = BAR + `<div class="game-hud"><span>Score: <b class="sc">0</b></span><span>Level: <b class="lv">1</b></span><span>Lives: <b class="li"></b></span><span>Apples: <b class="ap">0</b></span><span>Best: <b class="hi">0</b></span></div><div class="game-stage"><canvas width="${W}" height="${W}"></canvas><div class="game-msg"></div></div>`;
    body.classList.add("game-body");
    const cv = body.querySelector("canvas"), g = cv.getContext("2d"), msg = body.querySelector(".game-msg"), stage = cv.parentElement;
    const $ = (s) => body.querySelector(s), scEl = $(".sc"), hiEl = $(".hi"), lvEl = $(".lv"), liEl = $(".li"), apEl = $(".ap");
    let best = Number(ctx.store.lget("xp-snake-best")) || 0; hiEl.textContent = best;
    let pace = ctx.store.lget("xp-snake-speed"); if (!SPEEDS[pace]) pace = "Normal";
    let mode = ctx.store.lget("xp-snake-mode") === "endless" ? "endless" : "campaign", nextMode = mode;
    let wrapNext = ctx.store.lget("xp-snake-wrap") === "1", wrap = wrapNext;
    let reached = Math.max(1, Number(ctx.store.lget("xp-snake-reached")) || 1);
    let sn, dir, queue, food, bonus, obs, grow, score = 0, lv = 1, lives = 3, left = 0, state = "ready", acc = 0, speed = 200, overAt = 0, gen = 0, shake = 0, deadAt = 0, clock = 0, bgDirty = true;
    const wall = new Uint8Array(N * N);
    const px = [], py = [], ix = [], iy = []; let pl = 0; // segment positions before the latest tick, for interpolation
    const parts = [], pops = [];
    const savePrev = () => { pl = sn.length; for (let i = 0; i < pl; i++) { px[i] = sn[i].x; py[i] = sn[i].y; } };
    const wb = worldBoard(ctx, "snake", () => { const l = loadScores(); return l.length ? "Your top 5: " + l.join(", ") : "No local scores yet"; });
    const campaign = () => mode === "campaign";
    const intro = () => `<b>SNAKE</b>${campaign() ? "Clear 10 mazes on 3 lives" : "Endless: one life, no levels"}<br><small>Arrow keys / WASD or swipe<br>Space or tap to start</small>`;
    const rnd = (n) => (Math.random() * n) | 0;
    const maze = (l = lv) => MAZES[(l - 1) % MAZES.length];
    const target = () => Math.min(16, 5 + lv);
    const say = (t, light) => { msg.innerHTML = t ? `<div class="${light ? "gm-hint" : "gm-box"}">${t}</div>` : ""; msg.style.display = t ? "" : "none"; msg.classList.toggle("light", !!light); };
    const hud = () => { scEl.textContent = score; lvEl.textContent = campaign() ? lv : "∞"; liEl.textContent = "♥".repeat(Math.max(0, lives)); apEl.textContent = campaign() ? left : "—"; };
    const baseSpeed = () => (campaign() ? Math.max(SPEEDS[pace] * 0.45, SPEEDS[pace] * 0.94 ** (lv - 1)) : SPEEDS[pace]);
    const blocked = (x, y) => wall[y * N + x] === 1 || obs.some((p) => p.x === x && p.y === y);
    function loadLevel() {
      wall.fill(0); bgDirty = true;
      if (campaign()) for (const [x1, y1, x2, y2] of maze()[1]) for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) wall[y * N + x] = 1;
      dir = { x: 1, y: 0 }; sn = [4, 3, 2].map((x) => ({ x, y: 10 }));
      queue = []; obs = []; bonus = null; grow = 0; acc = 0; speed = baseSpeed(); shake = 0; placeFood(); savePrev(); hud();
    }
    const free = (pad = -1) => {
      const h = sn[0], out = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (blocked(x, y) || sn.some((p) => p.x === x && p.y === y) || (food && food.x === x && food.y === y) || (bonus && bonus.x === x && bonus.y === y)) continue;
        const dx = Math.abs(x - h.x), dy = Math.abs(y - h.y);
        if (pad >= 0 && Math.max(wrap ? Math.min(dx, N - dx) : dx, wrap ? Math.min(dy, N - dy) : dy) <= pad) continue;
        out.push({ x, y });
      }
      return out;
    };
    const placeFood = () => { food = null; const f = free(); food = f.length ? f[rnd(f.length)] : { x: -1, y: -1 }; };
    const spawn = () => { // occasional extras after eating
      if (!bonus && Math.random() < 0.2) { const f = free(); if (f.length) bonus = { ...f[rnd(f.length)], ttl: 5000 }; }
      if (!campaign() && score >= 100 && obs.length < 10 && Math.random() < 0.3) { const f = free(3); if (f.length) obs.push(f[rnd(f.length)]); }
    };
    const burstAt = (x, y, c, n) => { if (parts.length > 120) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = 0.03 + Math.random() * 0.1; parts.push({ x: (x + 0.5) * CELL, y: (y + 0.5) * CELL, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 450, c }); } };
    const pop = (x, y, t) => pops.push({ x: (x + 0.5) * CELL, y: (y + 0.5) * CELL, t, l: 800 });
    function newGame(startAt = 1) {
      gen++; ctx.skipWait(); // settle the old banner's wait now, or it would swallow the next Space
      mode = nextMode; wrap = wrapNext; lv = startAt; lives = campaign() ? 3 : 1; score = 0; left = target(); parts.length = pops.length = 0;
      loadLevel(); state = "ready"; say(intro());
    }
    function beginLevel() {
      const run = ++gen; state = "banner";
      say(campaign() ? `<b>Level ${lv}${lv > MAZES.length ? " (faster)" : ""}</b>${maze()[0]}<br><small>Eat ${left} apple${left === 1 ? "" : "s"} &middot; ${"♥".repeat(lives)}<br>Space skips this screen</small>` : `<b>Endless</b>Eat, grow, repeat<br><small>Space skips this screen</small>`);
      snd.fx("balloon");
      ctx.wait(1500).then(() => { if (run !== gen || !ctx.alive()) return; state = "run"; acc = 0; say(""); });
    }
    const start = () => { if (state === "over") newGame(); if (state === "ready") beginLevel(); else if (state === "paused") { state = "run"; say(""); } };
    const pause = () => {
      if (state === "run") { state = "paused"; say("<b>Paused</b><small>Space or tap to resume</small>"); }
      else if (state === "paused") start();
    };
    function turn(x, y) {
      if (state === "over") { if (performance.now() - overAt < 600) return; start(); }
      if (state === "clear" || state === "dying") return;
      const last = queue[queue.length - 1] || dir;
      if (last.x === -x && last.y === -y) return;
      if ((last.x !== x || last.y !== y) && queue.length < 3) queue.push({ x, y });
      if (state === "banner") ctx.skipWait(); else if (state !== "run") start();
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
      const rows = list.map((v, i) => i === rank ? `<b style="color:#b8860b">${i + 1}. ${v} &larr;</b>` : `${i + 1}. ${v}`).join(" &nbsp; ");
      snd.fx(win ? "tada" : "lose");
      career(ctx, "snake", { won: win || lv > 1, score: s, level: campaign() ? lv : undefined, mode, pts: lv * 10 + s / 50 });
      say(`<b>${win ? "You Win!" : "Game Over"}</b>Score ${s}${campaign() ? ` &middot; Level ${lv}` : ""}<br><small>${rows ? "<u>Your top 5</u><br>" + rows + "<br>" : ""}</small><u>World top 10</u><div class="wl"></div><small>Press Space or tap to play again</small>`);
      if (s > 0) wb.post(msg.querySelector(".wl"), s, { level: campaign() ? lv : undefined, mode: mode.slice(0, 3) + "-" + pace.toLowerCase() + (wrap ? "-wrap" : "") }); else msg.querySelector(".wl")?.remove();
    }
    function showWorld() {
      if (state === "run") pause();
      say(`<b>World top 10</b><div class="wl"></div><small>Press Space or tap to continue</small>`);
      wb.view(msg.querySelector(".wl"));
    }
    function die() {
      state = "dying"; deadAt = performance.now(); shake = 9; lives--; hud(); snd.fx("pop");
      for (let i = 0; i < sn.length; i += 2) burstAt(sn[i].x, sn[i].y, "#8be04e", 3);
      const run = ++gen;
      ctx.wait(800).then(() => {
        if (run !== gen || !ctx.alive()) return;
        if (lives > 0) { loadLevel(); beginLevel(); } else end(false);
      });
    }
    function levelClear() {
      state = "clear"; queue = [];
      const b = 50 * lv + lives * 25; score += b; hud(); snd.fx("levelup");
      for (let i = 0; i < 14; i++) burstAt(rnd(N), rnd(N), ["#ffd640", "#fff", "#8be04e"][i % 3], 3);
      if (lv + 1 > reached) { reached = lv + 1; ctx.store.lset("xp-snake-reached", reached); }
      say(`<b>Level ${lv} Clear!</b>Bonus +${b}<br><small>Next: ${maze(lv + 1)[0]}<br>Space skips this screen</small>`);
      const run = ++gen;
      ctx.wait(1500).then(() => {
        if (run !== gen || !ctx.alive()) return;
        lv++; left = target(); loadLevel(); beginLevel();
      });
    }
    function tick() {
      if (queue.length) dir = queue.shift();
      savePrev();
      let hx = sn[0].x + dir.x, hy = sn[0].y + dir.y;
      if (wrap) { hx = (hx + N) % N; hy = (hy + N) % N; }
      const h = { x: hx, y: hy }, eat = hx === food.x && hy === food.y, eatB = !!bonus && hx === bonus.x && hy === bonus.y;
      // the tail cell is free to enter unless we grow this tick
      const stay = eat || eatB || grow > 0;
      if (hx < 0 || hy < 0 || hx >= N || hy >= N || blocked(hx, hy) || sn.some((p, i) => (stay || i < sn.length - 1) && p.x === hx && p.y === hy)) return die();
      sn.unshift(h);
      if (eatB) { const p = 30 * lv; bonus = null; score += p; grow += 2; hud(); pop(hx, hy, "+" + p); burstAt(hx, hy, "#ffd640", 10); snd.fx("powerup"); return; }
      if (!eat) { if (grow > 0) grow--; else sn.pop(); return; }
      const p = 10 * lv; score += p; pop(hx, hy, "+" + p); burstAt(hx, hy, "#ff4136", 7); snd.blip(660, 0.07, "square", 0.8);
      if (campaign()) { left--; hud(); if (left <= 0) return levelClear(); } else hud();
      if (sn.length >= N * N - obs.length - wall.reduce((a, b) => a + b, 0)) return end(true);
      placeFood(); spawn(); speed = Math.max(SPEEDS[pace] * 0.4, speed * (campaign() ? 0.985 : 0.965));
    }
    // the field and its walls only change between levels, so they are drawn once onto a sharper offscreen canvas
    const bgc = document.createElement("canvas"); bgc.width = bgc.height = W * 2;
    function paintField() {
      bgDirty = false;
      const b = bgc.getContext("2d"); b.setTransform(2, 0, 0, 2, 0, 0);
      const hue = campaign() ? [110, 95, 150, 75, 125, 165, 85, 140, 60, 180][(lv - 1) % MAZES.length] : 110;
      b.fillStyle = `hsl(${hue},58%,20%)`; b.fillRect(0, 0, W, W);
      b.fillStyle = `hsl(${hue},58%,23%)`; for (let y = 0; y < N; y++) for (let x = (y & 1); x < N; x += 2) b.fillRect(x * CELL, y * CELL, CELL, CELL);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (!wall[y * N + x]) continue;
        const X = x * CELL, Y = y * CELL;
        b.fillStyle = "#8c5a33"; b.fillRect(X, Y, CELL, CELL);
        b.fillStyle = "#b47c4a"; b.fillRect(X, Y, CELL, 3); b.fillRect(X, Y, 3, CELL);
        b.fillStyle = "#5e3a1e"; b.fillRect(X, Y + CELL - 3, CELL, 3); b.fillRect(X + CELL - 3, Y, 3, CELL);
        b.fillStyle = "rgba(0,0,0,.2)"; b.fillRect(X + 3, Y + CELL / 2, CELL - 6, 1); b.fillRect(X + CELL / 2, Y + 3, 1, CELL / 2 - 3);
      }
      if (!wrap) { b.strokeStyle = "#7fbf5f"; b.lineWidth = 2; b.strokeRect(1, 1, W - 2, W - 2); }
    }
    function apple(x, y, t) {
      const cx = (x + 0.5) * CELL, cy = (y + 0.5) * CELL + Math.sin(t / 220) * 0.8;
      g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(cx, (y + 0.5) * CELL + 7, 6, 2, 0, 0, 7); g.fill();
      const r = g.createRadialGradient(cx - 2.5, cy - 2.5, 1, cx, cy, 8); r.addColorStop(0, "#ff8a7a"); r.addColorStop(0.6, "#e5261f"); r.addColorStop(1, "#99120e");
      g.fillStyle = r; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
      g.strokeStyle = "#5a3a12"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy - 6); g.lineTo(cx + 1, cy - 9); g.stroke();
      g.fillStyle = "#54c22a"; g.beginPath(); g.ellipse(cx + 4, cy - 8, 3.5, 1.8, -0.5, 0, 7); g.fill();
    }
    function star(x, y, t) {
      const cx = (x + 0.5) * CELL, cy = (y + 0.5) * CELL;
      g.save(); g.translate(cx, cy); g.rotate(t / 500); g.beginPath();
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, r = i & 1 ? 3.6 : 8.5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.closePath(); g.fillStyle = "#ffd640"; g.fill(); g.strokeStyle = "#b8860b"; g.lineWidth = 1; g.stroke(); g.restore();
    }
    function draw(dt) {
      clock += dt;
      if (bgDirty) paintField();
      g.save();
      if (shake > 0.3) { g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.9; }
      g.drawImage(bgc, 0, 0, W, W);
      for (const o of obs) { const X = o.x * CELL, Y = o.y * CELL; g.fillStyle = "#6b7280"; g.fillRect(X + 1, Y + 1, CELL - 2, CELL - 2); g.fillStyle = "#9ca3af"; g.fillRect(X + 1, Y + 1, CELL - 2, 3); }
      if (food.x >= 0) apple(food.x, food.y, clock);
      if (bonus && (bonus.ttl > 1500 || ((bonus.ttl / 150) | 0) % 2)) star(bonus.x, bonus.y, clock);
      // slide every segment from where it was at the last tick toward where it is now
      const a = state === "run" ? clamp(acc / speed, 0, 1) : state === "dying" || state === "clear" ? 1 : 0, L = sn.length;
      for (let i = 0; i < L; i++) {
        const p = sn[i], j = i < pl ? i : pl - 1, fx = px[j], fy = py[j];
        let x = p.x, y = p.y;
        if (Math.abs(fx - x) <= 1 && Math.abs(fy - y) <= 1) { x = fx + (x - fx) * a; y = fy + (y - fy) * a; } // wrapping segments just snap
        ix[i] = (x + 0.5) * CELL; iy[i] = (y + 0.5) * CELL;
      }
      const flashing = state === "dying" && ((performance.now() - deadAt) / 90 | 0) % 2 === 0;
      const stroke = (c, w) => {
        g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(ix[0], iy[0]); g.lineTo(ix[0] + 0.01, iy[0]);
        for (let i = 1; i < L; i++) { if (Math.abs(ix[i] - ix[i - 1]) > CELL * 1.5 || Math.abs(iy[i] - iy[i - 1]) > CELL * 1.5) g.moveTo(ix[i], iy[i]); else g.lineTo(ix[i], iy[i]); }
        g.stroke();
      };
      g.lineCap = "round"; g.lineJoin = "round";
      stroke("#1b520f", CELL - 3); stroke(flashing ? "#fff" : "#5fc42a", CELL - 6); stroke(flashing ? "#fff" : "#8be04e", 5);
      // head with eyes looking along the heading
      const cx = ix[0], cy = iy[0];
      g.fillStyle = flashing ? "#fff" : "#a6ec5c"; g.strokeStyle = "#1b520f"; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, CELL * 0.46, 0, 7); g.fill(); g.stroke();
      for (let s = -1; s <= 1; s += 2) {
        const ex = cx + dir.x * 4 - dir.y * 4 * s, ey = cy + dir.y * 4 + dir.x * 4 * s;
        g.fillStyle = "#fff"; g.beginPath(); g.arc(ex, ey, 2.8, 0, 7); g.fill();
        g.fillStyle = "#000"; g.beginPath(); g.arc(ex + dir.x * 1.2, ey + dir.y * 1.2, 1.3, 0, 7); g.fill();
      }
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.l -= dt; if (p.l <= 0) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.0002 * dt; g.globalAlpha = Math.min(1, p.l / 250); g.fillStyle = p.c; g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
      g.textAlign = "center"; g.textBaseline = "middle"; g.font = "bold 12px Tahoma,sans-serif";
      for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.l -= dt; if (p.l <= 0) { pops.splice(i, 1); continue; } p.y -= 0.03 * dt; g.globalAlpha = Math.min(1, p.l / 300); g.fillStyle = "#000"; g.fillText(p.t, p.x + 1, p.y + 1); g.fillStyle = "#fff"; g.fillText(p.t, p.x, p.y); }
      g.globalAlpha = 1; g.restore();
    }
    loop(ctx, (dt, resumed) => {
      if (state === "run" && (resumed || document.hidden || !ctx.isActive())) pause();
      if (state === "run") { if (bonus && (bonus.ttl -= dt) <= 0) bonus = null; acc += dt; while (acc >= speed && state === "run") { acc -= speed; tick(); } }
      draw(dt);
    });
    // pause as soon as the window loses focus or the tab is hidden
    const autoPause = () => { if (state === "run") pause(); };
    listen(ctx, "blur", autoPause); listen(ctx, "visibilitychange", () => { if (document.hidden) autoPause(); });
    const keys = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    listen(ctx, "keydown", (e) => {
      if (!ctx.isActive() || !mine(ctx, e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (keys[k]) { e.preventDefault(); turn(...keys[k]); }
      else if (k === " ") { e.preventDefault(); if (e.repeat || (state === "over" && performance.now() - overAt < 600)) return; if (state === "run" || state === "paused") pause(); else start(); }
      else if (k === "F2") { e.preventDefault(); newGame(); }
    });
    let tx = null, ty = 0;
    stage.addEventListener("pointerdown", (e) => { tx = e.clientX; ty = e.clientY; });
    stage.addEventListener("pointerup", (e) => {
      if (tx === null) return;
      const dx = e.clientX - tx, dy = e.clientY - ty; tx = null;
      if (Math.hypot(dx, dy) < 20) { if (state === "over" && performance.now() - overAt < 600) return; if (state === "banner" || state === "clear" || state === "dying") ctx.skipWait(); else if (state !== "run") start(); return; }
      Math.abs(dx) > Math.abs(dy) ? turn(Math.sign(dx), 0) : turn(0, Math.sign(dy));
    });
    stage.addEventListener("pointercancel", () => { tx = null; });
    ctx.menu(body.querySelector(".menubar"), [{ label: "Game", items: () => [
      { label: "New", key: "F2", act: () => newGame() },
      { label: state === "paused" ? "Resume" : "Pause", key: "Space", disabled: state !== "run" && state !== "paused", act: pause },
      { label: "Level Select…", disabled: mode !== "campaign", act: () => { autoPause(); levelPicker(stage, "Level Select", MAZES.map((m) => m[0]), reached, (l) => { newGame(l); }); } },
      { label: "World Leaderboard…", act: showWorld },
      "-",
      { label: "Campaign (next game)", check: nextMode === "campaign", act: () => { nextMode = "campaign"; ctx.store.lset("xp-snake-mode", nextMode); if (state === "ready") newGame(); } },
      { label: "Endless (next game)", check: nextMode === "endless", act: () => { nextMode = "endless"; ctx.store.lset("xp-snake-mode", nextMode); if (state === "ready") newGame(); } },
      "-",
      { label: "Speed (next game):", disabled: true },
      ...Object.keys(SPEEDS).map((n) => ({ label: n, check: n === pace, act: () => { pace = n; if (state === "ready") speed = baseSpeed(); ctx.store.lset("xp-snake-speed", n); } })),
      "-",
      { label: "Wrap-around, no walls (next game)", check: wrapNext, act: () => { wrapNext = !wrapNext; ctx.store.lset("xp-snake-wrap", wrapNext ? "1" : "0"); if (state === "ready") newGame(); } },
      snd.item(),
      "-",
      { label: "Exit", act: ctx.close },
    ] }]);
    observe(ctx, stage, () => fitCanvas(cv, W, W));
    ctx.el.__g = { get state() { return state; }, get sn() { return sn; }, get food() { return food; }, get bonus() { return bonus; }, get lv() { return lv; }, get lives() { return lives; }, get left() { return left; }, get score() { return score; }, get dir() { return dir; }, get wrap() { return wrap; }, get speed() { return speed; }, wall, N, MAZES, turn };
    newGame();
  }

  // =====================================================================
  //  Brick Breaker (twelve designed levels, then the cycle repeats harder)
  // =====================================================================
  function breakout(body, ctx) {
    const W = 480, H = 360, BH = 16, BTOP = 40, BW = 40, PW = 80, PY = H - 24, MAXP = 150;
    const COLORS = ["#e5410c", "#f2a900", "#ffd640", "#5ca50a", "#1e7ae6", "#8a4fd8"];
    const PU = { W: ["#1e7ae6", "W"], M: ["#e5410c", "M"], S: ["#5ca50a", "S"], L: ["#e0245e", "+"], C: ["#8a4fd8", "C"], G: ["#3a3f4a", "G"], F: ["#f27a00", "F"] };
    const PU_BAG = "WWWMMMSSCCLGGFF";
    // twelve columns. a-f: one hit, A-F: two hits, S: steel (three hits), U: unbreakable, *: bomb, ?: always drops a power-up
    const LEVELS = [
      ["The Flag", ["aaaaa..ddddd", "aaaaa..ddddd", "aaaaa..ddddd", "............", "eeeee..ccccc", "eeeee..ccccc", "eeeee..ccccc"]],
      ["Pyramid", [".....aa.....", "....bbbb....", "...cccccc...", "..dddddddd..", ".eeeeeeeeee.", "ffffffffffff"]],
      ["Invaders", ["..c......c..", "...c....c...", "..cccccccc..", ".cc.cccc.cc.", "cccccccccccc", "c.cccccccc.c", "c.c......c.c", "...cc..cc..."]],
      ["Checkers", ["a.b.c.d.e.f.", ".b.c.d.e.f.a", "c.d.e.f.a.b.", ".d.e.f.a.b.c", "E.F.A.B.C.D.", ".F.A.B.C.D.E"]],
      ["Diamond", [".....??.....", "....dDDd....", "...eeEEee...", "..ffFFFFff..", "...eeEEee...", "....dDDd....", ".....SS....."]],
      ["Bomb Squad", ["aa*aa*aa*aab", "bbbbbbbbbbbb", "c*cc*cc*cc*c", "dddddddddddd", "e*ee*ee*ee*e"]],
      ["Fortress", ["SSSSSSSSSSSS", "S..........S", "S.aabbccdd.S", "S.AABBCCDD.S", "S.aabbccdd.S", "S....??....S", "SSS......SSS"]],
      ["Hourglass", ["UUffffffffUU", ".UUeeeeeeUU.", "..UUddddUU..", "....????....", "..CCccccCC..", ".BBbbbbbbBB.", "AAaaaaaaaaAA"]],
      ["Heart", ["..aaa..aaa..", ".aAAAaaAAAa.", "aAAAAAAAAAAa", "aAAAA??AAAAa", ".aAAAAAAAAa.", "..aAAAAAAa..", "...aAAAAa...", "....aAAa....", ".....aa....."]],
      ["Zigzag", ["UUUUUUUU....", "dddddddddddd", "dddddddddddd", "....UUUUUUUU", "eeeeeeeeeeee", "eeeeeeeeeeee", "UUUUUUUU....", "f*ffff*ffff*"]],
      ["The Cross", ["....SSSS....", "....BBBB....", "....BBBB....", "SBBBBBBBBBBS", "SBBBB**BBBBS", "SBBBBBBBBBBS", "....BBBB....", "....BBBB....", "....SSSS...."]],
      ["The Wall", ["FFFFFFFFFFFF", "SSSSSSSSSSSS", "EEEEEEEEEEEE", "S*SS*SS*SS*S", "DDDDDDDDDDDD", "CCCC????CCCC", "BBBBBBBBBBBB", "AAAAAAAAAAAA"]],
    ];
    body.innerHTML = BAR + `<div class="game-hud"><span>Score: <b class="sc">0</b></span><span>Lives: <b class="lv li"></b></span><span>Level: <b class="lvl">1</b></span><span>Best: <b class="bst">0</b></span></div><div class="game-stage"><canvas width="${W}" height="${H}"></canvas><div class="game-msg"></div></div>`;
    body.classList.add("game-body");
    const cv = body.querySelector("canvas"), g = cv.getContext("2d"), msg = body.querySelector(".game-msg"), stage = cv.parentElement;
    const $ = (s) => body.querySelector(s);
    const snd = sound(ctx);
    let best = Number(ctx.store.lget("xp-breakout-best")) || 0, bestLvl = Number(ctx.store.lget("xp-breakout-level")) || 0;
    const wb = worldBoard(ctx, "breakout", () => best ? "Best: " + best + " (level " + (bestLvl || 1) + ")" : "No local best yet");
    const name = (l) => LEVELS[(l - 1) % LEVELS.length][0];
    const intro = () => `<b>BRICK BREAKER</b>${LEVELS.length} levels, 3 lives<br><small>Move the mouse or use ← →<br>Click or Space to launch${best ? "<br>Best: " + best + " (level " + (bestLvl || 1) + ")" : ""}</small>`;
    const rnd = (n) => (Math.random() * n) | 0;
    const parts = Array.from({ length: MAXP }, () => ({ l: 0, x: 0, y: 0, vx: 0, vy: 0, c: "" }));
    let pp = 0, pad = { x: W / 2 - PW / 2, w: PW }, balls = [], pups = [], bricks = [], shots = [], pops = [], remain = 0;
    let score = 0, lives = 3, level = 1, state = "ready", kl = false, kr = false, widenT = 0, slowT = 0, stickyT = 0, gunT = 0, fireT = 0, shotCd = 0, bannerT = 0, overAt = 0, combo = 0, noHit = 0, shake = 0, nextLife = 10000;
    const say = (t, light) => { msg.innerHTML = t ? `<div class="${light ? "gm-hint" : "gm-box"}">${t}</div>` : ""; msg.style.display = t ? "" : "none"; msg.classList.toggle("light", !!light); };
    const hud = () => { $(".sc").textContent = score; $(".lv").textContent = "♥".repeat(Math.max(0, lives)); $(".lvl").textContent = level; $(".bst").textContent = Math.max(best, score); };
    const basePW = () => Math.max(50, PW - (level - 1) * 3);
    const baseSp = () => Math.min(0.6, 0.26 + level * 0.025);
    const burst = (x, y, c, n) => {
      for (let i = 0; i < n; i++) {
        const p = parts[pp], a = Math.random() * 6.283, v = 0.05 + Math.random() * 0.15; pp = (pp + 1) % MAXP;
        p.l = 350 + Math.random() * 250; p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 0.05; p.c = c;
      }
    };
    function build() {
      const map = LEVELS[(level - 1) % LEVELS.length][1], lap = Math.floor((level - 1) / LEVELS.length);
      bricks = []; remain = 0;
      map.forEach((row, r) => [...row].forEach((ch, c) => {
        if (ch === ".") return;
        let t = 0, kind = "", col = COLORS[r % 6];
        if (ch === "S") t = 2; else if (ch === "U") t = 3; else if (ch === "*") kind = "bomb"; else if (ch === "?") kind = "power";
        else { const low = ch.toLowerCase(); col = COLORS[low.charCodeAt(0) - 97] || col; t = ch !== low || lap > 0 ? 1 : 0; }
        const hp = t === 3 ? 99 : t + 1;
        bricks.push({ x: c * BW, y: BTOP + r * BH, w: BW, t, kind, hp, max: hp, f: 0, alive: true, s: Math.random(), col });
        if (t < 3) remain++;
      }));
    }
    const resetBall = () => { balls = [{ x: pad.x + pad.w / 2, y: PY - 6, vx: 0, vy: 0, r: 6, stuck: true, off: pad.w / 2, tx: [], ty: [] }]; };
    const clearPowers = () => { pups.length = 0; shots.length = 0; widenT = slowT = stickyT = gunT = fireT = 0; combo = 0; noHit = 0; };
    function newGame(startAt = 1) {
      score = 0; lives = 3; level = startAt; pad.w = basePW(); nextLife = 10000; clearPowers(); pops.length = 0;
      for (const p of parts) p.l = 0;
      build(); resetBall(); hud(); state = "ready"; say(intro());
    }
    const pause = () => {
      if (state === "run") { state = "paused"; kl = kr = false; say("<b>Paused</b><small>Click or Space to resume</small>"); }
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
      if (state === "board") { state = beforeBoard.state; msg.innerHTML = beforeBoard.msg; msg.style.display = beforeBoard.msg ? "" : "none"; msg.classList.toggle("light", beforeBoard.light); return; }
      if (state === "banner") { bannerT = 0; return; }
      if (state === "paused") return pause();
      if (state === "over") { if (performance.now() - overAt > 600) newGame(); return; }
      if ((state === "ready" || state === "run") && release()) { state = "run"; say(""); }
    }
    function gameOver() {
      state = "over"; overAt = performance.now();
      const nb = score > best; if (nb) { best = score; ctx.store.lset("xp-breakout-best", best); }
      if (level > bestLvl) { bestLvl = level; ctx.store.lset("xp-breakout-level", bestLvl); }
      snd.fx("lose");
      career(ctx, "breakout", { won: level > 1, score, level, pts: level * 15 + score / 500 });
      say(`<b>Game Over</b>Score ${score} &middot; Level ${level}<br><small>${nb ? "New best score!" : "Best: " + best}<br>Best level: ${bestLvl}</small><div class="wl"></div><small>Click or Space to play again</small>`);
      if (score > 0) wb.post(msg.querySelector(".wl"), score, { level }); else msg.querySelector(".wl")?.remove();
    }
    // the leaderboard is its own state, so "continue" goes back to what was on screen instead of launching the ball
    let beforeBoard = null;
    function showWorld() {
      if (state === "run") pause();
      if (state !== "board") beforeBoard = { state, msg: msg.innerHTML, light: msg.classList.contains("light") };
      state = "board";
      say(`<b>World top 10</b><div class="wl"></div><small>Click or Space to continue</small>`);
      wb.view(msg.querySelector(".wl"));
    }
    ctx.onClose(() => { if (score > best) ctx.store.lset("xp-breakout-best", score); });
    function loseLife() {
      lives--; shake = 8; clearPowers(); resetBall(); snd.fx("pop"); hud();
      if (lives <= 0) gameOver(); else { state = "ready"; say("Click or Space to launch", true); }
    }
    function addScore(n) {
      score += n;
      if (score >= nextLife) { nextLife += 15000; if (lives < 5) { lives++; snd.fx("powerup"); pops.push({ x: pad.x + pad.w / 2, y: PY - 14, t: "EXTRA LIFE", l: 1400 }); } }
      hud();
    }
    function nextLevel() {
      const b = 100 * level + lives * 50; addScore(b);
      if (level + 1 > bestLvl) { bestLvl = level + 1; ctx.store.lset("xp-breakout-level", bestLvl); }
      say(`<b>Level ${level} Clear!</b>Bonus +${b}<br><small>Next: ${name(level + 1)}<br>Space skips this screen</small>`);
      level++; clearPowers(); build(); pad.w = basePW(); resetBall(); hud(); state = "banner"; bannerT = 1800; snd.fx("levelup");
    }
    // removes a brick and scores it; a run of bricks without touching the paddle is worth up to double
    function kill(b) {
      b.alive = false; remain--; combo++; noHit = 0;
      const base = b.kind === "bomb" ? 30 : b.kind === "power" ? 15 : [10, 20, 40][b.t], mult = 1 + Math.min(combo, 10) * 0.1;
      addScore(Math.round(base * (1 + (level - 1) * 0.25) * mult));
      burst(b.x + b.w / 2, b.y + BH / 2, b.kind === "bomb" ? "#ffb300" : b.col, 9);
      if (b.kind === "power" || Math.random() < 0.12) pups.push({ x: b.x + b.w / 2, y: b.y + BH / 2, k: PU_BAG[rnd(PU_BAG.length)] });
    }
    function explode(b) {
      const q = [b]; shake = 7; snd.fx("boom", "boom");
      while (q.length) {
        const k = q.pop();
        for (const o of bricks) {
          if (!o.alive || o.t === 3 || Math.abs(o.x - k.x) > BW * 1.1 || Math.abs(o.y - k.y) > BH * 1.1) continue;
          kill(o); if (o.kind === "bomb") q.push(o);
        }
      }
    }
    function hitBrick(b, forceKill) {
      if (b.t === 3) { b.f = 80; snd.blip(180, 0.05, "sawtooth", 0.7, 0, 0, "steel"); return; }
      if (!forceKill && --b.hp > 0) { b.f = 120; burst(b.x + b.w / 2, b.y + BH / 2, "#fff", 3); noHit = 0; snd.blip(b.t === 2 ? 240 : 380, 0.05, b.t === 2 ? "sawtooth" : "triangle", 0.8, 0, 0, "dent"); return; }
      snd.blip(480 + b.t * 110 + (b.s * 80) + Math.min(combo, 10) * 30, 0.07, "square", 0.9, 0, 0, "brick");
      kill(b); if (b.kind === "bomb") explode(b);
    }
    function applyPU(k) {
      snd.fx("powerup");
      pops.push({ x: pad.x + pad.w / 2, y: PY - 14, t: { W: "WIDE", M: "MULTI-BALL", S: "SLOW", L: "EXTRA LIFE", C: "CATCH", G: "LASER", F: "FIREBALL" }[k], l: 1000 });
      if (k === "W") widenT = 12000;
      else if (k === "S") slowT = 10000;
      else if (k === "C") stickyT = 12000;
      else if (k === "G") gunT = 10000;
      else if (k === "F") fireT = 8000;
      else if (k === "L") { lives = Math.min(5, lives + 1); hud(); }
      else if (k === "M") {
        const src = balls.find((b) => !b.stuck) || balls[0];
        for (const da of [-0.45, 0.45]) {
          if (balls.length >= 6) break;
          const c = Math.cos(da), s = Math.sin(da), vx = src.vx || 0.01, vy = src.vy || -baseSp();
          balls.push({ x: src.x, y: src.y, vx: vx * c - vy * s, vy: vx * s + vy * c, r: 6, stuck: src.stuck, off: src.off, tx: [], ty: [] });
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
        b.vx = sp * Math.sin(hit * 1.05); b.vy = -sp * Math.cos(hit * 1.05); b.y = PY - r; fixVel(b); combo = 0;
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
        // a fireball burns straight through everything but the unbreakable bricks
        const burnt = fireT > 0 && hitB.t !== 3;
        hitBrick(hitB, burnt);
        if (!burnt) {
          const len = Math.sqrt(hd);
          if (len > 0) {
            const nx = hx / len, ny = hy / len, dot = b.vx * nx + b.vy * ny;
            if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
            b.x += nx * (r - len + 0.01); b.y += ny * (r - len + 0.01);
          } else b.vy = b.y < hitB.y + BH / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
          fixVel(b);
        }
      }
      return b.y > H + 10;
    }
    function update(dt) {
      if (kl !== kr) pad.x = clamp(pad.x + (kr ? 1 : -1) * 0.5 * dt, 0, W - pad.w);
      const want = widenT > 0 ? Math.min(150, basePW() * 1.6) : basePW();
      if (Math.abs(want - pad.w) > 0.5) { const c = pad.x + pad.w / 2; pad.w += (want - pad.w) * Math.min(1, dt * 0.01); pad.x = clamp(c - pad.w / 2, 0, W - pad.w); }
      for (const k of bricks) if (k.f > 0) k.f -= dt;
      for (const p of parts) if (p.l > 0) { p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.0006 * dt; }
      for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.l -= dt; p.y -= 0.025 * dt; if (p.l <= 0) pops.splice(i, 1); }
      for (const b of balls) if (b.stuck) { b.x = pad.x + clamp(b.off, 0, pad.w); b.y = PY - b.r; }
      if (state === "banner") { bannerT -= dt; if (bannerT <= 0) { state = "ready"; say("Click or Space to launch", true); } return; }
      if (state !== "run") return;
      widenT = Math.max(0, widenT - dt); slowT = Math.max(0, slowT - dt); stickyT = Math.max(0, stickyT - dt); gunT = Math.max(0, gunT - dt); fireT = Math.max(0, fireT - dt);
      // a ball trapped between unbreakable bricks gets a small random nudge
      noHit += dt;
      if (noHit > 12000) { noHit = 0; for (const b of balls) { if (b.stuck) continue; const a = (Math.random() - 0.5) * 0.7, c = Math.cos(a), s = Math.sin(a), vx = b.vx; b.vx = vx * c - b.vy * s; b.vy = vx * s + b.vy * c; fixVel(b); } }
      if (gunT > 0 && (shotCd -= dt) <= 0) { shotCd = 380; shots.push({ x: pad.x + 6, y: PY - 4 }, { x: pad.x + pad.w - 6, y: PY - 4 }); snd.fx("laser", "laser"); }
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i]; s.y -= 0.5 * dt;
        const k = bricks.find((b) => b.alive && s.x >= b.x && s.x <= b.x + b.w && s.y >= b.y && s.y <= b.y + BH);
        if (k) { hitBrick(k); shots.splice(i, 1); } else if (s.y < 0) shots.splice(i, 1);
      }
      for (let i = pups.length - 1; i >= 0; i--) {
        const p = pups[i]; p.y += 0.09 * dt;
        if (p.y + 7 >= PY && p.y - 7 <= PY + 10 && p.x >= pad.x - 12 && p.x <= pad.x + pad.w + 12) { applyPU(p.k); pups.splice(i, 1); }
        else if (p.y > H + 10) pups.splice(i, 1);
      }
      const mult = slowT > 0 ? 0.65 : 1;
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i]; if (b.stuck) continue;
        b.tx.push(b.x); b.ty.push(b.y); if (b.tx.length > 7) { b.tx.shift(); b.ty.shift(); }
        const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt * mult / 3)), d = dt * mult / steps; // keep per-step travel well below the radius
        let lost = false;
        for (let s = 0; s < steps; s++) { if (stepBall(b, d)) { lost = b.y > H + 10; break; } }
        if (lost) balls.splice(i, 1);
      }
      if (remain <= 0) nextLevel(); else if (!balls.length) loseLife();
    }
    function crack(k, n) {
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const x = k.x + k.w * (0.2 + 0.3 * i + 0.15 * k.s);
        g.moveTo(x, k.y + 1); g.lineTo(x + 4, k.y + BH * 0.4); g.lineTo(x - 3, k.y + BH * 0.7); g.lineTo(x + 2, k.y + BH - 1);
      }
      g.stroke();
    }
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    let sd = 7; const srnd = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
    const STARS = Array.from({ length: 60 }, () => [srnd() * W, srnd() * H, srnd() < 0.15 ? 2 : 1, 0.2 + srnd() * 0.6]);
    function draw() {
      g.save();
      if (shake > 0.3) { g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.9; }
      const hue = (level * 47 + 215) % 360, grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, `hsl(${hue},62%,20%)`); grd.addColorStop(1, "#02030a");
      g.fillStyle = grd; g.fillRect(-10, -10, W + 20, H + 20);
      g.fillStyle = "#fff"; for (const s of STARS) { g.globalAlpha = s[3]; g.fillRect(s[0], s[1], s[2], s[2]); } g.globalAlpha = 1;
      g.font = "bold 11px Tahoma,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "rgba(255,255,255,.55)"; g.fillText(`Level ${level}: ${name(level)}`, W / 2, 20);
      g.lineWidth = 1;
      for (const k of bricks) {
        if (!k.alive) continue;
        const x = k.x + 1, y = k.y + 1, w = k.w - 2, h = BH - 2, dmg = k.max - k.hp;
        if (k.t === 3) { g.fillStyle = "#2c2c34"; g.fillRect(x, y, w, h); g.strokeStyle = "#d4a017"; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); g.fillStyle = "#d4a017"; g.fillRect(x + 3, y + h / 2 - 1, w - 6, 2); }
        else if (k.t === 2) { g.fillStyle = "#8d97a3"; g.fillRect(x, y, w, h); g.fillStyle = "#cfd6de"; g.fillRect(x, y, w, 3); g.fillStyle = "#59626d"; g.fillRect(x, y + h - 2, w, 2); g.fillStyle = "#3d444c"; g.fillRect(x + 2, y + 5, 2, 2); g.fillRect(x + w - 4, y + 5, 2, 2); if (dmg) { g.fillStyle = `rgba(0,0,0,${0.12 * dmg})`; g.fillRect(x, y, w, h); } }
        else if (k.kind === "bomb") { g.fillStyle = "#26222a"; g.fillRect(x, y, w, h); g.fillStyle = "#ff5a1f"; g.fillRect(x, y + h - 2, w, 2); g.fillStyle = "#ffd640"; g.font = "bold 12px Tahoma,sans-serif"; g.fillText("✸", x + w / 2, y + h / 2 + 1); }
        else if (k.kind === "power") { g.fillStyle = `hsl(${(performance.now() / 8) % 360},85%,55%)`; g.fillRect(x, y, w, h); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x, y, w, 3); g.fillStyle = "#fff"; g.font = "bold 11px Tahoma,sans-serif"; g.fillText("?", x + w / 2, y + h / 2 + 1); }
        else {
          g.fillStyle = k.col; g.fillRect(x, y, w, h);
          g.fillStyle = "rgba(255,255,255,.42)"; g.fillRect(x, y, w, 3); g.fillRect(x, y, 2, h);
          g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(x, y + h - 3, w, 3); g.fillRect(x + w - 2, y, 2, h);
          if (k.t === 1) { g.strokeStyle = "rgba(0,0,0,.6)"; g.strokeRect(x + 2.5, y + 3.5, w - 5, h - 7); if (dmg) { g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x, y, w, h); } }
        }
        if (dmg && k.t < 3) { g.strokeStyle = "rgba(0,0,0,.7)"; crack(k, dmg + (k.t === 1 ? 1 : 0)); }
        if (k.f > 0) { g.globalAlpha = Math.min(0.7, k.f / 120); g.fillStyle = "#fff"; g.fillRect(x, y, w, h); g.globalAlpha = 1; }
      }
      for (const p of parts) if (p.l > 0) { g.globalAlpha = Math.min(1, p.l / 300); g.fillStyle = p.c; g.fillRect(p.x, p.y, 3, 3); }
      g.globalAlpha = 1;
      g.fillStyle = "#ff5a4a"; for (const s of shots) g.fillRect(s.x - 1, s.y - 5, 2, 8);
      g.font = "bold 9px sans-serif";
      for (const p of pups) {
        const [c, t] = PU[p.k]; g.fillStyle = c; g.fillRect(p.x - 8, p.y - 6, 16, 12);
        g.beginPath(); g.arc(p.x - 8, p.y, 6, 0, 7); g.arc(p.x + 8, p.y, 6, 0, 7); g.fill();
        g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(p.x - 8, p.y - 5, 16, 3);
        g.fillStyle = "#fff"; g.fillText(t, p.x, p.y + 0.5);
      }
      // the paddle: chrome with blue caps; laser cannons when armed
      const pg = g.createLinearGradient(0, PY, 0, PY + 10); pg.addColorStop(0, "#fff"); pg.addColorStop(0.45, stickyT > 0 ? "#c9a4ff" : "#c8ccd4"); pg.addColorStop(1, "#6a6f7a");
      g.fillStyle = pg; rr(pad.x, PY, pad.w, 10, 5); g.fill();
      g.fillStyle = "#1e7ae6"; g.fillRect(pad.x + 7, PY + 1, 4, 8); g.fillRect(pad.x + pad.w - 11, PY + 1, 4, 8);
      if (gunT > 0) { g.fillStyle = "#e5410c"; g.fillRect(pad.x + 4, PY - 5, 4, 6); g.fillRect(pad.x + pad.w - 8, PY - 5, 4, 6); }
      for (const b of balls) {
        const c0 = fireT > 0 ? "#ffb300" : slowT > 0 ? "#9fd8ff" : "#fff";
        for (let i = 0; i < b.tx.length; i++) { g.globalAlpha = (i + 1) / b.tx.length * (fireT > 0 ? 0.5 : 0.22); g.fillStyle = c0; g.beginPath(); g.arc(b.tx[i], b.ty[i], b.r * (0.4 + 0.5 * i / b.tx.length), 0, 7); g.fill(); }
        g.globalAlpha = 1;
        const bg = g.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, b.r); bg.addColorStop(0, "#fff"); bg.addColorStop(1, fireT > 0 ? "#f27a00" : slowT > 0 ? "#5aa8e6" : "#b4bccb");
        g.fillStyle = bg; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
      }
      g.font = "bold 11px Tahoma,sans-serif"; g.textAlign = "center";
      for (const p of pops) { g.globalAlpha = Math.min(1, p.l / 300); g.fillStyle = "#000"; g.fillText(p.t, p.x + 1, p.y + 1); g.fillStyle = "#ffd640"; g.fillText(p.t, p.x, p.y); }
      g.globalAlpha = 1;
      g.font = "10px sans-serif"; g.textAlign = "left"; g.fillStyle = "rgba(255,255,255,.85)";
      let tx = 6;
      for (const [n, t] of [["WIDE", widenT], ["SLOW", slowT], ["CATCH", stickyT], ["LASER", gunT], ["FIRE", fireT]]) if (t > 0) { const s = n + " " + Math.ceil(t / 1000) + "s"; g.fillText(s, tx, H - 6); tx += g.measureText(s).width + 10; }
      if (combo >= 3) { g.textAlign = "right"; g.fillStyle = "#ffd640"; g.fillText("COMBO x" + combo, W - 6, H - 6); }
      g.restore();
    }
    loop(ctx, (dt, resumed) => {
      if (state === "run" && (resumed || document.hidden || !ctx.isActive())) pause();
      if (state !== "paused") update(dt);
      draw();
    });
    // map client coords through the canvas's CSS-scaled rect back to logical pixels
    const track = (e) => { if (state === "paused") return; const r = cv.getBoundingClientRect(); pad.x = clamp((e.clientX - r.left) / r.width * W - pad.w / 2, 0, W - pad.w); };
    stage.addEventListener("pointermove", track);
    stage.addEventListener("pointerdown", (e) => { if (e.target.closest(".sol-win")) return; track(e); launch(); });
    // moving the mouse off the play area pauses the game (touch and pen keep playing)
    cv.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && state === "run") pause(); });
    listen(ctx, "keydown", (e) => {
      if (!ctx.isActive() || !mine(ctx, e) || e.ctrlKey || e.metaKey || e.altKey) return;
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
      { label: "New Game", key: "F2", act: () => newGame() },
      { label: state === "paused" ? "Resume" : "Pause", key: "P", disabled: state !== "run" && state !== "paused", act: pause },
      { label: "Level Select…", act: () => { if (state === "run") pause(); levelPicker(stage, "Level Select", LEVELS.map((l) => l[0]), Math.max(1, bestLvl), (l) => newGame(l)); } },
      "-",
      snd.item(),
      { label: "World Leaderboard…", act: showWorld },
      "-",
      { label: "Exit", act: ctx.close },
    ] }]);
    observe(ctx, stage, () => fitCanvas(cv, W, H));
    ctx.el.__g = { get state() { return state; }, get balls() { return balls; }, get pad() { return pad; }, get bricks() { return bricks; }, get pups() { return pups; }, get level() { return level; }, get lives() { return lives; }, get score() { return score; }, get remain() { return remain; }, LEVELS, W, H, PY, launch, setPad: (x) => { pad.x = clamp(x, 0, W - pad.w); }, apply: applyPU };
    newGame();
  }

  // =====================================================================
  //  3D Pinball - Space Cadet style (2D table)
  // =====================================================================
  function pinball(body, ctx) {
    const W = 400, H = 600, BR = 7, G = 820, MAXV = 1700, SUB = 1 / 300;
    const FL = 54, FRP = 8, FRT = 5, REST = 0.5, UP = -0.5, FSPD = 20;
    const HX = 312, HY = 205, HR = 12, HPULL = 42; // the black hole: capture radius, then the radius its gravity reaches
    const LX = 376, LY = 556, MX = 376; // plunger lane ball rest position; MX mirrors x across the playfield
    const BX = [128, 248, 188], BY = [170, 170, 228], BRB = 17, NB = 3;
    const RX = [140, 188, 236], RY = 34, RR = 10; // top rollover lanes, set below the arch so a ball hugging the arch on launch rides over them
    const SPX = 188, SPY = 100; // spinner
    const DTX = 44, DTY0 = 270, DTGAP = 30, DTLEN = 22; // drop target bank
    const RANKS = ["Cadet", "Ensign", "Lieutenant", "Captain", "Commander", "Admiral", "Fleet Admiral"];
    const EXTRA = [50000, 150000, 400000];
    // each rank has one mission; a mission's count grows every time it comes around again
    const MISSIONS = [["Hit the bumpers", "bump", 8], ["Spin the gate", "spin", 12], ["Drop a target bank", "bank", 1], ["Enter the black hole", "hole", 1], ["Fire the slingshots", "sling", 6], ["Light the top lanes", "lanes", 1]];
    const LEFT = ["KeyZ", "ShiftLeft", "ArrowLeft"], RIGHT = ["Slash", "ShiftRight", "KeyM", "ArrowRight"], PLUNGE = ["Space", "ArrowDown"], NUDGE = { KeyX: [70, -30], Period: [-70, -30], ArrowUp: [0, -90] };
    body.innerHTML = BAR + `<div class="game-hud"><span>Score: <b class="sc">0</b></span><span>Ball: <b class="bl">1/3</b></span><span>Multiplier: <b class="mu">x1</b></span><span>Best: <b class="bs">0</b></span></div><div class="pb-led"><span class="pb-rank">CADET</span><span class="pb-mis"></span></div><div class="game-stage"><canvas width="${W}" height="${H}"></canvas><div class="game-msg"></div><button class="xpbtn pb-launch" style="position:absolute;right:8px;bottom:8px;width:84px;height:84px;border-radius:50%;font:bold 14px Tahoma,sans-serif;z-index:5;display:none;touch-action:none">LAUNCH</button></div>`;
    body.classList.add("game-body");
    const cv = body.querySelector("canvas"), g = cv.getContext("2d"), msg = body.querySelector(".game-msg"), stage = cv.parentElement, btn = body.querySelector(".pb-launch");
    cv.style.imageRendering = "auto";
    const $ = (s) => body.querySelector(s);
    const elSc = $(".sc"), elBl = $(".bl"), elMu = $(".mu"), elBs = $(".bs");
    const snd = sound(ctx);
    let best = Number(ctx.store.lget("xp-pinball-best")) || 0;
    const wb = worldBoard(ctx, "pinball", () => best ? "Best: " + best : "No local best yet");
    const intro = () => `<b>SPACE CADET</b><small>Hold Space / ↓ to pull the plunger, release to launch<br>Flippers: Z / ← and / / M / →<br>Nudge: X / . / ↑ (nudge too much and you TILT)${best ? "<br>Best: " + best : ""}</small>`;
    const say = (t, light) => { msg.innerHTML = t ? `<div class="${light ? "gm-hint" : "gm-box"}">${t}</div>` : ""; msg.style.display = t ? "" : "none"; msg.classList.toggle("light", !!light); };

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
      addW(X(46), 430, X(46), 490); addW(X(46), 490, X(124), 518, 0.3); // ends above the flipper pivot so a rolling ball runs onto the flipper instead of pocketing against it
      addW(X(72), 466, X(72), 408, 0.3, 0, -2); addW(X(72), 466, X(116), 494, 0.3, 0, -2); addW(X(72), 408, X(116), 494, 0.5, 330, m);
    }
    const WL = new Float64Array(wl), WN = WL.length;

    // ---- pre-rendered table art ----
    const bg = document.createElement("canvas"); bg.width = W * 2; bg.height = H * 2;
    (() => {
      const b = bg.getContext("2d"); b.scale(2, 2);
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
      b.font = "10px sans-serif"; b.fillText("TOP LANES", 188, 58); b.fillText("SPIN", SPX, SPY + 18);
      b.strokeStyle = "rgba(255,230,120,.5)"; b.lineWidth = 3;
      for (const [x, y] of [[HX - 2, 236], [HX - 4, 262], [HX - 6, 288]]) { b.beginPath(); b.moveTo(x - 10, y + 6); b.lineTo(x, y - 4); b.lineTo(x + 10, y + 6); b.stroke(); }
      const rim = b.createRadialGradient(HX, HY, HR - 4, HX, HY, HR + 10); rim.addColorStop(0, "rgba(130,90,255,.9)"); rim.addColorStop(1, "rgba(130,90,255,0)");
      b.fillStyle = rim; b.beginPath(); b.arc(HX, HY, HR + 10, 0, 7); b.fill();
      b.fillStyle = "rgba(180,200,255,.6)"; b.font = "9px sans-serif"; b.fillText("BLACK HOLE", HX - 6, HY + 26);
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
    let misIdx = 0, misN = 0, bonus = 0, holeT = 0, holeCd = 0, launchT = 0, tiltM = 0, tilted = false, nudgeX = 0, nudgeY = 0, clock = 0, pullTick = 0, gen = 0;
    const touchDev = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || "ontouchstart" in window;
    if (touchDev) btn.style.display = "";

    const misNeed = () => { const base = MISSIONS[misIdx % MISSIONS.length][2]; return base + Math.floor(misIdx / MISSIONS.length) * Math.ceil(base / 2); };
    const elRank = $(".pb-rank"), elMis = $(".pb-mis");
    const hud = () => {
      elSc.textContent = score; elBl.textContent = Math.min(ball, maxBalls) + "/" + maxBalls; elMu.textContent = "x" + mult; elBs.textContent = Math.max(best, score);
      elRank.textContent = RANKS[rank].toUpperCase(); elMis.textContent = tilted ? "TILT" : `${MISSIONS[misIdx % MISSIONS.length][0]}: ${misN}/${misNeed()}`;
    };
    const flash = (t, ms = 1500) => { msgText = t; msgT = ms; };
    function add(p) {
      score += p * mult; bonus += p * 0.1; dirty = true;
      if (extraIdx < EXTRA.length && score >= EXTRA[extraIdx]) { extraIdx++; maxBalls++; flash("EXTRA BALL!", 2200); snd.fx("powerup"); }
    }
    // progress on the current mission; finishing it is the only way to rank up
    function mission(k, n = 1) {
      dirty = true;
      if (MISSIONS[misIdx % MISSIONS.length][1] !== k) return;
      misN += n;
      if (misN < misNeed()) return;
      misN = 0; misIdx++; rank = Math.min(RANKS.length - 1, rank + 1);
      add(2500 * (rank + 1)); flash("MISSION COMPLETE: " + RANKS[rank].toUpperCase(), 2400); snd.fx("levelup");
    }
    function serve(f) { B.x = LX; B.y = LY; B.vx = B.vy = 0; state = "ready"; fresh = f; pull = 0; held = false; stuckT = 0; tilted = false; tiltM = 0; holeT = 0; dirty = true; }
    function newGame() {
      gen++; ctx.skipWait(); score = 0; ball = 1; maxBalls = 3; extraIdx = 0; mult = 1; rank = 0; saverT = 0; msgT = 0; dtReset = 0; spV = 0; misIdx = 0; misN = 0; bonus = 0; holeCd = 0; launchT = 0;
      lanes[0] = lanes[1] = lanes[2] = false; dtAlive[0] = dtAlive[1] = dtAlive[2] = 1;
      bumpF.fill(0); slingF.fill(0); slingCd.fill(0);
      serve(true); dirty = true; say(intro());
    }
    function launch() {
      if (state !== "ready") return;
      const p = Math.max(0.45, pull);
      B.vx = 0; B.vy = -(700 + 900 * p); B.y = LY; state = "play"; say(""); launchT = 2000;
      if (fresh) { saverT = 5000; fresh = false; }
      snd.fx("plunger");
    }
    function nudge(v) {
      if (state !== "play" || tilted) return;
      B.vx += v[0]; B.vy += v[1]; nudgeX = v[0] / 12; nudgeY = v[1] / 12; tiltM += 1; snd.blip(90, 0.08, "triangle", 0.9);
      // the meter drains over time, so an occasional nudge is safe; a burst of them is not
      if (tiltM > 3.2) { tilted = true; fl[0].on = fl[1].on = false; flash("TILT", 2500); snd.fx("tilt"); dirty = true; }
    }
    function toReady() { B.x = LX; B.y = LY; B.vx = B.vy = 0; state = "ready"; pull = 0; held = false; }
    function gameOver() {
      state = "over"; overAt = performance.now();
      const nb = score > best; if (nb) { best = score; ctx.store.lset("xp-pinball-best", best); }
      dirty = true;
      snd.fx("lose");
      career(ctx, "pinball", { won: rank >= 1, score, level: rank + 1, pts: rank * 20 + score / 5000 });
      say(`<b>Game Over</b>Score ${score}<br>Rank: ${RANKS[rank]}<br><small>${nb ? "New best score!" : "Best: " + best}</small><div class="wl"></div><small>Click, Space or F2 for a new game</small>`);
      if (score > 0) wb.post(msg.querySelector(".wl"), score, { level: rank + 1 }); else msg.querySelector(".wl")?.remove();
    }
    function drain() {
      if (saverT > 0 && !tilted) { saverT = 0; flash("BALL SAVED"); snd.seq([440, 660, 880], 0.07, 0.09, "triangle"); serve(false); return; }
      saverT = 0; state = "bonus"; dirty = true; snd.seq([330, 247, 196, 147], 0.12, 0.16, "sawtooth");
      // end-of-ball bonus: a tenth of what the ball scored, times the multiplier. A tilted ball forfeits it.
      const b = tilted ? 0 : Math.round(bonus / 10) * 10, m = mult, run = ++gen;
      say(`<b>End of Ball ${ball}</b>${tilted ? "Tilted: no bonus" : `Bonus ${b} &times; ${m} = ${b * m}`}<br><small>Space skips this screen</small>`);
      ctx.wait(1500).then(() => {
        if (run !== gen || !ctx.alive()) return;
        if (b) { const keep = bonus; add(b); bonus = keep; }
        bonus = 0; say("");
        if (ball >= maxBalls) { gameOver(); return; }
        ball++; mult = 1; dtReset = 0; dtAlive[0] = dtAlive[1] = dtAlive[2] = 1;
        serve(true); flash("BALL " + ball, 1200);
      });
    }
    const releaseAll = () => { for (const k in kd) kd[k] = false; ptrs.clear(); touchL = touchR = plungeTouch = false; };
    function pause() {
      if (state === "play" || state === "ready") { prev = state; state = "paused"; releaseAll(); held = false; pull = 0; say("<b>Paused</b><small>Click or P to resume</small>"); }
      else if (state === "paused") { state = prev; say(state === "ready" && ball === 1 && !score ? intro() : ""); }
    }
    function showWorld() {
      if (state === "play" || state === "ready") pause();
      say(`<b>World top 10</b><div class="wl"></div><small>Click or P to continue</small>`);
      wb.view(msg.querySelector(".wl"));
    }
    function help() {
      if (state === "play" || state === "ready") pause();
      stage.querySelector(".sol-win")?.remove();
      stage.insertAdjacentHTML("beforeend", `<div class="sol-win" style="text-align:left;line-height:1.5;max-width:88%"><b>How to play</b><div style="margin:6px 0 10px">Left flipper: Z, Left Shift or ←<br>Right flipper: /, M, Right Shift or →<br>Plunger: hold Space or ↓, release to launch<br>Nudge: X, . or ↑. Too many at once is a TILT: the flippers die until the next ball.<br>Touch: tap left/right half of the table, use the Launch button<br>Finish the mission on the panel above the table to rank up, from Cadet to Fleet Admiral.<br>Drop all 3 targets for a bonus multiplier (up to x5).<br>A top lane within 2 seconds of launching is a Skill Shot.<br>The black hole holds the ball, pays out, and throws it back.<br>Ball saver for the first 5 seconds. Extra balls at 50k, 150k and 400k.<br>F2 new game, P pause.</div><button class="xpbtn">OK</button></div>`);
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
      let cradled = false;
      B.vy += G * h;
      let sp2 = B.vx * B.vx + B.vy * B.vy;
      if (sp2 > MAXV * MAXV) { const k = MAXV / Math.sqrt(sp2); B.vx *= k; B.vy *= k; }
      B.x += B.vx * h; B.y += B.vy * h;
      for (let i = 0; i < WN; i += 7) {
        if (colSeg(WL[i], WL[i + 1], WL[i + 2], WL[i + 3], 0, 0, WL[i + 4], 0, 0, 0) && WL[i + 5] > 0) {
          const id = WL[i + 6];
          if (hitVn < -80 && slingCd[id] <= 0) { B.vx += nx * WL[i + 5]; B.vy += ny * WL[i + 5]; slingF[id] = 130; slingCd[id] = 120; add(10); mission("sling"); snd.blip(300, 0.06, "square", 0.8, 500, 0, "sling"); }
        }
      }
      for (let j = 0; j < NB; j++) {
        const dx = B.x - BX[j], dy = B.y - BY[j], R = BRB + BR, d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 0.01; nx = dx / d; ny = dy / d;
          B.x = BX[j] + nx * R; B.y = BY[j] + ny * R;
          const vn = B.vx * nx + B.vy * ny;
          if (vn < 0) { B.vx -= 2 * vn * nx; B.vy -= 2 * vn * ny; }
          B.vx += nx * 260; B.vy += ny * 260; bumpF[j] = 140; add(100); mission("bump");
          snd.fx("bumper", "bump");
        }
      }
      // the black hole pulls on a passing ball, then swallows it once it comes close enough
      if (holeCd <= 0) {
        const dx = HX - B.x, dy = HY - B.y, d2 = dx * dx + dy * dy;
        if (d2 < HR * HR) { holeT = 900; B.x = HX; B.y = HY; B.vx = B.vy = 0; add(1500); mission("hole"); flash("BLACK HOLE +" + 1500 * mult); snd.blip(700, 0.7, "sine", 1.2, 70); return; }
        if (d2 < HPULL * HPULL) { const d = Math.sqrt(d2), a = 900 * (1 - d / HPULL); B.vx += dx / d * a * h; B.vy += dy / d * a * h; }
      }
      for (let i = 0; i < 3; i++) if (dtAlive[i] && colSeg(DTX, DTY0 + DTGAP * i, DTX, DTY0 + DTGAP * i + DTLEN, 3, 3, 0.3, 0, 0, 0)) {
        dtAlive[i] = 0; dtF[i] = 150; add(200); snd.blip(700 + i * 120, 0.06, "triangle", 0.9, 0, 0, "tgt");
        if (!dtAlive[0] && !dtAlive[1] && !dtAlive[2]) {
          add(1000); if (mult < 5) mult++; dirty = true; dtReset = 900; flash("MULTIPLIER x" + mult); snd.seq([523, 659, 784, 1047], 0.07, 0.09, "triangle"); mission("bank");
        }
      }
      for (let i = 0; i < 2; i++) {
        const f = fl[i], tx = f.px + f.s * FL * Math.cos(f.a), ty = f.py + FL * Math.sin(f.a);
        if (colSeg(f.px, f.py, tx, ty, FRP, FRT, 0.25, f.px, f.py, f.w)) { if (f.on) cradled = true; if (hitVn < -250) snd.blip(120, 0.04, "triangle", 0.7, 0, 0, "fhit"); }
      }
      // spinner: a rollover gate that spins faster the harder the ball crosses it
      const inSp = Math.abs(B.x - SPX) < 26 && Math.abs(B.y - SPY) < 10;
      if (inSp && !spIn) spV += 14 + Math.sqrt(B.vx * B.vx + B.vy * B.vy) * 0.02;
      spIn = inSp;
      for (let k = 0; k < 3; k++) if (!lanes[k]) {
        const dx = B.x - RX[k], dy = B.y - RY;
        if (dx * dx + dy * dy < RR * RR) {
          lanes[k] = true; add(500); snd.blip(800 + k * 150, 0.07, "triangle", 0.9, 0, 0, "lane");
          if (launchT > 0) { launchT = 0; add(2000); flash("SKILL SHOT +" + 2000 * mult); snd.fx("powerup"); }
          if (lanes[0] && lanes[1] && lanes[2]) {
            add(2000); flash("TOP LANES +" + 2000 * mult);
            lanes[0] = lanes[1] = lanes[2] = false; snd.seq([392, 494, 587, 784, 988], 0.07, 0.1, "triangle"); mission("lanes");
          }
        }
      }
      sp2 = B.vx * B.vx + B.vy * B.vy;
      if (B.x > 366 && B.y > 530 && sp2 < 3600) { toReady(); return; } // fell back into the plunger lane
      stuckT = sp2 < 400 && !cradled ? stuckT + h : 0; // a ball held on a raised flipper is being aimed, not stuck
      if (stuckT > 2.5) { B.vy = -260; B.vx = (Math.random() < 0.5 ? -1 : 1) * 160; stuckT = 0; }
      if (B.y > H + 8) drain();
    }
    const anyKey = (arr) => { for (let i = 0; i < arr.length; i++) if (kd[arr[i]]) return true; return false; };
    function update(dt) {
      const ts = dt / 1000;
      clock += dt; tiltM = Math.max(0, tiltM - ts * 0.5); nudgeX *= 0.82; nudgeY *= 0.82;
      if (launchT > 0) launchT -= dt;
      if (holeCd > 0) holeCd -= dt;
      if (holeT > 0 && state === "play") { holeT -= dt; if (holeT <= 0) { B.vx = -280 - Math.random() * 120; B.vy = -560 - Math.random() * 160; holeCd = 1200; snd.fx("plunger"); } }
      if (msgT > 0) msgT -= dt;
      for (let j = 0; j < NB; j++) if (bumpF[j] > 0) bumpF[j] -= dt;
      for (let j = 0; j < 2; j++) { if (slingF[j] > 0) slingF[j] -= dt; if (slingCd[j] > 0) slingCd[j] -= dt; }
      for (let j = 0; j < 3; j++) if (dtF[j] > 0) dtF[j] -= dt;
      if (saverT > 0 && state === "play") saverT = Math.max(0, saverT - dt);
      if (dtReset > 0) { dtReset -= dt; if (dtReset <= 0) { dtAlive[0] = dtAlive[1] = dtAlive[2] = 1; snd.blip(400, 0.05, "triangle", 0.6); } }
      const l = !tilted && (anyKey(LEFT) || touchL), r = !tilted && (anyKey(RIGHT) || touchR);
      fl[0].on = l; fl[1].on = r;
      if ((l && !pl) || (r && !pr)) snd.blip(150, 0.05, "triangle", 0.8, 90, 0, "flip");
      pl = l; pr = r;
      const hold = anyKey(PLUNGE) || plungeTouch;
      if (state === "ready") {
        if (hold) { pull = Math.min(1, pull + ts); held = true; if (pull < 1 && (pullTick += dt) > 110) { pullTick = 0; snd.fx("tick"); } }
        else if (held) { held = false; launch(); pull = 0; }
      } else { held = false; pull = 0; }
      if (spV > 0) { spA += spV * ts; spV -= spV * 1.2 * ts; if (spV < 0.4) spV = 0; const n = Math.floor(spA / Math.PI); if (n !== spN) { const turns = Math.abs(n - spN); add(50 * turns); mission("spin", turns); spN = n; snd.blip(900, 0.02, "square", 0.3, 0, 0, "spin"); } }
      let n = Math.max(1, Math.ceil(ts / SUB)); if (n > 20) n = 20;
      const h = ts / n;
      for (let s = 0; s < n; s++) { stepFlippers(h); if (state === "play" && holeT <= 0) stepBall(h); }
      if (state === "ready") { B.x = LX; B.y = LY + pull * 26; }
      if (dirty) { hud(); dirty = false; }
    }

    // ---- drawing ----
    function draw() {
      g.save();
      if (Math.abs(nudgeX) + Math.abs(nudgeY) > 0.2) g.translate(nudgeX, nudgeY);
      g.drawImage(bg, 0, 0, W, H);
      g.textAlign = "center"; g.textBaseline = "middle";
      const attract = state === "ready" && fresh && ball === 1 && !score;
      // the black hole's slow swirl
      g.strokeStyle = "rgba(190,160,255,.75)"; g.lineWidth = 2; g.fillStyle = "#000"; g.beginPath(); g.arc(HX, HY, HR, 0, 7); g.fill();
      for (let i = 0; i < 3; i++) { const a = clock / 260 + i * 2.094; g.beginPath(); g.arc(HX, HY, HR - 2 - i * 2.4, a, a + 2.1); g.stroke(); }
      for (let k = 0; k < 3; k++) { const lit = lanes[k] || (attract && ((clock / 260) | 0) % 3 === k); g.fillStyle = lit ? "#6ff" : "#173a5a"; g.beginPath(); g.arc(RX[k], RY, 7, 0, 7); g.fill(); g.strokeStyle = "#9db4ff"; g.lineWidth = 1; g.stroke(); }
      g.strokeStyle = "#ffd640"; g.lineWidth = 4; const sw = 22 * Math.abs(Math.cos(spA));
      g.beginPath(); g.moveTo(SPX - sw, SPY); g.lineTo(SPX + sw, SPY); g.stroke();
      g.fillStyle = "#888"; g.fillRect(SPX - 24, SPY - 2, 3, 4); g.fillRect(SPX + 21, SPY - 2, 3, 4);
      g.lineWidth = 6; g.lineCap = "round";
      for (let i = 0; i < 3; i++) { const y = DTY0 + DTGAP * i; g.strokeStyle = dtAlive[i] ? (dtF[i] > 0 ? "#fff" : "#ff5a3c") : "#3a2a3a"; g.beginPath(); g.moveTo(DTX, y); g.lineTo(DTX, y + (dtAlive[i] ? DTLEN : 6)); g.stroke(); }
      for (let j = 0; j < NB; j++) {
        const f = bumpF[j] > 0 || (attract && ((clock / 330) | 0) % 3 === j);
        if (f) { g.fillStyle = "rgba(255,240,120,.25)"; g.beginPath(); g.arc(BX[j], BY[j], BRB + 8, 0, 7); g.fill(); }
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
      const br = holeT > 0 ? BR * Math.max(0.15, holeT / 900) : BR;
      const ballG = g.createRadialGradient(B.x - 2.5, B.y - 2.5, 0.5, B.x, B.y, br); ballG.addColorStop(0, "#fff"); ballG.addColorStop(0.55, "#c4cde6"); ballG.addColorStop(1, "#59617a");
      g.fillStyle = ballG; g.beginPath(); g.arc(B.x, B.y, br, 0, 7); g.fill();
      g.font = "bold 10px sans-serif";
      if (saverT > 0 && ((saverT / 250) | 0) % 2 === 0) { g.fillStyle = "#ffd640"; g.fillText("BALL SAVE", 188, 585); }
      g.textAlign = "left"; g.fillStyle = "rgba(255,255,255,.8)"; g.fillText(RANKS[rank], 20, 590);
      if (msgT > 0) {
        g.textAlign = "center"; g.globalAlpha = Math.min(1, msgT / 300); g.font = "bold 16px 'Lucida Console',monospace";
        g.fillStyle = "#000"; g.fillText(msgText, 189, 351); g.fillStyle = "#c8ff6a"; g.fillText(msgText, 188, 350); g.globalAlpha = 1;
      }
      g.restore();
    }
    loop(ctx, (dt, resumed) => {
      if (state === "play" && (resumed || document.hidden || !ctx.isActive())) pause();
      if (state !== "paused") update(dt);
      draw();
    });

    // ---- input ----
    const isCode = (c) => LEFT.includes(c) || RIGHT.includes(c) || PLUNGE.includes(c) || !!NUDGE[c];
    const syncTouch = () => { touchL = touchR = false; for (const s of ptrs.values()) if (s < 0) touchL = true; else touchR = true; };
    stage.addEventListener("pointerdown", (e) => {
      if (e.target === btn || e.target.closest(".sol-win")) return;
      if (state === "bonus") { ctx.skipWait(); return; }
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
      if (!ctx.isActive() || !mine(ctx, e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isCode(e.code)) {
        e.preventDefault();
        if (state === "over") { if (e.code === "Space" && !e.repeat && performance.now() - overAt > 600) newGame(); return; }
        if (state === "paused") return;
        if (NUDGE[e.code]) { if (!e.repeat) nudge(NUDGE[e.code]); return; }
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
    ctx.el.__g = { get state() { return state; }, B, fl, kd, get score() { return score; }, get ball() { return ball; }, get maxBalls() { return maxBalls; }, get rank() { return rank; }, get mult() { return mult; }, get mis() { return [misIdx, misN, misNeed()]; }, get tilted() { return tilted; }, get holeT() { return holeT; }, get bonus() { return bonus; }, add, mission, nudge, launch, BX, BY, HX, HY };
    newGame();
  }

  // =====================================================================
  //  Spider Solitaire (1, 2 or 4 suits)
  // =====================================================================
  function spider(body, ctx) {
    const SUITS = ["♠", "♥", "♦", "♣"], RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const red = (c) => c.s === 1 || c.s === 2;
    const snd = sound(ctx);
    let dealing = false, dealRun = 0, played = false, runFx = null;
    body.classList.add("sol-body");
    body.innerHTML = BAR + `<div class="sol"><div class="sol-table"></div></div><div class="statusbar"><span class="score">Score: 500</span><span class="time">Time: 0</span><span class="suits"></span></div>`;
    const sol = body.querySelector(".sol"), table = body.querySelector(".sol-table"), scoreEl = body.querySelector(".score"), timeEl = body.querySelector(".time"), suitsEl = body.querySelector(".suits");
    const sv = Number(ctx.store.lget("xp-spider-suits"));
    let nS = sv === 2 || sv === 4 ? sv : 1;
    let S, history = [], score = 500, secs = 0, timer, won = false, drag = null, layout = { cw: 50, ch: 68, gap: 8, H: 400 }, pendingOff = null, hintT = 0, toastT = 0, casc = null;
    paintBack(ctx, table);

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
    const forfeit = () => { if (played && !won) career(ctx, "spider", { won: false, mode: modeStr(), pts: 1 }); played = false; };
    function deal(quiet) {
      forfeit();
      stopCascade(); clearHint();
      const deck = [];
      for (let k = 0; k < 8; k++) for (let r = 1; r <= 13; r++) deck.push({ id: k * 13 + r, s: k % nS, r, up: false });
      for (let i = deck.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; }
      S = { t: [], k: [], d: [] };
      for (let c = 0; c < 10; c++) { const col = []; for (let n = c < 4 ? 6 : 5; n--;) col.push(deck.pop()); top(col).up = true; S.t.push(col); }
      S.k = deck; history = []; score = 500; secs = 0; won = false; drag = null; pendingOff = null;
      sol.querySelector(".sol-win")?.remove(); timeEl.textContent = "Time: 0"; suitsEl.textContent = nS + (nS === 1 ? " suit" : " suits");
      clearInterval(timer); timer = setInterval(() => { if (!dealing && !won && ctx.isVisible() && ctx.isActive() && !sol.querySelector(".sol-lb")) timeEl.textContent = "Time: " + ++secs; }, 1000);
      render();
      const run = ++dealRun;
      if (quiet) return;
      snd.fx("shuffle"); dealing = true;
      const els = [...table.querySelectorAll('.card[data-pile^="t"]')].sort((a, b) => (+a.dataset.i - +b.dataset.i) || (+a.dataset.pile[1] - +b.dataset.pile[1]));
      dealFx(ctx, snd, els, [xOf(9), layout.gap], 24, () => { if (run === dealRun) dealing = false; });
    }
    const snap = () => { played = true; history.push(JSON.stringify({ S, score })); if (history.length > 200) history.shift(); };
    function undo() {
      if (!history.length || won || casc || dealing) return;
      // undoing costs a point of its own, on top of the point the move cost
      const h = JSON.parse(history.pop()); S = h.S; score = Math.max(0, h.score - 2); drag = null; clearHint(); snd.blip(300, 0.05, "triangle"); render(true);
    }
    function setSuits(n) { nS = n; ctx.store.lset("xp-spider-suits", String(n)); deal(); }
    function askDifficulty() {
      dealing = true; dealRun++;
      const o = overlay(`<b>Difficulty</b><div class="diff-list">${[[1, "Easy: One Suit"], [2, "Medium: Two Suits"], [4, "Difficult: Four Suits"]].map(([n, t]) => `<label><input type="radio" name="spd" value="${n}" ${n === nS ? "checked" : ""}> ${t}</label>`).join("")}</div><button class="xpbtn">OK</button>`, "text-align:left");
      o.querySelector("button").onclick = () => { dealing = false; setSuits(+o.querySelector("input:checked").value); };
    }
    function help() {
      const o = overlay(`<b>How to play</b><div style="margin:6px 0 10px">Build descending runs from King to Ace in one suit; each finished run leaves the table.<br>Any card can be placed on a card one rank higher; only same-suit runs move together.<br>Click the stock to deal a card onto every column (no column may be empty).<br>Click a card to auto-move it, or drag it.<br>F2 new game, Ctrl+Z undo, H hint.<br>Score: 500, -1 per move, +100 per run.</div><button class="xpbtn">OK</button>`, "max-width:88%;text-align:left;line-height:1.5");
      o.querySelector("button").onclick = () => { if (won && !casc) showWin(false); else o.remove(); };
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
      const run = p.splice(b, 13); S.d.push(run); score += 100;
      (runFx ||= []).push(run);
      const t = top(p); if (t && !t.up) t.up = true;
      snd.seq([523, 659, 784, 1047], 0.06, 0.09, "triangle");
      return true;
    }
    // a finished run sweeps up to the foundation, King last, as clones laid over the table
    function flyRun(run, old) {
      if (reduced() || !Element.prototype.animate) return;
      const d = S.d.indexOf(run), tx = xOf(0) + d * layout.cw * 0.2, ty = layout.gap;
      [...run].reverse().forEach((c, i) => {
        const o = old.get(String(c.id)); if (!o) return;
        const el = document.createElement("div");
        el.className = `card fly ${red(c) ? "red" : ""}`; el.style.cssText = `left:${o[0]}px;top:${o[1]}px;z-index:${90 + i}`; el.innerHTML = cardFace(c, RANKS, SUITS);
        table.appendChild(el);
        const a = el.animate([{ transform: "translate(0,0)" }, { transform: `translate(${tx - o[0]}px,${ty - o[1]}px)` }], { duration: 240, delay: i * 26, easing: "ease-in", fill: "both" });
        a.onfinish = a.oncancel = () => el.remove();
      });
    }
    function move(from, idx, to) {
      snap();
      const src = pile(from), cards = src.splice(idx), dst = pile(to);
      dst.push(...cards); score = Math.max(0, score - 1);
      const t = top(src); if (t && !t.up) { t.up = true; snd.fx("flip"); }
      snd.fx("place");
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
      if (!S.k.length || won || casc || dealing) return;
      if (S.t.some((p) => !p.length)) { toast("Fill all empty columns before dealing"); snd.fx("menu"); return; }
      snap(); clearHint();
      for (let i = 0; i < 10; i++) { const c = S.k.pop(); c.up = true; S.t[i].push(c); }
      snd.fx("shuffle");
      for (let i = 0; i < 10; i++) complete(S.t[i]);
      const rowFrom = [xOf(9), layout.gap];
      render();
      const run = ++dealRun; dealing = true;
      const els = S.t.map((p, k) => table.querySelector(`.card[data-pile="t${k}"][data-i="${p.length - 1}"]`)).filter(Boolean);
      dealFx(ctx, snd, els, rowFrom, 28, () => { if (run === dealRun) dealing = false; });
      checkWin();
    }
    function checkWin() {
      if (S.d.length < 8) return;
      won = true; played = false; clearInterval(timer);
      career(ctx, "spider", { won: true, score, time: secs, mode: modeStr(), pts: { 1: 60, 2: 140, 4: 300 }[nS] });
      snd.fx("tada");
      startCascade();
    }
    function showWin(first = true) {
      const o = overlay(`<b>You Won!</b>Score ${score} in ${secs}s<div class="wl" style="min-width:230px"></div><button class="xpbtn">Deal again</button>`);
      o.querySelector("button").onclick = () => deal();
      if (first) wb.post(o.querySelector(".wl"), score, { time: secs, mode: modeStr() }); else wb.view(o.querySelector(".wl"));
    }
    function showWorld() {
      const o = overlay(`<b>World top 10</b><div class="wl sol-lb" style="min-width:230px"></div><button class="xpbtn">Close</button>`);
      o.querySelector("button").onclick = () => { if (won && !casc) showWin(false); else o.remove(); };
      wb.view(o.querySelector(".wl"));
    }

    // ---- hint ----
    ctx.el.__g = { get S() { return S; }, set S(v) { S = v; render(); }, get score() { return score; }, get won() { return won; }, get dealing() { return dealing; }, get casc() { return casc; }, get nS() { return nS; }, set secs(v) { secs = v; }, canDrop, move, dealStock, complete, checkWin, autoMove, isRun, undo, render, deal };
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
      if (won || casc || drag || dealing) return;
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
      if ((anim || runFx) && table.firstChild) {
        const off = pendingOff; old = new Map();
        for (const el of table.children) {
          const id = el.dataset.id; if (id === undefined) continue;
          let x = parseFloat(el.style.left), y = parseFloat(el.style.top);
          if (off && off.els.includes(el)) { x += off.dx; y += off.dy; }
          old.set(id, [x, y, el.classList.contains("back")]);
        }
      }
      const finished = runFx; runFx = null;
      pendingOff = null;
      computeLayout();
      const { cw, ch, gap, H } = layout, top0 = gap, tabY = gap * 2 + ch;
      const html = [];
      const slot = (id, x, y, label = "") => html.push(`<div class="slot" data-pile="${id}" style="left:${x}px;top:${y}px">${label}</div>`);
      const card = (c, id, i, x, y) => html.push(c.up
        ? `<div class="card ${red(c) ? "red" : ""}" data-id="${c.id}" data-pile="${id}" data-i="${i}" style="left:${x}px;top:${y}px">${cardFace(c, RANKS, SUITS)}</div>`
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
          if (o[2] && !el.classList.contains("back")) el.classList.add("flipin");
          const dx = o[0] - parseFloat(el.style.left), dy = o[1] - parseFloat(el.style.top);
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
          el.style.transition = "none"; el.style.transform = `translate(${dx}px,${dy}px)`; el.style.zIndex = 50; moving.push(el);
        }
        if (moving.length) {
          void table.offsetWidth;
          for (const el of moving) { el.style.transition = "transform 140ms ease-out"; el.style.transform = "translate(0,0)"; }
        }
      }
      if (finished && old) for (const run of finished) flyRun(run, old);
    }

    // ---- pointer interaction: click = auto move, drag = drop on a pile ----
    const colAt = (e) => {
      const r = table.getBoundingClientRect(), { cw, gap } = layout;
      return "t" + clamp(Math.floor((e.clientX - r.left - gap / 2) / (cw + gap)), 0, 9);
    };
    table.addEventListener("pointerdown", (e) => {
      if (dealing) { ctx.skipWait(); return; }
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
      if (to !== d.id && canDrop(pile(d.id).slice(d.i), to)) move(d.id, d.i, to); else { snd.blip(170, 0.06, "triangle", 0.6); render(true); }
    });
    table.addEventListener("pointercancel", () => { if (drag) { const d = drag; drag = null; pendingOff = d.moved ? { els: d.els, dx: d.dx, dy: d.dy } : null; render(true); } });

    ctx.menu(body.querySelector(".menubar"), [
      { label: "Game", items: () => [
        { label: "New Game", key: "F2", act: () => deal() },
        "-",
        { label: "Difficulty: 1 Suit", check: nS === 1, act: () => setSuits(1) },
        { label: "Difficulty: 2 Suits", check: nS === 2, act: () => setSuits(2) },
        { label: "Difficulty: 4 Suits", check: nS === 4, act: () => setSuits(4) },
        "-",
        { label: "Undo", key: "Ctrl+Z", disabled: !history.length || won || !!casc, act: undo },
        { label: "Hint", key: "H", disabled: won || !!casc, act: hint },
        { label: "Deck…", act: () => deckPicker(ctx, table, overlay) },
        snd.item(),
        "-",
        { label: "Statistics…", act: () => statsDialog(ctx, "spider", overlay) },
        { label: "World Leaderboard…", act: showWorld },
        "-",
        { label: "Exit", act: ctx.close },
      ] },
      { label: "Help", items: [{ label: "How to play", act: help }] },
    ]);
    listen(ctx, "keydown", (e) => {
      if (!ctx.isActive() || !mine(ctx, e)) return;
      if (casc && !["Shift", "Control", "Alt", "Meta"].includes(e.key)) { e.preventDefault(); endCascade(); return; }
      if (e.key === "F2") { e.preventDefault(); deal(); }
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat && e.key.toLowerCase() === "h") { e.preventDefault(); hint(); }
    });
    observeSize(ctx, table, () => { if (!S || drag) return false; render(); });
    ctx.onClose(() => { forfeit(); clearInterval(timer); clearTimeout(hintT); clearTimeout(toastT); });
    // like the real game, a first visit asks how hard before dealing
    if (sv) deal(); else { deal(true); askDifficulty(); }
  }

  window.GAMES = {
    solitaire,
    spider,
    snake: splash(snake, { title: "Snake", sub: "10 maze levels", bg: "linear-gradient(#2c7a1a,#0e3d0a)", art: `<svg viewBox="0 0 64 64"><path d="M10 50c14 0 8-16 20-16s8 16 20 4 0-26-14-22" fill="none" stroke="#a6ec5c" stroke-width="8" stroke-linecap="round"/><circle cx="36" cy="16" r="6" fill="#c8ff6a"/><circle cx="34" cy="14" r="1.5"/><circle cx="52" cy="50" r="6" fill="#e5261f"/></svg>` }),
    breakout: splash(breakout, { title: "Brick Breaker", sub: "12 designed levels", bg: "linear-gradient(#1a3c9c,#050a2c)", art: `<svg viewBox="0 0 64 64"><g stroke="#000" stroke-opacity=".3"><rect x="6" y="8" width="16" height="8" fill="#e5410c"/><rect x="24" y="8" width="16" height="8" fill="#5ca50a"/><rect x="42" y="8" width="16" height="8" fill="#1e7ae6"/><rect x="6" y="18" width="16" height="8" fill="#f2a900"/><rect x="42" y="18" width="16" height="8" fill="#8a4fd8"/></g><circle cx="32" cy="38" r="4" fill="#fff"/><rect x="18" y="52" width="28" height="6" rx="3" fill="#c8ccd4"/></svg>` }),
    pinball: splash(pinball, { title: "3D Pinball", sub: "Space Cadet", ms: 1700, bg: "radial-gradient(circle at 50% 40%,#2b1a7a,#05051c 70%)", art: `<svg viewBox="0 0 64 64"><circle cx="32" cy="30" r="22" fill="#0b0f3a" stroke="#9db4ff" stroke-width="2"/><path d="M32 8l5 16 16 6-16 6-5 16-5-16-16-6 16-6z" fill="#ffd640"/><circle cx="46" cy="50" r="6" fill="#dfe6ff"/></svg>` }),
  };
})();
