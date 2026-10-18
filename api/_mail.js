// Shared helpers for the contact functions (files starting with "_" are not routes on Vercel).
// Mail goes out through Gmail SMTP with an App Password:
//   GMAIL_USER          the Gmail address that sends (and receives) the mail
//   GMAIL_APP_PASSWORD  a 16-character App Password from myaccount.google.com/apppasswords
//   CONTACT_TO          optional: where verified messages are delivered (defaults to GMAIL_USER)
// One-time codes are stateless: the server returns an HMAC-signed token, so no database is needed.
import nodemailer from "nodemailer";
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const configured = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
const secret = () => createHmac("sha256", "xp-otp").update(process.env.GMAIL_APP_PASSWORD || "").digest();

let transport;
export const mailer = () => (transport ||= nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } }));

export const send = (res, status, body) => { res.setHeader("Cache-Control", "no-store"); res.status(status).json(body); };
export const body = (req) => (req.body && typeof req.body === "object" ? req.body : (() => { try { return JSON.parse(req.body || "{}"); } catch { return {}; } })());
export const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE = /^\+?[0-9 ()-]{7,20}$/;
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const sign = (data) => createHmac("sha256", secret()).update(data).digest("base64url");
export const digest = (m) => createHash("sha256").update(`${m.via}|${m.phone}|${m.subject}|${m.message}`).digest("base64url").slice(0, 22);
export function issue(email, h) {
  const code = String(randomInt(0, 10000)).padStart(4, "0");
  const exp = Date.now() + 5 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ e: email.toLowerCase(), h, exp })).toString("base64url");
  return { code, token: `${payload}.${sign(`${payload}.${code}`)}` };
}
export function verify(token, email, code, h) {
  const [payload, mac] = String(token || "").split(".");
  if (!payload || !mac || !/^\d{4}$/.test(String(code))) return "Enter the 4-digit code from the email.";
  const good = Buffer.from(sign(`${payload}.${code}`)), got = Buffer.from(mac);
  if (good.length !== got.length || !timingSafeEqual(good, got)) return "That code isn't right.";
  let p; try { p = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { return "That code isn't right."; }
  if (p.e !== email.toLowerCase()) return "That code was sent to a different email.";
  if (p.h !== h) return "Your message changed after the code was sent. Send a new code.";
  if (Date.now() > p.exp) return "That code has expired. Send a new one.";
  return null;
}

// Best-effort per-instance throttle (serverless instances are short-lived, so this only stops bursts)
const hits = new Map();
export function throttled(req, key, max, windowMs) {
  const ip = String(req.headers["x-forwarded-for"] || "?").split(",")[0].trim();
  const k = key + ":" + ip, now = Date.now(), h = (hits.get(k) || []).filter((t) => now - t < windowMs);
  h.push(now); hits.set(k, h);
  return h.length > max;
}

// Attempt counter per code, stored in Firestore (rules only allow +1 steps and false -> true for "used").
const FS = "https://firestore.googleapis.com/v1/projects/resume-41921/databases/(default)/documents/otp/";
const KEY = "AIzaSyAHb5rOYR0knifNMFUfh6RQZpvj4kkJu5M";
const MAX_TRIES = 5;
const fsfetch = (id, opt = {}, q = "") => fetch(`${FS}${id}?key=${KEY}${q}`, { ...opt, headers: { "Content-Type": "application/json" } });
const doc = (n, used, exp) => JSON.stringify({ fields: { n: { integerValue: String(n) }, used: { booleanValue: used }, exp: { integerValue: String(exp) } } });
// Claims one attempt for this token (max 5). Returns { id } when allowed, or { error }.
// The updateTime precondition makes parallel guesses fail instead of sharing one attempt.
export async function claimAttempt(token) {
  const id = createHash("sha256").update(String(token)).digest("hex").slice(0, 40);
  const cur = await fsfetch(id);
  if (cur.status === 404) {
    const r = await fsfetch(id, { method: "PATCH", body: doc(1, false, Date.now() + 10 * 60 * 1000) }, "&currentDocument.exists=false");
    return r.ok ? { id } : { error: "Please try again." };
  }
  if (!cur.ok) return { error: "Verification is busy. Please try again." };
  const j = await cur.json(), d = j.fields, n = Number(d.n.integerValue);
  if (d.used.booleanValue) return { error: "This code was already used. Send a new code." };
  if (n >= MAX_TRIES) return { error: "Too many wrong codes. Send a new code." };
  const upd = await fsfetch(id, { method: "PATCH", body: doc(n + 1, false, Number(d.exp.integerValue)) }, `&currentDocument.updateTime=${encodeURIComponent(j.updateTime)}`);
  return upd.ok ? { id } : { error: "Please try again." };
}
export async function markUsed(claim) {
  const cur = await fsfetch(claim.id); if (!cur.ok) return false;
  const d = (await cur.json()).fields;
  const r = await fsfetch(claim.id, { method: "PATCH", body: doc(Number(d.n.integerValue), true, Number(d.exp.integerValue)) });
  return r.ok;
}
