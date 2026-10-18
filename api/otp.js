// POST { email, via, phone, subject, message } -> emails a random 4-digit code (bound to this message) and returns { token } to send back with the message.
// GET -> { enabled } so the site knows whether verified contact is available.
import { configured, mailer, send, body, str, EMAIL, issue, digest, throttled } from "./_mail.js";

export default async function handler(req, res) {
  if (req.method === "GET") return send(res, 200, { enabled: configured() });
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return send(res, 405, { error: "Method not allowed" }); }
  if (!configured()) return send(res, 503, { error: "Verification email isn't set up yet." });
  const b = body(req), email = str(b.email, 120);
  const m = { via: b.via === "phone" ? "phone" : "email", phone: str(b.phone, 20), subject: str(b.subject, 140), message: str(b.message, 4000) };
  if (!EMAIL.test(email)) return send(res, 400, { error: "Please enter a valid email address.", field: "email" });
  if (throttled(req, "otp", 5, 15 * 60 * 1000)) return send(res, 429, { error: "Too many codes requested. Try again in a few minutes." });
  const { code, token } = issue(email, digest(m));
  try {
    await mailer().sendMail({
      from: `"Medhansh Khattar's portfolio" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `${code} is your verification code`,
      text: `Your verification code is ${code}. It expires in 5 minutes.\n\nIf you didn't try to contact Medhansh Khattar through his portfolio, you can ignore this email.`,
      html: `<div style="font:14px Tahoma,Arial,sans-serif;color:#222"><p>Your verification code is</p><p style="font:bold 32px monospace;letter-spacing:8px;color:#0a246a">${code}</p><p>It expires in 5 minutes.</p><p style="color:#777">If you didn't try to contact Medhansh Khattar through his portfolio, you can ignore this email.</p></div>`,
    });
    return send(res, 200, { token });
  } catch (e) {
    console.error("otp mail", e.message);
    return send(res, 502, { error: "Couldn't send the code. Please try again." });
  }
}
