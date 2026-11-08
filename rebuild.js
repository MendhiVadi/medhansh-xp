// Visual Rebuild, Mark 2: a ~36 second, purely visual rebuild of this site by a swarm of tiny agents. (Mark 1 is rebuild-mk1.js.)
// 3-12s   the foundation: back-end windows (real source, data, a deploy) and front-end modules, built side by side
// 7-29s   needles drop in from above, go under the page, come back out and the thread is snipped: no mark is left
// 12-27s  a handful of real app windows are built one on top of another, the games last and About Me on top
// 29-33s  the windows fly away and the desktop (wallpaper, icons) is built
// 33-36s  the taskbar, start button and tray icons, then it hands back to the live desktop underneath
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
.rb-hole { position: absolute; width: 600px; height: 600px; transform-origin: 300px 300px; pointer-events: none; }
.rb-ndl { position: absolute; left: 300px; top: 300px; transform-origin: 0 0; }
.rb-ndl > i { position: absolute; left: 0; top: 0; }
.rb-ndl > i { filter: blur(1.3px); opacity: .4; }
.rb-ndl svg { position: absolute; left: -124px; top: -7px; overflow: visible; }
.rb-pin { position: absolute; width: 4px; height: 4px; margin: -2px 0 0 -2px; border-radius: 50%; background: #020617; box-shadow: 0 0 0 1px rgba(255,255,255,.22); }
.rb-snip { position: absolute; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; background: radial-gradient(#fff, rgba(255,255,255,0) 70%); animation: rbSnip .2s ease-out both; }
@keyframes rbSnip { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }

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

/* skip */
.rb-skip { position: absolute; right: 12px; top: 10px; background: rgba(5,9,19,.55); border: 1px solid #334155; color: #cbd5e1; cursor: pointer; font: 10px var(--rb-mono);
  letter-spacing: .2em; padding: 4px 10px; border-radius: 999px; opacity: .35; transition: opacity .3s; }
.rb-skip:hover, .rb-skip:focus-visible { opacity: 1; outline: none; }

/* back-end windows: real source typed in by the swarm */
.rb-pn { position: absolute; box-sizing: border-box; border: 2px solid #0831d9; border-top: 0; border-radius: 8px 8px 0 0; overflow: hidden; opacity: 0;
  background: #0d1117; box-shadow: 0 22px 50px -14px rgba(0,0,0,.9), 0 0 0 1px rgba(0,0,0,.4); transition: opacity .25s; }
.rb-pn.on { opacity: 1; }
.rb-pt { height: 26px; display: flex; align-items: center; gap: 6px; padding: 0 3px 0 7px; color: #fff; font: bold 12px Tahoma, "Segoe UI", sans-serif; text-shadow: 1px 1px #0f1089;
  background: linear-gradient(#0997ff, #0053ee 8%, #0050ee 40%, #06f 88%, #06f 93%, #005bff 95%, #003dd7 96%, #003dd7); white-space: nowrap; overflow: hidden;
  clip-path: inset(0 100% 0 0); transition: clip-path .3s steps(10); }
.rb-pn.hd .rb-pt { clip-path: inset(0 0 0 0); }
.rb-pt i { width: 13px; height: 13px; border-radius: 2px; flex: none; background: var(--a); box-shadow: inset 0 0 0 1px rgba(255,255,255,.6); }
.rb-pt b { overflow: hidden; text-overflow: ellipsis; }
.rb-pt span { margin-left: auto; display: flex; gap: 2px; }
.rb-pt u { width: 19px; height: 19px; box-sizing: border-box; border: 1px solid #fff; border-radius: 3px; background: linear-gradient(#3c8cff, #1a5fe0); }
.rb-pt u:last-child { background: linear-gradient(#e8784a, #c4370f); }
.rb-pb { position: absolute; left: 0; right: 0; top: 26px; bottom: 0; padding: 8px 0; font: var(--cfs) var(--rb-mono); line-height: var(--clh); color: #c9d1d9; }
.rb-cl { display: flex; height: var(--clh); white-space: pre; overflow: hidden; clip-path: inset(0 100% 0 0); transition: clip-path var(--t, .3s) steps(var(--n, 12)); }
.rb-cl.on { clip-path: inset(0 0 0 0); }
.rb-cl s { flex: none; width: 26px; padding-right: 8px; text-align: right; text-decoration: none; color: #3b4a61; }
.rb-cl code { font: inherit; overflow: hidden; }
.rb-pn.term .rb-pb, .rb-pn.term { background: #000; }
.rb-pn.term .rb-cl { padding-left: 10px; color: #c0c0c0; }
.rb-pn.term .rb-cl.p { color: #7ee787; } .rb-pn.term .rb-cl.ok { color: #fff; font-weight: 700; }
.rb-cl b { font-weight: normal; } .rb-cl b.k { color: #ff7b72; } .rb-cl b.s { color: #a5d6ff; } .rb-cl b.c { color: #8b949e; font-style: italic; } .rb-cl b.n { color: #79c0ff; }
.rb-pn.db .rb-pb { background: #0b1220; }
.rb-dr { display: grid; grid-template-columns: 1.25fr 1fr 64px 34px; gap: 10px; align-items: center; padding: 0 12px; border-bottom: 1px solid #142036; }
.rb-dr span { color: #e2e8f0; } .rb-dr span::before { content: "▣ "; color: var(--a); } .rb-dr em { font-style: normal; color: #64748b; }
.rb-dr i { justify-self: start; height: 6px; width: 0; border-radius: 3px; background: var(--a); transition: width .7s cubic-bezier(.2,.8,.2,1) .15s; }
.rb-dr.on i { width: var(--w); }
.rb-dr u { text-decoration: none; text-align: right; color: #94a3b8; }

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
  const YARN = ["#f43f5e", "#fbbf24", "#22d3ee", "#e879f9", "#a3e635", "#fb923c", "#f8fafc"]; // thread colours
  const CHECKS = ["lint ✓", "tests ✓", "types ✓", "200 OK", "gzip 38 kB", "cache hit", "a11y ✓", "0 warnings", "hydrated", "diff +12 −3", "p95 41ms", "snapshot ✓"];

  // the back end, as real source (condensed): each one is a window the swarm opens and types into
  const PANELS = {
    rules: { title: "firestore.rules", kind: "code", lines: [
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
      "      allow read: if true;",
      "      allow create: if validScore(request.resource.data);",
      "      allow update, delete: if false;",
      "    }"] },
    otp: { title: "api/otp.js", kind: "code", lines: [
      "// POST -> emails a random 4-digit code",
      "import { mailer, send, issue, throttled } from './_mail.js';",
      "",
      "export default async function handler(req, res) {",
      "  if (req.method !== 'POST') return send(res, 405, {});",
      "  const b = body(req), email = str(b.email, 120);",
      "  if (!EMAIL.test(email)) return send(res, 400, {});",
      "  if (throttled(req, 'otp', 5, 15 * 60 * 1000))",
      "    return send(res, 429, { error: 'Slow down.' });",
      "  const { code, token } = issue(email, digest(m));",
      "  await mailer().sendMail({ to: email,",
      "    subject: `${code} is your verification code` });",
      "  return send(res, 200, { token });",
      "}"] },
    db: { title: "Firestore · resume-41921", kind: "db", lines: [
      ["shared/notepad", "read · write", 1], ["tasks", "validated", 38], ["pictures", "add · delete", 12], ["scores", "add-only", 214],
      ["board", "add-only", 57], ["stats", "+1 max", 6], ["otp", "5 attempts", 19], ["limits", "hashed keys", 44]] },
    deploy: { title: "C:\\WINDOWS\\system32\\cmd.exe - vercel", kind: "term", lines: [
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
  // the front end, built on top of it
  const FE = {
    app: { t: "APP.JS", tag: "runtime", lines: [["window manager", "z-order"], ["desktop grid", "snap"], ["start menu", ""], ["taskbar + tray", "live"], ["explorer · cmd · msn", ""], ["paint · notepad", ""]] },
    sound: { t: "SOUND.JS", tag: "webaudio", wave: true, lines: [["xp scheme", "synth"], ["files", "0"]] },
    data: { t: "DATA.JS", tag: "profile", lines: [["name", "Medhansh Khattar"], ["role", "AI/ML engineer"], ["based", "Navi Mumbai"], ["host", "MK-PC"]] },
    style: { t: "STYLE.CSS", tag: "luna", swatch: ["#0058ee", "#3c8f3c", "#ece9d8", "#4c9b2d", "#d6dff7", "#1941a5"], lines: [["titlebar", "#0058ee"], ["start", "#3c8f3c"]] },
  };
  // real apps, in build order (none that need the network)
  const APP_IDS = ["cmd", "paint", "projects", "msn", "mine", "solitaire", "spider", "snake", "about"];
  const APP_AT = [12000, 14000, 15900, 17600, 19200, 20600, 21900, 23100, 24800];
  const APP_SPOT = [[.3, .4], [.7, .36], [.22, .62], [.78, .62], [.4, .62], [.62, .34], [.34, .46], [.66, .56], [.5, .5]];

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
    const R = { x: side, y: 30, w: vw - 2 * side, h: vh - 60 };

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
      <div class="rb-sew"><svg width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}" style="position:absolute;left:0;top:0;overflow:visible"><defs><linearGradient id="rbNdG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f8fafc"/><stop offset=".45" stop-color="#cbd5e1"/><stop offset="1" stop-color="#475569"/></linearGradient></defs></svg></div>
      <div class="rb-fx"></div><div class="rb-ags"></div>
      <div class="rb-glitch-bars">${Array.from({ length: 7 }, () => `<i style="top:${rand(0, 96).toFixed(1)}%;height:${rand(1, 9).toFixed(1)}px"></i>`).join("")}</div>
      <div class="rb-intro"><div class="rb-intro-t">&nbsp;</div><div class="rb-intro-bar"></div><div class="rb-intro-s">&nbsp;</div></div>
      <div class="rb-vig"></div>
      <button class="rb-skip" type="button">SKIP · ESC</button>
      <div class="rb-flash"></div>`;
    const q = (s) => ov.querySelector(s);
    const beL = q(".rb-be"), feL = q(".rb-fe"), appsL = q(".rb-apps"), wall = q(".rb-wall"), sewL = q(".rb-sew"), sewS = q(".rb-sew svg"), fx = q(".rb-fx"), agL = q(".rb-ags");
    const intro = q(".rb-intro"), flash = q(".rb-flash");
    ["backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat", "backgroundOrigin", "backgroundClip"].forEach((k) => (wall.style[k] = rcs[k]));
    wall.after(clone);

    document.body.appendChild(ov);
    const prevFocus = document.activeElement;
    const skipBtn = q(".rb-skip");
    skipBtn.addEventListener("click", () => finish(true));
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
    let pace = 1; // > 1 is slower: every move and draw is scaled by it, and it drops as the show speeds up
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
          const ps = chores ? pieces() : [];
          if (ps.length && Math.random() < 0.75) { await chore(a, pick(ps)); continue; }
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

    // ---------- the back end: windows with the real source, typed in by the swarm ----------
    const LH = narrow ? 14 : 17, CW = narrow ? 6 : 6.9, TB = 26, GUT = 26;
    ov.style.setProperty("--clh", LH + "px"); ov.style.setProperty("--cfs", narrow ? "10px" : "11.5px");
    const shown = (p) => p.lines.slice(0, narrow ? 6 : 8);
    const panelH = (p) => TB + 16 + shown(p).length * LH + 2;
    // ---------- one foundation: back-end windows and front-end modules, side by side ----------
    const heightOf = (id) => (PANELS[id] ? panelH(PANELS[id]) : boxH(FE[id]));
    if (narrow) {
      const order = ["rules", "app", "sound", "deploy", "style", "db", "otp", "data"], hs = order.map(heightOf);
      const step = Math.min(hs[0] + 10, (R.h - hs.at(-1)) / (order.length - 1));
      order.forEach((id, k) => (rects[id] = { x: R.x + (k % 2 ? 8 : 0), y: R.y + k * step, w: R.w - 8, h: hs[k] }));
    } else {
      const gap = 26, n = 4, colW = Math.min(390, (R.w - (n - 1) * gap) / n), grid = [["rules", "app", "sound", "db"], ["deploy", "style", "otp", "data"]];
      const rowH = grid.map((row) => Math.max(...row.map(heightOf)));
      const tot = rowH[0] + gap + rowH[1], y0 = R.y + Math.max(0, (R.h - tot) / 2), lift = Math.min(0, R.h - tot), x0 = R.x + (R.w - n * colW - (n - 1) * gap) / 2;
      grid.forEach((row, ri) => row.forEach((id, ci) => {
        rects[id] = { x: clamp(x0 + ci * (colW + gap) + (ri ? colW * 0.06 : -colW * 0.03) + rand(-8, 8), 6, vw - colW - 6), y: y0 + (ri ? rowH[0] + gap + lift : 0) + rand(-8, 8), w: colW, h: heightOf(id) };
      }));
    }

    const hl = (line) => {
      const re = /(\/\/.*$)|('[^']*'|"[^"]*"|`[^`]*`)|(\b\d[\d_.]*\b)|(\b(?:import|from|export|default|async|function|return|if|const|await|allow|match|read|write|create|update|delete|service|true|false|rules_version)\b)/g;
      let out = "", i = 0, m;
      while ((m = re.exec(line))) { out += esc(line.slice(i, m.index)) + `<b class="${m[1] ? "c" : m[2] ? "s" : m[3] ? "n" : "k"}">${esc(m[0])}</b>`; i = re.lastIndex; }
      return out + esc(line.slice(i));
    };
    const makePanel = (p, r, color) => {
      const el = document.createElement("div");
      el.className = "rb-pn " + p.kind;
      el.style.cssText = `--a:${color};left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
      const rows = shown(p).map((ln, k) => {
        if (p.kind === "db") return `<div class="rb-cl rb-dr"><span>${esc(ln[0])}</span><em>${esc(ln[1])}</em><i style="--w:${Math.round(14 + Math.log10(ln[2] + 1) * 34)}%"></i><u>${ln[2]}</u></div>`;
        if (p.kind === "term") return `<div class="rb-cl${k === 0 ? " p" : /^(Production|Aliased)/.test(ln) ? " ok" : ""}"><code>${esc(ln)}</code></div>`;
        return `<div class="rb-cl"><s>${k + 1}</s><code>${hl(ln)}</code></div>`;
      }).join("");
      el.innerHTML = `<div class="rb-pt"><i></i><b>${esc(p.title)}</b><span><u></u><u></u><u></u></span></div><div class="rb-pb">${rows}</div>`;
      beL.appendChild(el);
      return el;
    };
    // one agent opens the window; then whoever is free piles in and types a line, so several lines type at once
    const short = (t) => t.replace(/^.*[\\/]/, "");
    const buildPanel = (id) => {
      const p = PANELS[id], r = rects[id];
      task(id, async (a) => {
        say(a, short(p.title));
        const f = await frame(a, r, "win · " + short(p.title), 400 * pace);
        const el = boxes[id] = makePanel(p, r, a.color);
        void el.offsetWidth; el.classList.add("on"); click(a);
        await go(a, r.x + 10, r.y + TB / 2, 140);
        el.classList.add("hd");
        await go(a, r.x + r.w - 70, r.y + TB / 2, 300 * pace, "linear");
        unframe(f, 250); chime();
      }, { pri: -1, x: r.x, y: r.y });
      shown(p).forEach((ln, k) => task(id + ":" + k, async (a) => {
        const row = boxes[id].querySelectorAll(".rb-cl")[k];
        const text = Array.isArray(ln) ? ln.slice(0, 2).join("    ") : ln, n = text.trimEnd().length, indent = text.length - text.trimStart().length;
        if (!n) { row.classList.add("on"); return; }
        const y = r.y + TB + 8 + k * LH + LH / 2, x0 = r.x + (p.kind === "code" ? GUT + 4 : 10) + indent * CW;
        say(a, p.kind === "db" ? ln[0] : short(p.title));
        await go(a, x0, y);
        const t = clamp((n - indent) * 7, 90, 300) * pace;
        row.style.setProperty("--t", t * sp + "ms"); row.style.setProperty("--n", Math.min(n, 48));
        row.classList.add("on");
        if (k % 3 === 0) click(a);
        await go(a, Math.min(r.x + r.w - 12, x0 + (n - indent) * CW), y, t, "linear");
      }, { deps: [id], pri: Math.floor(k / 4) * 0.01, x: r.x, y: r.y + TB + k * LH }));
    };

    // ---------- needles: one stitch at a time, anywhere, purely for texture ----------
    // Seen from above: a needle drops in from over the page (bigger and blurred-shadowed while it is high, its shadow closing in
    // as it lands), sinks into a pinhole at P, travels under the page, pokes back out at Q a little further on, lifts away
    // towards the viewer pulling its thread, and the thread is snipped: needle, thread and holes all vanish.
    // Each hole is a rotated, zero-size box clipped to one side of the hole, so whatever passes it is hidden under the page.
    const needleSvg = (color, shadow) => `<svg width="130" height="14" viewBox="-124 -7 130 14">` +
      `<path d="M-52 0 C-90 0 -120 ${rand(-5, 5).toFixed(1)} -230 ${rand(-8, 8).toFixed(1)}" stroke="${shadow ? "#000" : color}" stroke-width="1.1" fill="none" stroke-linecap="round"/>` +
      `<path d="M0 0 L-8 -1.6 L-58 -1.4 Q-62 0 -58 1.4 L-8 1.6 Z" fill="${shadow ? "#000" : "url(#rbNdG)"}" stroke="${shadow ? "none" : "#0f172a"}" stroke-width=".4"/>` +
      (shadow ? "" : `<ellipse cx="-53" cy="0" rx="3" ry=".7" fill="#0b1020"/>`) + `</svg>`;
    const sprite = (x, y, deg, side, color) => {
      const w = document.createElement("div");
      w.className = "rb-hole";
      w.style.cssText = `left:${(x - 300).toFixed(1)}px;top:${(y - 300).toFixed(1)}px;transform:rotate(${deg.toFixed(1)}deg);clip-path:` +
        (side < 0 ? "inset(0 300px 0 0)" : "inset(0 0 0 300px)");
      w.innerHTML = `<div class="rb-ndl"><i>${needleSvg(color, true)}</i>${needleSvg(color)}</div>`;
      sewL.appendChild(w);
      return { w, n: w.firstElementChild, sh: w.firstElementChild.firstElementChild };
    };
    const dot = (x, y, cls) => { const d = document.createElement("div"); d.className = cls; d.style.left = x + "px"; d.style.top = y + "px"; sewL.appendChild(d); return d; };
    const stitch = (px, py, color = pick(YARN)) => {
      const deg = rand(55, 125), ux = Math.cos((deg * Math.PI) / 180), uy = Math.sin((deg * Math.PI) / 180), gap = rand(14, 22);
      const qx = px + ux * gap, qy = py + uy * gap, T = (ms) => ms * sp;
      // down from above and into the pinhole at P
      const A = sprite(px, py, deg, -1, color);
      A.n.animate([{ transform: "translateX(-150px) scale(1.45)", opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: "translateX(0) scale(1)", offset: 0.6 }, { transform: "translateX(72px) scale(1)", opacity: 1 }],
        { duration: T(380), easing: "cubic-bezier(.45,0,.55,1)", fill: "forwards" });
      A.sh.animate([{ transform: "translate(-30px, 26px)", opacity: 0.12 }, { transform: "translate(0, 0)", opacity: 0.45, offset: 0.6 }, { transform: "translate(0, 0)", opacity: 0.45 }],
        { duration: T(380), easing: "cubic-bezier(.45,0,.55,1)", fill: "forwards" });
      let pin, pout, B;
      at(230, () => (pin = dot(px, py, "rb-pin")));
      // back out at Q, then up and away towards the viewer
      at(430, () => {
        A.w.remove();
        pout = dot(qx, qy, "rb-pin");
        B = sprite(qx, qy, deg, 1, color);
        B.n.animate([{ transform: "translateX(0) scale(1)" }, { transform: "translateX(72px) scale(1)", offset: 0.5 }, { transform: "translateX(165px) scale(1.4)", opacity: 0 }],
          { duration: T(440), easing: "cubic-bezier(.45,0,.55,1)", fill: "forwards" });
        B.sh.animate([{ transform: "translate(0, 0)", opacity: 0.45 }, { transform: "translate(0, 0)", opacity: 0.45, offset: 0.5 }, { transform: "translate(-30px, 26px)", opacity: 0.1 }],
          { duration: T(440), easing: "cubic-bezier(.45,0,.55,1)", fill: "forwards" });
      });
      // snip: the thread is cut at the hole and everything goes
      at(830, () => { B?.w.remove(); pin?.remove(); pout?.remove(); const sn = dot(qx, qy, "rb-snip"); tick(); at(220, () => sn.remove()); });
    };
    // anything that has been built can be stitched into, near its edges
    const appRects = {};
    let chores = true;
    const scaled = (r, f) => (f === 1 ? r : { x: vw / 2 + (r.x - vw / 2) * f, y: vh / 2 + (r.y - vh / 2) * f, w: r.w * f, h: r.h * f });
    const pieces = () => [
      ...Object.keys(boxes).filter((id) => rects[id]).map((id) => scaled(rects[id], beL.classList.contains("under") ? 0.965 : 1)),
      ...Object.values(appRects)];
    const onEdge = (r) => { const e = (Math.random() * 4) | 0, t = rand(0.12, 0.88); return e === 0 ? [r.x + r.w * t, r.y] : e === 1 ? [r.x + r.w, r.y + r.h * t] : e === 2 ? [r.x + r.w * t, r.y + r.h] : [r.x, r.y + r.h * t]; };
    const stitchOne = () => { const ps = pieces(); if (!ps.length) return; const [x, y] = onEdge(pick(ps)); stitch(clamp(x, 40, vw - 40), clamp(y, 24, vh - 24)); };
    // an idle agent never waits around: it checks something that is already built
    const chore = async (a, r) => {
      const h = rand(16, 24), sub = { x: r.x + rand(4, r.w * 0.3), y: r.y + rand(r.h * 0.15, Math.max(r.h * 0.15, r.h - h - 6)), w: r.w * rand(0.3, 0.6), h };
      say(a, "check");
      const f = await frame(a, sub, pick(CHECKS), 220, false);
      tick(); await wait(rand(180, 320)); unframe(f, 0);
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
      const top = 16, bottom = vh - 16, w = app.w, h = app.h;
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
        if (!rm) for (let n = 0; n < 2; n++) { const [kx, ky] = onEdge(r); stitch(clamp(kx, 40, vw - 40), clamp(ky, 24, vh - 24)); }
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
    at(1900, () => { q(".rb-intro-s").innerHTML = "spawning swarm ▸ <b>10 agents · needle and thread</b>"; tick(); });
    at(1000, () => prepAll());

    // 2.6-12s: the foundation, back end and front end built together
    at(2600, () => { intro.classList.add("off"); spawn(10); thud(); });
    [["rules", 2700], ["app", 3150], ["sound", 3600], ["db", 4050], ["deploy", 4500], ["style", 4950], ["otp", 5400], ["data", 5850]]
      .forEach(([id, t]) => at(t, () => (PANELS[id] ? buildPanel(id) : buildBox(beL, id, FE[id], "fe"))));
    if (!narrow) at(6400, () => {
      wire(beL, ["rules", "r", 0.5], ["app", "l", 0.35], "allow");
      wire(beL, ["app", "r", 0.3], ["sound", "l", 0.5], "play()");
      wire(beL, ["app", "b", 0.5], ["style", "t", 0.5], "paint");
      wire(beL, ["otp", "r", 0.5], ["data", "l", 0.5], "send");
    });
    // needles start stitching once there is something to stitch into
    let sewTimer = 0;
    at(7000, () => { if (!rm) sewTimer = every(narrow ? 320 : 190, stitchOne); });

    // 12-27s: the real apps, stacking on top of each other, the games last and About Me on top
    at(11500, () => {
      beL.classList.add("under");
      const edges = [[-30, vh * 0.3], [vw + 30, vh * 0.5], [vw * 0.5, vh + 30], [-30, vh * 0.8], [vw + 30, vh * 0.2], [vw * 0.3, -30]];
      spawn(4, (k) => edges[k]); thud();
    });
    at(18000, () => beL.classList.add("under2"));
    APP_AT.forEach((t, i) => at(t, () => { if (apps[i]) buildApp(apps[i], i); }));

    // 29-33s: the windows fly away and the desktop is built
    at(28600, () => stop(sewTimer));
    at(29000, () => {
      queue.length = 0; chores = false;
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
    at(29500, () => {
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

    // 33-36s: taskbar, start button, tray: wifi, battery, volume, clock
    at(32900, () => {
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
    at(35000, () => {
      queue.length = 0;
      const home = D.start[0]?.r || { x: 20, y: vh - 30, w: 60, h: 30 };
      ags.forEach((a, k) => { a.home = true; at(k * 35, () => { place(a, home.x + home.w / 2, home.y + home.h / 2, 520, "cubic-bezier(.6,0,.8,.4)"); at(480, () => a.el.classList.remove("on")); }); });
      skipBtn.style.opacity = "0"; fx.style.opacity = "0";
      // anything the swarm did not reach in time is simply shown
      clone.querySelectorAll(".rb-h").forEach((e) => e.classList.add("rb-on"));
    });
    at(35450, () => { flash.classList.add("go"); real.classList.remove("rb-glitch"); play("startup"); });
    at(36000, () => finish(false));

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
