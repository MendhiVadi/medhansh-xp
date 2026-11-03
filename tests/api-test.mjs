import { pathToFileURL } from "node:url";
const ROOT = process.argv[2].split("\\").join("/");
process.env.GMAIL_USER = "a@example.com"; process.env.GMAIL_APP_PASSWORD = "x";
const url = (p) => pathToFileURL(ROOT + "/" + p).href;
const realFetch = globalThis.fetch;
const store = new Map();
globalThis.fetch = async (u, opt = {}) => {
  const id = String(u).split("/otp/")[1].split("?")[0];
  if (!opt.method) return store.has(id) ? { status: 200, ok: true, json: async () => ({ fields: store.get(id), updateTime: "t" }) } : { status: 404, ok: false };
  store.set(id, JSON.parse(opt.body).fields); return { status: 200, ok: true };
};
const M = await import(url("api/_mail.js"));
const ok = (n, c) => console.log((c ? "PASS " : "FAIL ") + n);
const m = { via: "email", phone: "", subject: "s", message: "hello" };
const { code, token } = M.issue("a@b.com", M.digest(m));
const wrong = String((+code + 1) % 10000).padStart(4, "0");
ok("right code verifies", M.verify(token, "a@b.com", code, M.digest(m)) === null);
ok("suffix token rejected by verify", M.verify(token + ".1", "a@b.com", code, M.digest(m)) !== null);
ok("suffix token rejected by claim", !!(await M.claimAttempt(token + ".1")).error);
let n = 0; for (let i = 0; i < 7; i++) if (!(await M.claimAttempt(token)).error) n++;
ok("only 5 attempts for one code, got " + n, n === 5);
const { token: t2 } = M.issue("a@b.com", M.digest(m));
const macVariant = t2.split(".")[0] + ".AAAA";
await M.claimAttempt(t2); await M.claimAttempt(macVariant);
const cnt = [...store.values()].at(-1).n.integerValue;
ok("mac variant shares the same counter (n=" + cnt + ")", cnt === "2");
ok("wrong code rejected", M.verify(token, "a@b.com", wrong, M.digest(m)) !== null);
ok("limited() caps", (() => { let b = false; for (let i = 0; i < 4; i++) b = M.limited("k", 3, 1000); return b; })());
// nodemailer upgrade: address handling and a real message build
const { createRequire } = await import("node:module"); const nm = createRequire(ROOT + "/x.js")("nodemailer");
const tr = nm.createTransport({ jsonTransport: true });
const nasty = { name: 'x\\" <evil@attacker.com>, y', address: "me@x.com" };
const out = JSON.parse((await tr.sendMail({ from: '"P" <a@example.com>', to: "o@example.com", replyTo: nasty, subject: "s", text: "t" })).message);
ok("replyTo address stays the verified one: " + JSON.stringify(out.replyTo), out.replyTo.length === 1 && out.replyTo[0].address === "me@x.com");
ok("gmail transport still builds", !!nm.createTransport({ service: "gmail", auth: { user: "a", pass: "b" } }));
// proxy
globalThis.fetch = realFetch;
const online = await (await import("node:dns")).promises.lookup("example.com").then(() => true, () => false);
const P = (await import(url("api/proxy.js"))).default;
const call = (query, headers = {}) => new Promise((done) => {
  const res = { h: {}, code: 0, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, status(c) { this.code = c; return this; }, send(b) { done({ code: this.code, body: b, h: this.h }); return this; }, json(b) { done({ code: this.code, json: b, h: this.h }); return this; }, end() { done({ code: this.code, h: this.h }); return this; } };
  P({ method: "GET", query, headers: { "x-forwarded-for": "1.1.1." + Math.random(), ...headers } }, res);
});
for (const u of ["http://127.0.0.1/", "http://[::1]/", "http://[::ffff:127.0.0.1]:8080/", "http://[::ffff:a9fe:a9fe]/", "http://[::7f00:1]/", "http://0.0.0.0/", "http://169.254.169.254/latest/meta-data", "http://198.18.0.1/", "http://localhost/", "http://2130706433/", "http://0x7f.1/", "http://metadata.google.internal/", "http://192.168.1.1:8080/", "file:///etc/passwd", "http://user:p@example.com/"]) {
  const r = await call({ url: u, check: "1" });
  ok("blocked " + u, r.json?.blocked === true);
}
{ const r = await new Promise((done) => { const res = { h: {}, code: 0, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, status(c) { this.code = c; return this; }, send(b) { done({ code: this.code, h: this.h }); return this; } }; P({ method: "POST", query: { url: "https://example.com/" }, headers: { "sec-fetch-site": "same-origin" } }, res); });
  ok("POST is refused (no form relay)", r.code === 405 && r.h.allow === "GET"); }
if (!online) { console.log("SKIP live proxy checks: example.com doesn't resolve here (no network)"); process.exit(0); }
let r = await call({ url: "https://example.com/" }, { "sec-fetch-site": "none" }); ok("top-level open refused", r.code === 403);
r = await call({ url: "https://example.com/" }, { "sec-fetch-site": "cross-site" }); ok("cross-site refused", r.code === 403);
r = await call({ url: "https://example.com/", check: "1" }, { "sec-fetch-site": "same-origin" }); console.log("check example.com", JSON.stringify(r.json));
ok("check returns frameable bool", typeof r.json?.frameable === "boolean");
r = await call({ url: "https://www.google.com/", check: "1" }); console.log("check google", JSON.stringify(r.json));
r = await call({ url: "https://example.com/" }, { "sec-fetch-site": "same-origin", "sec-fetch-dest": "iframe" });
ok("proxied html served, base injected", r.code === 200 && r.body.includes('<base href="https://example.com/">') && r.body.includes("Example Domain"));
ok("CSP has sandbox + frame-ancestors", r.h["content-security-policy"].includes("sandbox") && r.h["content-security-policy"].includes("frame-ancestors 'self'"));
r = await call({ url: "https://en.wikipedia.org/wiki/Windows_XP" }); console.log("wikipedia", r.code, r.body?.length, (r.body || "").includes("Windows XP"));
r = await call({ url: "https://httpbin.org/gzip" }); console.log("non-html ->", r.code, r.h.location);
r = await call({ url: "http://neverssl.com/" }); console.log("http site", r.code, (r.body || "").length);
process.exit(0);
