// Lets the in-site Internet Explorer show sites that refuse to be framed.
// GET /api/proxy?url=https://example.com           -> the page's HTML with a <base> tag, served sandboxed
// GET /api/proxy?url=https://example.com&check=1   -> { frameable, url } (does the site allow framing?)
// Only the top-level HTML goes through here; images, CSS and scripts load straight from the site.
// Safety: http(s) only, public IPs only (checked on every redirect and again when the socket connects, so a DNS
// answer can't change in between), 10 s / 4 MB limits, per-instance throttle, same-origin callers only, and the
// response carries a CSP sandbox so proxied scripts never run with this site's origin.
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { throttled } from "./_mail.js";

const MAX = 4 * 1024 * 1024;
const LIMIT_MS = 10000;
const blocked = new BlockList();
[["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3]].forEach(([a, p]) => blocked.addSubnet(a, p, "ipv4"));
// BlockList also applies the IPv4 rules to IPv4-mapped addresses (::ffff:7f00:1); ::/96 covers ::1 and IPv4-compatible forms
[["::", 96], ["64:ff9b::", 96], ["2001::", 32], ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]].forEach(([a, p]) => blocked.addSubnet(a, p, "ipv6"));
const privateIP = (ip) => { const a = ip.split("%")[0]; return blocked.check(a, isIP(a) === 6 ? "ipv6" : "ipv4"); };
// used for the real connection, so the address that gets connected to is the one that was checked
const guardedLookup = (host, opts, cb) => lookup(host, { all: true }).then((list) => {
  if (!list.length || list.some((a) => privateIP(a.address))) return cb(Object.assign(new Error("That address can't be opened."), { code: "EBLOCKED" }));
  opts?.all ? cb(null, list) : cb(null, list[0].address, list[0].family);
}, cb);
const HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 5.1) PortfolioXP-IE/6.0 (+https://medhansh-xp.vercel.app)", Accept: "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en" };
const request = (u, method) => new Promise((ok, fail) => {
  const q = (u.protocol === "https:" ? https : http).request(u, { method, lookup: guardedLookup, headers: HEADERS }, ok);
  q.setTimeout(LIMIT_MS, () => q.destroy(new Error("The site took too long to respond.")));
  q.on("error", fail); q.end();
});
async function safeURL(raw) {
  let u; try { u = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
  if (u.port && !["80", "443", "8080", "8443"].includes(u.port)) return null;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) return null;
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => privateIP(a.address))) return null;
  return u;
}
async function get(url, method = "GET") {
  let u = await safeURL(url);
  for (let hop = 0; u && hop < 5; hop++) {
    const r = await request(u, method);
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) { r.resume(); u = await safeURL(new URL(r.headers.location, u).href); continue; }
    return { r, url: u.href };
  }
  return null;
}
// the whole body within the time and size limits (a page over the size limit is cut off), decompressed if the server insisted
async function readBody(r) {
  const t = setTimeout(() => r.destroy(new Error("The site took too long to respond.")), LIMIT_MS), chunks = [];
  let size = 0;
  try { for await (const c of r) { size += c.length; chunks.push(c); if (size > MAX) { r.destroy(); break; } } } finally { clearTimeout(t); }
  const buf = Buffer.concat(chunks), ce = String(r.headers["content-encoding"] || "").toLowerCase();
  const opt = { maxOutputLength: MAX * 4, finishFlush: zlib.constants.Z_SYNC_FLUSH };
  if (ce.includes("gzip")) return zlib.gunzipSync(buf, opt);
  if (ce.includes("deflate")) return zlib.inflateSync(buf, opt);
  if (ce.includes("br")) return zlib.brotliDecompressSync(buf, { maxOutputLength: MAX * 4, finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH });
  return buf;
}
const frameable = (h) => {
  const xfo = String(h["x-frame-options"] || "").toLowerCase(), csp = String(h["content-security-policy"] || "").toLowerCase();
  if (xfo.includes("deny") || xfo.includes("sameorigin")) return false;
  const fa = csp.split(";").map((s) => s.trim()).find((s) => s.startsWith("frame-ancestors"));
  return !fa || /\s\*(\s|$)/.test(fa);
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).send("Method not allowed"); }
  // only the portfolio's own Internet Explorer window may use this; otherwise any page could be shown under this domain
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin") return res.status(403).send("This address only works inside the portfolio's Internet Explorer.");
  if (throttled(req, "proxy", 60, 60 * 1000)) return res.status(429).send("Too many pages. Wait a moment.");
  const raw = String(req.query?.url || "");
  try {
    const got = await get(raw, req.query?.check ? "HEAD" : "GET");
    if (!got) return req.query?.check ? res.status(200).json({ frameable: false, blocked: true }) : res.status(400).send("That address can't be opened.");
    const { r, url } = got;
    if (req.query?.check) { r.resume(); return res.status(200).json({ frameable: r.statusCode >= 200 && r.statusCode < 300 && frameable(r.headers), url }); }
    const type = r.headers["content-type"] || "";
    if (!/text\/html|application\/xhtml/i.test(type)) { r.destroy(); res.setHeader("Location", url); return res.status(302).end(); }
    let html = (await readBody(r)).toString("utf8");
    html = html.replace(/<meta[^>]+http-equiv=["']?(content-security-policy|x-frame-options|refresh)["']?[^>]*>/gi, "");
    // links and forms inside the page keep going through the in-site browser
    const inject = `<base href="${url.replace(/"/g, "&quot;")}"><script>(function(){function go(u){try{parent.postMessage({xpNav:String(u)},"*")}catch(e){}}document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href]");if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||(a.target&&a.target!=="_self"))return;var h=a.href;if(/^(javascript:|#)/i.test(a.getAttribute("href")||""))return;e.preventDefault();go(h)},true);document.addEventListener("submit",function(e){var f=e.target;if((f.method||"get").toLowerCase()!=="get")return;e.preventDefault();var q=new URLSearchParams(new FormData(f)).toString();go(f.action.split("?")[0]+"?"+q)},true);parent.postMessage({xpTitle:document.title,xpUrl:${JSON.stringify(url)}},"*")})();</script>`;
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + inject) : inject + html;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Security-Policy", "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox; frame-ancestors 'self'");
    res.setHeader("X-Robots-Tag", "noindex");
    return res.status(r.statusCode).send(html);
  } catch (e) {
    console.error("proxy", e.message);
    return req.query?.check ? res.status(200).json({ frameable: false }) : res.status(502).send(`<p style="font:14px Tahoma,sans-serif;padding:16px">Internet Explorer cannot display the webpage.<br><small>${String(e.message).replace(/[<>&]/g, "")}</small></p>`);
  }
}
