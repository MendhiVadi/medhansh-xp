// Lets the in-site Internet Explorer show sites that refuse to be framed.
// GET /api/proxy?url=https://example.com           -> the page's HTML with a <base> tag and small shims, served sandboxed
// GET /api/proxy?url=https://example.com&check=1   -> { frameable, url } (does the site allow framing?)
// Only the top-level HTML goes through here; images, CSS, scripts and API calls go straight to the site. Proxying those
// too would make this a general web proxy (the kind that gets a domain flagged), so it deliberately doesn't.
// Safety: GET only (no POST relay), http(s) only, public IPs only (checked on every redirect and again when the socket
// connects, so a DNS answer can't change in between), no cookies or credentials in either direction, pages with a
// password field are refused (logins go to a new tab), one 8 s deadline and 4 MB (within Vercel's 10 s and 4.5 MB),
// a per-instance throttle, same-origin callers only, and a CSP sandbox so proxied scripts never run with this site's origin.
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { throttled, overLimit, visitor } from "./_mail.js";

const MAX = 4 * 1024 * 1024;
const DEADLINE_MS = 8000;
const blocked = new BlockList();
[["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3]].forEach(([a, p]) => blocked.addSubnet(a, p, "ipv4"));
// BlockList also applies the IPv4 rules to IPv4-mapped addresses (::ffff:7f00:1); ::/96 covers ::1 and IPv4-compatible forms
[["::", 96], ["64:ff9b::", 96], ["2001::", 32], ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]].forEach(([a, p]) => blocked.addSubnet(a, p, "ipv6"));
const privateIP = (ip) => { const a = ip.split("%")[0]; return blocked.check(a, isIP(a) === 6 ? "ipv6" : "ipv4"); };
// a current desktop browser, so sites send the page they'd send a visitor (some refuse unknown or ancient browsers)
const HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9", "Upgrade-Insecure-Requests": "1" };
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
// a page that tells the Explorer window why it failed, so it can offer a new tab
const failPage = (kind, text) => `<!doctype html><meta charset="utf-8"><p style="font:13px Tahoma,sans-serif;padding:16px">${esc(text)}</p><script>parent.postMessage({xpFail:${JSON.stringify(kind)}},"*")</script>`;
const timedOut = () => Object.assign(new Error("The site took too long to respond."), { code: "ETIMEOUT" });
// bot checks, which can't be passed from a sandboxed copy
const challengeHeader = (h) => h["cf-mitigated"] === "challenge" || h["x-amzn-waf-action"] === "challenge";
const BOT_PAGE = /anomaly-modal|px-captcha|<title[^>]*>\s*(just a moment|captcha|attention required|access denied|are you (not )?a robot|are you (a )?human)/i;
// frameable, but its result links only work when this window can see the clicks (the search engine, so far)
const ALWAYS_PROXY = /(^|\.)bing\.com$/i;

// resolve and isPrivate can be swapped only by tests (fake hostnames for local fixture sites); the default export uses DNS
export function makeProxy({ resolve = (h) => lookup(h, { all: true }), isPrivate = privateIP, over = overLimit } = {}) {
  // used for the real connection, so the address that gets connected to is the one that was checked
  const guardedLookup = (host, opts, cb) => resolve(host).then((list) => {
    if (!list.length || list.some((a) => isPrivate(a.address))) return cb(Object.assign(new Error("That address can't be opened."), { code: "EBLOCKED" }));
    opts?.all ? cb(null, list) : cb(null, list[0].address, list[0].family || isIP(list[0].address));
  }, cb);
  const request = (u, until) => new Promise((ok, fail) => {
    const q = (u.protocol === "https:" ? https : http).request(u, { method: "GET", lookup: guardedLookup, headers: HEADERS }, ok);
    q.setTimeout(Math.max(1, until - Date.now()), () => q.destroy(timedOut()));
    q.on("error", fail); q.end();
  });
async function safeURL(raw) {
  let u; try { u = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
  if (u.port && !["80", "443", "8080", "8443"].includes(u.port)) return null;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) return null;
  const addrs = isIP(host) ? [{ address: host }] : await resolve(host).catch(() => []);
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) return null;
  return u;
}
async function get(url, until) {
  let u = await safeURL(url);
  for (let hop = 0; u && hop < 5; hop++) {
    if (Date.now() >= until) throw timedOut();
    const r = await request(u, until);
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) { r.resume(); u = await safeURL(new URL(r.headers.location, u).href); continue; }
    return { r, url: u.href };
  }
  return null;
}
// the whole body within the deadline and size limit, decompressed if the server insisted; null when it's too big to send back
async function readBody(r, until) {
  const t = setTimeout(() => r.destroy(timedOut()), Math.max(1, until - Date.now())), chunks = [];
  let size = 0;
  try { for await (const c of r) { size += c.length; chunks.push(c); if (size > MAX) { r.destroy(); return null; } } } finally { clearTimeout(t); }
  const buf = Buffer.concat(chunks), ce = String(r.headers["content-encoding"] || "").toLowerCase();
  const opt = { maxOutputLength: MAX, finishFlush: zlib.constants.Z_SYNC_FLUSH };
  try {
    if (ce.includes("gzip")) return zlib.gunzipSync(buf, opt);
    if (ce.includes("deflate")) return zlib.inflateSync(buf, opt);
    if (ce.includes("br")) return zlib.brotliDecompressSync(buf, { maxOutputLength: MAX, finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH });
  } catch (e) { if (e instanceof RangeError) return null; throw e; }
  return buf;
}
// the page's own character set (header, then <meta>), so non-UTF-8 sites aren't garbled
const decode = (buf, type) => {
  const cs = (/charset=["']?([\w-]+)/i.exec(type) || /<meta[^>]+charset=["']?([\w-]+)/i.exec(buf.subarray(0, 4096).toString("latin1")) || [])[1] || "utf-8";
  try { return new TextDecoder(cs).decode(buf); } catch { return buf.toString("utf8"); }
};
const frameable = (h) => {
  const xfo = String(h["x-frame-options"] || "").toLowerCase(), csp = String(h["content-security-policy"] || "").toLowerCase();
  if (xfo.includes("deny") || xfo.includes("sameorigin")) return false;
  const fa = csp.split(";").map((s) => s.trim()).find((s) => s.startsWith("frame-ancestors"));
  return !fa || /\s\*(\s|$)/.test(fa);
};

  async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    // GET only: relaying form posts would turn this into an anonymous posting relay, so those open in a new tab instead
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).send("Method not allowed"); }
    // only the portfolio's own Internet Explorer window may use this; otherwise any page could be shown under this domain
    const site = req.headers["sec-fetch-site"];
    if (site && site !== "same-origin") return res.status(403).send("This address only works inside the portfolio's Internet Explorer.");
    if (throttled(req, "proxy", 60, 60 * 1000)) return res.status(429).send("Too many pages. Wait a moment.");
    const raw = String(req.query?.url || ""), check = !!req.query?.check, until = Date.now() + DEADLINE_MS;
    const page = (kind, text, code = 200) => { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.setHeader("Content-Security-Policy", "sandbox allow-scripts; frame-ancestors 'self'"); return res.status(code).send(failPage(kind, text)); };
    // a cap per visitor and for the whole site, counted per page: the header check above can't stop scripts, and this bounds what they can use
    if (!check && ((await over("proxy:" + visitor(req), 200, 3600000)) || (await over("proxy-all", 3000, 86400000)))) return page("error", "Too many pages have been opened through this browser. Try again later.", 429);
    try {
      const got = await get(raw, until);
      if (!got) return check ? res.status(200).json({ frameable: false, blocked: true }) : res.status(400).send("That address can't be opened.");
      const { r, url } = got;
      // the check only needs the headers
      if (check) { r.destroy(); return res.status(200).json({ frameable: r.statusCode >= 200 && r.statusCode < 300 && frameable(r.headers) && !ALWAYS_PROXY.test(new URL(url).hostname), challenge: challengeHeader(r.headers), url }); }
      const type = r.headers["content-type"] || "";
      if (!/text\/html|application\/xhtml/i.test(type)) { r.destroy(); res.setHeader("Location", url); return res.status(302).end(); }
      const buf = await readBody(r, until);
      if (!buf) return page("toolarge", "This page is too large to show here.");
      let html = decode(buf, type);
      // a bot check can't be passed from a sandboxed copy, and logins never go through here
      if (challengeHeader(r.headers) || BOT_PAGE.test(html) || (r.statusCode >= 403 && /challenge-platform|cf-chl-|captcha-delivery\.com/i.test(html))) return page("challenge", "This site wants to check that you're a person first.");
      // a refusal aimed at this server, not the visitor; the site's real 404s and 500s still show
      if ([400, 401, 403, 429, 503].includes(r.statusCode)) return page("refused", "This site doesn't accept visits through this browser.");
      if (/<input[^>]+type\s*=\s*["']?password/i.test(html)) return page("login", "This page asks for a password, so it opens in its own tab.");
      if (ALWAYS_PROXY.test(new URL(url).hostname)) html = html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/\starget=["']?_blank["']?/gi, ""); // its results are plain HTML, its scripts reload the page when the address looks wrong, and results should open in this window
      html = html.replace(/<meta[^>]+http-equiv=["']?(content-security-policy|x-frame-options|refresh)["']?[^>]*>/gi, "");
      // first in <head>: the base for relative links, then shims for what a sandboxed copy can't do (storage, cookies,
      // history) and reports back to the window (title, address, links, forms, logins, failures)
      const inject = `<base href="${esc(url)}"><meta name="referrer" content="no-referrer"><script>${INJECT.replace("%STATUS%", String(r.statusCode)).replace("%URL%", () => JSON.stringify(url).replace(/</g, "\\u003c"))}</script>`;
      html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + inject) : inject + html;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Security-Policy", "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox; frame-ancestors 'self'");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("X-Robots-Tag", "noindex");
      return res.status(r.statusCode).send(html);
    } catch (e) {
      console.error("proxy", e.message);
      if (check) return res.status(200).json({ frameable: false, timeout: e.code === "ETIMEOUT" });
      return page(e.code === "ETIMEOUT" ? "timeout" : "error", "Internet Explorer cannot display the webpage. " + e.message, 502);
    }
  }
  return handler;
}
const INJECT = "(function(){var U=%URL%,cur=U;function post(m){try{parent.postMessage(m,\"*\")}catch(e){}}\nfunction real(u){try{var a=new URL(u,cur);if(a.pathname===\"/api/proxy\"){var p=a.searchParams.get(\"url\");if(p)return new URL(p).href}if(a.host===location.host)return new URL(a.pathname+a.search+a.hash,U).href;return a.href}catch(e){return cur}}\nfunction mem(){var d={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}\n[\"localStorage\",\"sessionStorage\"].forEach(function(n){try{window[n].length}catch(e){try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(e2){}}});\ntry{document.cookie}catch(e){var jar={};try{Object.defineProperty(document,\"cookie\",{configurable:true,get:function(){return Object.keys(jar).map(function(k){return k+\"=\"+jar[k]}).join(\"; \")},set:function(v){var p=String(v).split(\";\")[0],i=p.indexOf(\"=\");if(i>0)jar[p.slice(0,i).trim()]=p.slice(i+1).trim()}})}catch(e2){}}\ntry{navigator.serviceWorker}catch(e){try{Object.defineProperty(navigator,\"serviceWorker\",{value:undefined,configurable:true})}catch(e2){}}\n[\"pushState\",\"replaceState\"].forEach(function(n){var o=history[n];history[n]=function(s,t,u){var a=cur;try{if(u!=null)a=real(u)}catch(e){}try{o.call(history,s,t,u)}catch(e){try{o.call(history,s,t)}catch(e2){}}cur=a;post({xpUrl:a,xpTitle:document.title})}});\nfunction pw(){if(document.querySelector('input[type=password]')){post({xpFail:\"login\"});return true}}\nfunction go(u){post({xpNav:String(u)})}\ndocument.addEventListener(\"click\",function(e){var a=e.target.closest&&e.target.closest(\"a[href]\");if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||(a.target&&a.target!==\"_self\"))return;var h=a.getAttribute(\"href\")||\"\";if(/^(javascript:|#)/i.test(h))return;e.preventDefault();go(a.href)},true);\ndocument.addEventListener(\"submit\",function(e){var f=e.target;e.preventDefault();if(f.querySelector('input[type=password]'))return post({xpFail:\"login\"});if((f.getAttribute(\"method\")||\"get\").toLowerCase()!==\"get\")return post({xpFail:\"post\"});var q=new URLSearchParams(new FormData(f)).toString();go(f.action.split(/[?#]/)[0]+\"?\"+q)},true);\ndocument.addEventListener(\"DOMContentLoaded\",function(){post({xpTitle:document.title,xpUrl:cur});if(!pw()){var mo=new MutationObserver(function(){if(pw())mo.disconnect()});mo.observe(document.documentElement,{childList:true,subtree:true})}});\nfunction text(r){var s=r.body?r.body.innerText||\"\":r.textContent||\"\";r.querySelectorAll(\"*\").forEach(function(e){if(e.shadowRoot)s+=\" \"+text(e.shadowRoot)});return s}\nfunction broken(){var t=text(document).trim(),big=function(e){return e.getBoundingClientRect().width>100},m=[].some.call(document.images,function(i){return i.naturalWidth>32})||[].some.call(document.querySelectorAll(\"svg,canvas,video,iframe,object,embed\"),big);if(%STATUS%<300&&(/^(page )?not found|^404\\b|^error\\b|^application error|page not found/i.test(document.title)||(t.length<600&&/application error|client-side exception|this page (doesn.t|does not) exist|page not found|something went wrong/i.test(t)))||(t.length<20&&!m))post({xpFail:\"empty\"})}\naddEventListener(\"load\",function(){post({xpTitle:document.title,xpUrl:cur,xpLoaded:1});setTimeout(broken,8000)});\naddEventListener(\"pagehide\",function(){post({xpLeft:location.search})});\n})();";
export default makeProxy();
export { privateIP };
