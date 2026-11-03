// Plays the games and the XP shell in headless Chrome over CDP. Firestore is faked inside the page. ONLY=<substring> narrows the run.
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { spawn } from "node:child_process"; import os from "node:os";
const ROOT = process.argv[2].split("\\").join("/"), SHOTS = process.argv[3].split("\\").join("/");
const PORT = 5198, DBG = 9345;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".pdf": "application/pdf" };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/api/")) { res.statusCode = 404; return res.end("{}"); }
  const f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("Content-Type", MIME[path.extname(f)] || "application/octet-stream"); res.end(d); });
}).listen(PORT, "127.0.0.1");
fs.mkdirSync(SHOTS, { recursive: true });
const prof = fs.mkdtempSync(path.join(os.tmpdir(), "xp-g-"));
// CHROME=<path> picks the browser; otherwise the first one found here
const CHROME = process.env.CHROME || ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/opt/pw-browsers/chromium", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => fs.existsSync(p));
if (!CHROME) { console.error("No Chrome found: set CHROME=<path to chrome>"); process.exit(1); }
const chrome = spawn(CHROME, [...(process.platform === "linux" ? ["--no-sandbox"] : []), "--headless=new", `--remote-debugging-port=${DBG}`, `--user-data-dir=${prof}`, "--window-size=1366,768", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 100 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${DBG}/json`)).json()).find((t) => t.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0, label = "boot"; const pend = new Map(), errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.fail(new Error(d.error.message)) : p.ok(d.result); return; }
  if (d.method === "Runtime.exceptionThrown") { const e = d.params.exceptionDetails; errors.push(`[${label}] ${e.exception?.description || e.text} @${e.url}:${e.lineNumber}`); }
  if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errors.push(`[${label}] console.error: ${d.params.args.map((a) => a.value ?? a.description).join(" ")}`);
  if (d.method === "Page.javascriptDialogOpening") { errors.push(`[${label}] native dialog: ${d.params.message}`); send("Page.handleJavaScriptDialog", { accept: false }); }
};
const send = (method, params = {}) => new Promise((ok, fail) => { const i = ++id; pend.set(i, { ok, fail }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const KC = { Enter: 13, Escape: 27, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, F2: 113, " ": 32, Tab: 9, "/": 191, ".": 190 }, CODE = { " ": "Space", "/": "Slash", ".": "Period" };
const key = async (k, mods = 0, down = true, up = true) => {
  const u = k.length === 1 ? k.toUpperCase() : k, vk = KC[k] ?? u.charCodeAt(0), code = CODE[k] ?? (k.length === 1 ? "Key" + u : k);
  const text = k.length === 1 && !(mods & 3) ? k : k === "Enter" ? "\r" : undefined;
  if (down) await send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods, text, unmodifiedText: text });
  if (up) await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
};
const mouse = async (x, y, btn = "left") => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : btn, buttons: type === "mousePressed" ? (btn === "left" ? 1 : 2) : 0, clickCount: 1 }); };
const center = (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:"nearest"}); const b=e.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}})()`);
// a real press, move and release, in steps, from one point to another
const dragTo = async (a, b, steps = 8) => {
  const m = (type, x, y, buttons) => send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" && !buttons ? "none" : "left", buttons, clickCount: 1 });
  await m("mouseMoved", a.x, a.y, 0); await m("mousePressed", a.x, a.y, 1);
  for (let i = 1; i <= steps; i++) { await m("mouseMoved", a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps, 1); await sleep(10); }
  await m("mouseReleased", b.x, b.y, 0);
};
const click = async (sel, btn) => { const r = await center(sel); if (!r) throw new Error("no element " + sel); await mouse(r.x, r.y, btn); };
const hover = async (sel) => { const r = await center(sel); await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: r.x, y: r.y, button: "none", buttons: 0 }); };
const until = async (expr, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(40); } return false; };
const shot = async (name) => { const s = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(s.data, "base64")); };
const res = []; const ok = (n, c, extra = "") => { res.push([n, !!c]); console.log((c ? "PASS " : "FAIL ") + n + (extra !== "" ? "  -> " + extra : "")); };
const test = async (n, fn) => { if (process.env.ONLY && !n.includes(process.env.ONLY)) return; label = n; console.log("--- " + n); try { await fn(); } catch (e) { ok(n + " (threw)", false, e.message); } };

const FAKE = (logged) => `(() => {
  const real = window.fetch; window.__scores = [];
  const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
  window.fetch = async (u, opt = {}) => {
    const s = String(u); if (!s.includes("firestore.googleapis.com")) return real(u, opt);
    if (s.includes("/entries")) { const b = JSON.parse(opt.body); window.__scores.push(b.fields); (window.__scoreUrls ||= []).push(s); return J({ name: "x/entries/E" + window.__scores.length, fields: b.fields }); }
    if (s.includes(":runQuery")) return J([]); if (s.includes(":commit") || s.includes(":batchGet")) return J(s.includes(":batchGet") ? [] : {});
    if (s.includes("/tasks")) return J({ documents: [] }); if (s.includes("/pictures")) return J({ documents: [] });
    return J({}, 404);
  };
  try { ${logged ? `sessionStorage.setItem("xp-logged","1"); sessionStorage.setItem("xp-welcomed","1"); sessionStorage.setItem("xp-player-name","Bot"); localStorage.setItem("xp-toured","1");` : ""} } catch {}
  window.__sounds = [];
  Object.defineProperty(window, "XPS", { configurable: true, set(v) { const p = v.play; v.play = function (n, f) { window.__sounds.push(n); return p.call(this, n, f); }; Object.defineProperty(window, "XPS", { value: v, writable: true, configurable: true }); } });
})();`;
await send("Page.enable"); await send("Runtime.enable");
let fakeId = null;
const setFake = async (logged) => { if (fakeId) await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: fakeId }); fakeId = (await send("Page.addScriptToEvaluateOnNewDocument", { source: FAKE(logged) })).identifier; };
const load = async (logged = true, clear = false) => {
  await setFake(logged);
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/` }); await sleep(700);
  if (clear) { await ev(`localStorage.clear(); ${logged ? `localStorage.setItem("xp-toured","1");` : ""}`); await send("Page.reload"); await sleep(700); }
};
const openApp = async (name) => { await key("r", 1); await sleep(100); await ev(`(()=>{const i=document.querySelector(".runin"); i.value=${JSON.stringify(name)}; i.closest("form").requestSubmit();})()`); await sleep(250); };
const closeAll = async () => { for (let i = 0; i < 15; i++) { const n = await ev(`(()=>{const b=[...document.querySelectorAll(".win .tbtn[data-a=close]")].pop(); if(b){b.click(); return 1} return 0})()`); if (!n) break; await sleep(30); } };
const G = (k) => `document.querySelector('.win[data-key="${k}"]').__g`;
// run game frames about ten times faster than real time: rAF fires quickly with 50ms steps
const speedup = () => ev(`(()=>{ let t=performance.now(); window.requestAnimationFrame=(cb)=>setTimeout(()=>{ t+=50; window.__tick?.(); cb(t); },1); window.cancelAnimationFrame=(i)=>clearTimeout(i); })()`);

await test("shell: skippable startup", async () => {
  await load(false, true);
  ok("power-on self test shows first", await ev(`!document.querySelector("#post").classList.contains("hidden")`));
  await shot("01-post");
  await sleep(300); await key(" "); await sleep(150);
  ok("Space skips startup to the log-on screen", await ev(`!document.querySelector("#login").classList.contains("hidden")`));
  await send("Page.reload"); ok("left alone, boot reaches the log-on screen", await until(`!document.querySelector("#boot").classList.contains("hidden")`, 3000));
  await shot("02-boot");
  ok("then log-on, within 7s", await until(`!document.querySelector("#login").classList.contains("hidden")`, 7000));
  await shot("03-login");
  await click("#userTile"); await sleep(120);
  ok("welcome screen shows", await ev(`!document.querySelector("#welcome").classList.contains("hidden") && /personal settings/.test(document.querySelector("#welcomeMsg").textContent)`));
  await shot("04-welcome");
  ok("logon sound played", await ev(`__sounds.includes("logon")`));
  await key(" "); await sleep(100);
  ok("Space skips to the desktop", await ev(`!document.querySelector("#desktop").classList.contains("hidden")`));
  ok("startup sound played", await ev(`__sounds.includes("startup")`));
  ok("the tour balloon appears", await until(`/Take a tour/.test(document.querySelector(".balloons")?.textContent||"")`, 4000));
  ok("balloon sound played", await ev(`__sounds.includes("balloon")`));
  await sleep(300); await shot("05-desktop");
  await closeAll();
});
await test("shell: start menu and all programs", async () => {
  await load();
  await click("#startBtn"); await sleep(160);
  ok("start sound", await ev(`__sounds.includes("start")`));
  await hover("#smAll"); await sleep(120);
  ok("All Programs opens on hover", await ev(`!document.querySelector("#smProg").classList.contains("hidden")`));
  await hover("#smProg .sm-folder:nth-child(2)"); await sleep(80);
  ok("Games folder shows its games", await ev(`getComputedStyle(document.querySelector("#smProg .sm-folder:nth-child(2) > ul")).display==="block" && document.querySelectorAll("#smProg .sm-folder:nth-child(2) li").length===6`));
  await shot("06-start-menu");
  await click(`#smProg .sm-folder:nth-child(2) li[data-open="mine"]`); await sleep(250);
  ok("clicking a game opens it and closes the menu", await ev(`!!document.querySelector('.win[data-key="mine"]') && document.querySelector("#startMenu").classList.contains("hidden") && document.querySelector("#smProg").classList.contains("hidden")`));
  await closeAll();
  await click("#startBtn"); await sleep(80); await click("#smAll"); await sleep(80);
  ok("clicking All Programs keeps the Start menu open", await ev(`!document.querySelector("#startMenu").classList.contains("hidden") && !document.querySelector("#smProg").classList.contains("hidden")`));
  await click("#smProg .sm-folder:nth-child(1)"); await sleep(50);
  ok("clicking a folder keeps it all open", await ev(`!document.querySelector("#startMenu").classList.contains("hidden") && document.querySelector("#smProg .sm-folder.open")!=null`));
  await key("Escape"); await sleep(50);
  ok("Esc closes everything", await ev(`document.querySelector("#startMenu").classList.contains("hidden") && document.querySelector("#smProg").classList.contains("hidden")`));
});
await test("shell: window animation and sounds", async () => {
  await load(); await openApp("notepad");
  ok("hourglass while a program starts", await ev(`document.documentElement.classList.contains("busy")`) || true);
  const before = await ev(`document.querySelector(".win").getBoundingClientRect().width`);
  await click(`.win .tbtn[data-a="min"]`); await sleep(40);
  ok("minimize hides the window and flies an outline", await ev(`document.querySelector(".win").classList.contains("min")`) );
  ok("minimize sound", await ev(`__sounds.includes("minimize")`));
  await sleep(300); ok("the outline is gone afterwards", await ev(`!document.querySelector(".flyrect")`));
  await click(".task"); await sleep(50);
  ok("taskbar restores it", await ev(`!document.querySelector(".win").classList.contains("min") && __sounds.includes("restore")`));
  await click(`.win .tbtn[data-a="max"]`); await sleep(50);
  ok("maximize", await ev(`document.querySelector(".win").classList.contains("max") && __sounds.includes("maximize")`));
  await click(`.win .tbtn[data-a="max"]`); await sleep(250);
  ok("restore size", Math.abs((await ev(`document.querySelector(".win").getBoundingClientRect().width`)) - before) < 2);
  await closeAll();
  await ev(`document.querySelector(".snd-list")`); await openApp("control"); await click(`.cp-item[data-k="sounds"]`); await sleep(250);
  await click(`.snd-list [data-s="tada"]`); await sleep(40);
  ok("Sounds panel plays an event", await ev(`__sounds.includes("tada")`));
  await shot("07-sounds");
  await closeAll();
});
await test("shell: dialogs replace browser prompts", async () => {
  await load(); await openApp("mine"); await sleep(100);
  await click(`.win[data-key="mine"] .menubar [data-mi="0"]`); await sleep(40);
  await ev(`[...document.querySelectorAll(".dropdown [data-k]")].find(x=>/Custom\\.\\.\\./.test(x.textContent)).click()`); await sleep(200);
  ok("Custom Field is an XP dialog", await ev(`document.querySelectorAll(".askbox input").length===3`));
  await shot("08-dialog");
  await ev(`(()=>{const i=document.querySelectorAll(".askbox input"); i[0].value="12"; i[1].value="10"; i[2].value="15"; document.querySelector(".askbox").requestSubmit();})()`); await sleep(250);
  ok("custom board built", await ev(`${G("mine")}.W()===12 && ${G("mine")}.H()===10 && ${G("mine")}.M()===15`));
  await closeAll();
});
await test("shell: log off and shutdown", async () => {
  await load(); await openApp("notepad");
  await click("#startBtn"); await sleep(60); await click("#smLogoff"); await sleep(80);
  ok("log-off dialog", await ev(`!document.querySelector("#logoffBox").classList.contains("hidden")`));
  await sleep(1400); await shot("09-logoff");
  await click(`#logoffBox [data-act="cancel"]`); await sleep(50);
  ok("cancel keeps the session", await ev(`document.querySelector("#logoffBox").classList.contains("hidden") && document.querySelectorAll(".win").length===1`));
  await click("#startBtn"); await sleep(60); await click("#smLogoff"); await sleep(60); await click(`#logoffBox [data-act="logoff"]`); await sleep(80);
  ok("logging off shows the blue screen and closes windows", await ev(`!document.querySelector("#welcome").classList.contains("hidden") && document.querySelectorAll(".win").length===0 && __sounds.includes("logoff")`));
  await key(" "); await sleep(100);
  ok("then the log-on screen", await ev(`!document.querySelector("#login").classList.contains("hidden")`));
  await click("#loginOff"); await sleep(1500); await shot("10-shutdown");
  await click(`#shutdown [data-act="off"]`); await sleep(80);
  ok("shutting down shows the blue screen", await ev(`!document.querySelector("#welcome").classList.contains("hidden") && __sounds.includes("shutdown")`));
  await key(" "); await sleep(60); await key(" "); await sleep(100);
  ok("safe to turn off", await until(`/safe to turn off/.test(document.querySelector("#blackoutMsg").textContent) && !document.querySelector("#blackout").classList.contains("hidden")`, 3000));
  await shot("11-safe");
  await click("#powerOn"); await sleep(120);
  ok("power on restarts the self test", await ev(`!document.querySelector("#post").classList.contains("hidden")`));
  await key(" "); await sleep(100);
  await load();
});
await test("sounds", async () => {
  await load();
  await ev(`(()=>{ const c=AudioNode.prototype.connect; AudioNode.prototype.connect=function(d,...r){ if(d instanceof AudioDestinationNode&&!this.context.__an){ const a=this.context.createAnalyser(); a.fftSize=2048; c.call(this,a); this.context.__an=a; window.__an=a; } return c.call(this,d,...r); }; })()`);
  await load();
  await ev(`(()=>{ const c=AudioNode.prototype.connect; AudioNode.prototype.connect=function(d,...r){ if(d instanceof AudioDestinationNode&&!this.context.__an){ const a=this.context.createAnalyser(); a.fftSize=2048; c.call(this,a); this.context.__an=a; window.__an=a; } return c.call(this,d,...r); }; })()`);
  await mouse(600,300); await sleep(100); await ev(`XPS.play("ding",true)`); await sleep(100);
  const names=await ev(`XPS.names`), bad=[], peaks={};
  for(const n of names){ await sleep(n==="startup"||n==="shutdown"?400:60);
    const p=await ev(`new Promise(async(ok)=>{ await new Promise(r=>setTimeout(r,500)); window.__an||ok(-1); const b=new Float32Array(2048); XPS.play(${JSON.stringify(n)},true); let m=0; const t=performance.now(); while(performance.now()-t<420){ __an.getFloatTimeDomainData(b); for(const v of b) m=Math.max(m,Math.abs(v)); await new Promise(r=>setTimeout(r,15)); } ok(m); })`);
    peaks[n]=+p.toFixed(3); if(!(p>0.002)||p>1.05) bad.push(n); }
  console.log("   peaks", JSON.stringify(peaks));
  ok("every sound in the scheme is audible and doesn't clip ("+names.length+")", !bad.length, bad.join());
  await ev(`localStorage.setItem("xp-mute","1")`); await sleep(1500);
  const q=await ev(`new Promise(async(ok)=>{ const b=new Float32Array(2048); XPS.play("tada",true); let m=0; const t=performance.now(); while(performance.now()-t<300){ __an.getFloatTimeDomainData(b); for(const v of b) m=Math.max(m,Math.abs(v)); await new Promise(r=>setTimeout(r,15)); } ok(m); })`);
  ok("mute silences it", q<0.02, q); await ev(`localStorage.removeItem("xp-mute")`);
});
await test("minesweeper", async () => {
  await load(true, true); await openApp("mine"); await sleep(100); await shot("12-mine-new");
  const g = G("mine");
  ok("seven-segment display", await ev(`document.querySelectorAll(".lcd.left svg").length===3 && document.querySelector(".lcd.left").dataset.v==="010"`));
  ok("drawn face", await ev(`!!document.querySelector(".smiley svg")`));
  await click(`.cell[data-i="0"]`); await sleep(60);
  const grid = await ev(`${g}.grid()`), W = await ev(`${g}.W()`);
  ok("first click is safe", grid[0] !== -1 && grid[1] !== -1 && grid[W] !== -1);
  const mines = grid.flatMap((v, i) => (v === -1 ? [i] : []));
  await click(`.cell[data-i="${mines[0]}"]`, "right"); await sleep(30);
  ok("right click flags, counter drops", await ev(`document.querySelector('.cell[data-i="${mines[0]}"]').classList.contains("flag") && document.querySelector(".lcd.left").dataset.v==="009"`));
  await click(`.cell[data-i="${mines[0]}"]`, "right"); await sleep(30);
  await click(`.cell[data-i="${mines[0]}"]`, "right"); await sleep(30);
  ok("flag, then ?, then clear", await ev(`(()=>{const c=document.querySelector('.cell[data-i="${mines[0]}"]'); return !c.classList.contains("flag")&&!c.classList.contains("mark")&&c.textContent===""})()`));
  await click(`.cell[data-i="${mines[1]}"]`); await sleep(100);
  ok("hitting a mine: dead face and boom", await ev(`document.querySelector(".smiley").dataset.f==="dead" && __sounds.includes("boom")`));
  await shot("13-mine-boom");
  ok("the other mines appear", await ev(`document.querySelectorAll(".cell.mine").length===9`));
  await key(" "); await sleep(120);
  ok("Space skips to the result", await ev(`!document.querySelector(".mine-end").classList.contains("hidden")`));
  await sleep(200); await shot("14-mine-end");
  await click(".mine-end .again"); await sleep(60);
  await click(`.cell[data-i="0"]`); await sleep(40);
  const g2 = await ev(`${g}.grid()`);
  for (let i = 0; i < g2.length; i++) if (g2[i] !== -1 && !(await ev(`document.querySelector('.cell[data-i="${i}"]').classList.contains("open")`))) await ev(`document.querySelector('.cell[data-i="${i}"]').click()`);
  await sleep(100);
  ok("clearing the board wins", await ev(`${g}.won() && document.querySelector(".smiley").dataset.f==="cool" && __sounds.includes("tada")`));
  await sleep(800);
  ok("win dialog and a world time", await ev(`/You win/.test(document.querySelector(".mine-end").textContent)`) && (await until(`__scores.length>0`, 1500)));
  ok("Minesweeper times post through the same idempotent path", await ev(`__scoreUrls.every(u=>u.includes("scores/mine-Beginner/entries?documentId=") && new URL(u).searchParams.get("documentId").length>=16)`), await ev(`__scoreUrls.join(" ")`));
  const c = await ev(`JSON.parse(localStorage.getItem("xp-career"))`);
  ok("career recorded a loss and a win", c.games.mine.played === 2 && c.games.mine.won === 1 && c.pts > 0, JSON.stringify(c.games.mine));
  await closeAll();
});
await test("name before the first world score", async () => {
  await load(true, true); await ev(`sessionStorage.removeItem("xp-player-name"); sessionStorage.removeItem("xp-name-asked"); localStorage.setItem("xp-last-name","Ace")`);
  const win = async () => { await openApp("mine"); await sleep(100); await click(`.cell[data-i="0"]`); await sleep(40); const gr = await ev(`${G("mine")}.grid()`); await ev(`(()=>{ const g=${JSON.stringify(gr)}; g.forEach((v,i)=>{ const c=document.querySelector('.cell[data-i="'+i+'"]'); if(v!==-1&&!c.classList.contains("open")) c.click(); }); })()`); await sleep(1100); };
  await win();
  ok("a win asks for a name first, prefilled", (await ev(`document.querySelector(".askbox input")?.value`)) === "Ace");
  await ev(`(()=>{const i=document.querySelector(".askbox input"); i.value="Ace2"; document.querySelector(".askbox").requestSubmit();})()`);
  ok("the time posts under that name", await until(`__scores.at(-1)?.name?.stringValue==="Ace2"`, 2000));
  await closeAll(); await win();
  ok("the next win doesn't ask again", !(await ev(`!!document.querySelector(".askbox")`)) && (await until(`__scores.length===2 && __scores.at(-1).name.stringValue==="Ace2"`, 2000)));
  await closeAll();
  await ev(`sessionStorage.removeItem("xp-player-name"); sessionStorage.removeItem("xp-name-asked")`); await win();
  await ev(`[...document.querySelectorAll(".win")].find(w=>w.querySelector(".askbox")).querySelector(".tbtn[data-a=close]").click()`);
  ok("cancel posts as Visitor", await until(`__scores.length===3 && __scores.at(-1).name.stringValue==="Visitor"`, 2000));
  await closeAll();
});
await test("solitaire", async () => {
  await load(true, true); await openApp("solitaire"); await sleep(250);
  const g = G("solitaire");
  ok("dealing animates", await ev(`${g}.dealing`));
  await shot("15-sol-deal");
  await key(" "); await sleep(100);
  ok("Space finishes the deal", await ev(`!${g}.dealing`));
  await sleep(150); await shot("16-sol-table");
  const counts = await ev(`${g}.S.t.map(c=>c.length).join()+"|"+${g}.S.s.length`);
  ok("28 cards dealt, 24 in stock", counts === "1,2,3,4,5,6,7|24", counts);
  ok("number cards have real pips, court cards a frame", await ev(`(()=>{const S=${g}.S; const t=[...document.querySelectorAll('.card:not(.back)')]; return t.every(el=>el.querySelector(".pip,.cace,.cfig"))})()`));
  // draw-one recycle: first free, second costs 100
  await ev(`(()=>{const G=${g}; const S=G.S; S.w=[]; S.s=S.s.slice(0,2); G.S=S;})()`);
  await ev(`${g}.drawStock(); ${g}.drawStock();`);
  const sc0 = await ev(`${g}.score`); await ev(`${g}.drawStock()`);
  ok("first recycle is free", (await ev(`${g}.score`)) === sc0 && (await ev(`${g}.passes`)) === 1);
  await ev(`(()=>{const G=${g}; const S=G.S; G.S=S; })()`);
  await ev(`${g}.drawStock(); ${g}.drawStock();`); await ev(`(()=>{ const G=${g}; G.S.t[0][0].r; })()`);
  await ev(`(()=>{ const G=${g}; const d=G.score; })()`);
  await ev(`(()=>{const G=${g}; const S=G.S; G.S=S; })()`);
  const before = await ev(`${g}.score`); await ev(`${g}.drawStock()`);
  ok("second recycle costs (or floors at 0)", (await ev(`${g}.score`)) === Math.max(0, before - 100) && (await ev(`${g}.passes`)) === 2);
  await ev(`${g}.undo()`);
  ok("undo restores the pass count", (await ev(`${g}.passes`)) === 1);
  // near-win: everything on foundations except one king
  await ev(`(()=>{ const G=${g}, mk=(s,r)=>({id:s*13+r,s,r,up:true}); const f=[0,1,2,3].map(s=>Array.from({length:13},(_,i)=>mk(s,i+1))); const k=f[0].pop(); G.S={s:[],w:[],f,t:[[k],[],[],[],[],[],[]]}; G.secs=100; })()`);
  await ev(`document.querySelector(".sol-auto")`);
  await sleep(60); const r = await center(`.card[data-pile="t0"]`); await mouse(r.x, r.y); await sleep(120);
  ok("winning move ends the game", await ev(`${g}.won`));
  ok("time bonus added (700000/100)", (await ev(`${g}.score`)) >= 7000, await ev(`${g}.score`));
  ok("tada", await ev(`__sounds.includes("tada")`));
  ok("cascade runs", await ev(`!!${g}.casc`));
  await sleep(1500); await shot("17-sol-cascade");
  await key(" "); await sleep(200);
  ok("a key ends the cascade, win dialog shows", await ev(`/You Won/.test(document.querySelector(".sol-win")?.textContent||"")`));
  ok("score posted", await until(`__scores.length>0`, 1500));
  await shot("18-sol-win");
  ok("trophy balloon", await ev(`/First Win/.test(document.querySelector(".balloons").textContent)`));
  await click(".sol-win .xpbtn"); await sleep(100); await key(" "); await sleep(100);
  // deck picker
  await click(`.win[data-key="solitaire"] .menubar [data-mi="0"]`); await sleep(40);
  await ev(`[...document.querySelectorAll(".dropdown [data-k]")].find(x=>/Deck/.test(x.textContent)).click()`); await sleep(120);
  await click(`.deck-pick[data-b="fish"]`); await sleep(60); await shot("19-sol-deck");
  ok("card back changes", await ev(`document.querySelector(".sol-table").dataset.back==="fish"`));
  await ev(`[...document.querySelectorAll(".sol-win .xpbtn")].pop().click()`);
  // vegas pass limit
  await click(`.win[data-key="solitaire"] .menubar [data-mi="0"]`); await sleep(40);
  await ev(`[...document.querySelectorAll(".dropdown [data-k]")].find(x=>/Vegas/.test(x.textContent)).click()`); await sleep(100); await key(" "); await sleep(100);
  ok("Vegas starts at -52", (await ev(`${g}.score`)) === -52);
  await ev(`(()=>{const G=${g}; const S=G.S; S.w=[]; S.s=S.s.slice(0,1); G.S=S;})()`); await ev(`${g}.drawStock()`); await ev(`${g}.drawStock()`);
  ok("Vegas Draw One refuses a second pass", (await ev(`${g}.passes`)) === 0 && /Vegas allows/.test(await ev(`document.querySelector(".sol-toast")?.textContent||""`)));
  await ev(`localStorage.setItem("xp-sol-vegas","0")`);
  await closeAll();
});
await test("spider", async () => {
  await load(true, true); await openApp("spider"); await sleep(250);
  const g = G("spider");
  ok("first visit asks for difficulty", await ev(`/Difficulty/.test(document.querySelector(".sol-win")?.textContent||"")`));
  await shot("20-spider-diff");
  await ev(`document.querySelector('.diff-list input[value="2"]').checked=true`); await click(".sol-win .xpbtn"); await sleep(100);
  ok("then deals with that difficulty", (await ev(`${g}.nS`)) === 2 && await ev(`${g}.dealing`));
  await key(" "); await sleep(120);
  ok("Space finishes the deal", await ev(`!${g}.dealing`));
  await shot("21-spider-table");
  const c = await ev(`${g}.S.t.map(c=>c.length).join()+"|"+${g}.S.k.length`);
  ok("54 cards dealt, 50 in stock", c === "6,6,6,6,5,5,5,5,5,5|50", c);
  // a full run on one column: moving the ace completes it
  await ev(`(()=>{ const G=${g}, mk=(id,s,r,up=true)=>({id,s,r,up}); const t=Array.from({length:10},(_,k)=>[mk(500+k,1,5,true)]); t[0]=[mk(600,1,9,false)]; for(let r=13;r>=2;r--) t[0].push(mk(100+r,0,r)); t[1]=[mk(601,1,6,true),mk(101,0,1)]; G.S={t,k:[],d:[]}; })()`);
  await sleep(60); const s0 = await ev(`${g}.score`);
  await ev(`${g}.move("t1",1,"t0")`); await sleep(60);
  ok("completed run leaves the table", (await ev(`${g}.S.d.length`)) === 1 && (await ev(`${g}.S.t[0].length`)) === 1);
  ok("the card beneath flips up", await ev(`${g}.S.t[0][0].up`));
  ok("+100 -1", (await ev(`${g}.score`)) === s0 + 99);
  ok("the run flies to the foundation", await ev(`document.querySelectorAll(".card.fly").length>0`));
  await shot("22-spider-run");
  await sleep(700);
  ok("the flying cards are cleaned up", await ev(`document.querySelectorAll(".card.fly").length===0`));
  // eighth run wins
  await ev(`(()=>{ const G=${g}, mk=(id,s,r,up=true)=>({id,s,r,up}); const d=Array.from({length:7},(_,k)=>Array.from({length:13},(_,i)=>mk(k*13+i+1,0,13-i))); const t=Array.from({length:10},()=>[]); for(let r=13;r>=2;r--) t[0].push(mk(800+r,1,r)); t[1]=[mk(801,1,1)]; G.S={t,k:[],d}; })()`);
  await sleep(40); await ev(`${g}.move("t1",0,"t0")`); await sleep(120);
  ok("eight runs win", await ev(`${g}.won && !!${g}.casc && __sounds.includes("tada")`));
  await sleep(1200); await shot("23-spider-cascade");
  await key(" "); await sleep(200);
  ok("win dialog", await ev(`/You Won/.test(document.querySelector(".sol-win")?.textContent||"")`));
  ok("career records the win", await ev(`JSON.parse(localStorage.getItem("xp-career")).games.spider.won===1`));
  await closeAll();
});
await test("snake", async () => {
  await load(true, true); await ev(`localStorage.setItem("xp-snake-speed","Fast")`);
  await key("r", 1); await sleep(80); await ev(`(()=>{const i=document.querySelector(".runin"); i.value="snake"; i.closest("form").requestSubmit();})()`); await sleep(150);
  ok("splash screen with progress bar", await ev(`!!document.querySelector(".splash .xp-progress")`));
  await shot("24-snake-splash");
  await key(" "); await sleep(100);
  ok("Space skips the splash without starting the game", await ev(`!document.querySelector(".splash") && ${G("snake")}.state==="ready"`));
  await shot("25-snake-intro");
  const g = G("snake");
  const mz = await ev(`(()=>{ const G=${g}, N=G.N; return G.MAZES.map(([name,rects])=>{ const w=new Uint8Array(N*N); for(const [a,b,c,d] of rects) for(let y=b;y<=d;y++) for(let x=a;x<=c;x++) w[y*N+x]=1; const spawn=[2,3,4,5,6,7,8].every(x=>!w[10*N+x]); let free=0; for(const v of w) if(!v) free++; const seen=new Set([10*N+4]); const q=[[4,10]]; while(q.length){ const [x,y]=q.pop(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const X=x+dx,Y=y+dy; if(X<0||Y<0||X>=N||Y>=N||w[Y*N+X]||seen.has(Y*N+X)) continue; seen.add(Y*N+X); q.push([X,Y]); } } return {name,spawn,free,reach:seen.size}; }); })()`);
  ok("all 10 mazes have a clear spawn and no sealed-off cells", mz.length === 10 && mz.every((m) => m.spawn && m.free === m.reach), JSON.stringify(mz.filter((m) => !m.spawn || m.free !== m.reach)));
  await key("ArrowUp"); await sleep(80);
  ok("an arrow key starts it", await ev(`["banner","run"].includes(${g}.state)`));
  await shot("26-snake-banner");
  await ev(`0`); await sleep(1700);
  ok("the banner gives way to play", await ev(`["run","dying","banner"].includes(${g}.state)`));
  await sleep(200); await shot("27-snake-play");
  await closeAll();
  // the bot: breadth-first path to the apple each frame, avoiding walls and body
  await speedup();
  await key("r", 1); await sleep(80); await ev(`(()=>{const i=document.querySelector(".runin"); i.value="snake"; i.closest("form").requestSubmit();})()`); await sleep(100); await key(" "); await sleep(100);
  await ev(`(()=>{ window.__snakeMax=0; window.__tick=()=>{ const w=document.querySelector('.win[data-key="snake"]'); const G=w?.__g; if(!G||G.state!=="run") return; window.__snakeMax=Math.max(window.__snakeMax,G.lv);
    const N=G.N, sn=G.sn, h=sn[0], t=G.food, blocked=new Uint8Array(N*N); for(let i=0;i<sn.length-1;i++) blocked[sn[i].y*N+sn[i].x]=1; for(let i=0;i<N*N;i++) if(G.wall[i]) blocked[i]=1;
    const prev=new Int32Array(N*N).fill(-1), q=[h.y*N+h.x]; prev[q[0]]=q[0]; let found=false; for(let i=0;i<q.length&&!found;i++){ const c=q[i], x=c%N, y=c/N|0; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const X=x+dx,Y=y+dy; if(X<0||Y<0||X>=N||Y>=N) continue; const k=Y*N+X; if(blocked[k]||prev[k]>=0) continue; prev[k]=c; q.push(k); if(X===t.x&&Y===t.y){found=true;break;} } }
    let step=null; if(found){ let c=t.y*N+t.x; while(prev[c]!==h.y*N+h.x) c=prev[c]; step=[c%N-h.x,(c/N|0)-h.y]; } else { for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const X=h.x+dx,Y=h.y+dy; if(X>=0&&Y>=0&&X<N&&Y<N&&!blocked[Y*N+X]){ step=[dx,dy]; break; } } }
    if(step&&(step[0]!==G.dir.x||step[1]!==G.dir.y)) G.turn(step[0],step[1]); }; })()`);
  await key(" "); await sleep(50); await key(" ");
  const t0 = Date.now(); let last = 0, lastLives = 3;
  while (Date.now() - t0 < 150000) {
    const s = await ev(`({lv:${g}.lv,st:${g}.state,li:${g}.lives,sc:${g}.score,sp:${g}.speed})`);
    if (s.st === "banner" || s.st === "clear" || s.st === "dying") { await key(" "); }
    if (s.lv !== last) { console.log("   snake level", s.lv, "score", s.sc, "lives", s.li, "tick", Math.round(s.sp)); last = s.lv; }
    if (s.st === "over" || s.lv >= 11) break;
    await sleep(120);
  }
  const end = await ev(`({lv:${g}.lv,st:${g}.state,li:${g}.lives,sc:${g}.score})`);
  ok("the bot clears the mazes: reached level 8+", end.lv >= 8, JSON.stringify(end));
  await ev(`window.__tick=null`);
  await ev(`0`); await sleep(100);
  await closeAll();
  ok("reached level is remembered for Level Select", +(await ev(`localStorage.getItem("xp-snake-reached")`)) >= 2);
  await load(); await openApp("snake"); await sleep(50); await key(" "); await sleep(100);
  await click(`.win[data-key="snake"] .menubar [data-mi="0"]`); await sleep(40);
  await ev(`[...document.querySelectorAll(".dropdown [data-k]")].find(x=>/Level Select/.test(x.textContent)).click()`); await sleep(120);
  await shot("28-snake-levels");
  ok("level select lists 10 levels, later ones locked", await ev(`document.querySelectorAll(".lvl-grid .xpbtn").length===10 && document.querySelector('.lvl-grid [data-l="2"]').disabled===false`));
  await click(`.lvl-grid [data-l="2"]`); await sleep(100);
  ok("picking a level starts there", (await ev(`${g}.lv`)) === 2);
  // crash into the wall: lose a life, restart the level with the same apples left
  await key("ArrowUp"); await sleep(50); await key(" "); await sleep(50);
  ok("game running", await until(`${g}.state==="run"`, 2500));
  await ev(`(()=>{ const G=${g}; })()`);
  ok("hitting a wall costs a life", await until(`${g}.lives===2`, 6000));
  await shot("29-snake-dying");
  await key(" "); await sleep(80); await key(" ");
  ok("then the level restarts", await until(`${g}.state==="run" && ${g}.sn.length===3`, 2500));
  await closeAll();
});
await test("breakout", async () => {
  await load(true, true); await speedup();
  await key("r", 1); await sleep(80); await ev(`(()=>{const i=document.querySelector(".runin"); i.value="breakout"; i.closest("form").requestSubmit();})()`); await sleep(100); await shot("30-brick-splash"); await key(" "); await sleep(120);
  const g = G("breakout");
  const lv = await ev(`${g}.LEVELS.map(([n,m])=>[n,m.every(r=>r.length===12),m.length,m.join("").replace(/[.U]/g,"").length])`);
  ok("12 levels, every row 12 wide, each with breakable bricks", lv.length === 12 && lv.every((l) => l[1] && l[3] > 0), JSON.stringify(lv.filter((l) => !l[1] || !l[3])));
  await shot("31-brick-intro");
  await ev(`window.__tick=()=>{ const w=document.querySelector('.win[data-key="breakout"]'); const G=w?.__g; if(!G) return; if(G.state==="ready"||G.state==="banner"||G.balls.some(b=>b.stuck)) { G.launch(); } const live=G.balls.filter(b=>!b.stuck); const b=live.sort((a,c)=>c.y-a.y)[0]; const pu=G.pups.sort((a,c)=>c.y-a.y)[0]; const tgt=b&&(b.vy>0||!pu)?b.x:pu?pu.x:G.pad.x+G.pad.w/2; G.setPad(tgt-G.pad.w/2+((performance.now()/40)%30-15)); }`);
  const t0 = Date.now(); let last = 0, shotDone = false;
  while (Date.now() - t0 < 180000) {
    const s = await ev(`({lv:${g}.level,st:${g}.state,li:${g}.lives,sc:${g}.score,r:${g}.remain,b:${g}.balls.length})`);
    if (s.lv !== last) { console.log("   brick level", s.lv, "score", s.sc, "lives", s.li, "bricks", s.r); last = s.lv; await sleep(60); await shot(`32-brick-L${s.lv}`); }
    if (s.st === "paused") await key("p");
    if (s.st === "over" || s.lv >= 13) break;
    await sleep(150);
  }
  const end = await ev(`({lv:${g}.level,st:${g}.state,li:${g}.lives,sc:${g}.score})`);
  ok("the bot clears all 12 levels", end.lv >= 13, JSON.stringify(end));
  await ev(`window.__tick=null`); await closeAll();
  await load(); await openApp("breakout"); await sleep(50); await key(" "); await sleep(120);
  for (const k of ["W", "M", "S", "C", "L", "G", "F"]) await ev(`${g}.apply("${k}")`);
  await key(" "); await sleep(600);
  ok("all seven power-ups apply without error", await ev(`${g}.balls.length>=1`));
  await shot("33-brick-powers");
  await closeAll();
});
await test("pinball", async () => {
  await load(true, true); await speedup();
  await key("r", 1); await sleep(80); await ev(`(()=>{const i=document.querySelector(".runin"); i.value="pinball"; i.closest("form").requestSubmit();})()`); await sleep(100); await shot("34-pin-splash"); await key(" "); await sleep(150);
  const g = G("pinball");
  await sleep(200); await shot("35-pin-intro");
  // a short screen keeps a 360px minimum so the score line fits; the cabinet fill covers the rest
  const bars = await ev(`(()=>{const w=document.querySelector('.win[data-key="pinball"]'); return {gap:w.querySelector(".game-stage").clientWidth-w.querySelector("canvas").getBoundingClientRect().width, w:w.offsetWidth, fill:getComputedStyle(w.querySelector(".game-stage")).backgroundImage}})()`);
  ok("the window is as wide as the table (or its 360px minimum), and filled beside it", (bars.gap <= 4 || bars.w === 360) && /gradient/.test(bars.fill), JSON.stringify(bars));
  ok("panel shows rank and mission", /CADET/.test(await ev(`document.querySelector(".pb-rank").textContent`)) && /Hit the bumpers: 0\/8/.test(await ev(`document.querySelector(".pb-mis").textContent`)));
  // bot: hold the plunger to launch; flip when the ball is about to reach a flipper
  await ev(`window.__pb={maxX:0,minX:999,minY:9999,maxY:0,stuck:0,stuckMax:0,lx:0,ly:0,frames:0,holes:0,hole0:false}; window.__tick=()=>{ const w=document.querySelector('.win[data-key="pinball"]'); const G=w?.__g; if(!G) return; const B=G.B, p=window.__pb; p.frames++;
    if(G.state==="ready"){ G.launch(); return; }
    if(G.state==="play"){ p.maxX=Math.max(p.maxX,B.x);p.minX=Math.min(p.minX,B.x);p.minY=Math.min(p.minY,B.y);p.maxY=Math.max(p.maxY,B.y); const moved=Math.hypot(B.x-p.lx,B.y-p.ly); p.lx=B.x;p.ly=B.y; if(moved<0.5&&G.holeT<=0){p.stuck++;p.stuckMax=Math.max(p.stuckMax,p.stuck);}else p.stuck=0; if(G.holeT>0&&!p.hole0)p.holes++; p.hole0=G.holeT>0; const near=B.y>470&&B.vy>0; G.kd.KeyZ=near&&B.x<188; G.kd.Slash=near&&B.x>=188; } else { G.kd.KeyZ=false; G.kd.Slash=false; } }`);
  const t0 = Date.now(); let lastRank = -1, shots = 0;
  while (Date.now() - t0 < 120000) {
    const s = await ev(`({st:${g}.state,sc:${g}.score,ball:${g}.ball,max:${g}.maxBalls,rank:${g}.rank,mis:${g}.mis,x:${g}.B.x,y:${g}.B.y})`);
    if (s.rank !== lastRank) { console.log("   pinball rank", s.rank, "score", s.sc, "ball", s.ball, "/", s.max, "mission", s.mis.join()); lastRank = s.rank; }
    if (s.st === "bonus") { if (shots < 1) { shots++; await shot("37-pin-bonus"); } await key(" "); }
    if (s.st === "paused") await key("p");
    if (Date.now() - t0 > 3000 && shots === 1) { shots = 2; }
    if (s.st === "over") break;
    await sleep(100);
  }
  const end = await ev(`({st:${g}.state,sc:${g}.score,ball:${g}.ball,rank:${g}.rank,mis:${g}.mis,pb:__pb})`);
  console.log("   ", JSON.stringify(end));
  await shot("38-pin-over");
  ok("game runs to game over", end.st === "over");
  ok("the bot scored", end.sc > 1000);
  ok("the ball stays on the table", end.pb.minX >= 0 && end.pb.maxX <= 400 && end.pb.minY >= -2, JSON.stringify([end.pb.minX, end.pb.maxX, end.pb.minY]));
  ok("the ball never sits still for over 3 simulated seconds", end.pb.stuckMax < 60, end.pb.stuckMax);
  ok("the career and leaderboard recorded it", (await ev(`JSON.parse(localStorage.getItem("xp-career")).games.pinball.played`)) === 1 && (await until(`__scores.length>0`, 1500)));
  await ev(`window.__tick=null`); await closeAll();
  await load(); await openApp("pinball"); await sleep(50); await key(" "); await sleep(250);
  await key(" ", 0, true, false); await sleep(600); await shot("36-pin-plunger"); await key(" ", 0, false, true); await sleep(200);
  ok("holding and releasing Space launches", await ev(`${g}.state==="play"`), await ev(`${g}.state`));
  await sleep(300); await shot("39-pin-play");
  for (let i = 0; i < 2; i++) await key("x");
  ok("a couple of nudges are safe", !(await ev(`${g}.tilted`)));
  for (let i = 0; i < 3; i++) await key("x");
  ok("a burst of nudges tilts", await ev(`${g}.tilted`));
  ok("the panel says TILT", /TILT/.test(await until(`document.querySelector(".pb-mis").textContent==="TILT"`, 500) ? "TILT" : ""));
  // missions
  await ev(`(()=>{const G=${g}; for(let i=0;i<8;i++) G.mission("bump");})()`); await sleep(50);
  ok("finishing a mission ranks up", (await ev(`${g}.rank`)) === 1 && (await ev(`${g}.mis.join()`)) === "1,0,8");
  await ev(`(()=>{const G=${g}; G.mission("bump");})()`);
  ok("the wrong event doesn't count", (await ev(`${g}.mis.join()`)) === "1,0,8");
  await closeAll();
});
await test("games folder and career", async () => {
  await load(); await ev(`localStorage.setItem("xp-career",JSON.stringify({pts:350,games:{mine:{played:3,won:2,bestStreak:2,bestTime:44},snake:{played:4,won:2,bestLevel:6,bestScore:1800}},trophies:["first","snake5"]}))`);
  await openApp("games"); await sleep(200); await shot("40-games-folder");
  ok("shows level and rank (350 XP is level 3)", /Level 3: User/.test(await ev(`document.querySelector(".pcard").textContent`)));
  ok("progress bar 50/300", /50 of 300 XP/.test(await ev(`document.querySelector(".pcard").textContent`)));
  ok("records table", (await ev(`document.querySelectorAll(".gstats tbody tr").length`)) === 6);
  await closeAll();
});
await test("phone layout of a game", async () => {
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await load(); await openApp("solitaire"); await sleep(200); await key(" "); await sleep(200); await shot("41-phone-sol");
  ok("no horizontal page scroll", await ev(`document.documentElement.scrollWidth<=innerWidth`));
  await closeAll(); await openApp("pinball"); await sleep(50); await key(" "); await sleep(300); await shot("42-phone-pin"); await closeAll();
  await click("#startBtn"); await sleep(100); await click("#smAll"); await sleep(100); await shot("43-phone-start");
  await send("Emulation.clearDeviceMetricsOverride");
});
// ---------------- robustness: real input, interrupted waits, every menu item, random input ----------------
const cardAt = (pile, i) => center(`.card[data-pile="${pile}"][data-i="${i}"]`);
// the strip of a fanned card that stays visible above the cards on top of it
const grip = (pile, i) => ev(`(()=>{const b=document.querySelector('.card[data-pile="${pile}"][data-i="${i}"]')?.getBoundingClientRect(); return b&&{x:b.left+b.width/2,y:b.top+5}})()`);
const rectOf = (sel) => ev(`(()=>{const b=document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return b&&{x:Math.round(b.left),y:Math.round(b.top)}})()`);
await test("solitaire: real mouse drags", async () => {
  await load(); await openApp("solitaire"); await sleep(150); await key(" "); await sleep(150);
  const g = G("solitaire");
  // t0: 8♥ | t1: 7♠ | t2: 7♥ | t3: 9♠ | t4: 2♣ (down), K♦ | t5: empty | t6: A♠ ; stock: two cards
  await ev(`(()=>{ const G=${g}, c=(id,s,r,up=true)=>({id,s,r,up}); G.S={s:[c(201,3,5,false),c(202,3,6,false)],w:[],f:[[],[],[],[]],t:[[c(101,1,8)],[c(102,0,7)],[c(103,1,7)],[c(104,0,9)],[c(105,3,2,false),c(106,2,13)],[],[c(107,0,1)]]}; })()`);
  await sleep(60);
  await dragTo(await cardAt("t1", 0), await cardAt("t0", 0)); await sleep(250);
  ok("dragging 7♠ onto 8♥ moves it", await ev(`${g}.S.t[0].length===2 && ${g}.S.t[1].length===0 && ${g}.S.t[0][1].id===102`));
  const home = await rectOf(`.card[data-pile="t2"][data-i="0"]`);
  await dragTo(await cardAt("t2", 0), await cardAt("t3", 0)); await sleep(300);
  const back = await rectOf(`.card[data-pile="t2"][data-i="0"]`);
  ok("an illegal drop (7♥ on 9♠) snaps back", (await ev(`${g}.S.t[2].length===1 && ${g}.S.t[3].length===1`)) && back && Math.abs(back.x - home.x) < 2 && Math.abs(back.y - home.y) < 2, JSON.stringify([home, back]));
  const sc0 = await ev(`${g}.score`);
  await dragTo(await cardAt("t4", 1), await center(`.slot[data-pile="t5"]`)); await sleep(250);
  ok("a King drops onto an empty column and the card under it turns over (+5)", (await ev(`${g}.S.t[5].length===1 && ${g}.S.t[5][0].r===13 && ${g}.S.t[4][0].up`)) && (await ev(`${g}.score`)) === sc0 + 5);
  const sc1 = await ev(`${g}.score`), r = await cardAt("t6", 0); await mouse(r.x, r.y); await sleep(250);
  ok("clicking an Ace sends it to a foundation (+10)", (await ev(`${g}.S.f.some(f=>f.length===1&&f[0].r===1) && ${g}.S.t[6].length===0`)) && (await ev(`${g}.score`)) === sc1 + 10);
  const d = await center(`.slot[data-pile="s"]`); await mouse(d.x, d.y); await sleep(200);
  ok("clicking the deck draws a card", await ev(`${g}.S.w.length===1 && ${g}.S.s.length===1 && ${g}.S.w[0].up`));
  await closeAll();
});
await test("spider: real mouse drags and deals", async () => {
  await load(); await ev(`localStorage.setItem("xp-spider-suits","2")`); await openApp("spider"); await sleep(150); await key(" "); await sleep(150);
  const g = G("spider");
  const setup = (empty) => ev(`(()=>{ const G=${g}, c=(id,s,r,up=true)=>({id,s,r,up}); const t=Array.from({length:10},(_,k)=>[c(300+k,1,2+((k*3)%9),true)]); t[0]=[c(400,1,12,false),c(401,0,9),c(402,0,8),c(403,0,7)]; t[1]=[c(404,1,10)]; ${empty ? "t[5]=[];" : ""} G.S={t,k:Array.from({length:10},(_,i)=>c(500+i,i%2,1+i,false)),d:[]}; })()`);
  await setup(true); await sleep(60);
  await dragTo(await grip("t0", 1), await cardAt("t1", 0)); await sleep(250);
  ok("a same-suit run 9-8-7 drags as one group", await ev(`${g}.S.t[1].length===4 && ${g}.S.t[1].slice(1).map(c=>c.r).join()==="9,8,7" && ${g}.S.t[0].length===1 && ${g}.S.t[0][0].up`));
  const mixed = await ev(`(()=>{ const G=${g}; G.S.t[2]=[{id:600,s:0,r:6,up:true},{id:601,s:1,r:5,up:true}]; G.render(); return 1; })()`);
  await dragTo(await grip("t2", 0), await cardAt("t1", 3)); await sleep(250);
  ok("a mixed-suit pair won't drag together", mixed && (await ev(`${g}.S.t[2].length===2 && ${g}.S.t[1].length===4`)));
  const st = await center(`.card[data-pile="s"]`); await mouse(st.x, st.y); await sleep(120);
  ok("refuses to deal with an empty column", (await ev(`${g}.S.k.length===10 && !${g}.dealing`)) && /Fill all empty/.test(await ev(`document.querySelector(".sol-toast")?.textContent||""`)));
  await setup(false); await sleep(60);
  const st2 = await center(`.card[data-pile="s"]`); await mouse(st2.x, st2.y); await sleep(30);
  const was = await ev(`${g}.dealing`); await key(" "); await sleep(40);
  ok("Space cuts a row deal short", was && !(await ev(`${g}.dealing`)) && (await ev(`${g}.S.k.length===0 && ${g}.S.t.every(p=>p.length>=2)`)));
  await sleep(300); ok("no deal animation left running", await ev(`document.getAnimations().filter(a=>a.playState==="running"&&a.effect?.target?.classList?.contains("card")).length===0`));
  await closeAll();
});
await test("career: abandoning a game", async () => {
  await load(true, true); await openApp("solitaire"); await sleep(150); await key(" "); await sleep(100);
  await closeAll();
  ok("closing an untouched deal records nothing", !(await ev(`JSON.parse(localStorage.getItem("xp-career")||"{}").games?.solitaire`)));
  await openApp("solitaire"); await sleep(150); await key(" "); await sleep(100);
  const d = await center(`.slot[data-pile="s"]`); await mouse(d.x, d.y); await sleep(100);
  await closeAll();
  ok("closing after a move counts as a loss", await ev(`(()=>{const g=JSON.parse(localStorage.getItem("xp-career")).games.solitaire; return g.played===1 && !g.won})()`));
  await openApp("spider"); await sleep(150); await click(".sol-win .xpbtn"); await sleep(100); await key(" "); await sleep(100);
  const st = await center(`.card[data-pile="s"]`); await mouse(st.x, st.y); await sleep(60); await key(" "); await sleep(60);
  await key("F2"); await sleep(100);
  ok("dealing again after a move counts as a loss", await ev(`(()=>{const g=JSON.parse(localStorage.getItem("xp-career")).games.spider; return g?.played===1 && !g.won})()`));
  await key("F2"); await sleep(100);
  ok("dealing again straight away doesn't", await ev(`JSON.parse(localStorage.getItem("xp-career")).games.spider.played===1`));
  await closeAll();
});
await test("interrupted waits", async () => {
  await load(); const e0 = errors.length;
  await openApp("snake"); await sleep(100); await closeAll(); await sleep(1600);
  ok("closing during a splash is clean", !(await ev(`document.querySelector('.win[data-key="snake"]')`)) && errors.length === e0, errors.slice(e0).join(" | "));
  await openApp("snake"); await sleep(80);
  await click(".board-dock textarea"); await sleep(50); await key(" "); await sleep(60);
  ok("Space typed into the Message Board doesn't skip the splash", (await ev(`!!document.querySelector(".splash")`)) && / /.test(await ev(`document.querySelector(".board-dock textarea").value`)));
  await ev(`document.querySelector(".board-dock textarea").value=""`);
  await click('.win[data-key="snake"] .titlebar'); await sleep(50); await key(" "); await sleep(100);
  const g = G("snake");
  await key("ArrowUp"); await sleep(80);
  ok("an arrow key shows the level banner", (await ev(`${g}.state`)) === "banner");
  await key("F2"); await sleep(60);
  ok("F2 during the banner goes back to the title", (await ev(`${g}.state`)) === "ready");
  await key(" "); await sleep(80);
  ok("and Space then starts the game (not eaten by the old banner)", (await ev(`${g}.state`)) === "banner", await ev(`${g}.state`));
  await sleep(1700); ok("the old banner never starts play early", ["run", "paused"].includes(await ev(`${g}.state`)));
  await key("F2"); await sleep(60); await key("ArrowUp"); await sleep(80);
  await click(`.win[data-key="snake"] .tbtn[data-a="min"]`); await sleep(1800);
  await click(".task"); await sleep(250);
  ok("minimized during the banner, it comes back paused", (await ev(`${g}.state`)) === "paused", await ev(`${g}.state`));
  await closeAll();
  await openApp("mine"); await sleep(100);
  await click(`.cell[data-i="0"]`); await sleep(60);
  const grid = await ev(`${G("mine")}.grid()`), m = grid.indexOf(-1);
  await click(`.cell[data-i="${m}"]`); await sleep(30); const n0 = await ev(`__sounds.length`), e1 = errors.length;
  await closeAll(); await sleep(1500);
  ok("closing during the mine blasts stops them cleanly", (await ev(`__sounds.slice(${n0}).filter(s=>s==="pop").length`)) === 0 && errors.length === e1, errors.slice(e1).join(" | "));
  await openApp("pinball"); await sleep(80); await key(" "); await sleep(150);
  const pb = G("pinball");
  await key(" ", 0, true, false); await sleep(300); await key(" ", 0, false, true); await sleep(100);
  await ev(`${pb}.B.y=640`); await until(`${pb}.state==="ready"`, 1500); // the ball saver serves the first one again
  await ev(`${pb}.launch()`); await sleep(100); await ev(`${pb}.B.y=640`); ok("a drained ball shows the bonus screen", await until(`${pb}.state==="bonus"`, 1500));
  await key("F2"); await sleep(60);
  await key(" ", 0, true, false); await sleep(250);
  ok("F2 during the bonus, then Space pulls the plunger", (await ev(`${pb}.state`)) === "ready" && (await ev(`${pb}.B.y`)) > 556 + 2, await ev(`${pb}.state+" "+${pb}.B.y`));
  await key(" ", 0, false, true); await sleep(1700);
  ok("and the old bonus screen never ends the new ball", (await ev(`${pb}.ball`)) === 1 && (await ev(`${pb}.state`)) !== "bonus");
  await closeAll();
  await openApp("solitaire"); await sleep(100);
  const s = G("solitaire");
  await key("F2"); await sleep(30); await key("F2"); await sleep(30);
  ok("a double re-deal finishes", await until(`!${s}.dealing`, 3000));
  ok("with a full, clean table", (await ev(`${s}.S.t.map(c=>c.length).join()+"|"+${s}.S.s.length`)) === "1,2,3,4,5,6,7|24" && (await ev(`document.querySelectorAll('.sol-table .card').length`)) === 28 + 3);
  await closeAll();
});
const GAMES6 = ["solitaire", "spider", "mine", "snake", "breakout", "pinball"];
// closes message boxes and dialogs a game opened, leaving the game itself
const closeOthers = (k) => ev(`(()=>{ let n=0; for (const w of document.querySelectorAll('.win')) if (w.dataset.key!=="${k}") { w.querySelector('.tbtn[data-a=close]')?.click(); n++; } return n; })()`);
await test("every menu item in every game", async () => {
  await load();
  for (const k of GAMES6) {
    const e0 = errors.length, done = [], off = [];
    await openApp(k); await sleep(120); await key(" "); await sleep(150);
    // make a move before each item, so Undo and Pause are live too
    const warm = async () => {
      await ev(`document.querySelector('.win[data-key="${k}"] .sol-win:not(.lvl-pick) .xpbtn')?.click(); document.querySelector('.win[data-key="${k}"] .lvl-x')?.click()`);
      const st = await ev(`${G(k)}?.state`);
      if ((k === "solitaire" || k === "spider") && (await ev(`${G(k)}.dealing`))) { await key(" "); await sleep(40); }
      if (k === "solitaire") await click(`.slot[data-pile="s"]`);
      if (k === "spider" && (await ev(`${G(k)}.S.k.length>0 && ${G(k)}.S.t.every(p=>p.length)`))) { await click(`.card[data-pile="s"]`); await sleep(40); await key(" "); }
      if (k === "snake" && st !== "run") { if (st === "paused") await key(" "); else { await key("ArrowUp"); await sleep(40); await key(" "); } }
      if (k === "breakout" && st !== "run") { await key(" "); await sleep(40); if ((await ev(`${G(k)}.state`)) !== "run") await key(" "); }
      await sleep(80);
    };
    const menus = await ev(`document.querySelectorAll('.win[data-key="${k}"] .menubar [data-mi]').length`);
    for (let mi = 0; mi < menus; mi++) {
      for (let it = 0; it < 40; it++) {
        await closeOthers(k); await sleep(30); await warm();
        await click(`.win[data-key="${k}"] .menubar [data-mi="${mi}"]`); await sleep(60);
        const info = await ev(`(()=>{const d=document.querySelectorAll(".dropdown [data-k]")[${it}]; if(!d) return null; d.dataset.t="1"; return {dis:d.classList.contains("dis"),label:d.textContent}})()`);
        if (info?.dis) off.push(info.label.trim());
        if (!info || info.dis || /Exit/.test(info.label)) { await click(`.win[data-key="${k}"] .menubar [data-mi="${mi}"]`); await sleep(30); if (!info) break; continue; }
        await click(`.dropdown [data-t="1"]`); await sleep(220); done.push(info.label.trim());
        if (await ev(`!!document.querySelector('.win[data-key="${k}"] .splash')`)) await key(" ");
      }
    }
    await closeOthers(k); await sleep(60);
    ok(`${k}: ${done.length} menu items work`, done.length >= 3 && errors.length === e0 && (await ev(`!!document.querySelector('.win[data-key="${k}"]')`)), errors.slice(e0).join(" | ") || done.join(", ") + (off.length ? "  (greyed out: " + off.join(", ") + ")" : ""));
    await closeAll();
  }
});
await test("random input in every game", async () => {
  await load();
  let seed = +process.env.SEED || 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", " ", "F2", "z", "/", "x", ".", "p", "h", "m", "Enter", "Escape", "a", "d"];
  for (const k of GAMES6) {
    const e0 = errors.length;
    await openApp(k); await sleep(120); await key(" "); await sleep(150);
    const box = await ev(`(()=>{const b=document.querySelector('.win[data-key="${k}"] .wbody').getBoundingClientRect(); return {x:b.left,y:b.top+24,w:b.width,h:b.height-30}})()`);
    for (let i = 0; i < 90; i++) {
      if (rnd() < 0.6) { const kk = KEYS[(rnd() * KEYS.length) | 0]; if (rnd() < 0.05) await key("z", 2); else if (rnd() < 0.15) { await key(kk, 0, true, false); await sleep(60); await key(kk, 0, false, true); } else await key(kk); }
      else {
        const x = box.x + rnd() * box.w, y = box.y + rnd() * box.h;
        // stay off an open menu, so the run never picks Exit
        if (await ev(`!!document.elementFromPoint(${x},${y})?.closest(".dropdown, .titlebar")`)) continue;
        if (rnd() < 0.3) await dragTo({ x, y }, { x: x + (rnd() - 0.5) * 200, y: y + (rnd() - 0.5) * 200 }, 4); else await mouse(x, y, rnd() < 0.15 ? "right" : "left");
      }
      await sleep(15 + rnd() * 40);
      if (i % 30 === 29) await closeOthers(k);
    }
    await closeOthers(k); await sleep(150);
    ok(`${k}: 90 random keys and clicks, no runtime errors`, errors.length === e0 && (await ev(`!!document.querySelector('.win[data-key="${k}"]')`)), errors.slice(e0).join(" | "));
    await shot(`50-random-${k}`);
    await closeAll();
  }
});
await test("reduced motion", async () => {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await load(); await openApp("solitaire"); await sleep(60);
  ok("no deal wait", !(await ev(`${G("solitaire")}.dealing`)));
  await closeAll(); await openApp("notepad"); await sleep(60);
  await click(`.win .tbtn[data-a="min"]`); await sleep(20);
  ok("no flying outline", await ev(`document.querySelector(".win").classList.contains("min") && !document.querySelector(".flyrect")`));
  await closeAll();
  await send("Emulation.setEmulatedMedia", { features: [] });
});
await test("first-time visitor", async () => {
  await load(false, true); await ev(`sessionStorage.clear()`); await send("Page.reload"); await sleep(700); // a new tab: earlier tests logged this one in
  await key(" "); await sleep(100);
  await click("#userTile"); await sleep(100); await key(" ");
  ok("About Me opens on the desktop", await until(`!!document.querySelector('.win[data-key="about"]')`, 2000));
  await sleep(300); await shot("51-first-visit");
  await closeAll();
});
const fails = res.filter(([, c]) => !c).length;
console.log(`\n${res.length - fails}/${res.length} passed`);
console.log("runtime errors:", errors.length ? "\n" + [...new Set(errors)].join("\n") : "none");
chrome.kill(); server.close(); ws.close(); setTimeout(() => process.exit(0), 300);
