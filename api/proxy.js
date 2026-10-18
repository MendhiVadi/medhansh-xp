// Lets the in-site Internet Explorer show sites that refuse to be framed.
// GET /api/proxy?url=https://example.com           -> the page's HTML with a <base> tag, served sandboxed
// GET /api/proxy?url=https://example.com&check=1   -> { frameable, url } (does the site allow framing?)
// Only the top-level HTML goes through here; images, CSS and scripts load straight from the site.
// Safety: http(s) only, public IPs only (checked on every redirect), 10 s / 4 MB limits, per-instance throttle,
// and the response carries a CSP sandbox so proxied scripts never run with this site's origin.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { throttled } from "./_mail.js";

const MAX = 4 * 1024 * 1024;
const privateIP = (ip) => {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return privateIP(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
};
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
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 10000);
    try {
      const r = await fetch(u, { method, redirect: "manual", signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0 (Windows NT 5.1) PortfolioXP-IE/6.0 (+https://medhansh-xp.vercel.app)", Accept: "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en" } });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { u = await safeURL(new URL(r.headers.get("location"), u).href); continue; }
      return { r, url: u.href, done: () => clearTimeout(t) };
    } catch (e) { clearTimeout(t); throw e; }
  }
  return null;
}
const frameable = (h) => {
  const xfo = (h.get("x-frame-options") || "").toLowerCase(), csp = (h.get("content-security-policy") || "").toLowerCase();
  if (xfo.includes("deny") || xfo.includes("sameorigin")) return false;
  const fa = csp.split(";").map((s) => s.trim()).find((s) => s.startsWith("frame-ancestors"));
  return !fa || /\s\*(\s|$)/.test(fa);
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).send("Method not allowed"); }
  if (throttled(req, "proxy", 60, 60 * 1000)) return res.status(429).send("Too many pages. Wait a moment.");
  const raw = String(req.query?.url || "");
  try {
    const got = await get(raw, req.query?.check ? "HEAD" : "GET");
    if (!got) return req.query?.check ? res.status(200).json({ frameable: false, blocked: true }) : res.status(400).send("That address can't be opened.");
    const { r, url, done } = got;
    if (req.query?.check) { done(); return res.status(200).json({ frameable: r.ok && frameable(r.headers), url }); }
    const type = r.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(type)) { done(); res.setHeader("Location", url); return res.status(302).end(); }
    const reader = r.body.getReader(), chunks = []; let size = 0;
    for (;;) { const { value, done: end } = await reader.read(); if (end) break; size += value.length; if (size > MAX) { reader.cancel(); break; } chunks.push(value); }
    done();
    let html = Buffer.concat(chunks).toString("utf8");
    html = html.replace(/<meta[^>]+http-equiv=["']?(content-security-policy|x-frame-options|refresh)["']?[^>]*>/gi, "");
    // links and forms inside the page keep going through the in-site browser
    const inject = `<base href="${url.replace(/"/g, "&quot;")}"><script>(function(){function go(u){try{parent.postMessage({xpNav:String(u)},"*")}catch(e){}}document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href]");if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||(a.target&&a.target!=="_self"))return;var h=a.href;if(/^(javascript:|#)/i.test(a.getAttribute("href")||""))return;e.preventDefault();go(h)},true);document.addEventListener("submit",function(e){var f=e.target;if((f.method||"get").toLowerCase()!=="get")return;e.preventDefault();var q=new URLSearchParams(new FormData(f)).toString();go(f.action.split("?")[0]+"?"+q)},true);parent.postMessage({xpTitle:document.title,xpUrl:${JSON.stringify(url)}},"*")})();</script>`;
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + inject) : inject + html;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Security-Policy", "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox");
    res.setHeader("X-Robots-Tag", "noindex");
    return res.status(r.status === 200 ? 200 : r.status).send(html);
  } catch (e) {
    console.error("proxy", e.message);
    return req.query?.check ? res.status(200).json({ frameable: false }) : res.status(502).send(`<p style="font:14px Tahoma,sans-serif;padding:16px">Internet Explorer cannot display the webpage.<br><small>${String(e.message).replace(/[<>&]/g, "")}</small></p>`);
  }
}
