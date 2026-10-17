// GET /api/health -> { ok, db } so the site can tell whether the shared backend is reachable.
import { db, send } from "./_db.js";

export default async function handler(req, res) {
  try {
    await db().collection("shared").doc("notepad").get();
    return send(res, 200, { ok: true, db: true });
  } catch (e) {
    console.error("health", e.message);
    return send(res, 200, { ok: true, db: false });
  }
}
