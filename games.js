// Games are loaded on demand the first time one is opened.
// Each game: (body, ctx) where ctx = { el, close, onClose(fn), isVisible(), isActive(), store, menu(bar, menus) }
(() => {
  const BAR = `<div class="menubar" style="background:#ece9d8;color:#000"></div>`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const loop = (ctx, step) => {
    // rAF loop that sleeps while the window is minimized or the tab is hidden
    let raf = 0, last = 0, dead = false;
    const frame = (t) => {
      if (dead) return;
      const dt = last ? Math.min(50, t - last) : 16; last = t;
      if (ctx.isVisible()) step(dt); else last = 0;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    ctx.onClose(() => { dead = true; cancelAnimationFrame(raf); });
  };
  const fitCanvas = (cv, W, H) => {
    // keep the logical size, scale with CSS to fit the window body
    const box = cv.parentElement;
    const s = Math.min(box.clientWidth / W, box.clientHeight / H) || 1;
    cv.style.width = W * s + "px"; cv.style.height = H * s + "px";
  };
  const observe = (ctx, el, fn) => { const ro = new ResizeObserver(fn); ro.observe(el); ctx.onClose(() => ro.disconnect()); };
  const listen = (ctx, type, fn) => { addEventListener(type, fn); ctx.onClose(() => removeEventListener(type, fn)); };

  // =====================================================================
  //  Solitaire (Klondike, draw one or three)
  // =====================================================================
  function solitaire(body, ctx) {
    const SUITS = ["♠", "♥", "♦", "♣"], RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const red = (c) => c.s === 1 || c.s === 2;
    body.classList.add("sol-body");
    body.innerHTML = BAR + `<div class="sol"><div class="sol-table"></div></div><div class="statusbar"><span class="score">Score: 0</span><span class="time">Time: 0</span></div>`;
    const sol = body.querySelector(".sol"), table = body.querySelector(".sol-table"), scoreEl = body.querySelector(".score"), timeEl = body.querySelector(".time");
    let S, history = [], score, secs, timer, won = false, drag = null, draw3 = ctx.store.lget("xp-sol-draw") === "3", layout = { cw: 71, ch: 96, gap: 10, H: 400 };

    const overlay = (html, style = "") => { sol.querySelector(".sol-win")?.remove(); sol.insertAdjacentHTML("beforeend", `<div class="sol-win" style="${style}">${html}</div>`); return sol.querySelector(".sol-win"); };
    function deal() {
      const deck = [];
      for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ s, r, up: false });
      for (let i = deck.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; }
      S = { s: [], w: [], f: [[], [], [], []], t: [[], [], [], [], [], [], []] };
      for (let c = 0; c < 7; c++) for (let k = 0; k <= c; k++) { const card = deck.pop(); card.up = k === c; S.t[c].push(card); }
      S.s = deck; history = []; score = 0; secs = 0; won = false; drag = null;
      sol.querySelector(".sol-win")?.remove(); timeEl.textContent = "Time: 0";
      clearInterval(timer); timer = setInterval(() => { if (!won && ctx.isVisible()) timeEl.textContent = "Time: " + ++secs; }, 1000);
      render();
    }
    const snap = () => { history.push(JSON.stringify({ S, score })); if (history.length > 100) history.shift(); };
    const pile = (id) => id === "s" ? S.s : id === "w" ? S.w : id[0] === "f" ? S.f[+id[1]] : S.t[+id[1]];
    const top = (p) => p[p.length - 1];
    function undo() {
      if (!history.length || won) return;
      const h = JSON.parse(history.pop()); S = h.S; score = h.score; drag = null; render();
    }
    function setDraw(v) { draw3 = v; ctx.store.lset("xp-sol-draw", v ? "3" : "1"); render(); }
    function help() {
      const o = overlay(`<b>How to play</b><div style="margin:6px 0 10px">Build the four foundations up by suit, Ace to King.<br>Stack tableau cards downward, alternating colors.<br>Drag cards or runs between piles, or click a card to auto-move it.<br>Click the deck to draw; click the empty deck to recycle the waste.<br>F2 deals a new game, Ctrl+Z undoes.</div><button class="xpbtn">OK</button>`, "max-width:88%;text-align:left;line-height:1.5");
      o.querySelector("button").onclick = () => o.remove();
    }

    function canDrop(cards, id) {
      const c = cards[0], dest = pile(id), t = top(dest);
      if (id[0] === "f") return cards.length === 1 && (t ? t.s === c.s && c.r === t.r + 1 : c.r === 1);
      if (id[0] === "t") return t ? t.up && red(t) !== red(c) && c.r === t.r - 1 : c.r === 13;
      return false;
    }
    function move(from, idx, to) {
      snap();
      const src = pile(from), cards = src.splice(idx);
      pile(to).push(...cards);
      if (to[0] === "f") score += 10; else if (from === "w") score += 5; else if (from[0] === "f") score = Math.max(0, score - 15);
      const t = top(src); if (from[0] === "t" && t && !t.up) { t.up = true; score += 5; }
      render(); checkWin();
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
      snap();
      if (S.s.length) { for (let n = draw3 ? 3 : 1; n-- && S.s.length;) { const c = S.s.pop(); c.up = true; S.w.push(c); } }
      else { S.s = S.w.reverse().map((c) => ({ ...c, up: false })); S.w = []; score = Math.max(0, score - (draw3 ? 20 : 100)); }
      render();
    }
    function checkWin() {
      if (!S.f.every((f) => f.length === 13)) return;
      won = true; clearInterval(timer);
      overlay(`<b>You won!</b><br>Score ${score} in ${secs}s<br><button class="xpbtn">Deal again</button>`).querySelector("button").onclick = deal;
    }

    function computeLayout() {
      const W = table.clientWidth || 560, H = table.clientHeight || 400;
      const gap = Math.max(4, Math.min(12, W * 0.015));
      const cw = Math.min(80, (W - gap * 8) / 7), ch = cw * 1.36;
      layout = { cw, ch, gap, H };
      table.style.setProperty("--cw", cw + "px"); table.style.setProperty("--ch", ch + "px");
    }
    const xOf = (col) => layout.gap + col * (layout.cw + layout.gap);
    function render() {
      computeLayout();
      const { cw, ch, gap, H } = layout, top0 = gap, tabY = gap * 2 + ch;
      const html = [];
      const slot = (id, x, y, label = "") => html.push(`<div class="slot" data-pile="${id}" style="left:${x}px;top:${y}px">${label}</div>`);
      const card = (c, id, i, x, y) => html.push(c.up
        ? `<div class="card ${red(c) ? "red" : ""}" data-pile="${id}" data-i="${i}" style="left:${x}px;top:${y}px"><span class="ci">${RANKS[c.r]}<br>${SUITS[c.s]}</span><span class="cc">${SUITS[c.s]}</span><span class="ci br">${RANKS[c.r]}<br>${SUITS[c.s]}</span></div>`
        : `<div class="card back" data-pile="${id}" data-i="${i}" style="left:${x}px;top:${y}px"></div>`);
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
    }

    // ---- pointer interaction: click = auto move, drag = drop on a pile ----
    table.addEventListener("pointerdown", (e) => {
      if (won || drag || e.button !== 0) return;
      const el = e.target.closest(".card, .slot"); if (!el) return;
      const id = el.dataset.pile;
      if (id === "s") { drawStock(); return; }
      if (!el.classList.contains("card")) return;
      const i = +el.dataset.i, p = pile(id), c = p[i];
      if (!c.up) { if (id[0] === "t" && i === p.length - 1) { snap(); c.up = true; score += 5; render(); } return; }
      if (id[0] !== "t" && i !== p.length - 1) return; // only the top card of waste/foundations is playable
      const els = [...table.querySelectorAll(`.card[data-pile="${id}"]`)].filter((x) => +x.dataset.i >= i);
      drag = { id, i, els, x: e.clientX, y: e.clientY, moved: false };
      table.setPointerCapture(e.pointerId);
    });
    table.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      drag.els.forEach((el) => { el.style.transform = `translate(${dx}px,${dy}px)`; el.classList.add("dragging"); });
    });
    table.addEventListener("pointerup", (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) { if (d.id[0] === "f" || !autoMove(d.id, d.i)) render(); return; }
      const under = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-pile]");
      const to = under?.dataset.pile;
      if (to && to !== d.id && canDrop(pile(d.id).slice(d.i), to)) move(d.id, d.i, to); else render();
    });
    table.addEventListener("pointercancel", () => { if (drag) { drag = null; render(); } });

    ctx.menu(body.querySelector(".menubar"), [
      { label: "Game", items: () => [
        { label: "Deal", key: "F2", act: deal },
        { label: "Undo", key: "Ctrl+Z", disabled: !history.length || won, act: undo },
        "-",
        { label: "Draw One", check: !draw3, act: () => setDraw(false) },
        { label: "Draw Three", check: draw3, act: () => setDraw(true) },
        "-",
        { label: "Exit", act: ctx.close },
      ] },
      { label: "Help", items: [{ label: "How to play", act: help }] },
    ]);
    listen(ctx, "keydown", (e) => {
      if (!ctx.isActive()) return;
      if (e.key === "F2") { e.preventDefault(); deal(); }
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
    });
    // a re-render mid-drag would detach the dragged cards; the drop re-renders anyway
    observe(ctx, table, () => S && !drag && render());
    ctx.onClose(() => clearInterval(timer));
    deal();
  }

  // =====================================================================
  //  Snake
  // =====================================================================
  function snake(body, ctx) {
    const N = 20, CELL = 20, W = N * CELL, SPEEDS = { Slow: 300, Normal: 240, Fast: 170 };
    body.innerHTML = BAR + `<div class="game-hud"><span>Score: <b class="sc">0</b></span><span>Best: <b class="hi">0</b></span></div><div class="game-stage"><canvas width="${W}" height="${W}"></canvas><div class="game-msg"></div></div>`;
    body.classList.add("game-body");
    const cv = body.querySelector("canvas"), g = cv.getContext("2d"), msg = body.querySelector(".game-msg");
    const scEl = body.querySelector(".sc"), hiEl = body.querySelector(".hi");
    let best = Number(ctx.store.lget("xp-snake-best")) || 0; hiEl.textContent = best;
    let level = ctx.store.lget("xp-snake-speed"); if (!SPEEDS[level]) level = "Normal";
    let sn, dir, queue, food, bonus, obs, grow, score, state = "ready", acc = 0, speed, overAt = 0;
    const intro = "<b>SNAKE</b><br><small>Arrow keys / WASD or swipe<br>Space or tap to start</small>";
    const rnd = (n) => (Math.random() * n) | 0;
    const reset = () => {
      // random head and heading, kept far enough from every wall that the snake never starts facing one
      const hx = 5 + rnd(N - 10), hy = 5 + rnd(N - 10), d = [[1, 0], [-1, 0], [0, 1], [0, -1]][rnd(4)];
      dir = { x: d[0], y: d[1] }; sn = [0, 1, 2].map((i) => ({ x: hx - dir.x * i, y: hy - dir.y * i }));
      queue = []; obs = []; bonus = null; grow = 0; score = 0; speed = SPEEDS[level]; acc = 0; placeFood(); scEl.textContent = 0;
    };
    const free = (pad = -1) => {
      const h = sn[0], out = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (sn.some((p) => p.x === x && p.y === y) || obs.some((p) => p.x === x && p.y === y) || (food && food.x === x && food.y === y) || (bonus && bonus.x === x && bonus.y === y)) continue;
        if (pad >= 0 && Math.max(Math.abs(x - h.x), Math.abs(y - h.y)) <= pad) continue;
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
    const start = () => { if (state === "over") reset(); state = "run"; say(""); };
    const newGame = () => { reset(); state = "ready"; say(intro); };
    const pause = () => {
      if (state === "run") { state = "paused"; say("<b>Paused</b><br><small>Space to resume</small>"); }
      else if (state === "paused") start();
    };
    function turn(x, y) {
      if (state === "over") { if (performance.now() - overAt < 600) return; start(); }
      const last = queue[queue.length - 1] || dir;
      if (last.x === -x && last.y === -y) return;
      if ((last.x !== x || last.y !== y) && queue.length < 3) queue.push({ x, y });
      if (state !== "run") start();
    }
    function end(win) {
      state = "over"; overAt = performance.now(); const s = score;
      if (s > best) { best = s; ctx.store.lset("xp-snake-best", best); hiEl.textContent = best; }
      say(`<b>${win ? "YOU WIN!" : "GAME OVER"}</b><br>Score ${s}<br><small>Press Space or tap to play again</small>`);
    }
    function tick() {
      if (queue.length) dir = queue.shift();
      const h = { x: sn[0].x + dir.x, y: sn[0].y + dir.y }, eat = h.x === food.x && h.y === food.y, eatB = !!bonus && h.x === bonus.x && h.y === bonus.y;
      // the tail cell is free to enter unless we grow this tick
      const stay = eat || eatB || grow > 0;
      if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || obs.some((p) => p.x === h.x && p.y === h.y) || sn.some((p, i) => (stay || i < sn.length - 1) && p.x === h.x && p.y === h.y)) return end(false);
      sn.unshift(h);
      if (eatB) { bonus = null; score += 3; grow += 2; scEl.textContent = score; return; }
      if (!eat) { if (grow > 0) grow--; else sn.pop(); return; }
      score++; scEl.textContent = score;
      if (sn.length >= N * N - obs.length) return end(true);
      placeFood(); spawn(); speed = Math.max(Math.round(SPEEDS[level] * 0.4), speed * 0.965); // each apple shaves ~3.5% off the tick
    }
    function draw() {
      g.fillStyle = "#0b3d0b"; g.fillRect(0, 0, W, W);
      g.fillStyle = "#0e470e"; for (let y = 0; y < N; y++) for (let x = (y & 1); x < N; x += 2) g.fillRect(x * CELL, y * CELL, CELL, CELL);
      g.fillStyle = "#6b7280"; for (const o of obs) { g.fillRect(o.x * CELL + 1, o.y * CELL + 1, CELL - 2, CELL - 2); g.fillStyle = "#9ca3af"; g.fillRect(o.x * CELL + 1, o.y * CELL + 1, CELL - 2, 3); g.fillStyle = "#6b7280"; }
      g.fillStyle = "#ff4136"; g.beginPath(); g.arc(food.x * CELL + 10, food.y * CELL + 10, 7, 0, 7); g.fill();
      if (bonus && (bonus.ttl > 1500 || ((bonus.ttl / 150) | 0) % 2)) { g.fillStyle = "#ffd700"; g.beginPath(); g.arc(bonus.x * CELL + 10, bonus.y * CELL + 10, 8, 0, 7); g.fill(); g.fillStyle = "#fff6b0"; g.beginPath(); g.arc(bonus.x * CELL + 8, bonus.y * CELL + 8, 2.5, 0, 7); g.fill(); }
      sn.forEach((p, i) => { g.fillStyle = i ? "#7fdb3b" : "#c8ff6a"; g.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2); });
    }
    loop(ctx, (dt) => { if (state === "run") { if (bonus && (bonus.ttl -= dt) <= 0) bonus = null; acc += dt; while (acc >= speed && state === "run") { acc -= speed; tick(); } } draw(); });
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
      if (Math.hypot(dx, dy) < 20) { if (state !== "run") start(); return; }
      Math.abs(dx) > Math.abs(dy) ? turn(Math.sign(dx), 0) : turn(0, Math.sign(dy));
    });
    stage.addEventListener("pointercancel", () => { tx = null; });
    ctx.menu(body.querySelector(".menubar"), [{ label: "Game", items: () => [
      { label: "New", key: "F2", act: newGame },
      { label: state === "paused" ? "Resume" : "Pause", key: "Space", disabled: state !== "run" && state !== "paused", act: pause },
      "-",
      { label: "Speed:", disabled: true },
      ...Object.keys(SPEEDS).map((n) => ({ label: n, check: n === level, act: () => { level = n; speed = SPEEDS[n]; ctx.store.lset("xp-snake-speed", n); } })),
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
    let best = Number(ctx.store.lget("xp-breakout-best")) || 0;
    const intro = () => `<b>BRICK BREAKER</b><br><small>Move the mouse or use ← →<br>Click or Space to launch${best ? "<br>Best: " + best : ""}</small>`;
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
      if (state === "run") { state = "paused"; say("<b>Paused</b><br><small>Click or Space to resume</small>"); }
      else if (state === "paused") { state = "run"; say(""); }
    };
    function release() {
      let any = false;
      for (const b of balls) if (b.stuck) {
        if (!b.vx && !b.vy) { const a = (0.25 + Math.random() * 0.45) * (Math.random() < 0.5 ? -1 : 1), sp = baseSp(); b.vx = sp * Math.sin(a); b.vy = -sp * Math.cos(a); }
        b.stuck = false; b.y = PY - b.r - 1; any = true;
      }
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
      say(`<b>GAME OVER</b><br>Score ${score}<br><small>${nb ? "New best!" : "Best: " + best}<br>Click to play again</small>`);
    }
    function loseLife() {
      lives--; hud(); pups.length = 0; widenT = slowT = stickyT = 0; resetBall();
      if (lives <= 0) gameOver(); else { state = "ready"; say("<small>Click to launch</small>"); }
    }
    function nextLevel() {
      level++; pups.length = 0; build(); resetBall(); hud(); state = "banner"; bannerT = 1500;
      say(`<b>Level ${level}</b><br><small>Get ready</small>`);
    }
    function hitBrick(b) {
      if (b.t === 3) { b.f = 80; return; }
      if (--b.hp > 0) { b.f = 120; burst(b.x + b.w / 2, b.y + BH / 2, "#fff", 3); return; }
      b.alive = false; remain--; score += Math.round([10, 20, 40][b.t] * (1 + (level - 1) * 0.25)); hud();
      burst(b.x + b.w / 2, b.y + BH / 2, b.col, 9);
      if (Math.random() < 0.12) pups.push({ x: b.x + b.w / 2, y: b.y + BH / 2, k: PU_BAG[rnd(PU_BAG.length)] });
    }
    function applyPU(k) {
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
    // returns true when this ball should stop stepping (fell out, or caught by a sticky paddle)
    function stepBall(b, d) {
      const r = b.r;
      b.x += b.vx * d; b.y += b.vy * d;
      if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx); } else if (b.x > W - r) { b.x = W - r; b.vx = -Math.abs(b.vx); }
      if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy); }
      if (b.vy > 0 && b.y + r >= PY && b.y < PY + 10 && b.x >= pad.x - r && b.x <= pad.x + pad.w + r) {
        const hit = clamp((b.x - (pad.x + pad.w / 2)) / (pad.w / 2), -1, 1), sp = Math.min(baseSp() * 1.5, Math.hypot(b.vx, b.vy) * 1.012);
        b.vx = sp * Math.sin(hit * 1.05); b.vy = -sp * Math.cos(hit * 1.05); b.y = PY - r;
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
        const sp = Math.hypot(b.vx, b.vy), minY = sp * 0.25; // never let the ball go nearly horizontal
        if (Math.abs(b.vy) < minY) { b.vy = (b.vy < 0 ? -1 : 1) * minY; b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(sp * sp - minY * minY); }
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
    loop(ctx, (dt) => { if (state !== "paused") update(dt); draw(); });
    const stage = cv.parentElement;
    // map client coords through the canvas's CSS-scaled rect back to logical pixels
    const track = (e) => { if (state === "paused") return; const r = cv.getBoundingClientRect(); pad.x = clamp((e.clientX - r.left) / r.width * W - pad.w / 2, 0, W - pad.w); };
    stage.addEventListener("pointermove", track);
    stage.addEventListener("pointerdown", (e) => { track(e); launch(); });
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
    listen(ctx, "blur", () => { kl = kr = false; });
    ctx.menu(body.querySelector(".menubar"), [{ label: "Game", items: () => [
      { label: "New Game", key: "F2", act: newGame },
      { label: state === "paused" ? "Resume" : "Pause", key: "P", disabled: state !== "run" && state !== "paused", act: pause },
      "-",
      { label: "Exit", act: ctx.close },
    ] }]);
    observe(ctx, stage, () => fitCanvas(cv, W, H));
    build(); resetBall(); say(intro());
  }

  // =====================================================================
  //  Tic-Tac-Toe (minimax AI)
  // =====================================================================
  function tictactoe(body, ctx) {
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    body.innerHTML = `<div class="ttt"><div class="ttt-bar"><label><input type="checkbox" class="hard" checked> Unbeatable AI</label><span class="ttt-score"></span></div><div class="ttt-msg">Your turn (X)</div><div class="ttt-grid">${Array.from({ length: 9 }, (_, i) => `<button data-i="${i}"></button>`).join("")}</div><div style="display:flex;gap:8px"><button class="xpbtn again">New Game</button><button class="xpbtn zero">Reset score</button></div></div>`;
    const cells = [...body.querySelectorAll(".ttt-grid button")], msgEl = body.querySelector(".ttt-msg"), scoreEl = body.querySelector(".ttt-score");
    let tally = { w: 0, l: 0, d: 0 };
    try { const t = JSON.parse(ctx.store.lget("xp-ttt") || "{}"); tally = { w: Number(t.w) || 0, l: Number(t.l) || 0, d: Number(t.d) || 0 }; } catch {}
    let b, over;
    const save = () => ctx.store.lset("xp-ttt", JSON.stringify(tally));
    const aiStarts = () => (tally.w + tally.l + tally.d) % 2 === 1; // the computer opens every other finished game
    const winner = (b) => { for (const [x, y, z] of LINES) if (b[x] && b[x] === b[y] && b[x] === b[z]) return { p: b[x], line: [x, y, z] }; return b.every(Boolean) ? { p: "draw" } : null; };
    function minimax(b, me) {
      const w = winner(b); if (w) return { s: w.p === "O" ? 10 : w.p === "X" ? -10 : 0 };
      let best = { s: me === "O" ? -99 : 99 };
      b.forEach((v, i) => {
        if (v) return; b[i] = me; const r = minimax(b, me === "O" ? "X" : "O"); b[i] = null;
        const s = r.s - Math.sign(r.s); // prefer faster wins / slower losses
        if (me === "O" ? s > best.s : s < best.s) best = { s, i };
      });
      return best;
    }
    // every move that is equally optimal for O, so play varies between games
    function bestMoves(b) {
      let top = -99, mv = [];
      b.forEach((v, i) => {
        if (v) return; b[i] = "O"; const r = minimax(b, "X"); b[i] = null;
        const s = r.s - Math.sign(r.s);
        if (s > top) { top = s; mv = [i]; } else if (s === top) mv.push(i);
      });
      return mv;
    }
    // decent heuristic: win, block, centre, corner, edge
    function okMove(b, empty, rnd) {
      for (const me of ["O", "X"]) for (const i of empty) { b[i] = me; const w = winner(b); b[i] = null; if (w && w.p === me) return i; }
      if (empty.includes(4)) return 4;
      const c = empty.filter((i) => i % 2 === 0);
      return rnd(c.length ? c : empty);
    }
    const paint = () => { cells.forEach((c, i) => { c.textContent = b[i] || ""; c.className = b[i] ? "p" + b[i] : ""; }); scoreEl.textContent = `W ${tally.w} · L ${tally.l} · D ${tally.d}`; };
    function finish(w) {
      over = true;
      if (w.p === "X") { tally.w++; msgEl.textContent = "You win! 🎉"; } else if (w.p === "O") { tally.l++; msgEl.textContent = "Computer wins."; } else { tally.d++; msgEl.textContent = "It's a draw."; }
      save(); paint(); // paint resets cell classes, so highlight afterwards
      if (w.line) w.line.forEach((i) => cells[i].classList.add("hl"));
    }
    function aiMove() {
      const empty = b.map((v, k) => (v ? -1 : k)).filter((k) => k >= 0), rnd = (a) => a[(Math.random() * a.length) | 0];
      // on an empty board every reply scores the same, so skip the search and open on a random corner/centre
      const hard = body.querySelector(".hard").checked;
      b[hard ? (empty.length === 9 ? rnd([0, 2, 4, 6, 8]) : rnd(bestMoves(b))) : Math.random() < 0.35 ? rnd(empty) : okMove(b, empty, rnd)] = "O";
    }
    function play(i) {
      if (over || b[i]) return;
      b[i] = "X"; paint(); let w = winner(b); if (w) return finish(w);
      aiMove(); paint(); w = winner(b); if (w) return finish(w);
      msgEl.textContent = "Your turn (X)";
    }
    const reset = () => {
      b = Array(9).fill(null); over = false;
      if (aiStarts()) { aiMove(); msgEl.textContent = "Computer opened. Your turn (X)"; } else msgEl.textContent = "Your turn (X)";
      paint();
    };
    body.querySelector(".ttt-grid").addEventListener("click", (e) => { const c = e.target.closest("button"); if (c) play(+c.dataset.i); });
    body.querySelector(".again").onclick = reset;
    body.querySelector(".zero").onclick = () => { tally = { w: 0, l: 0, d: 0 }; save(); reset(); };
    reset();
  }

  window.GAMES = { solitaire, snake, breakout, tictactoe };
})();
