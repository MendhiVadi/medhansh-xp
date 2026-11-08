// Drives headless Chrome over CDP against a local copy of the site. Firestore is faked inside the page: nothing reaches production.
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { spawn } from "node:child_process"; import os from "node:os"; import { pathToFileURL } from "node:url";
const ROOT = process.argv[2].split("\\").join("/"), SHOTS = process.argv[3].split("\\").join("/");
const PORT = 5199, DBG = 9344;
fs.mkdirSync(SHOTS, { recursive: true });
const seen = { proxy: [] };
// the real proxy code, except that *.test hostnames resolve to a local fixture server (every other host gets real DNS and the private-address block)
const PX = await import(pathToFileURL(ROOT + "/api/proxy.js").href);
const { lookup } = await import("node:dns/promises");
const proxy = PX.makeProxy({ resolve: (h) => (h.endsWith(".test") ? Promise.resolve([{ address: "127.0.0.1", family: 4 }]) : lookup(h, { all: true })), isPrivate: (ip) => ip !== "127.0.0.1" && PX.privateIP(ip), over: async () => seen.over === true });
// fixture sites on port 8080: what real sites do that matters here
const FIX = { cookies: [] };
const fixture = http.createServer((req, res) => {
  const u = new URL(req.url, "http://" + req.headers.host), host = u.hostname, p = u.pathname; FIX.cookies.push(req.headers.cookie || "");
  const html = (b, h = {}) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...h }); res.end(b); };
  if (host === "frame.test") return html(`<title>Frameable</title><p>FRAMEOK</p><a id="two" href="/two">two</a>`);
  if (p.startsWith("/app")) return html(`<!doctype html><html><head><title>App</title><script>var ok=[];try{localStorage.setItem("k","v");ok.push(localStorage.getItem("k")==="v")}catch(e){ok.push(false)}try{document.cookie="a=1";ok.push(/a=1/.test(document.cookie))}catch(e){ok.push(false)}try{history.pushState({}, "", "/app/next");ok.push(true)}catch(e){ok.push(false)}</script></head><body><p id="r"></p><a id="p2" href="/page2">page 2</a><form id="s" action="/search"><input name="q" value="cats"></form><form id="pf" method="post" action="/send"><input name="m" value="x"></form><script>document.getElementById("r").textContent=ok.every(Boolean)?"SHIMS OK":"SHIMS FAIL "+ok</script></body></html>`, { "X-Frame-Options": "DENY", "Set-Cookie": "track=1" });
  if (p === "/page2") return html(`<title>Page 2</title><p>PAGE TWO</p>`, { "X-Frame-Options": "DENY" });
  if (p === "/search") return html(`<title>Search</title><p>RESULTS ${u.searchParams.get("q")}</p>`, { "X-Frame-Options": "DENY" });
  if (p === "/redir") { res.writeHead(302, { Location: "/page2?from=redir" }); return res.end(); }
  if (p === "/login") return html(`<title>Sign in</title><form><input name=u><input type="password" name=p></form>`, { "X-Frame-Options": "DENY" });
  if (p === "/jslogin") return html(`<title>Sign in</title><p>wait</p><script>setTimeout(function(){document.body.insertAdjacentHTML("beforeend","<input type=password>")},300)</script>`, { "X-Frame-Options": "DENY" });
  if (p === "/slow") return; // never answers
  if (p === "/big") return html("<p>" + "x".repeat(5 * 1024 * 1024), { "X-Frame-Options": "DENY" });
  if (p === "/cf") { res.writeHead(403, { "Content-Type": "text/html", "cf-mitigated": "challenge" }); return res.end("<title>Just a moment...</title>"); }
  if (p === "/blank") return html(`<title>Blank</title><div id="root"></div><script>/* an app that never renders here */</script>`, { "X-Frame-Options": "DENY" });
  const deny = { "X-Frame-Options": "DENY" };
  if (p === "/rewrite") return html(`<title>Rewrites</title><p>REWRITTEN</p><script>history.replaceState(null,"",location.href);history.replaceState(null,"",location.pathname+location.search)</script>`, deny);
  if (p === "/robot") return html(`<title>Are you a robot?</title><p>Please confirm.</p>`, deny);
  if (p === "/anomaly") { res.writeHead(202, { "Content-Type": "text/html", ...deny }); return res.end(`<title>Search</title><div class="anomaly-modal__title">bots</div>`); }
  if (p === "/waf") { res.writeHead(202, { "Content-Type": "text/html", "x-amzn-waf-action": "challenge" }); return res.end(`<p>checking</p>`); }
  if (p === "/refused") { res.writeHead(403, { "Content-Type": "text/html", ...deny }); return res.end(`<title>Forbidden</title><p>No.</p>`); }
  if (p === "/really404") { res.writeHead(404, { "Content-Type": "text/html", ...deny }); return res.end(`<title>Page not found</title><p>A real missing page from this site, with plenty of words on it.</p>`); }
  if (p === "/crash") return html(`<title>News</title><p>Application error: a client-side exception has occurred.</p>`, deny);
  if (p === "/route") return html(`<title>App</title><script>document.title="Page not found / App"</script><p>Hmm, nothing here. Log in or sign up to continue with plenty of other words on this page.</p>`, deny);
  if (p === "/selfnav") return html(`<title>Moves</title><p>moving away now</p><script>setTimeout(function(){location.replace("https://deny.test/x")},200)</script>`, deny);
  if (p === "/reloads") return html(`<title>Reloads</title><p>about to reload itself with plenty of words on the page</p><script>addEventListener("load",function(){setTimeout(function(){location.assign(location.pathname+location.search)},300)})</script>`, deny);
  if (p === "/skeleton") return html(`<title>Tube</title><svg width="24" height="24"></svg><div style="height:900px;background:#ccc"></div>`, deny);
  if (p === "/full") return html(`<title>Article</title><p>${"A real page with real words. ".repeat(20)}</p>`, deny);
  if (p === "/latin") { res.writeHead(200, { "Content-Type": "text/html; charset=iso-8859-1", "X-Frame-Options": "DENY" }); return res.end(Buffer.from("<title>Latin</title><p>caf\xe9</p>", "latin1")); }
  res.writeHead(404); res.end("nope");
}).listen(8080, "127.0.0.1");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".pdf": "application/pdf" };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/api/proxy") {
    seen.proxy.push({ url: u.searchParams.get("url"), check: u.searchParams.get("check"), site: req.headers["sec-fetch-site"], dest: req.headers["sec-fetch-dest"] });
    res.status = (c) => { res.statusCode = c; return res; };
    res.send = (b) => res.end(b); res.json = (b) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(b)); };
    req.headers["x-forwarded-for"] = "10.9." + (seen.proxy.length % 250) + ".1"; // a long run would trip the per-visitor throttle
    req.query = Object.fromEntries(u.searchParams); return proxy(req, res);
  }
  if (u.pathname.startsWith("/api/")) { res.statusCode = 404; return res.end("{}"); }
  const f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  fs.readFile(f, (e, d) => { if (e) { res.statusCode = 404; return res.end(); } res.setHeader("Content-Type", MIME[path.extname(f)] || "application/octet-stream"); res.end(d); });
}).listen(PORT, "127.0.0.1");
const prof = fs.mkdtempSync(path.join(os.tmpdir(), "xp-e2e-"));
// CHROME=<path> picks the browser; otherwise the first one found here
const CHROME = process.env.CHROME || ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/opt/pw-browsers/chromium", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => fs.existsSync(p));
if (!CHROME) { console.error("No Chrome found: set CHROME=<path to chrome>"); process.exit(1); }
// site isolation off, so the test can read Explorer's sandboxed frame from the page's frame tree
const chrome = spawn(CHROME, [...(process.platform === "linux" ? ["--no-sandbox"] : []), "--disable-site-isolation-trials", "--disable-features=IsolateOrigins,site-per-process", "--headless=new", `--remote-debugging-port=${DBG}`, `--user-data-dir=${prof}`, "--window-size=1366,768", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 100 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${DBG}/json`)).json()).find((t) => t.type === "page"); } catch {} }
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
const until = async (expr, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(40); } return false; };
const res = []; const ok = (n, c, extra = "") => { res.push([n, !!c]); console.log((c ? "PASS " : "FAIL ") + n + (extra !== "" ? "  -> " + extra : "")); };
// ONLY=<text> runs the tests whose name contains it; several can be given as a|b
const test = async (n, fn) => { if (process.env.ONLY && !process.env.ONLY.split("|").some((o) => n.includes(o))) return; label = n; try { await fn(); } catch (e) { ok(n + " (threw)", false, e.message); } };

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
    // message board: documentId creates, 409 on a repeat id, an optional slow reply (the write lands at once) or a failing reply
    const hold = (ms) => new Promise((ok, no) => { const t = setTimeout(ok, ms); opt.signal?.addEventListener("abort", () => { clearTimeout(t); no(new DOMException("aborted", "AbortError")); }); });
    fs.board ||= {};
    if (p === "/board" && m === "POST") {
      const id = url.searchParams.get("documentId") || "B" + (++fs.seq);
      if (fs.board[id]) return J({ error: { message: "exists" } }, 409);
      fs.board[id] = conv(JSON.parse(opt.body).fields);
      if (fs.boardFail) { fs.boardFail--; return J({ error: { message: "boom" } }, 503); }
      await hold(fs.boardSlow || 0);
      return J({ name: "x/board/" + id, fields: unconv(fs.board[id]) });
    }
    if (p.startsWith("/board/") && m === "GET") { const d = fs.board[p.slice(7)]; return d ? J({ name: "x" + p, fields: unconv(d) }) : J({}, 404); }
    if (s.includes(":runQuery") && opt.body?.includes('"board"')) return J(Object.entries(fs.board).map(([id, d]) => ({ document: { name: "x/board/" + id, fields: unconv(d) } })).sort((a, b) => +b.document.fields.createdAt.integerValue - +a.document.fields.createdAt.integerValue));
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
// a clean browser for a test: no saved settings (hidden board, mute...) left over from the tests before it
const fresh = async () => { await load(); await ev(`localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem("xp-logged","1"); indexedDB.deleteDatabase("xp-music")`); await load(); };

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
  // a reminder another tab already fired stays quiet here; an unclaimed one fires
  await ev(`(()=>{ const d=new Date(Date.now()+180000), p=(n)=>String(n).padStart(2,"0"); window.__rd=d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()); window.__rt=p(d.getHours())+":"+p(d.getMinutes()); for (const [k,x] of [["R1","claimed elsewhere"],["R2","not claimed"]]) __fs.tasks[k]={date:__rd,time:__rt,text:x,done:false,remind:true,updatedAt:3}; })()`);
  await closeAll(); await openApp("calendar"); await sleep(500); await closeAll();
  await ev(`(()=>{ const due=new Date(__rd+"T"+__rt).getTime(); localStorage.setItem("xp-rem-fired",JSON.stringify({["R1|"+due]:Date.now()})); window.__dn=Date.now; Date.now=()=>window.__dn.call(Date)+300000; })()`);
  await sleep(16000);
  const fired = await ev(`[...document.querySelectorAll(".balloon")].map(b=>b.textContent).join("|")`);
  ok("a reminder claimed by another tab stays quiet, an unclaimed one fires", /not claimed/.test(fired) && !/claimed elsewhere/.test(fired), fired);
  await ev(`Date.now=window.__dn; delete __fs.tasks.R1; delete __fs.tasks.R2; document.querySelectorAll(".balloon .bx").forEach(b=>b.click())`);
  await openApp("calendar"); await sleep(500);
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
  ok("Refresh keeps using the proxy", (await ev(`document.querySelector(".win iframe").getAttribute("src")||""`)).startsWith("/api/proxy") && seen.proxy.length > before);
  await ev(`__nav("node.js")`); await sleep(400);
  ok("'node.js' is a search, not an address", (await ev(`document.querySelector(".ieaddr input").value`)).includes("bing.com/search"));
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
  await ev(`sessionStorage.removeItem("xp-logged")`); const loggedOut = (await send("Page.addScriptToEvaluateOnNewDocument", { source: `try{sessionStorage.removeItem("xp-logged")}catch{}` })).identifier;
  await load(); await sleep(5500); // BIOS 1.9s + XP logo 2.8s
  const hidden = await ev(`document.querySelector("#login").classList.contains("hidden")`);
  ok("boot reaches the log-on screen", !hidden);
  await click("#userTile"); await sleep(2300);
  ok("log-on reaches the desktop with icons", await ev(`!document.querySelector("#desktop").classList.contains("hidden") && document.querySelectorAll("#icons .dicon").length>5`));
  const shot = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(SHOTS + "/desktop.png", Buffer.from(shot.data, "base64"));
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: loggedOut }); // later tests start logged in again
});
await test("message board posts once", async () => {
  await fresh(); await ev(`sessionStorage.setItem("xp-player-name","Tester")`);
  const posts = () => ev(`__fs.log.filter(l=>l.m==="POST"&&l.p==="/board").length`), docs = () => ev(`Object.keys(__fs.board||{}).length`);
  const type = async (sel, text) => { await click(sel); await ev(`document.querySelector(${JSON.stringify(sel)}).value=${JSON.stringify(text)}`); };
  // a reply slower than the 8 s timeout, though the write landed: no error, no duplicate
  await ev(`__fs.boardSlow=9500`);
  await type(".board-dock textarea", "slow hello"); await key("Enter", 2); await sleep(150);
  for (let i = 0; i < 4; i++) { await key("Enter", 2); await sleep(60); }
  ok("repeated Ctrl+Enter sends one request", (await posts()) === 1, await posts());
  await sleep(9000);
  ok("a timed-out post that landed counts as posted", (await docs()) === 1 && (await ev(`document.querySelector(".board-dock textarea").value`)) === "" && !(await ev(`[...document.querySelectorAll(".win .ttl")].some(t=>/Message Board/.test(t.textContent)) && /Couldn't post/.test(document.body.textContent)`)));
  ok("and it shows in the list", /slow hello/.test(await ev(`document.querySelector(".board-dock .mb-list").textContent`)));
  // a failed reply, then the visitor tries again: still one message
  await ev(`__fs.boardSlow=0; __fs.boardFail=1`);
  await openApp("board"); await sleep(300);
  ok("the window shares the cooldown", (await ev(`(()=>{const f=document.querySelector('.win[data-key="board"] form'); f.text.value="too soon"; f.requestSubmit(); return 1})()`)) && /wait a few seconds/.test(await ev(`document.body.textContent`)));
  await closeAll(); await openApp("board"); await sleep(300);
  ok("the window lists the post from the docked board", /slow hello/.test(await ev(`document.querySelector('.win[data-key="board"] .mb-list').textContent`)));
  await ev(`(()=>{ document.querySelectorAll(".win").forEach(w=>w.dataset.key!=="board"&&w.querySelector(".tbtn[data-a=close]").click()); })()`);
  await ev(`window.__bs = 1`);
  // skip the cooldown for the next part
  const w = `.win[data-key="board"]`;
  await sleep(15100);
  await ev(`(()=>{const f=document.querySelector('${w} form'); f.from.value="Ann"; f.text.value="retry me"; f.requestSubmit();})()`); await sleep(300);
  ok("a failed post keeps the text and says so", (await ev(`document.querySelector('${w} form').text.value`)) === "retry me" && /won't be posted twice/.test(await ev(`document.body.textContent`)));
  await ev(`[...document.querySelectorAll(".win")].filter(w=>w.dataset.key!=="board").forEach(w=>w.querySelector(".tbtn[data-a=close]").click())`);
  await ev(`document.querySelector('${w} form').requestSubmit()`); await sleep(400);
  const r = await ev(`(()=>{ const id=new URLSearchParams(__fs.log.filter(l=>l.m==="POST"&&l.p==="/board").at(-1).q).get("documentId"); return {id, checks:__fs.log.filter(l=>l.m==="GET"&&l.p==="/board/"+id).length, copies:Object.values(__fs.board).filter(d=>d.text==="retry me").length}; })()`);
  ok("retrying checks the same id first and stores one message", r.copies === 1 && r.checks >= 1, JSON.stringify(r));
  ok("and the docked board refreshes too", /retry me/.test(await ev(`document.querySelector(".board-dock .mb-list").textContent`)));
  await closeAll();
});
await test("player name", async () => {
  await fresh(); await ev(`__fs.board={}; localStorage.setItem("xp-last-name","Old")`);
  ok("the board's name field won't autofill", (await ev(`document.querySelector(".board-dock input[name=from]").autocomplete`)) === "off");
  await click(".board-dock textarea"); await ev(`document.querySelector(".board-dock textarea").value="hi"`); await key("Enter", 2); await sleep(300);
  ok("the first post asks for a name, prefilled with the last one", (await ev(`document.querySelector(".askbox input")?.value`)) === "Old");
  await ev(`(()=>{const i=document.querySelector(".askbox input"); i.value="Neo"; document.querySelector(".askbox").requestSubmit();})()`); await sleep(400);
  ok("the post goes out under that name", (await ev(`Object.values(__fs.board).map(d=>d.from).join()`)) === "Neo" && (await ev(`document.querySelector(".board-dock input[name=from]").value`)) === "Neo");
  ok("kept for the session, not forever", (await ev(`sessionStorage.getItem("xp-player-name")`)) === "Neo" && !(await ev(`localStorage.getItem("xp-player-name")||localStorage.getItem("xp-player-name-asked")`)));
  await openApp("games"); await sleep(300);
  ok("the Games folder shows the name", /Neo/.test(await ev(`document.querySelector(".pcard").textContent`)));
  await click(".pname-change"); await sleep(300);
  ok("and can change it", (await ev(`document.querySelector(".askbox input")?.value`)) === "Neo");
  await ev(`(()=>{const i=document.querySelector(".askbox input"); i.value="Trin"; document.querySelector(".askbox").requestSubmit();})()`); await sleep(300);
  ok("the new name shows everywhere", /Trin/.test(await ev(`document.querySelector(".pcard").textContent`)) && (await ev(`document.querySelector(".board-dock input[name=from]").value`)) === "Trin");
  await closeAll();
  // a new session asks again; cancelling posts as Anonymous
  await ev(`sessionStorage.removeItem("xp-player-name"); sessionStorage.removeItem("xp-name-asked")`); await load();
  await click(".board-dock textarea"); await ev(`document.querySelector(".board-dock textarea").value="bye"`); await key("Enter", 2); await sleep(300);
  ok("a new session asks again, prefilled", (await ev(`document.querySelector(".askbox input")?.value`)) === "Trin");
  await ev(`[...document.querySelectorAll(".win")].pop().querySelector(".tbtn[data-a=close]").click()`); await sleep(400);
  ok("cancel posts as Anonymous", (await ev(`Object.values(__fs.board).find(d=>d.text==="bye")?.from`)) === "Anonymous");
  ok("and doesn't ask again this session", (await ev(`sessionStorage.getItem("xp-name-asked")`)) === "1" && (await ev(`!sessionStorage.getItem("xp-player-name")`)));
});
await test("instagram link", async () => {
  await fresh(); const IG = "https://www.instagram.com/mendhi_vadi/";
  await openApp("about"); await sleep(300);
  ok("About Me lists Instagram, opening in a new tab", await ev(`(()=>{const a=[...document.querySelectorAll('.win a')].find(a=>a.href===${JSON.stringify(IG)}); return !!a && a.target==="_blank" && /noopener/.test(a.rel) && !!a.querySelector("svg") && /Instagram/.test(a.textContent)})()`));
  await closeAll(); await openApp("ie"); await sleep(400);
  ok("Explorer's Profiles list it", await ev(`(()=>{const a=[...document.querySelectorAll('.ie-home .link-card')].find(a=>a.href===${JSON.stringify(IG)}); return !!a && a.target==="_blank"})()`));
  await closeAll(); await openApp("cmd"); await sleep(200);
  await ev(`(()=>{const i=document.querySelector(".cmd input"); i.value="contact"; i.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));})()`); await sleep(200);
  ok("cmd contact prints it", (await ev(`document.querySelector(".cmd .out").textContent`)).includes("Instagram:   " + IG));
  await closeAll();
});
await test("vision assist opens in a new tab", async () => {
  await fresh(); const VA = "https://vision-assist-two.vercel.app";
  const dlg = () => ev(`(()=>{const w=[...document.querySelectorAll(".win")].find(w=>/Open in new tab/.test(w.textContent)&&w.querySelector(".msgbox")); return w?w.querySelector(".msgbox").textContent:null})()`);
  const answer = (yes) => click(`.win:last-of-type .msgbox-actions .${yes ? "yes" : "no"}`);
  await openApp("ie"); await sleep(400);
  await ev(`window.__opened=[]; window.__realOpen=window.open; window.open=(...a)=>{__opened.push(a); return null}`);
  // 1. the home card
  await click(`.ie-home .link-card[href^="${VA}"]`); await sleep(250);
  ok("the Favorites card asks first, saying why", /camera/.test((await dlg()) || ""));
  await answer(false); await sleep(200);
  ok("Cancel stays on the page and opens nothing", (await ev(`__opened.length`)) === 0 && (await ev(`!document.querySelector(".iehomepage").classList.contains("hidden")`)));
  // 2. the address bar, from another page: history must not change on Cancel
  await ev(`(()=>{const i=document.querySelector(".ieurl"); i.value="https://example.org/"; i.closest("form").requestSubmit();})()`); await sleep(300);
  await ev(`(()=>{const i=document.querySelector(".ieurl"); i.value="${VA}/"; i.closest("form").requestSubmit();})()`); await sleep(250);
  ok("the address bar asks too", /camera/.test((await dlg()) || ""));
  await answer(false); await sleep(200);
  ok("Cancel keeps the current page and history", (await ev(`document.querySelector(".ieurl").value`)) === "https://example.org/" && (await ev(`document.querySelector(".ieback").disabled`)) === false && (await ev(`document.querySelector(".iefwd").disabled`)) === true);
  // 3. the Favorites menu, accepted
  await click(`.win[data-key="ie"] .menubar [data-mi="2"]`); await sleep(60); await ev(`[...document.querySelectorAll(".dropdown [data-k]")].find(d=>/Vision/.test(d.textContent)).click()`); await sleep(250);
  await answer(true); await sleep(200);
  ok("Open in new tab calls window.open(url, _blank, noopener)", JSON.stringify(await ev(`__opened[0]`)) === JSON.stringify([VA, "_blank", "noopener"]), JSON.stringify(await ev(`__opened`)));
  // 4. the Projects window's live demo link
  await closeAll(); await openApp("projects"); await sleep(300);
  await ev(`[...document.querySelectorAll(".win .fitem")].find(e=>/Vision/.test(e.textContent)).dispatchEvent(new MouseEvent("dblclick",{bubbles:true}))`); await sleep(400);
  await ev(`window.open=(...a)=>{__opened.push(a); return null}; __opened=[]`);
  await click(`[data-browse-url^="${VA}"]`); await sleep(400);
  ok("the Projects window's live demo asks too", /camera/.test((await dlg()) || ""));
  // a real click on the real window.open: the browser lets it through
  await ev(`window.open=window.__realOpen`);
  const before = (await (await fetch(`http://127.0.0.1:${DBG}/json`)).json()).filter((t) => t.type === "page").length;
  await answer(true); await sleep(800);
  const after = (await (await fetch(`http://127.0.0.1:${DBG}/json`)).json()).filter((t) => t.type === "page");
  ok("a real click isn't stopped by the pop-up blocker", after.length === before + 1 && after.some((t) => t.url.startsWith(VA) || t.url === "about:blank"), after.map((t) => t.url).join(" "));
  for (const t of after) if (t.url.startsWith(VA) || (t.url === "about:blank" && t.id !== target.id)) await fetch(`http://127.0.0.1:${DBG}/json/close/${t.id}`).catch(() => {});
  await closeAll();
});
await test("explorer browses like a browser", async () => {
  await fresh(); await openApp("ie"); await sleep(400);
  const W = `.win[data-key="ie"]`, frame = `document.querySelector('${W} .ieframe')`;
  const nav = async (u) => { await ev(`(()=>{const i=document.querySelector('${W} .ieurl'); i.value=${JSON.stringify(u)}; i.closest("form").requestSubmit();})()`); };
  const inFrame = (expr) => ev(`new Promise(ok=>{ const f=${frame}; const h=(e)=>{ if(e.source===f.contentWindow&&e.data&&e.data.__r!==undefined){ removeEventListener("message",h); ok(e.data.__r); } }; addEventListener("message",h); setTimeout(()=>ok(null),1500); })`);
  const dialog = () => ev(`(()=>{const w=[...document.querySelectorAll(".win")].find(w=>/Open in new tab/.test(w.textContent)&&w.querySelector(".msgbox")); return w?w.querySelector(".msgbox").textContent:null})()`);
  const dismiss = () => ev(`[...document.querySelectorAll(".win")].filter(w=>/Open in new tab/.test(w.textContent)&&w.querySelector(".msgbox")).forEach(w=>w.querySelector(".no").click())`);
  // the Explorer frame (found by its name), read from an isolated world so the page's own scripts can't interfere
  const ieWorld = async () => { const want = await ev(`(()=>{const f=${frame}; return f.hasAttribute("srcdoc")?"about:srcdoc":f.src})()`); const t = await send("Page.getFrameTree"); const find = (n) => n.frame.url === want && n.frame.parentId ? n.frame : (n.childFrames || []).map(find).find(Boolean); const kid = find(t.frameTree); if (!kid) return null; return (await send("Page.createIsolatedWorld", { frameId: kid.id })).executionContextId; };
  const inIE = async (expression) => { const c = await ieWorld(); if (!c) return null; const r = await send("Runtime.evaluate", { expression, contextId: c, returnByValue: true }); return r.result.value; };
  const text = async () => (await inIE("document.body ? document.body.innerText : ''")) || "";
  void inFrame;
  // an http page judged frameable still goes through the proxy (it would be mixed content on https)
  await nav("http://frame.test:8080/"); await sleep(1500);
  ok("an http:// page goes through the proxy", (await ev(`${frame}.getAttribute("src")||""`)).startsWith("/api/proxy") && /FRAMEOK/.test(await text()));
  ok("loading ends: throbber stops, Stop greys out, status Done", await until(`!document.querySelector('${W} .iethrob').classList.contains("on") && document.querySelector('${W} .iestop').disabled && document.querySelector('${W} .iestat').textContent==="Done"`, 3000));
  // a framing-refusing app: shims make storage, cookies and history work; the address bar follows pushState
  await nav("http://deny.test:8080/app"); await sleep(2000);
  ok("storage, cookie and history shims let the page's script run", /SHIMS OK/.test(await text()), await text());
  ok("the address bar follows in-page navigation", (await ev(`document.querySelector('${W} .ieurl').value`)) === "http://deny.test:8080/app/next");
  ok("no cookies reach the site, none come back", FIX.cookies.every((c) => !c) && !(await ev(`document.cookie.includes("track")`)));
  // a link click and a GET form are new history entries; Back and Forward walk them
  await send("Runtime.evaluate", { expression: "0" });
  const clickIn = async (sel) => { const p = await inIE(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()`); const f = await ev(`(()=>{const r=${frame}.getBoundingClientRect(); return {x:r.left,y:r.top}})()`); for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: f.x + p.x, y: f.y + p.y, button: type === "mouseMoved" ? "none" : "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 }); };
  await clickIn("#p2"); await sleep(1500);
  ok("a link inside the page navigates in the window", /PAGE TWO/.test(await text()) && (await ev(`document.querySelector('${W} .ieurl').value`)) === "http://deny.test:8080/page2");
  await click(`${W} .ieback`); await sleep(1800);
  ok("Back returns to the app page", (await ev(`document.querySelector('${W} .ieurl').value`)).startsWith("http://deny.test:8080/app"));
  await click(`${W} .iefwd`); await sleep(1500);
  ok("Forward goes to page 2 again", /PAGE TWO/.test(await text()));
  await click(`${W} .ieback`); await sleep(1800);
  await inIE(`document.getElementById("s").requestSubmit()`); await sleep(1500);
  ok("a GET search form works", /RESULTS cats/.test(await text()));
  await click(`${W} .ieback`); await sleep(1800);
  await inIE(`document.getElementById("pf").requestSubmit()`); await sleep(600);
  ok("a POST form offers a new tab instead", /sends information/.test((await dialog()) || "")); await dismiss();
  // redirects show the final address
  await nav("http://deny.test:8080/redir"); await sleep(1800);
  ok("a redirect shows the final address", (await ev(`document.querySelector('${W} .ieurl').value`)) === "http://deny.test:8080/page2?from=redir");
  // pages that can't work here end in the new-tab dialog
  seen.over = true; await nav("http://deny.test:8080/full"); await sleep(1500); seen.over = false;
  ok("over the page limit, the window offers a new tab", /couldn't load/.test((await dialog()) || ""), (await dialog()) || "(none)"); await dismiss();
  await nav("http://deny.test:8080/rewrite?a=1"); await sleep(1500);
  ok("a page rewriting its own address doesn't corrupt the address bar", (await ev(`document.querySelector('${W} .ieurl').value`)) === "http://deny.test:8080/rewrite?a=1", await ev(`document.querySelector('${W} .ieurl').value`));
  await click(`${W} .iereload`); await sleep(1500);
  ok("and Refresh reloads the real page", /REWRITTEN/.test(await text()));
  await ev(`window.__o=window.open; window.open=(...a)=>{window.__oa=a}; document.querySelector('${W} .ienew').click(); window.open=window.__o`);
  ok("and New tab opens the real page", (await ev(`window.__oa[0]`)) === "http://deny.test:8080/rewrite?a=1");
  for (const path of ["/full", "/really404"]) { await nav("http://deny.test:8080" + path); await sleep(9800); ok(`${path}: a working page isn't called broken`, !(await dialog()), (await dialog()) || ""); await dismiss(); }
  for (const [path, why, wait] of [["/login", /password/, 1800], ["/jslogin", /password/, 2200], ["/cf", /person/, 1800], ["/robot", /person/, 1800], ["/anomaly", /person/, 1800], ["/waf", /person/, 1800], ["/refused", /doesn't accept/, 1800], ["/big", /too large/, 2500], ["/selfnav", /didn't load properly/, 2500], ["/reloads", /didn't load properly/, 3500],["/crash", /didn't load properly/, 9800], ["/route", /didn't load properly/, 9800], ["/skeleton", /didn't load properly/, 9800], ["/blank", /didn't load properly/, 9800]]) {
    await nav("http://deny.test:8080" + path); await sleep(wait);
    ok(`${path}: offers a new tab, saying why`, why.test((await dialog()) || ""), (await dialog()) || "(no dialog) " + (await ev(`document.querySelector('${W} .iestat').textContent`)));
    await dismiss(); await sleep(100);
  }
  await nav("http://deny.test:8080/latin"); await sleep(1500);
  ok("non-UTF-8 pages keep their accents", /café/.test(await text()));
  // Stop cancels a slow page; it doesn't fail later
  await nav("http://deny.test:8080/slow"); await sleep(800);
  ok("a slow page shows the loading indicator", await ev(`document.querySelector('${W} .iethrob').classList.contains("on") && !document.querySelector('${W} .iestop').disabled && !document.querySelector('${W} .ieprog').classList.contains("hidden")`));
  await click(`${W} .iestop`); await sleep(300);
  ok("Stop cancels it", /canceled/.test(await text()) && (await ev(`document.querySelector('${W} .iestat').textContent`)) === "Stopped");
  await sleep(9000); ok("and nothing pops up later", !(await dialog()));
  // left alone, a page that never answers ends in the dialog instead of a blank frame
  await nav("http://deny.test:8080/slow"); await sleep(10500);
  ok("a page that never answers ends in the new-tab dialog", /too long/.test((await dialog()) || ""), (await dialog()) || "(none)"); await dismiss();
  await closeAll();
});
await test("media player plays your own songs", async () => {
  await fresh();
  await openApp("wmp"); await sleep(500);
  const g = `document.querySelector('.win[data-key="wmp"]').__g`;
  // a 1.5 s, 440 Hz WAV made here, a text file and a broken "mp3", dropped on the window together
  await ev(`(()=>{ const rate=8000, n=rate*1.5, b=new DataView(new ArrayBuffer(44+n*2)); const w=(o,s)=>[...s].forEach((c,i)=>b.setUint8(o+i,c.charCodeAt(0)));
    w(0,"RIFF"); b.setUint32(4,36+n*2,true); w(8,"WAVEfmt "); b.setUint32(16,16,true); b.setUint16(20,1,true); b.setUint16(22,1,true); b.setUint32(24,rate,true); b.setUint32(28,rate*2,true); b.setUint16(32,2,true); b.setUint16(34,16,true); w(36,"data"); b.setUint32(40,n*2,true);
    for(let i=0;i<n;i++) b.setInt16(44+i*2, Math.sin(i/rate*2*Math.PI*440)*12000, true);
    const dt=new DataTransfer(); dt.items.add(new File([b.buffer],"My Song.wav",{type:"audio/wav"})); dt.items.add(new File(["hello"],"notes.txt",{type:"text/plain"})); dt.items.add(new File([new Uint8Array(4000).fill(7)],"broken.mp3",{type:"audio/mpeg"}));
    document.querySelector('.win[data-key="wmp"] .wbody').dispatchEvent(new DragEvent("drop",{dataTransfer:dt,bubbles:true,cancelable:true})); })()`);
  await until(`${g}.items.length===6`, 6000); await sleep(400);
  ok("a dropped song joins the playlist, titled from its file name, with its length", await ev(`${g}.items[5].name==="My Song" && /0:01/.test(document.querySelector('.win[data-key="wmp"] .pl [data-i="5"]').textContent)`));
  ok("files it can't play get an XP dialog", /broken\.mp3/.test(await ev(`document.body.textContent`)) && /notes\.txt/.test(await ev(`[...document.querySelectorAll(".win .msgbox")].map(m=>m.textContent).join()`)));
  ok("the visitor is told it stays in this browser", /never uploaded or shared/.test(await ev(`document.querySelector('.win[data-key="wmp"]').textContent`)));
  await ev(`[...document.querySelectorAll(".win")].filter(w=>w.querySelector(".msgbox")).forEach(w=>w.querySelector(".xpbtn").click())`);
  await ev(`document.querySelector('.win[data-key="wmp"] .pl [data-i="5"]').dispatchEvent(new MouseEvent("dblclick",{bubbles:true}))`); await sleep(700);
  ok("it plays: time moves", (await ev(`${g}.au.currentTime`)) > 0.2 && (await ev(`${g}.playing`)), await ev(`${g}.au.currentTime`));
  const peak = () => ev(`(()=>{const a=${g}.analyser, d=new Uint8Array(a.fftSize); a.getByteTimeDomainData(d); return Math.max(...d.map(v=>Math.abs(v-128)))})()`);
  ok("through the visualizer's analyser", (await peak()) > 5, await peak());
  await click(`.win[data-key="wmp"] .mute`); await sleep(250);
  ok("mute silences it", (await peak()) <= 1, await peak());
  await click(`.win[data-key="wmp"] .mute`); await sleep(150);
  await ev(`(()=>{const s=document.querySelector('.win[data-key="wmp"] .seek'); s.value=100; s.dispatchEvent(new Event("change"))})()`); await sleep(100);
  ok("seeking moves the song", Math.abs((await ev(`${g}.au.currentTime`)) - 0.15) < 0.12, await ev(`${g}.au.currentTime`));
  ok("the time readout uses its length", /\/ 0:01/.test(await ev(`document.querySelector('.win[data-key="wmp"] .tm').textContent`)));
  await sleep(1800);
  ok("at the end of the last song, with Repeat off, it stops at the top", !(await ev(`${g}.started`)) && (await ev(`${g}.cur`)) === 0);
  await click(`.win[data-key="wmp"] .rep`); await click(`.win[data-key="wmp"] .prev`); await sleep(200);
  await click(`.win[data-key="wmp"] .play`); await sleep(300);
  ok("Previous from the first track wraps to the song", (await ev(`${g}.cur`)) === 5 && (await ev(`${g}.playing`)) && (await ev(`!${g}.au.paused`)));
  await click(`.win[data-key="wmp"] .next`); await sleep(300);
  ok("Next goes on to a built-in track, and the song stops", (await ev(`${g}.cur`)) === 0 && (await ev(`${g}.au.paused`)) && (await peak()) > 1);
  await click(`.win[data-key="wmp"] .prev`); await sleep(200); await ev(`(()=>{const s=document.querySelector('.win[data-key="wmp"] .seek'); s.value=950; s.dispatchEvent(new Event("change"))})()`); await sleep(700);
  ok("with Repeat on, the end of the last song goes round to the first track", (await ev(`${g}.cur`)) === 0 && (await ev(`${g}.started`)));
  await click(`.win[data-key="wmp"] .rep`); await click(`.win[data-key="wmp"] .shuf`); await click(`.win[data-key="wmp"] .next`); await sleep(200);
  ok("shuffle picks another track", (await ev(`${g}.cur`)) !== 0); await click(`.win[data-key="wmp"] .shuf`);
  // closing releases the song's object URL
  await ev(`window.__revoked=[]; const r=URL.revokeObjectURL; URL.revokeObjectURL=(u)=>{__revoked.push(u); return r.call(URL,u)}`);
  await closeAll();
  ok("closing revokes the object URL", (await ev(`__revoked.some(u=>u.startsWith("blob:"))`)));
  // kept for the next visit, and removable
  await load(); await openApp("wmp"); await sleep(600);
  ok("the song is still there after a reload (IndexedDB)", await until(`${g}.items.length===6 && ${g}.items[5].name==="My Song"`, 3000));
  // File > Open's input, with an ID3v2.3 tag on the file: the tag's title and artist win over the file name
  await ev(`(()=>{ const rate=8000, n=rate/2, b=new DataView(new ArrayBuffer(44+n*2)); const w=(o,s)=>[...s].forEach((c,i)=>b.setUint8(o+i,c.charCodeAt(0)));
    w(0,"RIFF"); b.setUint32(4,36+n*2,true); w(8,"WAVEfmt "); b.setUint32(16,16,true); b.setUint16(20,1,true); b.setUint16(22,1,true); b.setUint32(24,rate,true); b.setUint32(28,rate*2,true); b.setUint16(32,2,true); b.setUint16(34,16,true); w(36,"data"); b.setUint32(40,n*2,true);
    const fr=(id,t)=>{ const tx=new TextEncoder().encode(t), h=new Uint8Array(11+tx.length); h.set([...id].map(c=>c.charCodeAt(0))); new DataView(h.buffer).setUint32(4,tx.length+1); h[10]=3; h.set(tx,11); return h; };
    const frames=[fr("TIT2","Tagged Title"),fr("TPE1","Some Band")], len=frames.reduce((a,f)=>a+f.length,0), tag=new Uint8Array(10+len); tag.set([73,68,51,3,0,0,0,0,(len>>7)&127,len&127]); let o=10; for(const f of frames){tag.set(f,o);o+=f.length;}
    const dt=new DataTransfer(); dt.items.add(new File([tag,b.buffer],"untitled.wav",{type:"audio/wav"}));
    const i=document.querySelector('.win[data-key="wmp"] .mfile'); i.files=dt.files; i.dispatchEvent(new Event("change")); })()`);
  ok("File > Open adds songs too, and reads ID3 title and artist", await until(`${g}.items.length===7 && ${g}.items[6].name==="Tagged Title" && ${g}.items[6].artist==="Some Band"`, 5000), await ev(`JSON.stringify(${g}.items.slice(5).map(i=>[i.name,i.artist]))+" "+document.body.textContent.includes("cannot play")`));
  await ev(`[...document.querySelectorAll(".win")].filter(w=>w.querySelector(".msgbox")).forEach(w=>w.querySelector(".xpbtn").click())`);
  await click(`.win[data-key="wmp"] .pl [data-rm="6"]`); await sleep(150);
  await click(`.win[data-key="wmp"] .pl [data-rm="5"]`); await sleep(200);
  await closeAll(); await load(); await openApp("wmp"); await sleep(700);
  ok("removing it forgets it", (await ev(`${g}.items.length`)) === 5);
  await closeAll();
});
if (process.env.SHOT) { label = "shot"; await send("Page.addScriptToEvaluateOnNewDocument", { source: `try{sessionStorage.setItem("xp-logged","1")}catch{}` }); await load(); await openApp("paint"); await sleep(500); const s = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(SHOTS + "/paint.png", Buffer.from(s.data, "base64")); }
const fails = res.filter(([, c]) => !c).length;
console.log(`\n${res.length - fails}/${res.length} passed; dialogs seen: ${dialogs.length}`);
console.log("runtime errors:", errors.length ? "\n" + [...new Set(errors)].join("\n") : "none");
chrome.kill(); server.close(); fixture.close(); ws.close(); setTimeout(() => process.exit(0), 300);
