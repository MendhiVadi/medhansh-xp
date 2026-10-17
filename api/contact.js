// Contact form: stores messages in the Firestore "messages" collection for the site owner to read.
// POST { name, email, subject, message, website } -> { ok }   ("website" is a hidden honeypot field)
import { db, send, readBody, limited, str } from "./_db.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return send(res, 405, { error: "Method not allowed" }); }
  try {
    const b = await readBody(req);
    if (str(b.website, 200)) return send(res, 200, { ok: true }); // bots fill the hidden field; pretend success
    const msg = { name: str(b.name, 80), email: str(b.email, 120), subject: str(b.subject, 140), message: str(b.message, 4000) };
    const errors = {};
    if (!msg.name) errors.name = "Please enter your name.";
    if (!EMAIL.test(msg.email)) errors.email = "Please enter a valid email address.";
    if (!msg.subject) errors.subject = "Please add a subject.";
    if (msg.message.length < 5) errors.message = "Please write a message.";
    if (Object.keys(errors).length) return send(res, 400, { error: "Please fix the highlighted fields.", errors });
    if (await limited(req, "contact", 5, 3600)) return send(res, 429, { error: "Too many messages from this connection. Try again later." });
    await db().collection("messages").add({ ...msg, read: false, createdAt: Date.now(), userAgent: str(req.headers["user-agent"], 200) });
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error("contact", e);
    return send(res, 500, { error: "Server error. Please email instead." });
  }
}
