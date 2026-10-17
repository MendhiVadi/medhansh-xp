// Shared Calendar tasks.
// GET -> { tasks: [...] }
// POST { date, time, text, remind } -> { task }
// PATCH { id, ...fields } -> { task }
// DELETE ?id=... (or ?done=1 to clear completed) -> { ok }
import { db, send, readBody, limited, str } from "./_db.js";

const MAX_TASKS = 1000;
const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const clean = (b, partial) => {
  const t = {};
  if (!partial || "date" in b) { if (!DATE.test(b.date || "")) throw new Error("date must be YYYY-MM-DD"); t.date = b.date; }
  if (!partial || "time" in b) { const v = b.time || ""; if (v && !TIME.test(v)) throw new Error("time must be HH:MM"); t.time = v; }
  if (!partial || "text" in b) { t.text = str(b.text, 140); if (!t.text) throw new Error("text is required"); }
  if ("done" in b) t.done = !!b.done; else if (!partial) t.done = false;
  if ("remind" in b) t.remind = !!b.remind && !!(t.time ?? b.time); else if (!partial) t.remind = false;
  return t;
};
const out = (doc) => ({ id: doc.id, ...doc.data() });

export default async function handler(req, res) {
  try {
    const col = db().collection("tasks");
    if (req.method === "GET") {
      const snap = await col.orderBy("date").limit(MAX_TASKS).get();
      return send(res, 200, { tasks: snap.docs.map(out) });
    }
    if (await limited(req, "tasks", 60, 60)) return send(res, 429, { error: "Too many changes. Wait a moment." });
    if (req.method === "POST") {
      const count = (await col.count().get()).data().count;
      if (count >= MAX_TASKS) return send(res, 409, { error: "The shared calendar is full." });
      let t; try { t = clean(await readBody(req), false); } catch (e) { return send(res, 400, { error: e.message }); }
      const now = Date.now(), ref = col.doc();
      await ref.set({ ...t, createdAt: now, updatedAt: now });
      return send(res, 201, { task: { id: ref.id, ...t, createdAt: now, updatedAt: now } });
    }
    if (req.method === "PATCH") {
      const b = await readBody(req), id = str(b.id, 64);
      if (!id) return send(res, 400, { error: "id is required" });
      const ref = col.doc(id), snap = await ref.get();
      if (!snap.exists) return send(res, 404, { error: "Task not found" });
      let t; try { t = clean({ ...b, time: "time" in b ? b.time : snap.data().time }, true); } catch (e) { return send(res, 400, { error: e.message }); }
      delete t.id; t.updatedAt = Date.now();
      await ref.update(t);
      return send(res, 200, { task: { id, ...snap.data(), ...t } });
    }
    if (req.method === "DELETE") {
      if (req.query?.done === "1") {
        const done = await col.where("done", "==", true).limit(500).get();
        const batch = db().batch(); done.docs.forEach((d) => batch.delete(d.ref)); await batch.commit();
        return send(res, 200, { ok: true, removed: done.size });
      }
      const id = str(req.query?.id, 64);
      if (!id) return send(res, 400, { error: "id is required" });
      await col.doc(id).delete();
      return send(res, 200, { ok: true });
    }
    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return send(res, 405, { error: "Method not allowed" });
  } catch (e) {
    console.error("tasks", e);
    return send(res, 500, { error: "Server error" });
  }
}
