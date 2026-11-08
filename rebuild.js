// Visual Rebuild: a 45 second, purely visual rebuild of this site by a swarm of tiny agents.
// 0-10s   the screen is wiped and the swarm draws the back end (Vercel edge, serverless API, Firestore rules and data)
// 10-20s  the front end is built on top of it (index.html, app.js, sound.js, data.js, style.css, the lazy chunks)
// 10-38s  sewing needles keep stitching threads between the layers in the background
// 20-38s  real app windows open and get built one on top of another, faster and faster, until several build at once
// 38-42s  the windows fly away and the desktop (wallpaper, icons) is built
// 42-45s  the taskbar, start button and tray icons, then it hands back to the live desktop underneath
// It is all theatre: nothing here writes data or touches the network. Loaded on demand by app.js.
(() => {
  const CSS = `
.rb { position: fixed; inset: 0; z-index: 100001; overflow: hidden; color: #e2e8f0; cursor: default; user-select: none; -webkit-user-select: none;
  --rb-mono: ui-monospace, "Cascadia Mono", "SF Mono", Consolas, "Courier New", monospace; --rb-sans: "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif;
  font: 12px var(--rb-sans); --c: #22d3ee; opacity: 0; transition: opacity .5s ease; background: #050913; }
.rb.on { opacity: 1; }
.rb.rb-out { opacity: 0; transition: opacity .7s ease; pointer-events: none; }
.rb-grid { position: absolute; inset: 0; transition: opacity 1s;
  background: radial-gradient(circle, rgba(148,163,184,.14) 1px, transparent 1.4px) 0 0 / 22px 22px, radial-gradient(ellipse 85% 75% at 50% 45%, #0b1530 0%, #050913 72%); }
.rb-layer { position: absolute; inset: 0; transform-origin: 50% 50%; transition: opacity 1.2s ease, transform 1.4s cubic-bezier(.6,0,.3,1); }
.rb-layer > svg { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
.rb-be.under { opacity: .42; transform: scale(.965); }
.rb-be.under2 { opacity: .22; }
.rb-fe.under { opacity: .38; transform: scale(.985); }
.rb-layer.gone { opacity: 0; }

/* blueprint boxes */
.rb-box { position: absolute; box-sizing: border-box; border: 1px solid color-mix(in srgb, var(--a) 60%, #1e293b); border-radius: 6px; overflow: hidden;
  background: rgba(7,12,26,.94); font: var(--fs) var(--rb-mono); opacity: 0; transition: opacity .3s, box-shadow .6s; }
.rb-box.on { opacity: 1; box-shadow: 0 0 0 1px rgba(0,0,0,.45), 0 12px 44px -20px var(--a); }
.rb-box.fe { background: rgba(14,20,38,.96); border-color: var(--a); }
.rb-box.fe.on { box-shadow: 0 0 0 1px rgba(0,0,0,.5), 0 18px 50px -16px rgba(0,0,0,.9), 0 0 30px -12px var(--a); }
.rb-bh { display: flex; align-items: center; gap: 8px; height: var(--hdr); padding: 0 10px; border-bottom: 1px solid #16203a; white-space: nowrap;
  clip-path: inset(0 100% 0 0); transition: clip-path .35s steps(10); }
.rb-box.hd .rb-bh { clip-path: inset(0 0 0 0); }
.rb-bh b { font-weight: 700; letter-spacing: .12em; color: #f8fafc; }
.rb-bh small { margin-left: auto; color: var(--a); font-size: .85em; letter-spacing: .06em; overflow: hidden; text-overflow: ellipsis; }
.rb-bh i { width: 7px; height: 7px; border-radius: 50%; background: var(--a); flex: none; box-shadow: 0 0 8px var(--a); }
.rb-box.fe .rb-bh i { border-radius: 1px; width: 8px; height: 10px; }
.rb-box.sm { font-size: var(--fss); }
.rb-box.sm .rb-bh { height: var(--hdrs); }
.rb-box.sm .rb-r { height: var(--rows); }
.rb-r { display: flex; gap: 8px; align-items: center; height: var(--row); padding: 0 10px; color: #94a3b8; white-space: nowrap; overflow: hidden;
  clip-path: inset(0 100% 0 0); transition: clip-path .22s steps(12); }
.rb-r.on { clip-path: inset(0 0 0 0); }
.rb-r::before { content: "▸"; color: var(--a); }
.rb-r em { margin-left: auto; font-style: normal; color: #64748b; font-size: .9em; overflow: hidden; text-overflow: ellipsis; }
.rb-box.db .rb-r { border-bottom: 1px solid #101a30; }
.rb-box.db .rb-r::before { content: "▣"; }
.rb-box .rb-pad { height: 6px; }
.rb-sw { display: flex; gap: 6px; height: 14px; padding: 4px 10px 2px; clip-path: inset(0 100% 0 0); transition: clip-path .4s steps(8); }
.rb-sw.on { clip-path: inset(0 0 0 0); }
.rb-sw i { flex: 1; height: 12px; border-radius: 2px; }
.rb-wave { display: block; margin: 2px 10px 2px; height: 26px; width: calc(100% - 20px); }
.rb-wave path { fill: none; stroke: var(--a); stroke-width: 1.4; stroke-dasharray: 1; stroke-dashoffset: 1; }
.rb-wave.on path { stroke-dashoffset: 0; transition: stroke-dashoffset .6s linear; }

.rb-wire { fill: none; stroke: var(--a); stroke-width: 1.4; stroke-dasharray: 1; stroke-dashoffset: 1; opacity: .8; }
.rb-wire.on { stroke-dashoffset: 0; transition: stroke-dashoffset var(--t) linear; }
.rb-knot { fill: var(--a); }

/* app windows */
.rb-app { position: absolute; left: 0; top: 0; transition: transform .85s cubic-bezier(.6,0,.35,1), opacity .75s ease; }
.rb-app .win { position: absolute !important; left: 0 !important; top: 0 !important; margin: 0 !important; max-width: none !important; max-height: none !important;
  z-index: auto !important; transform: none !important; animation: none !important; pointer-events: none; }
.rb-app .rb-wf, .rb-app .rb-wf * { background: transparent !important; color: transparent !important; box-shadow: none !important; text-shadow: none !important;
  border-color: color-mix(in srgb, var(--a) 45%, transparent) !important; caret-color: transparent !important; }
.rb-app .rb-wf { outline: 1px dashed var(--a); outline-offset: -1px; opacity: 0; transition: opacity .5s; }
.rb-app .rb-wf * { outline: 1px solid color-mix(in srgb, var(--a) 22%, transparent); outline-offset: -1px; }
.rb-app .rb-wf svg, .rb-app .rb-wf img, .rb-app .rb-wf canvas, .rb-app .rb-wf .avatar { opacity: 0 !important; }
.rb-app.wf .rb-wf { opacity: 1; }
.rb-app.done .rb-wf { opacity: 0; }
.rb-app .rb-rl { clip-path: inset(0 100% calc(100% - var(--tb)) 0); transition: clip-path var(--t, .4s) linear; }
.rb-app .rb-rl.t { clip-path: inset(0 0 calc(100% - var(--tb)) 0); }
.rb-app .rb-rl.b { clip-path: inset(0 0 0 0); }
.rb-scan { position: absolute; left: -6px; right: -6px; height: 2px; top: var(--tb); background: var(--a); box-shadow: 0 0 14px 2px var(--a); opacity: 0; }
.rb-app.scan .rb-scan { opacity: 1; animation: rbScan var(--t) linear both; }
@keyframes rbScan { from { top: var(--tb); } to { top: 100%; } }
.rb-app.done .rb-scan { opacity: 0; }
.rb-app.fly { opacity: 0; }

/* the desktop copy that is built last */
.rb-wall { position: absolute; inset: 0; clip-path: circle(0 at var(--x, 50%) var(--y, 50%)); transition: clip-path 1.2s cubic-bezier(.6,0,.2,1); }
.rb-wall.on { clip-path: circle(150vmax at var(--x, 50%) var(--y, 50%)); }
.rb-ui { pointer-events: none; animation: none !important; background: transparent !important; opacity: 0; }
.rb-ui.on { opacity: 1; }
.rb-ui .rb-h { transition: clip-path var(--t, .45s) cubic-bezier(.5,0,.3,1); }
.rb-ui .rb-h.rb-hr { clip-path: inset(0 100% 0 0); }
.rb-ui .rb-h.rb-hl { clip-path: inset(0 0 0 100%); }
.rb-ui .rb-h.rb-hd { clip-path: inset(0 0 100% 0); }
.rb-ui .rb-h.rb-hc { clip-path: circle(0% at 50% 40%); }
.rb-ui .rb-h.rb-on { clip-path: inset(0 0 0 0); }
.rb-ui .rb-h.rb-hc.rb-on { clip-path: circle(80% at 50% 40%); }

/* needles and thread */
.rb-sew { position: absolute; inset: 0; pointer-events: none; transition: opacity .8s; }
.rb-sew > svg { position: absolute; left: 0; top: 0; overflow: visible; }
.rb-seam { fill: none; stroke-width: 2.6; stroke-linecap: round; stroke-dasharray: 7 5; }
.rb-seam-u { fill: none; stroke-width: 1; opacity: .3; }
.rb-sg { transition: opacity 1.2s; } .rb-sg.old { opacity: .3; }
.rb-nd { position: absolute; left: 0; top: 0; width: 92px; height: 14px; offset-rotate: auto; offset-anchor: 100% 50%; offset-distance: 0%; }
.rb-nd svg { display: block; width: 92px; height: 14px; overflow: visible; animation: rbBob .26s ease-in-out infinite alternate; }
@keyframes rbBob { from { transform: translateX(0) scale(1); opacity: 1; } to { transform: translateX(-7px) scale(.9, .8); opacity: .7; } }
.rb-nd.out { opacity: 0 !important; }

/* swarm */
.rb-fx, .rb-ags { position: absolute; inset: 0; pointer-events: none; transition: opacity .4s; }
.rb-fr { position: absolute; box-sizing: border-box; border: 1px solid var(--a);
  transition: width var(--t) cubic-bezier(.5,0,.2,1), height var(--t) cubic-bezier(.5,0,.2,1), opacity .4s; }
.rb-fr::before { content: ""; position: absolute; inset: 0; background: color-mix(in srgb, var(--a) 8%, transparent); }
.rb-fr i { position: absolute; width: 6px; height: 6px; background: #fff; border: 1px solid var(--a); box-sizing: border-box; opacity: 0; transition: opacity .2s; }
.rb-fr i:nth-child(1) { left: -3px; top: -3px; } .rb-fr i:nth-child(2) { right: -3px; top: -3px; }
.rb-fr i:nth-child(3) { left: -3px; bottom: -3px; } .rb-fr i:nth-child(4) { right: -3px; bottom: -3px; }
.rb-fr.set i { opacity: 1; }
.rb-chip { position: absolute; left: -1px; bottom: 100%; margin-bottom: 4px; background: var(--a); color: #020617; font: 600 10px/1 var(--rb-mono);
  padding: 3px 6px; border-radius: 3px; white-space: nowrap; opacity: 0; transition: opacity .2s; }
.rb-fr.lo .rb-chip { bottom: auto; top: 100%; margin: 4px 0 0; }
.rb-fr.rt .rb-chip { left: auto; right: -1px; }
.rb-fr.set .rb-chip { opacity: 1; }
.rb-fr.gone { opacity: 0; }
.rb-ag { position: absolute; left: 0; top: 0; opacity: 0; transition: transform .5s cubic-bezier(.45,0,.2,1), opacity .4s; }
.rb-ag.on { opacity: 1; }
.rb-ag svg { display: block; width: 16px; height: 20px; overflow: visible; }
.rb-ag path { fill: var(--a); stroke: #fff; stroke-width: 1.3; stroke-linejoin: round; }
.rb-ag span { position: absolute; left: 12px; top: 17px; background: var(--a); color: #020617; font: 600 10px/1 var(--rb-mono); padding: 3px 6px;
  border-radius: 2px 8px 8px 8px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,.45); }
.rb-ag.click svg { animation: rbClick .22s ease-out; }
@keyframes rbClick { 50% { transform: scale(.8); } }
.rb-rip { position: absolute; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%; border: 1.5px solid var(--a); box-sizing: border-box; animation: rbRip .55s ease-out both; }
@keyframes rbRip { from { transform: scale(.2); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }

/* HUD */
.rb-hud { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); display: flex; align-items: center; gap: 16px; padding: 7px 8px 7px 16px;
  background: rgba(5,9,19,.84); border: 1px solid #1e293b; border-radius: 999px; font-family: var(--rb-mono); white-space: nowrap;
  box-shadow: 0 8px 30px rgba(0,0,0,.5); transition: opacity .6s; }
.rb-hud.off { opacity: 0; pointer-events: none; }
.rb-brand { font: 700 12px var(--rb-mono); letter-spacing: .32em; color: #fff; }
.rb-prog { width: 160px; height: 2px; background: #1b2540; position: relative; }
.rb-prog i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: var(--c); box-shadow: 0 0 10px var(--c); transition: background .6s; }
.rb-meta { display: flex; gap: 12px; font-size: 11px; color: #64748b; letter-spacing: .1em; }
.rb-meta b { color: var(--c); letter-spacing: .2em; transition: color .6s; }
.rb-skip { background: transparent; border: 1px solid #334155; color: #cbd5e1; cursor: pointer; font: 11px var(--rb-mono); letter-spacing: .2em; padding: 5px 12px; border-radius: 999px; }
.rb-skip small { margin-left: 8px; color: #64748b; letter-spacing: .08em; font-size: 10px; }
.rb-skip:hover, .rb-skip:focus-visible { border-color: var(--c); color: #fff; outline: none; }
.rb-cap { position: absolute; left: 0; right: 0; bottom: 34px; text-align: center; pointer-events: none; transition: opacity .6s; }
.rb-cap.off { opacity: 0; }
.rb-cap::before { content: ""; position: absolute; left: 50%; top: 50%; width: min(1000px, 96vw); height: 250%; transform: translate(-50%, -48%); z-index: -1;
  background: radial-gradient(closest-side, rgba(2,4,12,.9), rgba(2,4,12,.6) 55%, transparent); }
.rb-cap small { display: block; font: 11px var(--rb-mono); letter-spacing: .55em; color: var(--c); transition: color .6s; }
.rb-cap b { display: block; font: 800 clamp(22px, 3.2vw, 44px)/1.15 var(--rb-sans); letter-spacing: .3em; text-indent: .3em; color: #fff; margin: 6px 0 4px;
  text-shadow: 0 0 30px color-mix(in srgb, var(--c) 60%, transparent); }
.rb-cap span { font: 14px var(--rb-sans); color: #94a3b8; letter-spacing: .04em; }
.rb-cap.swap { animation: rbCap .9s cubic-bezier(.2,.8,.2,1) both; }
.rb-cap.swap b { animation: rbCapB 1.1s cubic-bezier(.2,.8,.2,1) both; }
@keyframes rbCap { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes rbCapB { from { letter-spacing: .9em; text-indent: .9em; } to { letter-spacing: .3em; text-indent: .3em; } }
.rb-vig { position: absolute; inset: 0; pointer-events: none; transition: opacity 1s;
  background: radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,.65) 100%), repeating-linear-gradient(0deg, rgba(255,255,255,.02) 0 1px, transparent 1px 3px); }
.rb-vig.off { opacity: 0; }
.rb-intro { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; pointer-events: none;
  transition: opacity .6s, transform .9s cubic-bezier(.7,0,.3,1); }
.rb-intro.off { opacity: 0; transform: scale(1.25); }
.rb-intro-t { font: 800 clamp(26px, 4.6vw, 64px) var(--rb-sans); letter-spacing: .42em; text-indent: .42em; color: #fff; white-space: nowrap; text-shadow: 0 0 34px rgba(34,211,238,.55); }
.rb-intro-s { font: 13px var(--rb-mono); color: #64748b; letter-spacing: .22em; min-height: 1.5em; text-align: center; padding: 0 12px; }
.rb-intro-s b { color: #22d3ee; font-weight: 400; }
.rb-intro-bar { width: min(420px, 70vw); height: 1px; background: linear-gradient(90deg, transparent, #22d3ee, transparent); transform: scaleX(0); transition: transform 1.2s cubic-bezier(.7,0,.3,1); }
.rb-intro-bar.on { transform: none; }
.rb-glitch-bars { position: absolute; inset: 0; pointer-events: none; opacity: 0; }
.rb-glitch-bars.go { animation: rbBars .9s steps(1) both; }
.rb-glitch-bars i { position: absolute; left: 0; right: 0; background: rgba(34,211,238,.35); }
@keyframes rbBars { 0%, 100% { opacity: 0; } 10%, 30%, 55%, 80% { opacity: 1; } 20%, 45%, 70% { opacity: 0; } }
.rb-flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
.rb-flash.go { animation: rbFlash .8s ease-out both; }
@keyframes rbFlash { 0% { opacity: 0; } 12% { opacity: .5; } 100% { opacity: 0; } }
@media (max-width: 700px) { .rb-brand, .rb-meta .rb-clock, .rb-meta .rb-ags-n { display: none; } .rb-prog { width: 70px; } .rb-hud { gap: 10px; }
  .rb-cap { bottom: 46px; } .rb-cap span { display: block; padding: 0 16px; font-size: 12px; } }
@media (max-height: 560px) { .rb-cap span { display: none; } }
#desktop.rb-glitch { animation: rbGlitch 1s steps(1, end) both; }
@keyframes rbGlitch {
  0% { filter: none; transform: none; clip-path: none; }
  8% { transform: translate(-8px, 2px) skewX(5deg); filter: hue-rotate(90deg) saturate(3); }
  16% { transform: translate(6px, -3px); filter: contrast(2.2) brightness(1.3); clip-path: inset(12% 0 58% 0); }
  24% { transform: none; filter: invert(1) hue-rotate(180deg); clip-path: none; }
  32% { transform: translate(12px, 0) skewX(-8deg); filter: grayscale(1) brightness(1.8); clip-path: inset(0 0 72% 0); }
  42% { transform: translate(-4px, 5px); filter: hue-rotate(-120deg) saturate(4); clip-path: inset(46% 0 20% 0); }
  52% { transform: none; filter: brightness(2.6) contrast(.6); clip-path: none; }
  62% { transform: translate(0, -6px) scaleY(.96); filter: hue-rotate(40deg) brightness(.7); clip-path: inset(30% 0 30% 0); }
  74% { transform: scaleY(.3); filter: brightness(3); clip-path: inset(47% 0 47% 0); }
  86% { transform: scaleY(.02) scaleX(.6); filter: brightness(4); clip-path: inset(49.5% 0 49.5% 0); }
  100% { transform: scale(0); filter: brightness(0); clip-path: inset(50% 50% 50% 50%); }
}
#desktop.rb-reveal { animation: rbReveal 1.1s ease-out both; }
@keyframes rbReveal { from { filter: brightness(2.2) saturate(1.8) hue-rotate(-20deg); } to { filter: none; } }
`;

  const AGENTS = [["nova", "#f472b6"], ["atlas", "#22d3ee"], ["pixel", "#a3e635"], ["echo", "#fbbf24"], ["flux", "#a78bfa"], ["orbit", "#fb7185"], ["vega", "#34d399"], ["juno", "#60a5fa"],
    ["kite", "#f59e0b"], ["ion", "#2dd4bf"], ["lumen", "#e879f9"], ["quill", "#facc15"], ["rho", "#38bdf8"], ["zed", "#4ade80"]];
  const THREADS = ["#f43f5e", "#fbbf24", "#22d3ee", "#e879f9", "#a3e635", "#fb923c"];

  // the back end, as the swarm draws it
  const BE = {
    edge: { t: "VERCEL EDGE", tag: "cdn", lines: [["regions", "18"], ["cache", "1y immutable"], ["nosniff", "on"], ["referrer", "strict-origin"], ["permissions", "locked"]] },
    api: { t: "API/", tag: "serverless", subs: {
      otp: { t: "otp.js", lines: [["POST", "/api/otp"], ["code", "4 digits"]] },
      contact: { t: "contact.js", lines: [["verify", "→ send"], ["via", "gmail"]] },
      proxy: { t: "proxy.js", lines: [["sandbox", "IE only"], ["cookies", "never"]] },
      mailer: { t: "_mail.js", lines: [["mailer", "shared"], ["auth", "app pw"]] },
    } },
    rules: { t: "FIRESTORE.RULES", tag: "gatekeeper", lines: [["fields", "validated"], ["scores · board", "add-only"], ["stats", "+1 max"], ["limits", "hashed keys"]] },
    db: { t: "FIRESTORE", tag: "resume-41921", db: true, lines: [["shared/notepad", "rw"], ["tasks", "rw"], ["pictures", "add · del"], ["scores", "add-only"], ["board", "add-only"], ["stats", "+1"], ["otp", "counters"], ["limits", "hashed"]] },
    mail: { t: "GMAIL SMTP", tag: "outbound", lines: [["otp", "4 digits"], ["contact", "→ inbox"], ["rate limit", "on"]] },
  };
  // the front end, built on top of it
  const FE = {
    index: { t: "INDEX.HTML", tag: "shell", lines: [["doctype", "html"], ["#desktop", "mount"], ["#windows", "layer"], ["taskbar", "toolbar"]] },
    app: { t: "APP.JS", tag: "runtime", lines: [["window manager", "z-order"], ["desktop grid", "snap"], ["start menu", ""], ["taskbar + tray", "live"], ["explorer · cmd · msn", ""], ["paint · notepad", ""]] },
    sound: { t: "SOUND.JS", tag: "webaudio", wave: true, lines: [["xp scheme", "synth"], ["files", "0"]] },
    data: { t: "DATA.JS", tag: "profile", lines: [["name", "Medhansh Khattar"], ["role", "AI/ML engineer"], ["based", "Navi Mumbai"], ["host", "MK-PC"]] },
    style: { t: "STYLE.CSS", tag: "luna", swatch: ["#0058ee", "#3c8f3c", "#ece9d8", "#4c9b2d", "#d6dff7", "#1941a5"], lines: [["titlebar", "#0058ee"], ["start", "#3c8f3c"]] },
    games: { t: "GAMES.JS", tag: "lazy chunk", lines: [["solitaire · spider", ""], ["minesweeper", ""], ["snake · bricks", ""], ["3d pinball", ""]] },
    extras: { t: "EXTRAS.JS", tag: "lazy chunk", lines: [["calculator", ""], ["media player", "indexeddb"], ["my pictures", ""], ["task manager", ""]] },
  };
  // real apps, in build order (none that need the network)
  const APP_IDS = ["about", "cmd", "mine", "paint", "projects", "solitaire", "msn", "calc", "resume", "spider", "wmp", "snake", "notepad"];
  const APP_AT = [20000, 22300, 24300, 26000, 27400, 28600, 29600, 30500, 31300, 32000, 32600, 33200, 33700];
  const APP_SPOT = [[.3, .4], [.7, .36], [.46, .6], [.2, .64], [.78, .62], [.54, .32], [.34, .5], [.64, .5], [.16, .4], [.84, .42], [.42, .66], [.58, .44], [.5, .52]];
  // where each app's thread is stitched to underneath
  const APP_LINK = { about: "data", cmd: "app", mine: "db", paint: "app", projects: "data", solitaire: "db", msn: "api:contact", calc: "extras", resume: "edge", spider: "db", wmp: "extras", snake: "db", notepad: "db" };

  let running = false;

  window.REBUILD = function start(opts = {}) {
    if (running) return;
    running = true;
    const real = opts.desktop || document.getElementById("desktop");
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sp = opts.speed || 1;
    const soundOn = () => { try { return localStorage.getItem("xp-sounds") !== "0"; } catch { return true; } };
    const blip = (...a) => soundOn() && window.XPS?.blip?.(...a);
    const play = (n) => window.XPS?.play?.(n);
    if (!document.getElementById("rb-css")) { const st = document.createElement("style"); st.id = "rb-css"; st.textContent = CSS; document.head.appendChild(st); }

    // ---------- timers (all cancelled on skip) ----------
    let done = false;
    const timers = new Set();
    const at = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); if (!done) { try { fn(); } catch (e) { console.error("rebuild", e); } } }, Math.max(0, ms * sp)); timers.add(id); return id; };
    const every = (ms, fn) => { const id = setInterval(() => { if (!done) { try { fn(); } catch (e) { console.error("rebuild", e); } } }, ms * sp); timers.add(id); return id; };
    const stop = (id) => { clearInterval(id); timers.delete(id); };
    const wait = (ms) => new Promise((r) => at(ms, r));
    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[(Math.random() * arr.length) | 0];
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    let lastTick = 0;
    const tick = () => { const n = performance.now(); if (n - lastTick < 70) return; lastTick = n; blip(1300 + Math.random() * 900, 0.025, "square", 0.12); };
    let lastChime = 0;
    const chime = () => { const n = performance.now(); if (n - lastChime < 250) return; lastChime = n; blip(1760, 0.06, "triangle", 0.3); blip(2640, 0.08, "triangle", 0.25, 0, 0.06); };
    const thud = () => blip(70, 0.45, "sine", 2.2, 34);

    // ---------- geometry ----------
    const vw = innerWidth, vh = innerHeight;
    const narrow = vw < 700 || vw < vh * 0.9;
    const M = narrow ? { hdr: 26, row: 18, ch: 6.2, hdrs: 22, rows: 16, chs: 5.9, fs: "10.5px", fss: "10px" }
      : { hdr: 30, row: 22, ch: 7.2, hdrs: 24, rows: 18, chs: 6.6, fs: "12px", fss: "11px" };
    const side = narrow ? 12 : Math.max(24, vw * 0.035);
    const R = { x: side, y: narrow ? 64 : 70, w: vw - 2 * side, h: vh - (narrow ? 64 : 70) - 120 };

    // ---------- measure the live desktop before anything moves ----------
    const rel = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const visible = (r) => r.w > 2 && r.h > 2 && r.x < vw && r.y < vh && r.x + r.w > 0 && r.y + r.h > 0;
    const clone = real.cloneNode(true);
    const pair = (s) => { const rr = [...real.querySelectorAll(s)], cc = [...clone.querySelectorAll(s)]; return rr.map((e, i) => ({ el: cc[i], r: rel(e) })).filter((p) => p.el && visible(p.r)); };
    const D = {
      icons: pair(".dicon"), wins: pair(".win:not(.min), .board-dock:not(.hidden), .board-tab:not(.hidden)"), bar: pair(".taskbar"),
      start: pair(".start-btn"), quick: pair(".quick"), tray: pair(".tray-ico"), clock: pair(".tray-clock"),
    };
    const rcs = getComputedStyle(real);
    clone.removeAttribute("id"); clone.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
    clone.querySelectorAll("iframe, video, audio, script, .start-menu, .ctx, .tray-pop, .balloons").forEach((e) => e.remove());
    const realCanvases = real.querySelectorAll("canvas");
    clone.querySelectorAll("canvas").forEach((c, i) => { try { c.getContext("2d")?.drawImage(realCanvases[i], 0, 0); } catch {} });
    clone.classList.remove("arrive", "drop-over", "rb-glitch", "rb-reveal");
    clone.classList.add("rb-ui");
    clone.setAttribute("aria-hidden", "true");
    const bs = getComputedStyle(document.body);
    ["color", "font", "lineHeight", "letterSpacing", "textAlign"].forEach((k) => (clone.style[k] = bs[k]));
    const hide = (p, kind) => p.el.classList.add("rb-h", kind);
    D.icons.forEach((p) => hide(p, "rb-hc")); D.wins.forEach((p) => hide(p, "rb-hd")); D.bar.forEach((p) => hide(p, "rb-hl"));
    [...D.start, ...D.quick, ...D.tray, ...D.clock].forEach((p) => hide(p, "rb-hc"));

    // ---------- DOM ----------
    const ov = document.createElement("div");
    ov.className = "rb";
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Visual Rebuild");
    Object.entries({ hdr: M.hdr + "px", row: M.row + "px", hdrs: M.hdrs + "px", rows: M.rows + "px", fs: M.fs, fss: M.fss }).forEach(([k, v]) => ov.style.setProperty("--" + k, v));
    const svgL = `<svg width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}"></svg>`;
    ov.innerHTML = `<div class="rb-grid"></div>
      <div class="rb-layer rb-be">${svgL}</div><div class="rb-layer rb-fe">${svgL}</div>
      <div class="rb-layer rb-apps"></div><div class="rb-wall"></div>
      <div class="rb-sew"><svg width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}"><defs><linearGradient id="rbNdG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f8fafc"/><stop offset=".45" stop-color="#cbd5e1"/><stop offset="1" stop-color="#475569"/></linearGradient></defs></svg></div>
      <div class="rb-fx"></div><div class="rb-ags"></div>
      <div class="rb-glitch-bars">${Array.from({ length: 7 }, () => `<i style="top:${rand(0, 96).toFixed(1)}%;height:${rand(1, 9).toFixed(1)}px"></i>`).join("")}</div>
      <div class="rb-intro"><div class="rb-intro-t">&nbsp;</div><div class="rb-intro-bar"></div><div class="rb-intro-s">&nbsp;</div></div>
      <div class="rb-cap off" aria-live="polite"><small></small><b></b><span></span></div>
      <div class="rb-vig"></div>
      <div class="rb-hud off"><span class="rb-brand">VISUAL REBUILD</span><span class="rb-prog"><i></i></span>
        <span class="rb-meta"><b class="rb-ph">BOOT</b><span class="rb-ags-n">0 agents</span><span class="rb-clock">00.000</span></span>
        <button class="rb-skip" type="button">SKIP<small>ESC</small></button></div>
      <div class="rb-flash"></div>`;
    const q = (s) => ov.querySelector(s);
    const beL = q(".rb-be"), feL = q(".rb-fe"), appsL = q(".rb-apps"), wall = q(".rb-wall"), sewL = q(".rb-sew"), sewS = q(".rb-sew svg"), fx = q(".rb-fx"), agL = q(".rb-ags");
    const cap = q(".rb-cap"), hud = q(".rb-hud"), intro = q(".rb-intro"), flash = q(".rb-flash");
    ["backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat", "backgroundOrigin", "backgroundClip"].forEach((k) => (wall.style[k] = rcs[k]));
    wall.after(clone);

    document.body.appendChild(ov);
    const prevFocus = document.activeElement;
    const skipBtn = q(".rb-skip");
    skipBtn.addEventListener("click", () => finish(true));
    const t0 = performance.now();
    const clockEl = q(".rb-clock"), progEl = q(".rb-prog i");
    const TOTAL = 45000;
    every(60, () => {
      const e = (performance.now() - t0) / sp;
      clockEl.textContent = `${String((e / 1000) | 0).padStart(2, "0")}.${String((e | 0) % 1000).padStart(3, "0")}`;
      progEl.style.width = Math.min(100, (e / TOTAL) * 100) + "%";
    });
    const phase = (name, c) => { q(".rb-ph").textContent = name; if (c) ov.style.setProperty("--c", c); };
    const caption = (small, big, line) => {
      cap.classList.remove("off", "swap"); void cap.offsetWidth; cap.classList.add("swap");
      cap.querySelector("small").textContent = small; cap.querySelector("b").textContent = big; cap.querySelector("span").textContent = line;
    };
    const decode = (el, text, ms) => {
      const glyphs = "▓▒░█<>/\\|=+*#01ABCDEF"; const s0 = performance.now();
      const id = every(28, () => {
        const p = (performance.now() - s0) / (ms * sp);
        el.textContent = [...text].map((ch, k) => (ch === " " || k / text.length < p ? ch : glyphs[(Math.random() * glyphs.length) | 0])).join("");
        if (p >= 1) { el.textContent = text; stop(id); }
      });
    };

    // ---------- the swarm ----------
    const ags = [];
    let pace = 1.25; // > 1 is slower: every move and draw is scaled by it, and it drops as the show speeds up
    function place(a, x, y, ms, ease) {
      a.x = x; a.y = y;
      a.el.style.transition = ms && !rm ? `transform ${ms * sp}ms ${ease || "cubic-bezier(.45,0,.2,1)"}, opacity .4s` : "opacity .4s";
      a.el.style.transform = `translate(${x}px,${y}px)`;
    }
    const go = async (a, x, y, ms, ease) => { if (ms == null) ms = Math.min(850, 230 + Math.hypot(x - a.x, y - a.y) * 0.5) * Math.min(pace, 1.1); place(a, x, y, ms, ease); await wait(ms); };
    const say = (a, txt) => (a.tag.textContent = txt ? `${a.name} · ${txt}` : a.name);
    const ripple = (x, y, c) => { const d = document.createElement("div"); d.className = "rb-rip"; d.style.cssText = `left:${x}px;top:${y}px;--a:${c}`; fx.appendChild(d); at(600, () => d.remove()); };
    const click = (a) => { a.el.classList.remove("click"); void a.el.offsetWidth; a.el.classList.add("click"); ripple(a.x, a.y, a.color); tick(); };
    const spawn = (n, from) => {
      for (let k = 0; k < n && ags.length < AGENTS.length; k++) {
        const [name, color] = AGENTS[ags.length];
        const el = document.createElement("div");
        el.className = "rb-ag"; el.style.setProperty("--a", color);
        el.innerHTML = `<svg viewBox="0 0 16 20"><path d="M1.5 1.5 L14 10 L8.2 11.2 L5.2 17.5 Z"/></svg><span>${name}</span>`;
        agL.appendChild(el);
        const a = { name, color, el, tag: el.querySelector("span"), x: 0, y: 0 };
        const [sx, sy] = from ? from(k) : [vw / 2, vh / 2];
        place(a, sx, sy, 0);
        ags.push(a);
        at(30 + k * 60, () => { el.classList.add("on"); go(a, clamp(vw / 2 + rand(-vw * 0.3, vw * 0.3), 20, vw - 80), clamp(vh / 2 + rand(-vh * 0.25, vh * 0.25), 60, vh - 60), 650); worker(a); });
      }
      q(".rb-ags-n").textContent = ags.length + " agents";
    };

    // tasks: each agent pulls the most urgent ready task, nearest first
    const queue = [], doneIds = new Set();
    const task = (id, run, o = {}) => queue.push({ id, run, deps: o.deps || [], pri: o.pri || 0, x: o.x ?? vw / 2, y: o.y ?? vh / 2 });
    let focusPt = null;
    async function worker(a) {
      await wait(650);
      while (!done && !a.home) {
        const ready = queue.filter((t) => t.deps.every((d) => doneIds.has(d)));
        if (!ready.length) {
          const x = focusPt ? focusPt[0] + rand(-150, 150) : a.x + rand(-90, 90), y = focusPt ? focusPt[1] + rand(-90, 90) : a.y + rand(-70, 70);
          say(a); await go(a, clamp(x, 16, vw - 90), clamp(y, 60, vh - 50), rand(500, 800)); await wait(rand(40, 160)); continue;
        }
        const top = Math.min(...ready.map((t) => t.pri));
        const t = ready.filter((t) => t.pri === top).sort((p, r) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(r.x - a.x, r.y - a.y))[0];
        queue.splice(queue.indexOf(t), 1);
        try { await t.run(a); } catch (e) { console.error("rebuild task", t.id, e); }
        doneIds.add(t.id);
      }
    }

    // a wireframe box dragged out corner to corner, the way the swarm marks out every element
    const frame = async (a, r, label, ms = 450) => {
      await go(a, r.x, r.y);
      click(a);
      const f = document.createElement("div");
      f.className = "rb-fr" + (r.y < 34 ? " lo" : "") + (r.x + 200 > vw ? " rt" : "");
      f.style.cssText = `--a:${a.color};left:${r.x}px;top:${r.y}px;width:0;height:0;--t:${rm ? 0 : ms * sp}ms`;
      f.innerHTML = `<i></i><i></i><i></i><i></i><b class="rb-chip">${esc(label)} · ${Math.round(r.w)}×${Math.round(r.h)}</b>`;
      fx.appendChild(f); void f.offsetWidth;
      f.style.width = r.w + "px"; f.style.height = r.h + "px";
      await go(a, r.x + r.w, r.y + r.h, ms, "cubic-bezier(.5,0,.2,1)");
      f.classList.add("set");
      return f;
    };
    const unframe = (f, delay = 200) => at(delay, () => { f.classList.add("gone"); at(500, () => f.remove()); });

    // ---------- blueprint boxes ----------
    const rects = {}, boxes = {};
    let dbRow = M.row;
    const subH = () => M.hdrs + 6 + 2 * M.rows + 6;
    const boxH = (d) => {
      if (d.subs) return M.hdr + 8 + 2 * subH() + 8 + 8;
      if (d.db) return M.hdr + 6 + d.lines.length * dbRow + 8;
      return M.hdr + 6 + (d.wave ? 30 : 0) + (d.swatch ? 20 : 0) + (d.lines?.length || 0) * M.row + 8;
    };
    const makeBox = (layer, d, r, color, kind) => {
      const b = document.createElement("div");
      b.className = "rb-box " + (kind || "") + (d.db ? " db" : "");
      b.style.cssText = `--a:${color};left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px` + (d.db ? `;--row:${dbRow}px` : "");
      b.innerHTML = `<div class="rb-bh"><i></i><b>${esc(d.t)}</b><small>${esc(d.tag || "")}</small></div><div class="rb-pad"></div>` +
        (d.wave ? `<svg class="rb-wave" viewBox="0 0 200 26" preserveAspectRatio="none"><path pathLength="1" d="M0 13 ${Array.from({ length: 40 }, (_, k) => `L${(k + 1) * 5} ${(13 + Math.sin(k * 0.9) * (4 + (k % 7) * 1.4)).toFixed(1)}`).join(" ")}"/></svg>` : "") +
        (d.swatch ? `<div class="rb-sw">${d.swatch.map((c) => `<i style="background:${c}"></i>`).join("")}</div>` : "") +
        (d.subs ? "" : (d.lines || []).map(([k, v]) => `<div class="rb-r">${esc(k)}${v ? `<em>${esc(v)}</em>` : ""}</div>`).join(""));
      layer.appendChild(b);
      return b;
    };
    // type each row: the cursor hops to the start of the line and runs along it as it appears
    const typeRows = async (a, b, r, small) => {
      const rows = [...b.querySelectorAll(":scope > .rb-r")], row = small ? M.rows : M.row, hdr = small ? M.hdrs : M.hdr, ch = small ? M.chs : M.ch;
      const extra = (b.querySelector(".rb-wave") ? 30 : 0) + (b.querySelector(".rb-sw") ? 20 : 0);
      for (let k = 0; k < rows.length; k++) {
        const y = r.y + hdr + 6 + extra + k * row + row / 2;
        if (y > r.y + r.h - 4) break;
        await go(a, r.x + 12, y, 110 * pace);
        rows[k].classList.add("on");
        await go(a, r.x + Math.min(r.w - 14, 30 + rows[k].textContent.length * ch), y, 190 * pace, "linear");
      }
    };
    const buildBox = (layer, id, d, kind) => {
      const r = rects[id];
      task(id, async (a) => {
        say(a, d.t.toLowerCase());
        const f = await frame(a, r, (kind === "fe" ? "module " : "section#") + id, 420 * pace);
        const b = boxes[id] = makeBox(layer, d, r, a.color, kind);
        void b.offsetWidth; b.classList.add("on");
        await wait(90); b.classList.add("hd"); click(a);
        await go(a, r.x + Math.min(r.w - 12, 30 + d.t.length * M.ch), r.y + M.hdr / 2, 240 * pace, "linear");
        const wv = b.querySelector(".rb-wave");
        if (wv) { await go(a, r.x + 12, r.y + M.hdr + 20, 120); wv.classList.add("on"); await go(a, r.x + r.w - 14, r.y + M.hdr + 20, 600, "linear"); }
        const sw = b.querySelector(".rb-sw");
        if (sw) { await go(a, r.x + 12, r.y + M.hdr + 16, 120); sw.classList.add("on"); await go(a, r.x + r.w - 14, r.y + M.hdr + 16, 400, "linear"); }
        if (!d.db) await typeRows(a, b, r);
        unframe(f); chime();
      }, { x: r.x, y: r.y });
      // a database's collections are filled in by whoever is free: the swarm piles in
      if (d.db) d.lines.forEach((_, k) => task(id + ":r" + k, async (a) => {
        const rows = boxes[id].querySelectorAll(".rb-r"), y = r.y + M.hdr + 6 + k * dbRow + dbRow / 2;
        say(a, d.lines[k][0]);
        await go(a, r.x + 12, y); click(a);
        rows[k].classList.add("on");
        await go(a, r.x + r.w - 20, y, 260 * pace, "linear");
      }, { deps: [id], x: r.x, y: r.y + M.hdr + k * dbRow }));
      if (d.subs) Object.entries(d.subs).forEach(([sid, sd], k) => {
        const sw = (r.w - 24) / 2, sh = subH();
        const key = id + ":" + sid;
        const sr = rects[key] = { x: r.x + 8 + (k % 2) * (sw + 8), y: r.y + M.hdr + 8 + ((k / 2) | 0) * (sh + 8), w: sw, h: sh };
        task(key, async (a) => {
          say(a, sd.t);
          const f = await frame(a, sr, sd.t, 300 * pace);
          const b = boxes[key] = makeBox(layer, sd, sr, a.color, "sm" + (kind ? " " + kind : ""));
          void b.offsetWidth; b.classList.add("on");
          await wait(80); b.classList.add("hd"); click(a);
          await typeRows(a, b, sr, true);
          unframe(f);
        }, { deps: [id], x: sr.x, y: sr.y });
      });
    };

    // ---------- wires between boxes, drawn by an agent walking the route ----------
    const anchor = (id, s, f = 0.5) => { const b = rects[id]; return s === "r" ? [b.x + b.w, b.y + b.h * f] : s === "l" ? [b.x, b.y + b.h * f] : s === "t" ? [b.x + b.w * f, b.y] : [b.x + b.w * f, b.y + b.h]; };
    const route = (a, as, b, bs) => {
      const hz = (s) => s === "l" || s === "r";
      if (hz(as) && hz(bs)) { if (Math.abs(a[1] - b[1]) < 2) return [a, b]; const mx = (a[0] + b[0]) / 2; return [a, [mx, a[1]], [mx, b[1]], b]; }
      if (!hz(as) && !hz(bs)) { if (Math.abs(a[0] - b[0]) < 2) return [a, b]; const my = (a[1] + b[1]) / 2; return [a, [a[0], my], [b[0], my], b]; }
      return hz(as) ? [a, [b[0], a[1]], b] : [a, [a[0], b[1]], b];
    };
    const wire = (layer, [ai, as, af], [bi, bs, bf], label) => {
      const p0 = anchor(ai, as, af);
      task(`w:${ai}>${bi}:${as}${af}`, async (a) => {
        const pts = route(p0, as, anchor(bi, bs, bf), bs);
        const d = "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join(" L");
        const segs = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
        const len = segs.reduce((s, v) => s + v, 0), dur = clamp(len * 1.5, 380, 1100) * pace;
        say(a, label);
        await go(a, pts[0][0], pts[0][1]); click(a);
        const svg = layer.querySelector(":scope > svg");
        svg.insertAdjacentHTML("beforeend", `<path class="rb-wire" pathLength="1" style="--a:${a.color};--t:${dur * sp}ms" d="${d}"/><circle class="rb-knot" style="--a:${a.color}" r="3" cx="${pts[0][0]}" cy="${pts[0][1]}"/>`);
        const p = svg.lastElementChild.previousElementSibling; void p.getBoundingClientRect(); p.classList.add("on");
        for (let k = 1; k < pts.length; k++) await go(a, pts[k][0], pts[k][1], (dur * segs[k - 1]) / len, "linear");
        svg.insertAdjacentHTML("beforeend", `<circle class="rb-knot" style="--a:${a.color}" r="3" cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}"/>`);
        click(a);
        if (!rm) for (let n = 0; n < 2; n++) {
          svg.insertAdjacentHTML("beforeend", `<circle r="2.4" fill="${n ? "#fff" : a.color}"><animateMotion dur="${rand(1.3, 2.3).toFixed(2)}s" repeatCount="indefinite" begin="indefinite" path="${d}"/></circle>`);
          try { svg.lastElementChild.firstElementChild.beginElementAt(n * 0.7); } catch {}
        }
      }, { deps: [ai, bi], pri: 1, x: p0[0], y: p0[1] });
    };

    // ---------- layouts ----------
    const layoutColumns = (cols, gapX, gapY, maxW) => {
      const n = cols.length, colW = Math.min(maxW, (R.w - (n - 1) * gapX) / n), x0 = R.x + (R.w - n * colW - (n - 1) * gapX) / 2;
      cols.forEach((ids, c) => {
        const hs = ids.map((id) => boxH(BE[id]));
        const tot = hs.reduce((s, v) => s + v, 0) + gapY * (ids.length - 1);
        let y = R.y + Math.max(0, (R.h - tot) / 2);
        ids.forEach((id, k) => { rects[id] = { x: x0 + c * (colW + gapX), y, w: colW, h: hs[k] }; y += hs[k] + gapY; });
      });
    };
    if (narrow) layoutColumns([["edge", "rules", "mail"], ["api", "db"]], 12, 26, 400);
    else {
      dbRow = clamp(Math.floor((R.h * 0.86 - M.hdr - 14) / BE.db.lines.length), M.row, 40);
      layoutColumns([["edge"], ["api"], ["rules", "mail"], ["db"]], clamp(R.w * 0.06, 40, 110), 46, 330);
    }
    // front-end modules are laid over the back end, offset so both stay readable
    const FE_SPOT = narrow
      ? { index: [0, 0, .58], sound: [.62, .03, .38], app: [.16, .2, .68], data: [0, .5, .52], style: [.55, .52, .45], games: [0, .74, .48], extras: [.52, .78, .48] }
      : { index: [.02, .03, .2], sound: [.62, 0, .19], app: [.3, .15, .26], data: [.75, .3, .23], style: [.05, .5, .19], games: [.33, .64, .21], extras: [.63, .68, .21] };
    Object.entries(FE_SPOT).forEach(([id, [fx0, fy0, fw]]) => {
      const w = Math.min(R.w, Math.max(narrow ? 140 : 210, R.w * fw)), h = boxH(FE[id]);
      rects[id] = { x: R.x + clamp(R.w * fx0, 0, R.w - w), y: R.y + clamp(R.h * fy0, 0, Math.max(0, R.h - h)), w, h };
    });

    // ---------- needles: a thread stitched between two pieces, in the background ----------
    let seamN = 0;
    const inside = (r, s) => { let x = r.x + r.w * rand(0.25, 0.75), y = r.y + r.h * rand(0.3, 0.7); if (s && s !== 1) { x = vw / 2 + (x - vw / 2) * s; y = vh / 2 + (y - vh / 2) * s; } return [x, y]; };
    const stitch = (A, B, color = pick(THREADS), ms = rand(1100, 1600)) => {
      if (!A || !B) return;
      const [x1, y1] = A, [x2, y2] = B, dx = x2 - x1, dy = y2 - y1;
      if (Math.hypot(dx, dy) < 40) return;
      const bend = rand(0.12, 0.3) * (Math.random() < 0.5 ? -1 : 1), cx = (x1 + x2) / 2 - dy * bend, cy = (y1 + y2) / 2 + dx * bend;
      const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      const id = "rbM" + seamN++;
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "rb-sg");
      g.innerHTML = `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${vw}" height="${vh}"><path d="${d}" fill="none" stroke="#fff" stroke-width="10" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" style="transition:stroke-dashoffset ${ms * sp}ms linear"/></mask>
        <path class="rb-seam-u" stroke="${color}" d="${d}" mask="url(#${id})"/><path class="rb-seam" stroke="${color}" d="${d}" mask="url(#${id})"/>
        <circle r="3" fill="${color}" cx="${x1}" cy="${y1}"/>`;
      sewS.appendChild(g);
      const nd = document.createElement("div");
      nd.className = "rb-nd";
      nd.style.cssText = `offset-path:path("${d}");transition:offset-distance ${ms * sp}ms linear, opacity .3s`;
      nd.innerHTML = `<svg viewBox="0 0 64 10"><path d="M6 5 L-30 ${rand(-4, 4).toFixed(1)}" stroke="${color}" stroke-width="1.6" fill="none"/><path d="M3 5 Q3 2 8 2.2 L60 4.5 Q64 5 60 5.5 L8 7.8 Q3 8 3 5Z" fill="url(#rbNdG)" stroke="#0f172a" stroke-width=".5"/><ellipse cx="9" cy="5" rx="3.2" ry="1.1" fill="#0b1020"/></svg>`;
      sewL.appendChild(nd);
      void nd.offsetWidth; void g.getBoundingClientRect();
      nd.style.offsetDistance = "100%";
      g.querySelector("mask path").style.strokeDashoffset = "0";
      blip(rand(500, 700), 0.05, "triangle", 0.04, rand(300, 400));
      at(ms, () => { nd.classList.add("out"); g.insertAdjacentHTML("beforeend", `<circle r="3" fill="${color}" cx="${x2}" cy="${y2}"/>`); at(400, () => nd.remove()); });
      at(ms + 2600, () => g.classList.add("old"));
      at(ms + (narrow ? 5500 : 9000), () => g.remove());
    };
    // the threads that tie the front end to the back end; app windows join the pool as they are built
    const SEAMS = [["index", "edge"], ["app", "rules"], ["app", "api:otp"], ["games", "db"], ["data", "edge"], ["app", "db"], ["extras", "edge"], ["style", "index"], ["sound", "app"], ["app", "api:contact"], ["index", "api:proxy"], ["games", "rules"]];
    const seamPool = [], appRects = {};
    const ptOf = (id) => {
      if (appRects[id]) return inside(appRects[id]);
      const r = rects[id]; if (!r || !boxes[id]) return null;
      return FE[id] ? inside(r, feL.classList.contains("under") ? 0.985 : 1) : inside(r, beL.classList.contains("under") ? 0.965 : 1);
    };
    let seamI = 0;
    const sewOne = () => {
      const ready = [...SEAMS, ...seamPool].filter(([a, b]) => ptOf(a) && ptOf(b));
      if (!ready.length) return;
      const [a, b] = ready[(seamI++ * 7) % ready.length];
      stitch(ptOf(a), ptOf(b));
    };

    // ---------- real apps: opened hidden behind the overlay, copied, closed again ----------
    const opened = new Set(), apps = [];
    const prepApp = async (id) => {
      let rec; try { rec = opts.open?.(id); } catch (e) { console.error("rebuild open", id, e); }
      const el = rec?.el || rec;
      if (!(el instanceof Element) || !el.isConnected) return null;
      opened.add(id);
      skipBtn.focus({ preventScroll: true });
      for (let k = 0; k < 30 && el.querySelector(".loading"); k++) await wait(100);
      await wait(260);
      const w = el.offsetWidth, h = el.offsetHeight, tb = el.querySelector(".titlebar")?.offsetHeight || 30;
      const make = () => {
        const c = el.cloneNode(true);
        c.removeAttribute("id"); c.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
        c.querySelectorAll("iframe, video, audio, script").forEach((e) => e.remove());
        c.classList.remove("min", "max");
        c.style.width = w + "px"; c.style.height = h + "px";
        c.setAttribute("aria-hidden", "true"); c.inert = true;
        return c;
      };
      const rl = make(), wf = make();
      const src = el.querySelectorAll("canvas");
      rl.querySelectorAll("canvas").forEach((c, i) => { try { c.getContext("2d")?.drawImage(src[i], 0, 0); } catch {} });
      const title = el.querySelector(".ttl")?.textContent || id;
      try { opts.close?.(id); } catch {}
      opened.delete(id);
      skipBtn.focus({ preventScroll: true });
      return w > 20 && h > 20 ? { id, w, h, tb, rl, wf, title } : null;
    };
    const prepAll = async () => { for (const id of APP_IDS) apps.push(await prepApp(id)); };

    const buildApp = (app, i) => {
      const [fx0, fy0] = APP_SPOT[i % APP_SPOT.length];
      const top = 58, bottom = vh - 34, w = app.w, h = app.h;
      const x = clamp(vw * fx0 - w / 2, 8, Math.max(8, vw - w - 8)), y = clamp(top + (bottom - top) * fy0 - h / 2, top, Math.max(top, bottom - h));
      const r = { x, y, w, h };
      const wrap = document.createElement("div");
      wrap.className = "rb-app";
      wrap.style.cssText = `width:${w}px;height:${h}px;transform:translate(${x}px,${y}px);--tb:${app.tb}px`;
      app.wf.classList.add("rb-wf"); app.rl.classList.add("rb-rl");
      wrap.append(app.wf, app.rl);
      wrap.insertAdjacentHTML("beforeend", `<div class="rb-scan"></div>`);
      const k = clamp(1.15 - i * 0.05, 0.6, 1.15); // later apps build faster: the crescendo
      const base = "app:" + app.id;
      task(base, async (a) => {
        say(a, app.id);
        wrap.style.setProperty("--a", a.color);
        appsL.appendChild(wrap);
        thud();
        const f = await frame(a, r, "win · " + app.title.replace(/ - .*$/, "").replace(/^.* - /, ""), 480 * k);
        wrap.classList.add("wf"); click(a);
        wrap.f = f;
      }, { pri: -1, x, y });
      task(base + ":t", async (a) => {
        say(a, "titlebar");
        await go(a, x + 8, y + app.tb / 2);
        app.rl.style.setProperty("--t", 380 * k * sp + "ms");
        app.rl.classList.add("t"); click(a);
        await go(a, x + w - 10, y + app.tb / 2, 380 * k, "linear");
      }, { deps: [base], pri: -1, x, y });
      const bodyMs = clamp(h * 3.2, 900, 1900) * k;
      // two agents raster the body down like a print head; the first one drives the reveal
      task(base + ":b", async (a) => {
        say(a, "paint");
        await go(a, x + 10, y + app.tb + 4);
        app.rl.style.setProperty("--t", bodyMs * sp + "ms");
        wrap.style.setProperty("--t", bodyMs * sp + "ms");
        app.rl.classList.add("b"); wrap.classList.add("scan"); click(a);
        const rows = 5;
        for (let s = 1; s <= rows; s++) await go(a, s % 2 ? x + w - 12 : x + 12, y + app.tb + ((h - app.tb) * s) / rows, bodyMs / rows, "linear");
      }, { deps: [base + ":t"], pri: -1, x, y: y + app.tb });
      task(base + ":b2", async (a) => {
        say(a, "layout");
        await go(a, x + w - 12, y + app.tb + 4);
        const rows = 4;
        for (let s = 1; s <= rows; s++) await go(a, s % 2 ? x + 14 : x + w - 14, y + app.tb + ((h - app.tb) * s) / rows - 6, bodyMs / rows, "linear");
      }, { deps: [base + ":t"], pri: -1, x: x + w, y: y + app.tb });
      task(base + ":d", async () => {
        wrap.classList.add("done"); if (wrap.f) unframe(wrap.f, 0);
        appRects[app.id] = r;
        seamPool.push([app.id, APP_LINK[app.id] || "db"]);
        if (!rm) stitch(inside(r), ptOf(APP_LINK[app.id] || "db"), pick(THREADS), 1000);
        chime();
      }, { deps: [base + ":b"], pri: -2, x, y });
    };

    // ---------- the show ----------
    // intro: the live desktop glitches out and the title decodes
    real.classList.add("rb-glitch");
    if (!rm) { q(".rb-glitch-bars").classList.add("go"); play("tilt"); }
    at(650, () => { ov.classList.add("on"); skipBtn.focus({ preventScroll: true }); });
    at(900, () => { decode(q(".rb-intro-t"), "VISUAL REBUILD", 900); q(".rb-intro-bar").classList.add("on"); blip(90, 0.9, "sawtooth", 0.6, 45); });
    at(1150, () => { q(".rb-intro-s").innerHTML = "unmounting render tree · <b>0 nodes remain</b>"; tick(); });
    at(1900, () => { q(".rb-intro-s").innerHTML = "spawning swarm ▸ <b>8 agents · needle and thread</b>"; tick(); });
    at(1000, () => prepAll());

    // 0-10s: the back end
    at(2600, () => {
      intro.classList.add("off"); hud.classList.remove("off");
      phase("BACKEND", "#22d3ee");
      caption("01 · BACK END", "BACKEND", "Edge network, serverless functions, rules, data.");
      spawn(8); thud();
    });
    at(2700, () => {
      ["edge", "api", "rules", "db", "mail"].forEach((id) => buildBox(beL, id, BE[id], ""));
      if (narrow) {
        wire(beL, ["edge", "r", 0.4], ["api", "l", 0.15], "invoke");
        wire(beL, ["api", "l", 0.7], ["rules", "r", 0.5], "admin sdk");
        wire(beL, ["api", "l", 0.9], ["mail", "r", 0.5], "smtp");
        wire(beL, ["rules", "r", 0.85], ["db", "l", 0.25], "allow");
      } else {
        wire(beL, ["edge", "r", 0.5], ["api", "l", 0.3], "invoke");
        wire(beL, ["api", "r", 0.3], ["rules", "l", 0.6], "admin sdk");
        wire(beL, ["api", "r", 0.8], ["mail", "l", 0.5], "smtp");
        wire(beL, ["rules", "r", 0.5], ["db", "l", 0.3], "allow");
      }
    });

    // 10-20s: the front end on top of the back end; needles start stitching the two together
    let sewTimer = 0;
    at(10000, () => {
      beL.classList.add("under");
      pace = 1.1;
      phase("FRONT END", "#f472b6");
      caption("02 · FRONT END", "INTERFACE", "Shell, runtime, sound, data and styles, on top of the back end.");
      thud();
      ["index", "app", "sound", "data", "style", "games", "extras"].forEach((id) => buildBox(feL, id, FE[id], "fe"));
      wire(feL, ["index", "r", 0.5], ["app", "l", 0.3], "boot");
      wire(feL, ["app", "b", 0.3], ["games", "t", 0.5], "import()");
      wire(feL, ["app", narrow ? "b" : "r", narrow ? 0.75 : 0.8], ["extras", "t", 0.4], "import()");
      if (!rm) sewTimer = every(narrow ? 1400 : 850, sewOne);
    });

    // 20-38s: the real apps, stacking on top of each other and speeding up
    at(19500, () => {
      feL.classList.add("under"); beL.classList.add("under2");
      pace = 1;
      phase("APPS", "#fbbf24");
      caption("03 · APPS", "PROGRAMS", "Every window rebuilt live, one on top of another.");
      const edges = [[-30, vh * 0.3], [vw + 30, vh * 0.5], [vw * 0.5, vh + 30], [-30, vh * 0.8], [vw + 30, vh * 0.2], [vw * 0.3, -30]];
      spawn(6, (k) => edges[k]); thud();
    });
    at(23500, () => { cap.classList.remove("swap"); cap.classList.add("off"); });
    APP_AT.forEach((t, i) => at(t, () => { if (apps[i]) buildApp(apps[i], i); }));

    // 38-42s: the windows fly away and the desktop is built
    at(37600, () => stop(sewTimer));
    at(38000, () => {
      phase("DESKTOP", "#a3e635");
      queue.length = 0;
      [...appsL.children].reverse().forEach((w, k) => at(k * 45, () => {
        const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(w.style.transform) || [0, 0, 0];
        const x = +m[1], y = +m[2], dx = x + w.offsetWidth / 2 - vw / 2, dy = y + w.offsetHeight / 2 - vh / 2, L = Math.hypot(dx, dy) || 1, far = Math.max(vw, vh) * 0.95;
        w.style.transform = `translate(${x + (dx / L) * far}px, ${y + (dy / L) * far}px) rotate(${rand(-14, 14).toFixed(1)}deg) scale(.6)`;
        w.classList.add("fly");
      }));
      fx.querySelectorAll(".rb-fr").forEach((f) => f.classList.add("gone"));
      sewL.style.opacity = "0";
      blip(55, 1.0, "sawtooth", 0.4, 140);
    });
    at(38500, () => {
      clone.classList.add("on");
      q(".rb-vig").classList.add("off");
      pace = 0.7;
      task("wall", async (a) => {
        say(a, "wallpaper");
        await go(a, vw / 2, vh / 2, 380); click(a);
        wall.style.setProperty("--x", vw / 2 + "px"); wall.style.setProperty("--y", vh / 2 + "px");
        wall.classList.add("on"); blip(220, 0.5, "sine", 1.0, 440);
        at(1300, () => { beL.classList.add("gone"); feL.classList.add("gone"); q(".rb-grid").style.opacity = 0; });
        await go(a, vw / 2 + 60, vh / 2 - 40, 500);
      }, { pri: -3 });
      D.icons.forEach((p, k) => task("icon" + k, async (a) => {
        const lbl = p.el.textContent.trim() || "icon";
        say(a, lbl.toLowerCase());
        const f = await frame(a, p.r, ".dicon " + lbl, 240);
        p.el.style.setProperty("--t", 360 * sp + "ms"); p.el.classList.add("rb-on"); click(a);
        unframe(f, 260);
      }, { x: p.r.x, y: p.r.y }));
      D.wins.forEach((p, k) => task("uwin" + k, async (a) => {
        say(a, "window");
        const f = await frame(a, p.r, "win", 380);
        p.el.style.setProperty("--t", 700 * sp + "ms"); p.el.classList.add("rb-on"); click(a);
        await go(a, p.r.x + 10, p.r.y + p.r.h, 700, "linear");
        unframe(f, 0);
      }, { x: p.r.x, y: p.r.y }));
    });

    // 42-45s: taskbar, start button, tray: wifi, battery, volume, clock
    at(41900, () => {
      phase("TASKBAR", "#60a5fa");
      focusPt = [vw / 2, vh - 70];
      D.bar.forEach((p) => task("bar", async (a) => {
        say(a, "taskbar");
        const f = await frame(a, p.r, "div.taskbar", 420);
        p.el.style.setProperty("--t", 480 * sp + "ms"); p.el.classList.add("rb-on"); click(a);
        await go(a, p.r.x + 6, p.r.y + p.r.h / 2, 480, "linear");
        unframe(f, 100);
      }, { pri: -3, x: 0, y: vh - 30 }));
      if (!D.bar.length) doneIds.add("bar");
      const part = (list, name, label) => list.forEach((p, k) => task(name + k, async (a) => {
        say(a, label);
        const f = await frame(a, p.r, label, 200);
        p.el.style.setProperty("--t", 300 * sp + "ms"); p.el.classList.add("rb-on"); click(a);
        unframe(f, 350);
      }, { deps: ["bar"], pri: -2, x: p.r.x, y: p.r.y }));
      part(D.start, "start", "button.start");
      part(D.quick, "quick", "quick launch");
      D.tray.forEach((p, k) => part([p], "tray" + k, (p.el.getAttribute("aria-label") || "tray").toLowerCase()));
      part(D.clock, "clock", "clock");
    });

    // outro: the swarm flies home into the start button and the live desktop takes over
    at(44000, () => {
      queue.length = 0;
      const home = D.start[0]?.r || { x: 20, y: vh - 30, w: 60, h: 30 };
      ags.forEach((a, k) => { a.home = true; at(k * 35, () => { place(a, home.x + home.w / 2, home.y + home.h / 2, 520, "cubic-bezier(.6,0,.8,.4)"); at(480, () => a.el.classList.remove("on")); }); });
      hud.classList.add("off"); fx.style.opacity = "0";
      // anything the swarm did not reach in time is simply shown
      clone.querySelectorAll(".rb-h").forEach((e) => e.classList.add("rb-on"));
    });
    at(44450, () => { flash.classList.add("go"); real.classList.remove("rb-glitch"); play("startup"); });
    at(45000, () => finish(false));

    // ---------- skip + exit ----------
    const onKey = (e) => {
      e.stopImmediatePropagation();
      if (e.key === "Escape" || e.key === " " || e.key === "Spacebar" || e.key === "Enter") { e.preventDefault(); finish(true); }
      else if (e.key === "Tab") { e.preventDefault(); skipBtn.focus(); }
    };
    addEventListener("keydown", onKey, true);
    function finish(skipped) {
      if (done) return;
      done = true;
      timers.forEach((id) => { clearTimeout(id); clearInterval(id); }); timers.clear();
      removeEventListener("keydown", onKey, true);
      opened.forEach((id) => { try { opts.close?.(id); } catch {} }); opened.clear();
      real.classList.remove("rb-glitch");
      if (skipped) real.classList.add("rb-reveal");
      ov.classList.add("rb-out");
      setTimeout(() => {
        ov.remove(); real.classList.remove("rb-reveal"); running = false;
        if (prevFocus?.isConnected) prevFocus.focus?.({ preventScroll: true });
        opts.onDone?.();
      }, skipped ? 800 : 750);
    }
  };
})();
