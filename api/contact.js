// POST { token, code, name, email, phone, via, subject, message, website }
// Checks the 4-digit code, then emails the message to the site owner. "website" is a hidden honeypot field.
import { configured, mailer, send, body, str, esc, EMAIL, PHONE, verify, digest, throttled, claimAttempt, markUsed } from "./_mail.js";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return send(res, 405, { error: "Method not allowed" }); }
  if (!configured()) return send(res, 503, { error: "Contact email isn't set up yet." });
  const b = body(req);
  if (str(b.website, 200)) return send(res, 200, { ok: true });
  const m = { name: str(b.name, 80), email: str(b.email, 120), phone: str(b.phone, 20), via: b.via === "phone" ? "phone" : "email", subject: str(b.subject, 140), message: str(b.message, 4000) };
  const errors = {};
  if (!m.name) errors.name = "Please enter your name.";
  if (!EMAIL.test(m.email)) errors.email = "Please enter a valid email address.";
  if (m.via === "phone" && !PHONE.test(m.phone)) errors.phone = "Please enter a valid phone number.";
  if (!m.subject) errors.subject = "Please add a subject.";
  if (m.message.length < 5) errors.message = "Please write a message.";
  if (Object.keys(errors).length) return send(res, 400, { error: "Please fix the highlighted fields.", errors });
  if (throttled(req, "contact-verify", 8, 15 * 60 * 1000)) return send(res, 429, { error: "Too many attempts. Try again in a few minutes." });
  // every check costs one of the code's 5 attempts, and a code works only once
  const claim = await claimAttempt(b.token).catch(() => ({ error: "Verification is busy. Please try again." }));
  if (claim.error) return send(res, 400, { error: claim.error, errors: { code: claim.error } });
  const bad = verify(b.token, m.email, str(String(b.code ?? ""), 4), digest(m));
  if (bad) return send(res, 400, { error: bad, errors: { code: bad } });
  if (!(await markUsed(claim).catch(() => false))) return send(res, 400, { error: "This code was already used. Send a new code.", errors: { code: 1 } });
  const reach = m.via === "phone" ? `Phone: ${m.phone} (preferred)\nEmail: ${m.email} (verified)` : `Email: ${m.email} (verified)${m.phone ? `\nPhone: ${m.phone}` : ""}`;
  try {
    await mailer().sendMail({
      from: `"Portfolio contact" <${process.env.GMAIL_USER}>`,
      to: process.env.CONTACT_TO || process.env.GMAIL_USER,
      replyTo: `"${m.name.replace(/"/g, "")}" <${m.email}>`,
      subject: `[Portfolio] ${m.subject}`,
      text: `${m.message}\n\n— ${m.name}\n${reach}\nPrefers: ${m.via}`,
      html: `<div style="font:14px Tahoma,Arial,sans-serif;color:#222"><p style="white-space:pre-wrap">${esc(m.message)}</p><hr><p><b>${esc(m.name)}</b><br>${esc(reach).replace(/\n/g, "<br>")}<br>Prefers to be contacted by <b>${m.via}</b></p></div>`,
    });
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error("contact mail", e.message);
    return send(res, 502, { error: "Couldn't deliver the message. Please try again." });
  }
}
