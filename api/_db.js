// Shared Firestore access for the API routes (files starting with "_" are not routes on Vercel).
// Credentials come from the FIREBASE_SERVICE_ACCOUNT env var (the service-account JSON, raw or base64).
// Locally you can instead point GOOGLE_APPLICATION_CREDENTIALS at the JSON file.
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHash } from "node:crypto";

function credential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return applicationDefault();
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return cert(JSON.parse(json));
}

export const db = () => {
  if (!getApps().length) initializeApp({ credential: credential() });
  return getFirestore();
};
export { FieldValue };

export const send = (res, status, body) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
};

export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

// Simple fixed-window rate limit per IP and bucket, stored in Firestore (IPs are hashed, never stored raw)
export async function limited(req, bucket, max, windowSec) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  const id = createHash("sha256").update(bucket + ":" + ip).digest("hex").slice(0, 32);
  const ref = db().collection("ratelimits").doc(id);
  const now = Date.now();
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : null;
    if (!d || now - d.start > windowSec * 1000) { tx.set(ref, { start: now, n: 1 }); return false; }
    if (d.n >= max) return true;
    tx.update(ref, { n: d.n + 1 });
    return false;
  });
}

export const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
