// Drives headless Chrome over CDP against a local copy of the site. Firestore is faked inside the page: nothing reaches production.
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { spawn } from "node:child_process"; import os from "node:os";
const ROOT = process.argv[2].split("\\").join("/"), SHOTS = process.argv[3].split("\\").join("/");
const PORT = 5199, DBG = 9344;
const seen = { proxy: [] };
const proxy = (await import("file:///" + ROOT + "/api/proxy.js")).default;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".pdf": "application/pdf" };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/api/proxy") {
    seen.proxy.push({ url: u.searchParams.get("url"), check: u.searchParams.get("check"), site: req.headers["sec-fetch-site"], dest: req.headers["sec-fetch-dest"] });
    res.status = (c) => { res.statusCode = c; return res; };
    res.send = (b) => res.end(b); res.json = (b) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(b)); };
    req.query = Object.fromEntries(u.searchParams); return proxy(req, res);
  }
  if (u.pathname.startsWith("/api/")) { res.statusCode = 404; return res.end("{}"); }
  const f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("Content-Type", MIME[path.extname(f)] || "application/octet-stream"); res.end(d); });
}).listen(PORT, "127.0.0.1");
const prof = fs.mkdtempSync(path.join(os.tmpdir(), "xp-e2e-"));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", `--remote-debugging-port=${DBG}`, `--user-data-dir=${prof}`, "--window-size=1366,768", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${DBG}/json`)).json()).find((t) => t.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(), errors = [];
let label = "boot";
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.fail(new Error(d.error.message)) : p.ok(d.result); return; }
  if (d.method === "Runtime.exceptionThrown") { const e = d.params.exceptionDetails; errors.push(`[${label}] ${e.exception?.description || e.text} @${e.url}:${e.lineNumber}`); }
  if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errors.push(`[${label}] console.error: ${d.params.args.map((a) => a.value ?? a.description).join(" ")}`);
  if (d.method === "Page.javascriptDialogOpening") { dialogs.push(d.params.message); send("Page.handleJavaScriptDialog", { accept: dialogAccept, promptText: dialogText }); }
};
const dialogs = []; let dialogAccept = false, dialogText = "";
const send = (method, params = {}) => new Promise((ok, fail) => { const i = ++id; pend.set(i, { ok, fail }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const KC = { Enter: 13, Escape: 27, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, F5: 116, " ": 32, Tab: 9 };
const key = async (k, mods = 0) => {
  const up = k.length === 1 ? k.toUpperCase() : k, vk = KC[k] ?? up.charCodeAt(0), code = k.length === 1 ? (/[a-z]/i.test(k) ? "Key" + up : k === " " ? "Space" : "") : k;
  const text = k.length === 1 && !(mods & 3) ? k : k === "Enter" ? "\r" : undefined;
  await send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods, text, unmodifiedText: text });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
};
const typeText = async (s) => { for (const c of s) await key(c); };
const click = async (sel) => {
  const r = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:"nearest"}); const b=e.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}})()`);
  if (!r) throw new Error("no element " + sel);
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: type === "mouseMoved" ? "none" : "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
};
const res = []; const ok = (n, c, extra = "") => { res.push([n, !!c]); console.log((c ? "PASS " : "FAIL ") + n + (extra !== "" ? "  -> " + extra : "")); };
const test = async (n, fn) => { if (process.env.ONLY && !n.includes(process.env.ONLY)) return; label = n; try { await fn(); } catch (e) { ok(n + " (threw)", false, e.message); } };

// fake Firestore, installed before any page script
const FAKE = `(() => {
  const fs = window.__fs = { note: null, tasks: {}, pics: [], log: [], offline: false, seq: 0 };
  const real = window.fetch;
  const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
  const conv = (f) => { const o = {}; for (const [k, v] of Object.entries(f || {})) o[k] = "integerValue" in v ? +v.integerValue : "booleanValue" in v ? v.booleanValue : v.stringValue; return o; };
  const unconv = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "boolean" ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : { stringValue: String(v) }]));
  window.fetch = async (u, opt = {}) => {
    const s = String(u); if (!s.includes("firestore.googleapis.com")) return real(u, opt);
    const url = new URL(s), m = opt.method || "GET", p = decodeURIComponent(url.pathname.split("/documents")[1] || "");
    fs.log.push({ m, p, q: url.search, body: opt.body ? JSON.parse(opt.body) : null });
    if (fs.offline) throw new TypeError("Failed to fetch");
    if (p === "/shared/notepad") {
      if (m === "PATCH") { fs.note = conv(JSON.parse(opt.body).fields); return J({}); }
      return fs.note ? J({ name: "x/shared/notepad", fields: unconv(fs.note) }) : J({}, 404);
    }
    if (p === "/tasks" && m === "GET") return J({ documents: Object.entries(fs.tasks).map(([id, t]) => ({ name: "x/tasks/" + id, fields: unconv(t) })) });
    if (p === "/tasks" && m === "POST") { const id = "T" + (++fs.seq), t = conv(JSON.parse(opt.body).fields); fs.tasks[id] = t; await new Promise((r) => setTimeout(r, fs.slow || 0)); return J({ name: "x/tasks/" + id, fields: unconv(t) }); }
    if (p.startsWith("/tasks/")) {
      const id = p.slice(7);
      if (m === "DELETE") { delete fs.tasks[id]; return J({}); }
      if (url.search.includes("currentDocument.exists=true") && !fs.tasks[id]) return J({ error: { message: "nope" } }, 404);
      fs.tasks[id] = { ...fs.tasks[id], ...conv(JSON.parse(opt.body).fields) }; return J({});
    }
    if (s.includes(":runQuery")) return J([]);
    if (s.includes(":commit")) return J({});
    if (s.includes(":batchGet")) return J([]);
    if (p === "/pictures" && m === "GET") return J({ documents: fs.pics });
    return J({});
  };
  try { sessionStorage.setItem("xp-logged", "1"); } catch {}
})();`;
await send("Page.enable"); await send("Runtime.enable"); await send("Page.addScriptToEvaluateOnNewDocument", { source: FAKE });
const load = async (p = "/") => { await send("Page.navigate", { url: `http://127.0.0.1:${PORT}${p}` }); await sleep(1500); };
const openApp = async (name) => { await key("r", 1); await sleep(120); await ev(`(()=>{const i=document.querySelector(".runin"); i.value=${JSON.stringify(name)}; i.closest("form").requestSubmit();})()`); await sleep(350); };
const closeAll = async () => { for (let i = 0; i < 12; i++) { const n = await ev(`(()=>{const b=[...document.querySelectorAll(".win .tbtn[data-a=close]")].pop(); if(b){b.click(); return 1} return 0})()`); if (!n) break; await sleep(40); } };
const clearStorage = () => ev(`localStorage.clear()`);

await load();
const APPS = (fs.readFileSync(ROOT + "/app.js", "utf8").match(/const APPS = \{[\s\S]*?\n  \};/)[0].match(/^\s{4}([a-z]+):\s*\{/gm) || []).map((s) => s.trim().split(":")[0]);
await test("every app opens and closes", async () => {
  await ev(`window.__shot=0`);
  const failed = [];
  for (const a of APPS) {
    if (a === "run") continue; label = "open:" + a;
    await openApp(a); await sleep(a === "solitaire" || a === "wmp" ? 700 : 250);
    const open = await ev(`document.querySelectorAll(".win").length`);
    if (!open) failed.push(a);
    await closeAll();
  }
  ok(`opened ${APPS.length - 1} apps from the Run dialog`, !failed.length, failed.join(","));
});
await test("notepad shows shared text and does not overwrite", async () => {
  await clearStorage(); await ev(`localStorage.setItem("xp-notepad","MY OLD COPY"); __fs.note={text:"SHARED TEXT",updatedAt:1000}`);
  await openApp("notepad"); await sleep(400);
  const r = await ev(`(()=>{const t=document.querySelector("textarea.notepad"); return {v:t.value, focused:document.activeElement===t}})()`);
  ok("notepad applies server text while focused", r.v === "SHARED TEXT", JSON.stringify(r));
  await click("textarea.notepad"); await ev(`(()=>{const t=document.querySelector("textarea.notepad"); t.selectionStart=t.selectionEnd=t.value.length})()`); await typeText("x"); await sleep(1100);
  const n = await ev(`__fs.note.text`); ok("first keystroke keeps shared text", n === "SHARED TEXTx", n + " | " + JSON.stringify(await ev(`({v:document.querySelector("textarea.notepad").value, ae:document.activeElement?.tagName, st:document.querySelector(".nstat").textContent, ms:__fs.log.filter(l=>l.p==="/shared/notepad").map(l=>l.m+":"+JSON.stringify(l.body?.fields?.text||""))})`)));
  await ev(`__fs.note={text:"OTHER PERSON",updatedAt:5}`);  // older clock than ours
  await ev(`document.querySelector("textarea.notepad").blur()`);
  await ev(`dispatchEvent(new Event("focus"))`);
  await closeAll(); await openApp("notepad"); await sleep(300);
  ok("edit from a client with an older clock still shows", await ev(`document.querySelector("textarea.notepad").value`) === "OTHER PERSON");
  await click("textarea.notepad"); await key("F5"); await sleep(50);
  ok("F5 inserts time/date, page not reloaded", (await ev(`document.querySelector("textarea.notepad").value.length`)) > 12);
  await closeAll();
});
await test("calendar", async () => {
  const day = await ev(`(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")})()`);
  await ev(`__fs.tasks={}; __fs.tasks['"><img src=x onerror=window.__xss=1>']={date:"${day}",time:"",text:"evil",done:false,remind:false,updatedAt:1}; __fs.tasks.A1={date:"${day}",time:"",text:"ok task",done:false,remind:false,updatedAt:1}`);
  await openApp("calendar"); await sleep(500);
  ok("task id can't inject HTML", !(await ev(`!!window.__xss`)) && (await ev(`document.querySelectorAll(".task-list li").length`)) === 2);
  await click(`.task-list li[data-id="A1"] .tedit`); await sleep(100);
  ok("edit focuses box, no TypeError", await ev(`document.activeElement?.classList.contains("etext")`));
  await key("Escape");
  await ev(`__fs.offline=true`); await click(`.task-list li[data-id="A1"] .tdone`); await sleep(150);
  ok("offline tick marks task dirty", await ev(`JSON.parse(localStorage.getItem("xp-tasks")).find(t=>t.id==="A1").dirty===true`));
  await ev(`__fs.offline=false`); await closeAll(); await openApp("calendar"); await sleep(500);
  ok("offline tick reaches server on next sync", await ev(`__fs.tasks.A1.done===true`));
  await ev(`__fs.offline=true`); await click(`.task-list li[data-id="A1"] .tdel`); await sleep(120);
  await ev(`__fs.offline=false`); await closeAll(); await openApp("calendar"); await sleep(500);
  ok("offline delete reaches server on next sync", await ev(`!__fs.tasks.A1 && !document.querySelector('.task-list li[data-id="A1"]')`));
  await ev(`__fs.tasks.B1={date:"${day}",time:"",text:"b",done:false,remind:false,updatedAt:2}`);
  await closeAll(); await openApp("calendar"); await sleep(500);
  await ev(`delete __fs.tasks.B1`); await click(`.task-list li[data-id="B1"] .tdone`); await sleep(200);
  ok("task deleted elsewhere is not resurrected", await ev(`!__fs.tasks.B1`));
  // a slow create with an edit during it must not POST twice
  await ev(`__fs.slow=400; __fs.log.length=0`);
  await ev(`(()=>{const i=document.querySelector(".ctext"); i.value="slow"; i.closest("form").requestSubmit();})()`); await sleep(60);
  await ev(`dispatchEvent(new Event("online"))`);
  await sleep(700);
  ok("one POST per new task", (await ev(`__fs.log.filter(l=>l.m==="POST"&&l.p==="/tasks").length`)) === 1);
  await ev(`__fs.slow=0`); await key("n", 1); await sleep(50);
  ok("Alt+N focuses new task box", await ev(`document.activeElement?.classList.contains("ctext")`));
  await closeAll();
});
await test("window focus and game keys", async () => {
  ok("an empty board says so", /No messages yet/.test(await ev(`document.querySelector(".board-dock .mb-list").textContent`)));
  await ev(`localStorage.removeItem("xp-board-hidden")`);
  await openApp("snake"); await sleep(600);
  ok("snake window active", await ev(`!document.querySelector(".win").classList.contains("inactive")`));
  await click(".board-dock textarea"); await sleep(60);
  ok("clicking the board deactivates the window", await ev(`document.querySelector(".win").classList.contains("inactive")`));
  await typeText("wasd w"); await sleep(50);
  ok("keys reach the board instead of Snake", (await ev(`document.querySelector(".board-dock textarea").value`)) === "wasd w");
  await ev(`document.querySelector(".board-dock textarea").value=""`);
  await click(".win .titlebar .ttl"); await sleep(50);
  ok("clicking the window activates it again", await ev(`!document.querySelector(".win").classList.contains("inactive")`));
  await closeAll();
});
await test("shortcuts and menus", async () => {
  await key("t", 1); await sleep(400);
  ok("Alt+T opens Task Manager", await ev(`[...document.querySelectorAll(".win .ttl")].some(t=>/Task Manager/.test(t.textContent))`));
  await key("w", 1); await sleep(100);
  ok("Alt+W closes it", (await ev(`document.querySelectorAll(".win").length`)) === 0);
  await openApp("notepad"); await sleep(200);
  ok("auto-focus still goes to the textarea, not the menu", await ev(`document.activeElement?.tagName==="TEXTAREA"`));
  await ev(`document.querySelector(".menubar [data-mi]").focus()`); await key("Enter"); await sleep(50);
  ok("Enter opens a menu and focuses an item", await ev(`document.activeElement?.closest(".dropdown")!=null`));
  await key("ArrowDown"); await key("ArrowRight"); await sleep(50);
  ok("arrows move to the next menu", await ev(`document.querySelector(".menubar [data-mi].on")?.textContent==="Edit"`));
  await key("Escape"); await sleep(50);
  ok("Esc closes menu and returns focus", await ev(`!document.querySelector(".dropdown") && document.activeElement?.dataset.mi!=null`));
  await closeAll();
  await openApp("control"); await sleep(200); await click(`.cp-item[data-k="network"]`); await sleep(100);
  ok("Control Panel network popup stays open", await ev(`!document.querySelector("#trayPop").classList.contains("hidden")`));
  await closeAll(); await ev(`document.body.click()`);
  await ev(`__x=0`).catch(() => {});
});
await test("games CSS and calculator", async () => {
  await openApp("solitaire"); await sleep(700);
  ok("solitaire table can't be text-selected", (await ev(`getComputedStyle(document.querySelector(".sol-table")).userSelect`)) === "none");
  await closeAll();
  await openApp("calc"); await sleep(400);
  const press = async (a) => { await ev(`document.querySelector('.grid [data-a="${a}"]').click()`); };
  for (const a of ["d9", "o+", "d1", "d6", "sqrt", "o+"]) await press(a);
  const d = await ev(`document.querySelector(".grid").closest(".wbody").innerText`);
  ok("calculator keeps sqrt result when chaining", /(^|\n)\s*13\s*(\n|$)/.test(d), JSON.stringify(d.slice(0, 30)));
  await closeAll();
  await clearStorage(); await openApp("wmp"); await sleep(700);
  ok("media player volume default isn't 0", (await ev(`+document.querySelector('.win input[type=range].vol, .win .vol input, .win input[aria-label*="olume"]')?.value`)) > 0);
  await closeAll();
});
await test("search and IE", async () => {
  await openApp("ie"); await sleep(300);
  await ev(`__nav=(v)=>{const i=document.querySelector(".ieaddr input"); i.value=v; i.form.requestSubmit();}`);
  await ev(`__nav("https://www.google.com/")`); await sleep(2500);
  const last = seen.proxy.at(-1);
  ok("framing-blocked site goes through the proxy in a real browser", last && !last.check && last.site === "same-origin", JSON.stringify(last));
  const src = await ev(`document.querySelector(".win iframe").getAttribute("src")`);
  ok("iframe loads /api/proxy", src?.startsWith("/api/proxy"), src);
  const before = seen.proxy.length; await ev(`document.querySelector(".iereload").click()`); await sleep(2000);
  ok("Refresh keeps using the proxy", (await ev(`document.querySelector(".win iframe").getAttribute("src")`)).startsWith("/api/proxy") && seen.proxy.length > before);
  await ev(`__nav("node.js")`); await sleep(400);
  ok("'node.js' is a search, not an address", (await ev(`document.querySelector(".ieaddr input").value`)).includes("duckduckgo"));
  await ev(`__nav("example.com")`); await sleep(300);
  ok("'example.com' is an address", (await ev(`document.querySelector(".ieaddr input").value`)) === "https://example.com");
  await ev(`document.querySelector(".iehome").click()`); await sleep(200);
  ok("Home hides the frame", await ev(`document.querySelector(".win iframe").classList.contains("hidden")`));
  await closeAll();
});
await test("standby wakes on keyboard", async () => {
  await click("#startBtn"); await sleep(100); await click("#smShutdown"); await sleep(100); await click('#shutdown [data-act="standby"]'); await sleep(300);
  await key("a"); await sleep(200);
  ok("standby wakes on a key", !(await ev(`document.querySelector("#login").classList.contains("hidden")`)));
  await load();
});
await test("phone layout", async () => {
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send("Page.reload"); await sleep(1500);
  ok("no horizontal page scroll", await ev(`document.documentElement.scrollWidth<=innerWidth`));
  await openApp("search"); await sleep(300);
  const r = await ev(`(()=>{const q=document.querySelector(".sq"); const b=q?.getBoundingClientRect(); return {w:b?.width,vis:q&&getComputedStyle(q).display!=="none"&&b.width>0}})()`);
  ok("search box visible on a phone", r.vis, JSON.stringify(r));
  await closeAll();
  await ev(`localStorage.setItem("xp-mine-level","Expert")`);
  await openApp("mine"); await sleep(400);
  const m = await ev(`(()=>{const a=document.querySelector(".mine-area"), w=document.querySelector(".mine-wrap"); a.scrollLeft=0; const ab=a.getBoundingClientRect(), wb=w.getBoundingClientRect(); return {area:ab.left, wrap:wb.left, sw:a.scrollWidth, cw:a.clientWidth}})()`);
  ok("Expert board's left column reachable", m.wrap >= m.area - 0.5, JSON.stringify(m));
  await send("Emulation.clearDeviceMetricsOverride");
  await closeAll();
});
await test("resume page and real boot flow", async () => {
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/resume.html` }); await sleep(800);
  ok("resume lists six games", await ev(`document.body.innerText.includes("six games")`));
  await ev(`sessionStorage.removeItem("xp-logged")`); await send("Page.addScriptToEvaluateOnNewDocument", { source: `try{sessionStorage.removeItem("xp-logged")}catch{}` });
  await load(); await sleep(5000);
  const hidden = await ev(`document.querySelector("#login").classList.contains("hidden")`);
  ok("boot reaches the log-on screen", !hidden);
  await click("#userTile"); await sleep(2300);
  ok("log-on reaches the desktop with icons", await ev(`!document.querySelector("#desktop").classList.contains("hidden") && document.querySelectorAll("#icons .dicon").length>5`));
  const shot = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(SHOTS + "/desktop.png", Buffer.from(shot.data, "base64"));
});
if (process.env.SHOT) { label = "shot"; await send("Page.addScriptToEvaluateOnNewDocument", { source: `try{sessionStorage.setItem("xp-logged","1")}catch{}` }); await load(); await openApp("paint"); await sleep(500); const s = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(SHOTS + "/paint.png", Buffer.from(s.data, "base64")); }
const fails = res.filter(([, c]) => !c).length;
console.log(`\n${res.length - fails}/${res.length} passed; dialogs seen: ${dialogs.length}`);
console.log("runtime errors:", errors.length ? "\n" + [...new Set(errors)].join("\n") : "none");
chrome.kill(); server.close(); ws.close(); setTimeout(() => process.exit(0), 300);
