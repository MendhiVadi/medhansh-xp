// Shared Notepad: one document everyone reads and edits.
// GET -> { text, updatedAt }    PUT { text } -> { updatedAt }
import { db, send, readBody, limited } from "./_db.js";

const MAX = 20000;

export default async function handler(req, res) {
  try {
    const ref = db().collection("shared").doc("notepad");
    if (req.method === "GET") {
      const snap = await ref.get();
      const d = snap.exists ? snap.data() : {};
      return send(res, 200, { text: typeof d.text === "string" ? d.text : null, updatedAt: d.updatedAt || 0 });
    }
    if (req.method === "PUT") {
      if (await limited(req, "notepad", 120, 60)) return send(res, 429, { error: "Too many saves. Wait a moment." });
      const body = await readBody(req);
      if (typeof body.text !== "string") return send(res, 400, { error: "text is required" });
      const updatedAt = Date.now();
      await ref.set({ text: body.text.slice(0, MAX), updatedAt });
      return send(res, 200, { updatedAt });
    }
    res.setHeader("Allow", "GET, PUT");
    return send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    console.error("notepad", e);
    return send(res, 500, { error: "Server error" });
  }
}
