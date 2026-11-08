// Visual Rebuild, Mark 2: a ~50 second, purely visual rebuild of this site by a swarm of tiny agents. (Mark 1 is rebuild-mk1.js.)
// 0-2.6s    the live desktop glitches out and the title decodes
// 2.6-9s    01 BACK END: the swarm types the real source into blueprint panels (firestore.rules, api/otp.js, the Firestore
//           collections, a vercel deploy, the mailer) and wires them up across the whole screen
// 9-14.5s   02 FRONT END: the modules (index.html, app.js, sound.js, data.js, style.css, the lazy chunks) are built on top of
//           the dimmed back end, and needles start stitching threads between the two layers
// 14.5-43s  03 APPS: real app windows, two or three at a time, each outlined as a wireframe, painted top to bottom and filled in
//           piece by piece with a job for every agent; a window is minimised once its swarm is done with it
// 43-50s    04 DESKTOP: the windows fly away, the wallpaper opens from the first click, icons, taskbar and tray are placed, the
//           swarm flies home into the Start button and the live desktop takes over
// A HUD at the top keeps the phase, the swarm size and the clock, and a caption names each phase as it starts. Space or Esc skips.
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

/* blueprint boxes: the front-end modules and the small back-end pieces */
.rb-box, .rb-pn { position: absolute; box-sizing: border-box; border: 1px solid color-mix(in srgb, var(--a) 60%, #1e293b); border-radius: 6px; overflow: hidden;
  background: rgba(7,12,26,.94); font: var(--fs) var(--rb-mono); opacity: 0; transition: opacity .3s, box-shadow .6s; }
.rb-box.on, .rb-pn.on { opacity: 1; box-shadow: 0 0 0 1px rgba(0,0,0,.45), 0 12px 44px -20px var(--a); }
.rb-box.fe { background: rgba(14,20,38,.96); border-color: var(--a); }
.rb-box.fe.on { box-shadow: 0 0 0 1px rgba(0,0,0,.5), 0 18px 50px -16px rgba(0,0,0,.9), 0 0 30px -12px var(--a); }
.rb-bh { display: flex; align-items: center; gap: 8px; height: var(--hdr); padding: 0 10px; border-bottom: 1px solid #16203a; white-space: nowrap;
  clip-path: inset(0 100% 0 0); transition: clip-path .35s steps(10); }
.rb-box.hd .rb-bh, .rb-pn.hd .rb-bh { clip-path: inset(0 0 0 0); }
.rb-bh b { font-weight: 700; letter-spacing: .12em; color: #f8fafc; overflow: hidden; text-overflow: ellipsis; }
.rb-bh small { margin-left: auto; color: var(--a); font-size: .85em; letter-spacing: .06em; overflow: hidden; text-overflow: ellipsis; flex: none; }
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

/* back-end panels: real source typed in by the swarm */
.rb-pb { position: absolute; left: 0; right: 0; top: var(--hdr); bottom: 0; padding: 8px 0; font: var(--cfs) var(--rb-mono); line-height: var(--clh); color: #c9d1d9; }
.rb-cl { display: flex; height: var(--clh); white-space: pre; overflow: hidden; clip-path: inset(0 100% 0 0); transition: clip-path var(--t, .3s) steps(var(--n, 12)); }
.rb-cl.on { clip-path: inset(0 0 0 0); }
.rb-cl s { flex: none; width: 26px; padding-right: 8px; text-align: right; text-decoration: none; color: #3b4a61; }
.rb-cl code { font: inherit; overflow: hidden; }
.rb-pn.term .rb-pb { background: rgba(0,0,0,.5); }
.rb-pn.term .rb-cl { padding-left: 10px; color: #c0c0c0; }
.rb-pn.term .rb-cl.p { color: #7ee787; } .rb-pn.term .rb-cl.ok { color: #fff; font-weight: 700; }
.rb-cl b { font-weight: normal; } .rb-cl b.k { color: #ff7b72; } .rb-cl b.s { color: #a5d6ff; } .rb-cl b.c { color: #8b949e; font-style: italic; } .rb-cl b.n { color: #79c0ff; }
.rb-pn.db .rb-pb { padding: 6px 0; }
.rb-dr { display: grid; grid-template-columns: 1.3fr 1fr 44px 30px; gap: 8px; align-items: center; padding: 0 12px; border-bottom: 1px solid #142036; }
.rb-dr span { color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; } .rb-dr span::before { content: "▣ "; color: var(--a); } .rb-dr em { font-style: normal; color: #64748b; overflow: hidden; text-overflow: ellipsis; }
.rb-dr i { justify-self: start; height: 6px; width: 0; border-radius: 3px; background: var(--a); transition: width .7s cubic-bezier(.2,.8,.2,1) .15s; }
.rb-dr.on i { width: var(--w); }
.rb-dr u { text-decoration: none; text-align: right; color: #94a3b8; }

/* app windows: a wireframe first, then the real window painted top to bottom and filled in piece by piece */
.rb-app { position: absolute; left: 0; top: 0; transition: transform .85s cubic-bezier(.6,0,.35,1), opacity .75s ease; }
.rb-app .win { position: absolute !important; left: 0 !important; top: 0 !important; margin: 0 !important; max-width: none !important; max-height: none !important;
  z-index: auto !important; transform: none !important; animation: none !important; pointer-events: none; }
.rb-app .rb-wf, .rb-app .rb-wf * { background: transparent !important; color: transparent !important; box-shadow: none !important; text-shadow: none !important;
  border-color: color-mix(in srgb, var(--a) 45%, transparent) !important; caret-color: transparent !important; }
.rb-app .rb-wf { outline: 1px dashed var(--a); outline-offset: -1px; opacity: 0; transition: opacity .5s; }
.rb-app .rb-wf * { outline: 1px solid color-mix(in srgb, var(--a) 26%, transparent); outline-offset: -1px; }
.rb-app .rb-wf svg, .rb-app .rb-wf img, .rb-app .rb-wf canvas, .rb-app .rb-wf .avatar { opacity: 0 !important; }
.rb-app .rb-wf .rb-wfoff { opacity: 0 !important; transition: opacity .35s; }
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
.rb-app .rb-hide { opacity: 0; }
.rb-app .rb-tl { display: block; width: fit-content; }
.rb-app .rb-gone { display: none !important; }
.rb-app.min { opacity: 0; transition: transform .5s cubic-bezier(.6,0,.4,1), opacity .35s ease .15s; }
.rb-throw { position: absolute; width: 46px; height: 46px; border-radius: 6px; border: 2px solid #fff; background-size: cover; background-position: center;
  box-shadow: 0 8px 18px rgba(0,0,0,.45); pointer-events: none; }
.rb-app .rb-stick { position: absolute; right: 1px; bottom: 1px; width: 60%; height: 60%; border-radius: 3px; background-size: cover; background-position: center;
  box-shadow: 0 0 0 1px #fff, 0 2px 4px rgba(0,0,0,.35); pointer-events: none; }
.rb-mine { position: absolute; width: var(--s); height: var(--s); margin: calc(var(--s) / -2) 0 0 calc(var(--s) / -2); border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff 0 12%, #111 14%); box-shadow: 0 0 0 2px rgba(0,0,0,.25); animation: rbMine .2s cubic-bezier(.3,1.6,.5,1) both; }
.rb-mine::before, .rb-mine::after { content: ""; position: absolute; left: 50%; top: -22%; width: 2px; height: 144%; margin-left: -1px; background: #111; }
.rb-mine::after { transform: rotate(90deg); }
.rb-mine.bury { transform: scale(0); opacity: 0; transition: transform .25s ease-in, opacity .25s; }
@keyframes rbMine { from { transform: scale(0); } to { transform: scale(1); } }

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
.rb-fr { position: absolute; box-sizing: border-box; border: 1px solid #3b82f6;
  transition: width var(--t) cubic-bezier(.5,0,.2,1), height var(--t) cubic-bezier(.5,0,.2,1), left var(--t) cubic-bezier(.5,0,.2,1), top var(--t) cubic-bezier(.5,0,.2,1), opacity .4s; }
.rb-fr::before { content: ""; position: absolute; inset: 0; background: rgba(59,130,246,.07); }
.rb-fr i { position: absolute; width: 6px; height: 6px; background: #fff; border: 1px solid #3b82f6; box-sizing: border-box; opacity: 0; transition: opacity .2s; }
.rb-fr i:nth-child(1) { left: -3px; top: -3px; } .rb-fr i:nth-child(2) { right: -3px; top: -3px; }
.rb-fr i:nth-child(3) { left: -3px; bottom: -3px; } .rb-fr i:nth-child(4) { right: -3px; bottom: -3px; }
.rb-fr.set i { opacity: 1; }
.rb-chip { position: absolute; left: -1px; bottom: 100%; margin-bottom: 4px; background: #3b82f6; color: #fff; font: 600 10px/1 var(--rb-mono);
  padding: 3px 6px; border-radius: 3px; white-space: nowrap; opacity: 0; transition: opacity .2s; }
.rb-fr.lo .rb-chip { bottom: auto; top: 100%; margin: 4px 0 0; }
.rb-fr.rt .rb-chip { left: auto; right: -1px; }
.rb-fr.set .rb-chip { opacity: 1; }
.rb-fr.gone { opacity: 0; }
.rb-ag { position: absolute; left: 0; top: 0; opacity: 0; transition: transform .5s cubic-bezier(.45,0,.2,1), opacity .4s; }
.rb-ag.on { opacity: 1; }
.rb-ag svg { display: block; width: 16px; height: 16px; overflow: visible; transform-origin: 1.7px 1.7px; transition: transform .22s ease-out; }
.rb-ag path { fill: var(--a); stroke: #fff; stroke-width: 1.2; stroke-linejoin: round; }
.rb-ag span { position: absolute; left: 14px; top: 16px; background: var(--a); color: #020617; font: 600 9.5px/1 var(--rb-mono); padding: 3px 6px;
  border-radius: 2px 8px 8px 8px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,.45); opacity: 0; transition: opacity .25s; }
.rb-ag.tag span { opacity: 1; }
.rb-ag.click svg path { animation: rbClick .22s ease-out; }
@keyframes rbClick { 50% { opacity: .55; } }
.rb-rip { position: absolute; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%; border: 1.5px solid var(--a); box-sizing: border-box; animation: rbRip .55s ease-out both; }
@keyframes rbRip { from { transform: scale(.2); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }

/* HUD and captions */
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

  // the back end, as real source (condensed): each one is a panel the swarm opens and types into
  const PANELS = {
    rules: { title: "firestore.rules", tag: "gatekeeper", kind: "code", lines: [
      "rules_version = '2';",
      "// The site talks to Firestore straight from the browser,",
      "// so these rules are the only gatekeeper.",
      "service cloud.firestore {",
      "  match /databases/{database}/documents {",
      "    match /shared/notepad {",
      "      allow read: if true;",
      "      allow write: if request.resource.data.text.size() <= 20000;",
      "    }",
      "    match /scores/{id} {",
      "      allow create: if validScore(request.resource.data);",
      "      allow update, delete: if false;",
      "    }"] },
    otp: { title: "api/otp.js", tag: "serverless", kind: "code", lines: [
      "// POST -> emails a random 4-digit code",
      "import { mailer, send, issue, throttled } from './_mail.js';",
      "",
      "export default async function handler(req, res) {",
      "  if (req.method !== 'POST') return send(res, 405, {});",
      "  const email = str(body(req).email, 120);",
      "  if (!EMAIL.test(email)) return send(res, 400, {});",
      "  if (throttled(req, 'otp', 5, 15 * 60 * 1000))",
      "    return send(res, 429, { error: 'Slow down.' });",
      "  const { code, token } = issue(email);",
      "  await mailer().sendMail({ to: email, subject: `${code} is your code` });",
      "  return send(res, 200, { token });",
      "}"] },
    db: { title: "FIRESTORE", tag: "resume-41921", kind: "db", lines: [
      ["shared/notepad", "read · write", 1], ["tasks", "validated", 38], ["pictures", "add · delete", 12], ["scores", "add-only", 214],
      ["board", "add-only", 57], ["stats", "+1 max", 6], ["otp", "5 attempts", 19], ["limits", "hashed keys", 44]] },
    deploy: { title: "VERCEL EDGE", tag: "18 regions", kind: "term", lines: [
      "C:\\medhansh-xp> vercel deploy --prod",
      "Vercel CLI 59.11.2",
      "Deploying medhansh-xp",
      "Uploading [====================] (637.7KB/637.7KB)",
      "Running build in Washington, D.C., USA (East) - iad1",
      "Installing dependencies... up to date in 503ms",
      "Build Completed in /vercel/output [3s]",
      "Deploying outputs...",
      "Production   https://medhansh-xp.vercel.app",
      "Aliased      https://medhansh-xp.vercel.app"] },
  };
  // the small back-end pieces drawn as blueprint boxes
  const BE = {
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
  const APP_IDS = ["cmd", "paint", "projects", "msn", "calendar", "mine", "solitaire", "spider", "snake", "about"];
  const APP_SPOT = [[.3, .4], [.7, .36], [.22, .62], [.78, .62], [.56, .4], [.4, .62], [.62, .34], [.34, .46], [.66, .56], [.5, .5]];
  // which module each finished app is stitched to underneath
  const APP_LINK = { cmd: "app", paint: "app", projects: "data", msn: "otp", calendar: "db", mine: "games", solitaire: "games", spider: "games", snake: "games", about: "data" };

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
    // the marks share class names, so only the stylesheet of the one playing may be on the page
    const old = document.getElementById("rb-css"); if (old?.dataset.mark !== "2") { old?.remove(); const st = document.createElement("style"); st.id = "rb-css"; st.dataset.mark = "2"; st.textContent = CSS; document.head.appendChild(st); }

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
    // the work area, under the HUD and above the captions
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
    const TOTAL = 49000;
    let progLock = false;
    every(60, () => {
      const e = (performance.now() - t0) / sp;
      clockEl.textContent = `${String((e / 1000) | 0).padStart(2, "0")}.${String((e | 0) % 1000).padStart(3, "0")}`;
      if (!progLock) progEl.style.width = Math.min(94, (e / TOTAL) * 100) + "%";
    });
    const phase = (name, c) => { q(".rb-ph").textContent = name; if (c) ov.style.setProperty("--c", c); };
    const caption = (small, big, line) => {
      cap.classList.remove("off", "swap"); void cap.offsetWidth; cap.classList.add("swap");
      cap.querySelector("small").textContent = small; cap.querySelector("b").textContent = big; cap.querySelector("span").textContent = line;
    };
    const capOff = () => { cap.classList.remove("swap"); cap.classList.add("off"); };
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
    let pace = 1.1; // > 1 is slower: every move and draw is scaled by it, and it drops as the show speeds up
    function place(a, x, y, ms, ease) {
      if (Math.hypot(x - a.x, y - a.y) > 6) {
        const deg = (Math.atan2(y - a.y, x - a.x) * 180) / Math.PI + 135;
        a.rot += ((((deg - a.rot) % 360) + 540) % 360) - 180;
        a.svg.style.transform = `rotate(${a.rot.toFixed(1)}deg)`;
      }
      a.x = x; a.y = y;
      a.el.style.transition = ms && !rm ? `transform ${ms * sp}ms ${ease || "cubic-bezier(.45,0,.2,1)"}, opacity .4s` : "opacity .4s";
      a.el.style.transform = `translate(${x}px,${y}px)`;
    }
    const go = async (a, x, y, ms, ease) => { if (ms == null) ms = Math.min(850, 230 + Math.hypot(x - a.x, y - a.y) * 0.5) * Math.min(pace, 1.1); place(a, x, y, ms, ease); await wait(ms); };
    const say = (a, txt) => {
      if (!txt) return;
      a.tag.textContent = `${a.name} · ${txt}`;
      a.el.classList.add("tag");
      clearTimeout(a.tagT); a.tagT = setTimeout(() => a.el.classList.remove("tag"), 1500);
    };
    const ripple = (x, y, c) => { const d = document.createElement("div"); d.className = "rb-rip"; d.style.cssText = `left:${x}px;top:${y}px;--a:${c}`; fx.appendChild(d); at(600, () => d.remove()); };
    const click = (a) => { a.el.classList.remove("click"); void a.el.offsetWidth; a.el.classList.add("click"); ripple(a.x, a.y, a.color); tick(); };
    const spawn = (n, from) => {
      for (let k = 0; k < n && ags.length < AGENTS.length; k++) {
        const [name, color] = AGENTS[ags.length];
        const el = document.createElement("div");
        el.className = "rb-ag"; el.style.setProperty("--a", color);
        el.innerHTML = `<svg viewBox="0 0 14 14"><path d="M1.5 1.5 L12.5 6 L7 7.2 L5.6 12.5 Z"/></svg><span>${name}</span>`;
        agL.appendChild(el);
        const a = { name, color, el, tag: el.querySelector("span"), svg: el.querySelector("svg"), x: 0, y: 0, rot: 0 };
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
        a.cur = t.id;
        try { await t.run(a); } catch (e) { console.error("rebuild task", t.id, e); }
        a.cur = null;
        doneIds.add(t.id);
      }
    }

    // a selection box dragged out corner to corner, the way the swarm marks out every element
    const frame = async (a, r, label, ms = 450, size = true) => {
      await go(a, r.x, r.y);
      click(a);
      const f = document.createElement("div");
      f.className = "rb-fr" + (r.y < 34 ? " lo" : "") + (r.x + 200 > vw ? " rt" : "");
      f.style.cssText = `--a:${a.color};left:${r.x}px;top:${r.y}px;width:0;height:0;--t:${rm ? 0 : ms * sp}ms`;
      f.innerHTML = `<i></i><i></i><i></i><i></i><b class="rb-chip">${esc(label)}${size ? ` · ${Math.round(r.w)}×${Math.round(r.h)}` : ""}</b>`;
      fx.appendChild(f); void f.offsetWidth;
      f.style.width = r.w + "px"; f.style.height = r.h + "px";
      await go(a, r.x + r.w, r.y + r.h, ms, "cubic-bezier(.5,0,.2,1)");
      f.classList.add("set");
      return f;
    };
    const unframe = (f, delay = 200) => at(delay, () => { f.classList.add("gone"); at(500, () => f.remove()); });

    // ---------- blueprint boxes ----------
    const rects = {}, boxes = {};
    const boxH = (d) => M.hdr + 6 + (d.wave ? 30 : 0) + (d.swatch ? 20 : 0) + (d.lines?.length || 0) * M.row + 8;
    const makeBox = (layer, d, r, color, kind) => {
      const b = document.createElement("div");
      b.className = "rb-box " + (kind || "");
      b.style.cssText = `--a:${color};left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
      b.innerHTML = `<div class="rb-bh"><i></i><b>${esc(d.t)}</b><small>${esc(d.tag || "")}</small></div><div class="rb-pad"></div>` +
        (d.wave ? `<svg class="rb-wave" viewBox="0 0 200 26" preserveAspectRatio="none"><path pathLength="1" d="M0 13 ${Array.from({ length: 40 }, (_, k) => `L${(k + 1) * 5} ${(13 + Math.sin(k * 0.9) * (4 + (k % 7) * 1.4)).toFixed(1)}`).join(" ")}"/></svg>` : "") +
        (d.swatch ? `<div class="rb-sw">${d.swatch.map((c) => `<i style="background:${c}"></i>`).join("")}</div>` : "") +
        (d.lines || []).map(([k, v]) => `<div class="rb-r">${esc(k)}${v ? `<em>${esc(v)}</em>` : ""}</div>`).join("");
      layer.appendChild(b);
      return b;
    };
    // type each row: the cursor hops to the start of the line and runs along it as it appears
    const typeRows = async (a, b, r) => {
      const rows = [...b.querySelectorAll(":scope > .rb-r")], row = M.row, hdr = M.hdr, ch = M.ch;
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
        await typeRows(a, b, r);
        unframe(f); chime();
      }, { x: r.x, y: r.y });
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

    // ---------- the back end: panels with the real source, typed in by the swarm ----------
    const LH = narrow ? 14 : 17, CW = narrow ? 6 : 6.9, GUT = 26, MAXL = narrow ? 7 : 13;
    ov.style.setProperty("--clh", LH + "px"); ov.style.setProperty("--cfs", narrow ? "10px" : "11.5px");
    const shown = (p) => p.lines.slice(0, MAXL);
    let dbRow = LH;
    const rowOf = (p) => (p.kind === "db" ? dbRow : LH), padOf = (p) => (p.kind === "db" ? 6 : 8);
    const panelH = (p) => M.hdr + 2 * padOf(p) + shown(p).length * rowOf(p) + 2;
    const heightOf = (id) => (PANELS[id] ? panelH(PANELS[id]) : boxH(BE[id] || FE[id]));
    const hl = (line) => {
      const re = /(\/\/.*$)|('[^']*'|"[^"]*"|`[^`]*`)|(\b\d[\d_.]*\b)|(\b(?:import|from|export|default|async|function|return|if|const|await|allow|match|read|write|create|update|delete|service|true|false|rules_version)\b)/g;
      let out = "", i = 0, m;
      while ((m = re.exec(line))) { out += esc(line.slice(i, m.index)) + `<b class="${m[1] ? "c" : m[2] ? "s" : m[3] ? "n" : "k"}">${esc(m[0])}</b>`; i = re.lastIndex; }
      return out + esc(line.slice(i));
    };
    const makePanel = (p, r, color) => {
      const el = document.createElement("div");
      el.className = "rb-pn " + p.kind;
      el.style.cssText = `--a:${color};left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px` + (p.kind === "db" ? `;--clh:${dbRow}px` : "");
      const rows = shown(p).map((ln, k) => {
        if (p.kind === "db") return `<div class="rb-cl rb-dr"><span>${esc(ln[0])}</span><em>${esc(ln[1])}</em><i style="--w:${Math.round(14 + Math.log10(ln[2] + 1) * 34)}%"></i><u>${ln[2]}</u></div>`;
        if (p.kind === "term") return `<div class="rb-cl${k === 0 ? " p" : /^(Production|Aliased)/.test(ln) ? " ok" : ""}"><code>${esc(ln)}</code></div>`;
        return `<div class="rb-cl"><s>${k + 1}</s><code>${hl(ln)}</code></div>`;
      }).join("");
      el.innerHTML = `<div class="rb-bh"><i></i><b>${esc(p.title)}</b><small>${esc(p.tag || "")}</small></div><div class="rb-pb">${rows}</div>`;
      beL.appendChild(el);
      return el;
    };
    // one agent opens the panel; then whoever is free piles in and types a line, so several lines type at once
    const buildPanel = (id) => {
      const p = PANELS[id], r = rects[id], rh = rowOf(p), pad = padOf(p);
      task(id, async (a) => {
        say(a, p.title.toLowerCase());
        const f = await frame(a, r, "section#" + id, 420 * pace);
        const el = boxes[id] = makePanel(p, r, a.color);
        void el.offsetWidth; el.classList.add("on"); click(a);
        await go(a, r.x + 10, r.y + M.hdr / 2, 140);
        el.classList.add("hd");
        await go(a, r.x + Math.min(r.w - 12, 30 + p.title.length * M.ch), r.y + M.hdr / 2, 260 * pace, "linear");
        unframe(f, 250); chime();
      }, { pri: -1, x: r.x, y: r.y });
      // the lines are split between two or three agents, each typing every second or third line down the panel
      const lines = shown(p), CH = Math.min(lines.length, p.kind === "db" ? 2 : 3);
      for (let c = 0; c < CH; c++) task(id + ":c" + c, async (a) => {
        say(a, p.kind === "db" ? "collections" : p.title.toLowerCase());
        for (let k = c, first = true; k < lines.length; k += CH, first = false) {
          const ln = lines[k], row = boxes[id].querySelectorAll(".rb-cl")[k];
          const text = Array.isArray(ln) ? ln.slice(0, 2).join("    ") : ln, n = text.trimEnd().length, indent = text.length - text.trimStart().length;
          if (!n) { row.classList.add("on"); continue; }
          const y = r.y + M.hdr + pad + k * rh + rh / 2, x0 = r.x + (p.kind === "code" ? GUT + 4 : p.kind === "db" ? 12 : 10) + indent * CW;
          if (p.kind === "db") say(a, ln[0]);
          await go(a, x0, y, first ? undefined : 150 * pace);
          const t = clamp((n - indent) * 9, 140, 380) * pace;
          row.style.setProperty("--t", t * sp + "ms"); row.style.setProperty("--n", Math.min(n, 48));
          row.classList.add("on");
          if (k % 3 === 0) click(a);
          await go(a, Math.min(r.x + r.w - 12, x0 + (n - indent) * CW), y, t, "linear");
        }
      }, { deps: [id], x: r.x, y: r.y + M.hdr + c * rh });
    };

    // ---------- layouts ----------
    const layoutColumns = (cols, gapX, gapY, maxW) => {
      const n = cols.length, colW = Math.min(maxW, (R.w - (n - 1) * gapX) / n), x0 = R.x + (R.w - n * colW - (n - 1) * gapX) / 2;
      cols.forEach((ids, c) => {
        const hs = ids.map(heightOf);
        const tot = hs.reduce((s, v) => s + v, 0) + gapY * (ids.length - 1);
        let y = R.y + Math.max(0, (R.h - tot) / 2);
        ids.forEach((id, k) => { rects[id] = { x: x0 + c * (colW + gapX), y, w: colW, h: hs[k] }; y += hs[k] + gapY; });
      });
    };
    if (narrow) layoutColumns([["deploy", "rules"], ["otp", "mail", "db"]], 12, 26, 400);
    else {
      dbRow = clamp(Math.floor((R.h * 0.62 - M.hdr - 14) / PANELS.db.lines.length), LH, 40);
      layoutColumns([["deploy"], ["otp", "mail"], ["rules"], ["db"]], clamp(R.w * 0.05, 36, 90), 46, 360);
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
    const SEAMS = [["index", "deploy"], ["app", "rules"], ["app", "otp"], ["games", "db"], ["data", "deploy"], ["app", "db"], ["extras", "deploy"], ["style", "index"], ["sound", "app"], ["app", "mail"], ["index", "otp"], ["games", "rules"]];
    let seamPool = []; const appRects = {};
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

    // ---------- real apps: opened hidden behind the overlay, copied twice (wireframe and real), closed again ----------
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
        // inside the overlay it would inherit the overlay's light text: give it the page's own text styles back
        ["color", "font", "lineHeight", "letterSpacing", "textAlign"].forEach((key) => (c.style[key] = bs[key]));
        return c;
      };
      const rl = make(), wf = make();
      // every element of the real copy knows its outline in the wireframe, so the outline can go as the piece is built
      const A = [rl, ...rl.querySelectorAll("*")], B = [wf, ...wf.querySelectorAll("*")];
      rl.__pairs = new Map(A.map((e, i) => [e, B[i]]));
      const src = el.querySelectorAll("canvas");
      rl.querySelectorAll("canvas").forEach((c, i) => { try { c.getContext("2d")?.drawImage(src[i], 0, 0); } catch {} });
      const title = el.querySelector(".ttl")?.textContent || id;
      try { opts.close?.(id); } catch {}
      opened.delete(id);
      skipBtn.focus({ preventScroll: true });
      return w > 20 && h > 20 ? { id, w, h, tb, rl, wf, title } : null;
    };
    const prepAll = async () => { for (const id of APP_IDS) apps.push(await prepApp(id)); };
    // a piece shows in the real window and its outline leaves the wireframe
    const reveal = (e) => {
      e.classList.remove("rb-hide");
      const m = e.closest(".rb-rl")?.__pairs, w = m?.get(e) || m?.get(e.parentElement);
      w?.classList.add("rb-wfoff");
    };

    // the pieces of a window the swarm builds one by one: text gets typed, everything else is dragged into place.
    // A long run of identical siblings (card stacks, minesweeper cells) is placed as one block.
    const PART_SEL = "button, input, textarea, select, img, canvas, svg, h1, h2, h3, h4, p, pre, li, a, label, td, [class*='card'], [class*='icon'], [class*='folder'], [class*='item'], [class*='btn'], [class*='tool']";
    const isText = (e) => !e.children.length && e.textContent.trim().length > 2 && !/^(button|input|textarea|select|img|canvas|svg)$/i.test(e.tagName);
    const pickParts = (rl, w, h) => {
      const box = rl.getBoundingClientRect(), tb = rl.querySelector(".titlebar");
      // multi-line text blocks (the command prompt's output) are typed one line at a time
      rl.querySelectorAll("div, pre").forEach((e) => {
        if (e.children.length || tb?.contains(e)) return;
        const lines = e.textContent.split("\n");
        if (lines.length < 3) return;
        e.textContent = "";
        lines.forEach((l) => { const sp = document.createElement("span"); sp.className = "rb-tl"; sp.textContent = l || " "; e.appendChild(sp); });
      });
      const ok = (r) => r.width >= 8 && r.height >= 8 && r.width <= w * 0.7 && r.height <= h * 0.6 && r.top >= box.top + 24 && r.top <= box.bottom - 6 && r.left <= box.right - 6 && r.right >= box.left + 6;
      let c = [...rl.querySelectorAll(PART_SEL + ", .rb-tl")].filter((e) => !tb?.contains(e) && !e.closest("svg *") && !(e.classList.contains("rb-tl") && !e.textContent.trim())
        && !e.closest(SPECIAL_OWN) && !e.querySelector(SPECIAL_OWN));
      // a long run of identical siblings is placed as one block, if that block is a sensible size
      c = c.map((e) => { const par = e.parentElement; return par && par !== rl && par.children.length > 12 && ok(par.getBoundingClientRect()) ? par : e; });
      // containers too big to move as one give way to the pieces inside them
      let o = [...new Set(c)].map((e) => ({ e, r: e.getBoundingClientRect() })).filter((p) => ok(p.r));
      o = o.filter((p) => !o.some((q) => q !== p && q.e.contains(p.e)));
      const max = 24, step = Math.max(1, o.length / max);
      return Array.from({ length: Math.min(max, o.length) }, (_, n) => o[Math.floor(n * step)]);
    };
    // one piece of a window: text gets typed, a text box is outlined first, an image is pulled out to size from its corner,
    // anything else is picked up nearby and dragged into place
    const buildPiece = async (b, e, k, win) => {
      const pr = e.getBoundingClientRect(), cx = pr.left + pr.width / 2, cy = pr.top + pr.height / 2;
      if (isText(e)) return typeEl(b, e, k, win.x + win.w - 8);
      if (e.matches("input, textarea, select")) {
        say(b, "text box");
        const fr = await frame(b, { x: pr.left, y: pr.top, w: pr.width, h: pr.height }, e.tagName.toLowerCase(), 240 * k);
        reveal(e);
        e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 * sp });
        return unframe(fr, 120);
      }
      if (pr.width >= 28 && pr.height >= 28 && (e.matches("img, canvas, .avatar") || /photo|avatar|pic|img/i.test(e.className))) {
        say(b, "resize");
        await go(b, pr.left + pr.width * 0.3, pr.top + pr.height * 0.3); click(b);
        reveal(e);
        const t = 420 * k;
        e.style.transformOrigin = "0 0";
        e.animate([{ scale: "0.3", opacity: 0.4 }, { scale: "1", opacity: 1 }], { duration: t * sp, easing: "cubic-bezier(.3,.7,.3,1)", fill: "backwards" });
        const fr = document.createElement("div");
        fr.className = "rb-fr set" + (pr.top < 34 ? " lo" : "");
        fr.style.cssText = `left:${pr.left}px;top:${pr.top}px;width:${pr.width * 0.3}px;height:${pr.height * 0.3}px;--t:${t * sp}ms`;
        fr.innerHTML = `<i></i><i></i><i></i><i></i><b class="rb-chip">resize · ${Math.round(pr.width)}×${Math.round(pr.height)}</b>`;
        fx.appendChild(fr); void fr.offsetWidth; fr.style.width = pr.width + "px"; fr.style.height = pr.height + "px";
        await go(b, pr.right, pr.bottom, t, "cubic-bezier(.3,.7,.3,1)");
        return unframe(fr, 150);
      }
      const ox = clamp(rand(-150, 150), win.x + 12 - cx, win.x + win.w - 12 - cx), oy = clamp(rand(-110, 110), win.y + win.tb + 12 - cy, win.y + win.h - 12 - cy), t = 340 * k;
      say(b, "place");
      await go(b, cx + ox, cy + oy); click(b);
      reveal(e);
      e.animate([{ translate: `${ox}px ${oy}px`, scale: "0.6", opacity: 0 }, { opacity: 1, offset: 0.25 }, { translate: "0px 0px", scale: "1", opacity: 1 }],
        { duration: t * sp, easing: "cubic-bezier(.2,.75,.25,1.15)", fill: "backwards" });
      await go(b, cx, cy, t, "cubic-bezier(.2,.75,.25,1.15)");
    };
    // typed in, the cursor running along the line
    const typeEl = async (b, e, k, xMax) => {
      const r = e.getBoundingClientRect(), cy = r.top + r.height / 2, n = Math.min(40, e.textContent.trim().length), t = clamp(n * 12, 150, 420) * k;
      say(b, "type");
      await go(b, r.left, cy);
      reveal(e);
      e.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: t * sp, easing: `steps(${Math.max(4, n)})`, fill: "backwards" });
      await go(b, Math.min(r.right, xMax), cy, t, "linear");
    };
    const mid = (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r]; };
    const flyIn = (e, dx, dy, t, delay = 0) => e.animate([{ translate: `${dx}px ${dy}px`, scale: "0.85", opacity: 0 }, { opacity: 1, offset: 0.15 }, { translate: "0px 0px", scale: "1", opacity: 1 }],
      { duration: t * sp, delay: delay * sp, easing: "cubic-bezier(.3,.7,.3,1)", fill: "backwards" });
    // the bits each app builds its own way, so the agents look like they are using the apps
    const SPECIAL_OWN = ".card, .mine-grid, .cal.big, .paint-area canvas, .cmd .line input, .msn-bar textarea";
    const SPECIAL = {
      // cards: the deck goes down first, then several agents deal from it at once
      solitaire: (rl, base, k) => deal(rl, base, k),
      spider: (rl, base, k) => deal(rl, base, k),
      // minesweeper: the grid is drawn row by row
      mine(rl, base, k) {
        const g = rl.querySelector(".mine-grid"); if (!g?.children.length) return;
        const rowIds = drawRows(g, base, k, "grid");
        const cells = [...g.children];
        const picks = cells.map((c) => [Math.random(), c]).sort((p, q) => p[0] - q[0]).slice(0, 10).map((p) => p[1]);
        [0, 1, 2].forEach((n) => task(`${base}:mines${n}`, async (a) => {
          say(a, "mines");
          for (const c of picks.filter((_, j) => j % 3 === n)) {
            const [cx, cy, cr] = mid(c);
            await go(a, cx, cy, 200 * k); click(a);
            const m = document.createElement("div");
            m.className = "rb-mine";
            m.style.cssText = `left:${cx}px;top:${cy}px;--s:${Math.max(8, cr.width * 0.55)}px`;
            fx.appendChild(m);
            at(650 * k, () => { m.classList.add("bury"); at(260, () => m.remove()); });
            await wait(120 * k);
          }
        }, { deps: rowIds, pri: -1, x: g.getBoundingClientRect().left, y: g.getBoundingClientRect().top }));
        return rowIds;
      },
      // paint: three agents draw on the canvas at once
      paint(rl, base, k) {
        const cv = rl.querySelector(".paint-area canvas"), area = rl.querySelector(".paint-area"); if (!cv || !area) return;
        const tools = [...rl.querySelectorAll(".pt-grid button")], swatches = [...rl.querySelectorAll(".palette i[data-c]")], fgc = rl.querySelector(".swatch .fgc");
        const r = cv.getBoundingClientRect(), ar = area.getBoundingClientRect(), W = Math.min(r.width, ar.width) - 10, H = Math.min(r.height, ar.height) - 10;
        const ctx = cv.getContext("2d"), sx = cv.width / r.width, sy = cv.height / r.height;
        const line = (pts, n = 6) => [pts[0], ...pts.slice(1).flatMap((q, i) => Array.from({ length: n }, (_, j) => [pts[i][0] + ((q[0] - pts[i][0]) * (j + 1)) / n, pts[i][1] + ((q[1] - pts[i][1]) * (j + 1)) / n]))];
        const ring = (cx, cy, rx, ry = rx, n = 24) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry]);
        const R0 = Math.min(W, H) * 0.1, sun = [W * 0.16, H * 0.24];
        // [colour from the palette, tool, strokes]: each one is one agent's drawing
        const ART = [
          ["#ff8040", "brush", [ring(sun[0], sun[1], R0)]],
          ["#ff8040", "pencil", Array.from({ length: 8 }, (_, i) => { const t = (i / 8) * Math.PI * 2; return line([[sun[0] + Math.cos(t) * R0 * 1.35, sun[1] + Math.sin(t) * R0 * 1.35], [sun[0] + Math.cos(t) * R0 * 1.85, sun[1] + Math.sin(t) * R0 * 1.85]], 2); })],
          ["#0080ff", "pencil", [Array.from({ length: 22 }, (_, i) => [W * (0.3 + 0.18 * (i / 21)), H * 0.2 - Math.abs(Math.sin((i / 21) * Math.PI * 3)) * R0 * 0.7])]],
          ["#0000ff", "pencil", [line([[W * 0.42, H * 0.82], [W * 0.42, H * 0.52], [W * 0.66, H * 0.52], [W * 0.66, H * 0.82], [W * 0.42, H * 0.82]])]],
          ["#800000", "brush", [line([[W * 0.39, H * 0.53], [W * 0.54, H * 0.34], [W * 0.69, H * 0.53]])]],
          ["#804000", "pencil", [line([[W * 0.51, H * 0.82], [W * 0.51, H * 0.66], [W * 0.57, H * 0.66], [W * 0.57, H * 0.82]], 4)]],
          ["#0080ff", "pencil", [line([[W * 0.45, H * 0.58], [W * 0.49, H * 0.58], [W * 0.49, H * 0.64], [W * 0.45, H * 0.64], [W * 0.45, H * 0.58]], 3)]],
          ["#804000", "brush", [line([[W * 0.82, H * 0.86], [W * 0.82, H * 0.6]], 5)]],
          ["#008000", "brush", [ring(W * 0.82, H * 0.5, R0 * 0.9, R0 * 0.8)]],
          ["#008000", "brush", [Array.from({ length: 30 }, (_, i) => [W * 0.04 + (W * 0.92 * i) / 29, H * 0.93 + Math.sin(i * 1.3) * 4])]],
          ["#ff0000", "pencil", [line([[W * 0.88, H * 0.1], [W * 0.88, H * 0.3]], 4), line([[W * 0.88, H * 0.22], [W * 0.9, H * 0.19], [W * 0.92, H * 0.22], [W * 0.92, H * 0.3]], 3), line([[W * 0.955, H * 0.21], [W * 0.955, H * 0.3]], 3), [[W * 0.955, H * 0.15], [W * 0.957, H * 0.155]]]],
        ];
        return ART.map(([color, tool, strokes], n) => { const id = `${base}:draw${n}`; task(id, async (a) => {
          // pick the tool, then the colour, then draw
          const tb = tools.find((bt) => bt.dataset.t === tool);
          if (tb) { say(a, tool); const [tx, ty] = mid(tb); await go(a, tx, ty); click(a); tools.forEach((bt) => bt.setAttribute("aria-pressed", bt === tb ? "true" : "false")); }
          const sw = swatches.find((q) => q.dataset.c === color);
          if (sw) { say(a, "colour"); const [qx, qy] = mid(sw); await go(a, qx, qy); click(a); if (fgc) fgc.style.background = color; }
          say(a, "draw");
          ctx.strokeStyle = color; ctx.lineWidth = (tool === "brush" ? 6 : 3) * sx; ctx.lineCap = ctx.lineJoin = "round";
          for (const st of strokes) {
            const P = st.map(([px, py]) => [r.left + 5 + px, r.top + 5 + py]);
            await go(a, P[0][0], P[0][1]); click(a);
            for (let i = 1; i < P.length; i++) {
              await go(a, P[i][0], P[i][1], 30 * k, "linear");
              ctx.beginPath(); ctx.moveTo((P[i - 1][0] - r.left) * sx, (P[i - 1][1] - r.top) * sy); ctx.lineTo((P[i][0] - r.left) * sx, (P[i][1] - r.top) * sy); ctx.stroke();
            }
          }
        }, { deps: [base + ":b"], pri: -1, x: r.left + W * ((n % 4) / 4), y: r.top + H / 2 }); return id; });
      },
      // calendar: the month is drawn row by row while two agents throw photos up from the bottom of the screen onto the days
      calendar(rl, base, k, partIds) {
        const g = rl.querySelector(".cal.big"); if (!g?.children.length) return;
        const rowIds = drawRows(g, base, k, "calendar"), ids = [...rowIds];
        const days = [...g.querySelectorAll("button[data-d]")].map((d) => [Math.random(), d]).sort((p, q) => p[0] - q[0]).slice(0, 6).map((p) => p[1]);
        const PICS = ["url(photo.jpg)", "linear-gradient(160deg,#ffb347,#ff5f6d)", "linear-gradient(160deg,#4facfe,#00f2fe)", "url(photo.jpg)", "linear-gradient(160deg,#43e97b,#38f9d7)", "linear-gradient(160deg,#a18cd1,#fbc2eb)"];
        [0, 1].forEach((n) => { const id = `${base}:throw${n}`; ids.push(id); task(id, async (a) => {
          say(a, "photos");
          for (const [j, d] of days.entries()) {
            if (j % 2 !== n) continue;
            const [dx, dy, dr] = mid(d), sx = clamp(dx + rand(-220, 220), 30, vw - 30), sy = vh - 26, pic = PICS[j];
            await go(a, sx, sy, 320 * k); click(a);
            const im = document.createElement("div");
            im.className = "rb-throw";
            im.style.cssText = `left:${sx}px;top:${sy}px;background-image:${pic}`;
            fx.appendChild(im);
            const tx = dx - sx, ty = dy - sy, t = 640 * k;
            im.animate([{ transform: "translate(-50%,-50%) rotate(0deg) scale(1)" },
              { transform: `translate(calc(-50% + ${tx * 0.5}px), calc(-50% + ${ty * 0.5 - 130}px)) rotate(200deg) scale(1.15)`, offset: 0.5 },
              { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(360deg) scale(${((dr.width * 0.6) / 46).toFixed(2)})` }],
              { duration: t * sp, easing: "cubic-bezier(.3,0,.6,1)", fill: "forwards" });
            at(t, () => {
              im.remove();
              const st = document.createElement("i");
              st.className = "rb-stick"; st.style.backgroundImage = pic;
              d.appendChild(st);
              st.animate([{ scale: "1.4" }, { scale: "1" }], { duration: 200 * sp, easing: "cubic-bezier(.3,1.5,.5,1)" });
              tick();
            });
            await wait(220 * k);
          }
        }, { deps: rowIds, pri: -1, x: vw / 2, y: vh - 30 }); });
        // and someone adds a task and ticks it off
        const ct = rl.querySelector(".cal-add .ctext"), list = rl.querySelector(".task-list");
        if (ct && list) { const id = `${base}:task`; ids.push(id); task(id, async (a) => {
          const [, cy, cr] = mid(ct), txt = "ship the visual rebuild";
          say(a, "add task");
          await go(a, cr.left + 6, cy); click(a);
          for (let n = 2; n <= txt.length; n += 2) { ct.value = txt.slice(0, n); if (n % 6 === 0) tick(); await go(a, cr.left + 6 + Math.min(cr.width - 16, n * 6.2), cy, 55 * k, "linear"); }
          ct.value = txt; await wait(160); ct.value = "";
          const li = document.createElement("li");
          li.innerHTML = `<input type="checkbox" class="tdone" tabindex="-1"><span class="ttext">${esc(txt)}</span>`;
          list.prepend(li);
          li.animate([{ opacity: 0, translate: "0 -6px" }, { opacity: 1, translate: "0 0" }], { duration: 240 * sp });
          const cb = li.querySelector("input"), [bx, by] = mid(cb);
          say(a, "done");
          await go(a, bx, by, 300 * k); click(a);
          cb.checked = true; li.classList.add("done");
        }, { deps: [base + ":b", ...partIds], pri: -1, x: ct.getBoundingClientRect().left, y: ct.getBoundingClientRect().top }); }
        return ids;
      },
      // command prompt: three commands typed in, and the swarm types each answer
      cmd(rl, base, k, partIds) {
        const inp = rl.querySelector(".cmd .line input"), out = rl.querySelector(".cmd .out"); if (!inp || !out) return;
        const promptTxt = rl.querySelector(".cmd .prompt")?.textContent || ">", d = new Date(), p2 = (v) => String(v).padStart(2, "0");
        const RUNS = [
          ["help", ["Available commands:", "  ABOUT     - Displays biography", "  PROJECTS  - Lists showcase projects", "  GAMES     - Lists the games you can play"]],
          ["whoami", ["mk-pc\\medhansh   (Medhansh Khattar, AI/ML engineer)"]],
          ["date", [`The current date is: ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]} ${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${d.getFullYear()}`]],
        ];
        const mk = (text) => { const e = document.createElement("span"); e.className = "rb-tl rb-hide rb-gone"; e.textContent = text; out.appendChild(e); return e; };
        let prev = [base + ":b", ...partIds];
        const all = [];
        RUNS.forEach(([cmdText, lines], c) => {
          const echo = mk(promptTxt + cmdText), outs = lines.map(mk), gap = mk(" "), id = `${base}:cmd${c}`;
          task(id, async (a) => {
            const [, iy, ir] = mid(inp);
            say(a, cmdText);
            await go(a, ir.left + 4, iy); click(a);
            for (let n = 1; n <= cmdText.length; n++) { inp.value = cmdText.slice(0, n); tick(); await go(a, ir.left + 4 + n * 8, iy, 80 * k, "linear"); }
            await wait(150);
            inp.value = "";
            echo.classList.remove("rb-gone", "rb-hide"); gap.classList.remove("rb-gone", "rb-hide");
            outs.forEach((e) => e.classList.remove("rb-gone"));
          }, { deps: prev, pri: -1, x: inp.getBoundingClientRect().left, y: inp.getBoundingClientRect().top });
          const ids = outs.map((e, n) => { const oid = `${id}:o${n}`; task(oid, (b) => typeEl(b, e, k, Infinity), { deps: [id], pri: -1, x: inp.getBoundingClientRect().left, y: inp.getBoundingClientRect().top + n * 14 }); return oid; });
          all.push(id, ...ids);
          prev = ids.length ? ids : [id];
        });
        return all;
      },
      // msn: two messages back and forth, then a nudge that shakes the window
      msn(rl, base, k, partIds) {
        const ta = rl.querySelector(".msn-bar textarea"), log = rl.querySelector(".msn-log"), send = rl.querySelector(".msn-bar .send"), nudge = rl.querySelector(".msn-bar .nudge");
        if (!ta || !log) return;
        const say2 = (who, text, cls) => {
          const el = document.createElement("p"); el.innerHTML = `<b>${esc(who)} says:</b><br><span class="${cls}">${esc(text)}</span>`; log.appendChild(el); log.scrollTop = log.scrollHeight;
          el.animate([{ opacity: 0, translate: "0 6px" }, { opacity: 1, translate: "0 0" }], { duration: 260 * sp });
        };
        const typeMsg = async (a, msg) => {
          const [, , tr] = mid(ta);
          say(a, "typing");
          await go(a, tr.left + 8, tr.top + 12); click(a);
          for (let n = 2; n <= msg.length; n += 2) { ta.value = msg.slice(0, n); if (n % 6 === 0) tick(); await go(a, tr.left + 8 + Math.min(tr.width - 24, n * 6), tr.top + 12, 50 * k, "linear"); }
          ta.value = msg;
          if (send) { const [bx, by] = mid(send); say(a, "send"); await go(a, bx, by, 220 * k); click(a); }
          ta.value = ""; say2("You", msg, "");
        };
        const id = `${base}:chat`;
        task(id, async (a) => {
          await typeMsg(a, "hey! who built this site?");
          await wait(450 * k); say2("Medhansh", "a swarm of tiny agents. they're still at it.", "them");
          await wait(300 * k);
          await typeMsg(a, "can they build mine too?");
          await wait(450 * k); say2("Medhansh", "sure, give them forty seconds.", "them");
          if (nudge) {
            const [nx, ny] = mid(nudge);
            say(a, "nudge"); await go(a, nx, ny, 240 * k); click(a);
            say2("You", "*sent a nudge*", "");
            rl.parentElement.animate([{ translate: "0 0" }, { translate: "-10px 2px" }, { translate: "9px -2px" }, { translate: "-7px 1px" }, { translate: "6px -1px" }, { translate: "-3px 0" }, { translate: "0 0" }], { duration: 480 * sp });
            blip(160, 0.3, "square", 0.06, 90);
          }
        }, { deps: [base + ":b", ...partIds], pri: -1, x: ta.getBoundingClientRect().left, y: ta.getBoundingClientRect().top });
        return [id];
      },
      // about me: once the top is built, the page is scrolled a screen at a time and each new section is built as it comes into view
      about(rl, base, k, partIds, win) {
        const sc = [...rl.querySelectorAll("*")].find((e) => e.scrollHeight > e.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
        if (!sc) return;
        const box = sc.getBoundingClientRect();
        const below = [...sc.querySelectorAll(PART_SEL)].filter((e) => !e.closest(SPECIAL_OWN)).map((e) => ({ e, r: e.getBoundingClientRect() }))
          .filter((q) => q.r.width >= 8 && q.r.height >= 8 && q.r.height <= box.height * 0.8 && q.r.top >= box.bottom - 6);
        const items = below.filter((q) => !below.some((o) => o !== q && o.e.contains(q.e))).map((q) => q.e);
        items.forEach((e) => e.classList.add("rb-hide"));
        const thumb = (st) => box.top + 18 + (st / Math.max(1, sc.scrollHeight - sc.clientHeight)) * (box.height - 50);
        const scrollTo = async (a, to) => {
          const from = sc.scrollTop, steps = 14, t = 600 * k;
          await go(a, box.right - 7, thumb(from)); click(a);
          for (let s2 = 1; s2 <= steps; s2++) { sc.scrollTop = from + ((to - from) * s2) / steps; await go(a, box.right - 7, thumb(sc.scrollTop), t / steps, "linear"); }
        };
        const page = (n, deps) => task(`${base}:page${n}`, async (a) => {
          const max = sc.scrollHeight - sc.clientHeight, to = Math.min(max, sc.scrollTop + sc.clientHeight * 0.8);
          const done = to <= sc.scrollTop + 4 || n > 1;
          if (done) {
            // back to the top; anything still unbuilt simply shows
            say(a, "scroll"); await scrollTo(a, 0);
            items.forEach(reveal);
            return;
          }
          say(a, "scroll");
          await scrollTo(a, to);
          const vis = sc.getBoundingClientRect();
          const now = items.filter((e) => e.classList.contains("rb-hide")).filter((e) => { const q = e.getBoundingClientRect(); return q.bottom > vis.top + 4 && q.top < vis.bottom - 4; });
          const ids = now.slice(0, 14).map((e, j) => { const id = `${base}:pg${n}:${j}`; const q = e.getBoundingClientRect(); task(id, (b) => buildPiece(b, e, k, win), { pri: -1, x: q.left, y: q.top }); return id; });
          page(n + 1, ids);
        }, { deps, pri: -1, x: box.right, y: box.top });
        page(0, [base + ":b", ...partIds]);
        return [`${base}:page0`];
      },
    };
    function drawRows(g, base, k, label) {
      const rows = new Map();
      [...g.children].forEach((c) => { c.classList.add("rb-hide"); const t = Math.round(c.getBoundingClientRect().top); rows.has(t) || rows.set(t, []); rows.get(t).push(c); });
      return [...rows.values()].map((row, n) => {
        const [x0, y0] = mid(row[0]), [x1] = mid(row.at(-1)), id = `${base}:row${n}`;
        task(id, async (a) => {
          say(a, label);
          const t = (120 + row.length * 30) * k;
          await go(a, x0 - 10, y0);
          row.forEach((c, m) => { reveal(c); c.animate([{ scale: "0.2", opacity: 0 }, { scale: "1", opacity: 1 }], { duration: 170 * sp, delay: ((m * t) / row.length) * sp, easing: "cubic-bezier(.3,1.4,.5,1)", fill: "backwards" }); });
          await go(a, x1 + 10, y0, t, "linear");
        }, { deps: [base + ":b"], pri: -1, x: x0, y: y0 });
        return id;
      });
    }
    function deal(rl, base, k) {
      const cards = [...rl.querySelectorAll(".card")].filter((c) => !c.closest(".deck-grid"));
      if (!cards.length) return;
      cards.forEach((c) => c.classList.add("rb-hide"));
      const stock = cards.filter((c) => c.dataset.pile === "s"), rest = cards.filter((c) => c.dataset.pile !== "s");
      const [ox, oy] = mid(stock[0] || cards[0]);
      const ids = [base + ":deck"];
      task(base + ":deck", async (a) => {
        say(a, "shuffle");
        await go(a, ox, oy); click(a);
        stock.forEach((c, n) => { reveal(c); flyIn(c, rand(-40, 40), -60, 280 * k, n * 40); });
        await wait(320 * k);
      }, { deps: [base + ":b"], pri: -1, x: ox, y: oy });
      const per = Math.max(3, Math.ceil(rest.length / 10));
      for (let b = 0; b * per < rest.length; b++) {
        const group = rest.slice(b * per, b * per + per), id = `${base}:deal${b}`;
        ids.push(id);
        task(id, async (a) => {
          say(a, "deal");
          for (const c of group) {
            await go(a, ox, oy, 150 * k);
            const [cx, cy] = mid(c);
            reveal(c); flyIn(c, ox - cx, oy - cy, 230 * k);
            await go(a, cx, cy, 230 * k, "cubic-bezier(.3,.7,.3,1)");
          }
          tick();
        }, { deps: [base + ":deck"], pri: -1, x: ox, y: oy });
      }
      return ids;
    }
    // a finished window shrinks down into the taskbar, the way XP minimises, so only two or three are ever on screen
    const minimize = (i) => {
      const app = apps[i], wrap = app?.wrap; if (!wrap?.isConnected) return;
      const base = "app:" + app.id;
      for (let n = queue.length - 1; n >= 0; n--) if (queue[n].id === base || queue[n].id.startsWith(base + ":")) queue.splice(n, 1);
      wrap.querySelectorAll(".rb-hide").forEach((e) => e.classList.remove("rb-hide"));
      if (wrap.f) unframe(wrap.f, 0);
      delete appRects[app.id];
      seamPool = seamPool.filter(([id]) => id !== app.id);
      wrap.style.transformOrigin = "0 0";
      wrap.classList.add("min");
      wrap.style.transform = `translate(${60 + (i % 6) * 110}px, ${vh - 22}px) scale(0.05)`;
      blip(520, 0.12, "sine", 0.05, 260);
      at(560, () => wrap.remove());
    };
    const buildApp = (app, i) => {
      const [fx0, fy0] = APP_SPOT[i % APP_SPOT.length];
      const top = narrow ? 50 : 58, bottom = vh - 34, w = app.w, h = app.h;
      const x = clamp(vw * fx0 - w / 2, 8, Math.max(8, vw - w - 8)), y = clamp(top + (bottom - top) * fy0 - h / 2, top, Math.max(top, bottom - h));
      const r = { x, y, w, h };
      const wrap = document.createElement("div");
      wrap.className = "rb-app";
      wrap.style.cssText = `width:${w}px;height:${h}px;transform:translate(${x}px,${y}px);--tb:${app.tb}px`;
      app.rl.classList.add("rb-rl"); app.wf.classList.add("rb-wf");
      wrap.append(app.rl, app.wf);
      app.wrap = wrap;
      wrap.insertAdjacentHTML("beforeend", `<div class="rb-scan"></div>`);
      const k = clamp(1 - i * 0.04, 0.68, 1); // later apps build faster: the crescendo
      const base = "app:" + app.id;
      task(base, async (a) => {
        say(a, app.id);
        wrap.style.setProperty("--a", a.color);
        appsL.appendChild(wrap);
        focusPt = [x + w / 2, y + h / 2];
        thud();
        const parts = pickParts(app.rl, w, h);
        const win = { x, y, w, h, tb: app.tb };
        const partIds = parts.map((_, j) => `${base}:p${j}`);
        parts.forEach(({ e, r: pr }, j) => {
          e.classList.add("rb-hide");
          task(partIds[j], (b) => buildPiece(b, e, k, win), { deps: [base + ":b"], pri: -1, x: pr.left + pr.width / 2, y: pr.top + pr.height / 2 });
        });
        const ownIds = SPECIAL[app.id]?.(app.rl, base, k, partIds, win) || [];
        const NAMES = { min: "minimize", max: "maximize", close: "close", fs: "full screen" };
        const tbIds = [...app.rl.querySelectorAll(".titlebar .tbtn")].map((bt, n) => {
          bt.classList.add("rb-hide");
          const [bx, by, br] = mid(bt), id = `${base}:tb${n}`;
          task(id, async (b) => {
            say(b, NAMES[bt.dataset.a] || "button");
            const fr = await frame(b, { x: br.left, y: br.top, w: br.width, h: br.height }, NAMES[bt.dataset.a] || "button", 200 * k, false);
            reveal(bt);
            bt.animate([{ scale: "0.3", opacity: 0 }, { scale: "1", opacity: 1 }], { duration: 220 * sp, easing: "cubic-bezier(.3,1.5,.5,1)" });
            click(b); unframe(fr, 80);
          }, { deps: [base + ":t"], pri: -1, x: bx, y: by });
          return id;
        });
        // the window is done once every piece is in: the wireframe goes, and the window joins the stitching
        task(base + ":d", async () => {
          wrap.classList.add("done"); if (wrap.f) unframe(wrap.f, 0);
          appRects[app.id] = r;
          seamPool.push([app.id, APP_LINK[app.id] || "app"]);
          if (!rm) stitch(inside(r), ptOf(APP_LINK[app.id] || "app"), pick(THREADS), 1000);
          chime();
        }, { deps: [base + ":b", ...partIds, ...tbIds, ...ownIds], pri: -2, x, y });
        const f = await frame(a, r, "win · " + app.title.replace(/ - .*$/, "").replace(/^.* - /, ""), 360 * k);
        wrap.classList.add("wf"); click(a);
        wrap.f = f;
      }, { pri: -1, x, y });
      task(base + ":t", async (a) => {
        say(a, "titlebar");
        await go(a, x + 8, y + app.tb / 2);
        app.rl.style.setProperty("--t", 300 * k * sp + "ms");
        app.rl.classList.add("t"); click(a);
        await go(a, x + w - 10, y + app.tb / 2, 300 * k, "linear");
        const tb = app.rl.querySelector(".titlebar"); if (tb) reveal(tb);
      }, { deps: [base], pri: -1, x, y });
      const bodyMs = clamp(h * 1.7, 600, 1000) * k;
      // two agents raster the body down like a print head; the first one drives the reveal
      task(base + ":b", async (a) => {
        say(a, "paint");
        await go(a, x + 10, y + app.tb + 4);
        app.rl.style.setProperty("--t", bodyMs * sp + "ms");
        wrap.style.setProperty("--t", bodyMs * sp + "ms");
        app.rl.classList.add("b"); wrap.classList.add("scan"); click(a);
        const rows = 3;
        for (let s = 1; s <= rows; s++) await go(a, s % 2 ? x + w - 12 : x + 12, y + app.tb + ((h - app.tb) * s) / rows, bodyMs / rows, "linear");
      }, { deps: [base + ":t"], pri: -1, x, y: y + app.tb });
      // helpers line up along the scan line and ride it down: the swarm pulls the paint down the window together
      [0.22, 0.42, 0.62, 0.82].forEach((f, n) => task(base + ":h" + n, async (a) => {
        say(a, "paint");
        await go(a, x + w * f, y + app.tb + 6);
        await go(a, x + w * f + rand(-20, 20), y + h - 8, bodyMs * 0.9, "linear");
      }, { deps: [base + ":t"], pri: -1, x: x + w * f, y: y + app.tb }));
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

    // 2.6-9s: the back end, typed in from the real source and wired up
    at(2600, () => {
      intro.classList.add("off"); hud.classList.remove("off");
      phase("BACK END", "#22d3ee");
      caption("01 · BACK END", "BACKEND", "Rules, serverless functions, data and a deploy, typed in from the real source.");
      spawn(8); thud();
    });
    at(2700, () => {
      ["deploy", "otp", "rules", "db"].forEach(buildPanel);
      buildBox(beL, "mail", BE.mail, "");
      if (narrow) {
        wire(beL, ["deploy", "r", 0.4], ["otp", "l", 0.2], "invoke");
        wire(beL, ["otp", "b", 0.5], ["mail", "t", 0.5], "smtp");
        wire(beL, ["rules", "r", 0.5], ["db", "l", 0.3], "allow");
      } else {
        wire(beL, ["deploy", "r", 0.5], ["otp", "l", 0.3], "invoke");
        wire(beL, ["otp", "b", 0.5], ["mail", "t", 0.5], "smtp");
        wire(beL, ["otp", "r", 0.6], ["rules", "l", 0.4], "admin sdk");
        wire(beL, ["rules", "r", 0.5], ["db", "l", 0.3], "allow");
      }
    });

    // 9-14.5s: the front end on top of the back end; needles start stitching the two together
    let sewTimer = 0;
    at(9000, () => {
      beL.classList.add("under");
      pace = 1.05;
      phase("FRONT END", "#f472b6");
      caption("02 · FRONT END", "INTERFACE", "Shell, runtime, sound, data and styles, on top of the back end.");
      thud();
      ["index", "app", "sound", "data", "style", "games", "extras"].forEach((id) => buildBox(feL, id, FE[id], "fe"));
      wire(feL, ["index", "r", 0.5], ["app", "l", 0.3], "boot");
      wire(feL, ["app", "b", 0.3], ["games", "t", 0.5], "import()");
      wire(feL, ["app", narrow ? "b" : "r", narrow ? 0.75 : 0.8], ["extras", "t", 0.4], "import()");
      if (!rm) sewTimer = every(narrow ? 1400 : 850, sewOne);
    });

    // 14.5-43s: the real apps, two or three at a time, each outlined, painted and filled in piece by piece
    const mine0 = (base, id) => id === base || id.startsWith(base + ":");
    const busyWith = (base) => queue.some((t) => mine0(base, t.id)) || ags.some((a) => a.cur && mine0(base, a.cur));
    const onScreen = [];
    let nextApp = 0, lastOpen = -1e9, ended = false;
    let appTimer = 0;
    // apps open one after another, two or three on screen: the next opens when there is room, and the oldest is
    // minimised only once its swarm has finished with it. When the last one is done, the ending starts.
    const appTick = () => {
      if (ended) return;
      while (nextApp < APP_IDS.length && apps[nextApp] === null) nextApp++;
      const now = performance.now(), allOpened = nextApp >= APP_IDS.length;
      if (allOpened) {
        if ((onScreen.every((i) => !busyWith("app:" + apps[i].id)) && now - lastOpen > 1500 * sp) || now - lastOpen > 11000 * sp) { stop(appTimer); at(700, endSeq); }
        return;
      }
      if (apps[nextApp] === undefined || now - lastOpen < 1700 * sp) return;
      if (onScreen.length >= 3) {
        const old = apps[onScreen[0]];
        if (busyWith("app:" + old.id) && now - old.openedAt < 7500 * sp) return;
        minimize(onScreen.shift());
      }
      const i = nextApp++;
      buildApp(apps[i], i); apps[i].openedAt = now; onScreen.push(i); lastOpen = now;
    };
    at(14500, () => {
      feL.classList.add("under"); beL.classList.add("under2");
      pace = 1;
      phase("APPS", "#fbbf24");
      caption("03 · APPS", "PROGRAMS", "Every window rebuilt live, piece by piece, two or three at a time.");
      const edges = [[-30, vh * 0.3], [vw + 30, vh * 0.5], [vw * 0.5, vh + 30], [-30, vh * 0.8], [vw + 30, vh * 0.2], [vw * 0.3, -30]];
      spawn(6, (k) => edges[k]); thud();
      appTimer = every(150, appTick);
    });
    at(18000, capOff);
    at(43000, endSeq);

    // the ending: the windows fly away and the desktop is built, then the taskbar, then the swarm flies home
    function endSeq() {
      if (ended) return;
      ended = true; stop(appTimer); stop(sewTimer);
      progLock = true; progEl.style.transition = `width ${6.6 * sp}s linear`; progEl.style.width = "100%";
      at(400, () => {
        queue.length = 0; focusPt = null;
        phase("DESKTOP", "#a3e635");
        caption("04 · DESKTOP", "DESKTOP", "Wallpaper, icons and taskbar, then the live desktop takes over.");
        appsL.querySelectorAll(".rb-hide").forEach((e) => e.classList.remove("rb-hide"));
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
      at(900, () => {
        clone.classList.add("on");
        q(".rb-vig").classList.add("off");
        pace = 0.7;
        task("wall", async (a) => {
          say(a, "wallpaper");
          const cx = vw * 0.5, cy = vh * 0.45;
          await go(a, cx, cy, 380); click(a);
          wall.style.setProperty("--x", cx + "px"); wall.style.setProperty("--y", cy + "px");
          wall.classList.add("on"); blip(220, 0.5, "sine", 1.0, 440);
          at(1300, () => { beL.classList.add("gone"); feL.classList.add("gone"); q(".rb-grid").style.opacity = 0; });
          await go(a, cx + 60, cy - 40, 500);
        }, { pri: -3 });
        D.icons.forEach((p, k) => task("icon" + k, async (a) => {
          const lbl = p.el.textContent.trim() || "icon", cx = p.r.x + p.r.w / 2, cy = p.r.y + p.r.h / 2;
          const ox = clamp(rand(-260, 260), 30 - cx, vw - 60 - cx), oy = clamp(rand(-160, 160), 30 - cy, vh - 60 - cy);
          say(a, lbl.toLowerCase());
          await go(a, cx + ox, cy + oy); click(a);
          p.el.style.setProperty("--t", "0ms"); p.el.classList.add("rb-on");
          p.el.animate([{ translate: `${ox}px ${oy}px`, scale: "0.6", opacity: 0 }, { opacity: 1, offset: 0.2 }, { translate: "0px 0px", scale: "1", opacity: 1 }],
            { duration: 380 * sp, easing: "cubic-bezier(.2,.75,.25,1.15)", fill: "backwards" });
          await go(a, cx, cy, 380, "cubic-bezier(.2,.75,.25,1.15)");
        }, { x: p.r.x, y: p.r.y }));
        D.wins.forEach((p, k) => task("uwin" + k, async (a) => {
          say(a, "window");
          const f = await frame(a, p.r, "win", 380);
          p.el.style.setProperty("--t", 700 * sp + "ms"); p.el.classList.add("rb-on"); click(a);
          await go(a, p.r.x + 10, p.r.y + p.r.h, 700, "linear");
          unframe(f, 0);
        }, { x: p.r.x, y: p.r.y }));
      });
      at(1500, capOff);

      // taskbar, start button, tray: wifi, battery, volume, clock
      at(3000, () => {
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
      at(5600, () => {
        queue.length = 0;
        const home = D.start[0]?.r || { x: 20, y: vh - 30, w: 60, h: 30 };
        ags.forEach((a, k) => { a.home = true; a.el.classList.remove("tag"); at(k * 35, () => { place(a, home.x + home.w / 2, home.y + home.h / 2, 520, "cubic-bezier(.6,0,.8,.4)"); at(480, () => a.el.classList.remove("on")); }); });
        hud.classList.add("off"); fx.style.opacity = "0";
        // anything the swarm did not reach in time is simply shown
        clone.querySelectorAll(".rb-h").forEach((e) => e.classList.add("rb-on"));
      });
      at(6050, () => { flash.classList.add("go"); real.classList.remove("rb-glitch"); play("startup"); });
      at(6600, () => finish(false));
    }

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
