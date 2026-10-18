// Shared helpers for the contact functions (files starting with "_" are not routes on Vercel).
// Mail goes out through Gmail SMTP with an App Password:
//   GMAIL_USER          the Gmail address that sends (and receives) the mail
//   GMAIL_APP_PASSWORD  a 16-character App Password from myaccount.google.com/apppasswords
//   CONTACT_TO          optional: where verified messages are delivered (defaults to GMAIL_USER)
// One-time codes are stateless: the server returns an HMAC-signed token, so no database is needed.
import nodemailer from "nodemailer";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

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
export function issue(email) {
  const code = String(randomInt(0, 10000)).padStart(4, "0");
  const exp = Date.now() + 10 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ e: email.toLowerCase(), exp })).toString("base64url");
  return { code, token: `${payload}.${sign(`${payload}.${code}`)}` };
}
export function verify(token, email, code) {
  const [payload, mac] = String(token || "").split(".");
  if (!payload || !mac || !/^\d{4}$/.test(String(code))) return "Enter the 4-digit code from the email.";
  const good = Buffer.from(sign(`${payload}.${code}`)), got = Buffer.from(mac);
  if (good.length !== got.length || !timingSafeEqual(good, got)) return "That code isn't right.";
  let p; try { p = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { return "That code isn't right."; }
  if (p.e !== email.toLowerCase()) return "That code was sent to a different email.";
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
