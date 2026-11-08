(() => {
  const P = window.PROFILE;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
    lget(k) { try { return localStorage.getItem(k); } catch { return null; } },
    lset(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  };
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Delays the visitor can cut short with Space. Resolves true when skipped, false when the time ran out.
  // One tied to a window (scope = its ctx) only skips while that window is active; typing in a field never skips.
  const waits = new Set();
  function wait(ms, scope) {
    return new Promise((done) => {
      const w = { scope, finish: (skipped) => { if (!waits.delete(w)) return; clearTimeout(w.t); done(skipped); } };
      w.t = setTimeout(() => w.finish(false), ms); waits.add(w);
    });
  }
  const skipWaits = (scope) => { let hit = false; for (const w of [...waits]) if (scope ? w.scope === scope : !w.scope || w.scope.isActive()) { w.finish(true); hit = true; } return hit; };
  addEventListener("keydown", (e) => {
    if (e.key !== " " || e.repeat || !waits.size || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    if (skipWaits()) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  // Profile photo with initials fallback (if photo.jpg is missing the initials stay visible)
  const avatar = (cls = "") => `<span class="avatar ${cls}">${esc(P.initials)}${P.photo ? `<img src="${esc(P.photo)}" alt="${esc(P.name)}" decoding="async" onerror="this.remove()">` : ""}</span>`;

  // Shared backend: Firestore, called straight from the browser over its REST API. Access is controlled by
  // firestore.rules (shared notepad, tasks, pictures, leaderboards, message board and visit counters). When it
  // can't be reached the apps keep working with this browser's storage and sync again later.
  const FB = P.firebase || {};
  const FS = `https://firestore.googleapis.com/v1/projects/${FB.projectId}/databases/(default)/documents`;
  const enc = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "boolean" ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : { stringValue: String(v ?? "") }])) });
  const dec = (doc) => { const o = { id: doc.name.split("/").pop() }; for (const [k, v] of Object.entries(doc.fields || {})) o[k] = "integerValue" in v ? Number(v.integerValue) : "doubleValue" in v ? Number(v.doubleValue) : "booleanValue" in v ? v.booleanValue : v.stringValue ?? null; return o; };
  // New shared documents get an id made here and kept until the write succeeds, so a retry (after a timeout that
  // may have landed, or a second click) can never add the same thing twice.
  const uid = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
  const pendingIds = new Map(); // what is being written (a key) -> { id, body, tries }
  const hashKey = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return s.length + ":" + (h >>> 0).toString(36); };
  const Cloud = {
    ok: null,
    // create path/<id> once: a retry first checks whether the earlier try already landed, and "already exists" counts as done
    async create(path, key, fields, timeout) {
      let p = pendingIds.get(key);
      if (!p) pendingIds.set(key, (p = { id: uid(), body: enc(fields), tries: 0 }));
      const done = () => { pendingIds.delete(key); return { id: p.id, ...fields }; };
      const landed = () => this.req(`${path}/${p.id}`, { query: "mask.fieldPaths=createdAt" }).catch(() => null);
      try {
        if (p.tries++ && (await landed())) return done();
        const r = dec(await this.req(path, { method: "POST", body: p.body, query: "documentId=" + p.id, timeout }));
        pendingIds.delete(key); return r;
      } catch (e) {
        if (e.status === 409 || (!e.status && (await landed()))) return done();
        throw e;
      }
    },
    async req(path, { method = "GET", body, query = "", timeout = 8000 } = {}) {
      if (!FB.projectId) { this.set(false); throw new Error("Backend not configured"); }
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
      try {
        const r = await fetch(`${FS}/${path}?${query}${FB.apiKey ? `${query ? "&" : ""}key=${FB.apiKey}` : ""}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal, cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (r.status === 404 && method === "GET") { this.set(true); return null; }
        if (r.status >= 500) { this.set(false); throw Object.assign(new Error("Server unavailable"), { status: r.status }); }
        if (!r.ok) { this.set(true); throw Object.assign(new Error(r.status === 429 ? "Too many changes. Wait a moment." : r.status === 403 ? "That change isn't allowed." : j.error?.message || r.statusText), { status: r.status }); }
        this.set(true); return j;
      } catch (e) { if (!e.status) this.set(false); throw e; } finally { clearTimeout(t); }
    },
    set(v) { if (this.ok !== v) { this.ok = v; document.dispatchEvent(new CustomEvent("cloud")); } },
    label() { return this.ok ? "Shared · synced" : this.ok === false ? "Offline · saved in this browser" : "Connecting…"; },
    async noteGet() { const d = await this.req("shared/notepad"); return d ? dec(d) : { text: null, updatedAt: 0 }; },
    async notePut(text) { const updatedAt = Date.now(); await this.req("shared/notepad", { method: "PATCH", body: enc({ text, updatedAt }) }); return { updatedAt }; },
    async tasks() {
      const out = []; let page = "";
      for (let i = 0; i < 5; i++) { const j = await this.req("tasks", { query: `pageSize=300${page ? "&pageToken=" + page : ""}` }); (j?.documents || []).forEach((d) => out.push(dec(d))); if (!(page = j?.nextPageToken)) break; }
      return out;
    },
    async taskCreate(t) { const now = Date.now(); const d = await this.req("tasks", { method: "POST", body: enc({ ...t, createdAt: now, updatedAt: now }) }); return dec(d); },
    async taskUpdate(id, patch) { const p = { ...patch, updatedAt: Date.now() }; await this.req("tasks/" + encodeURIComponent(id), { method: "PATCH", body: enc(p), query: [...Object.keys(p).map((k) => "updateMask.fieldPaths=" + k), "currentDocument.exists=true"].join("&") }); },
    async taskDelete(id) { await this.req("tasks/" + encodeURIComponent(id), { method: "DELETE" }); },
    // shared pictures: compressed images stored as data URLs (one document each, < 1 MB)
    async pictures() { const j = await this.req("pictures", { query: "pageSize=100&orderBy=createdAt%20desc&" + ["title", "w", "h", "by", "createdAt"].map((f) => "mask.fieldPaths=" + f).join("&") }); return (j?.documents || []).map(dec).sort((a, b) => b.createdAt - a.createdAt); },
    _pic: new Map(),
    pictureData(id) { if (!this._pic.has(id)) this._pic.set(id, this.req("pictures/" + encodeURIComponent(id), { query: "mask.fieldPaths=data", timeout: 30000 }).then((d) => dec(d).data).catch((e) => { this._pic.delete(id); throw e; })); return this._pic.get(id); },
    pictureAdd(title, data, w, h) { return this.create("pictures", "pic|" + hashKey(title + "|" + data), { title, data, w, h, by: playerName() || "Visitor", createdAt: Date.now() }, 60000); },
    async pictureDelete(id) { await this.req("pictures/" + encodeURIComponent(id), { method: "DELETE" }); },
    // shared leaderboards: scores/{game}/entries, ordered by score (single-field index, no setup needed)
    async top(game, n = 10, asc = false) {
      const j = await fetch(`${FS}/scores/${encodeURIComponent(game)}:runQuery${FB.apiKey ? `?key=${FB.apiKey}` : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "entries" }], orderBy: [{ field: { fieldPath: "score" }, direction: asc ? "ASCENDING" : "DESCENDING" }], limit: n } }) }).then((r) => (r.ok ? r.json() : Promise.reject(r)));
      this.set(true); return j.filter((x) => x.document).map((x) => dec(x.document));
    },
    // visit counters use server-side increments so concurrent visitors never overwrite each other
    async count(ids, visitor) {
      const base = `projects/${FB.projectId}/databases/(default)/documents/stats/`;
      const writes = ids.map((id) => ({ transform: { document: base + id, fieldTransforms: [{ fieldPath: "views", increment: { integerValue: "1" } }, { fieldPath: "visitors", increment: { integerValue: visitor[id] ? "1" : "0" } }] } }));
      const r = await fetch(`${FS.replace(/\/documents$/, "")}/documents:commit${FB.apiKey ? `?key=${FB.apiKey}` : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ writes }) });
      if (!r.ok) throw new Error("count failed");
    },
    async stats(ids) {
      const base = `projects/${FB.projectId}/databases/(default)/documents/stats/`;
      const r = await fetch(`${FS}:batchGet${FB.apiKey ? `?key=${FB.apiKey}` : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documents: ids.map((i) => base + i) }) });
      if (!r.ok) throw new Error("stats failed");
      this.set(true);
      const out = {}; (await r.json()).forEach((x) => { if (x.found) { const d = dec(x.found); out[d.id] = d; } }); return out;
    },
    async board(n = 50) {
      const j = await fetch(`${FS}:runQuery${FB.apiKey ? `?key=${FB.apiKey}` : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "board" }], orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }], limit: n } }) }).then((r) => (r.ok ? r.json() : Promise.reject(r)));
      this.set(true); return j.filter((x) => x.document).map((x) => dec(x.document));
    },
    post(from, to, text) { return this.create("board", "board|" + hashKey([from, to, text].join("\n")), { from, to, text, createdAt: Date.now() }); },
    submit(game, score, extra = {}) { const name = playerName() || "Visitor"; return this.create(`scores/${encodeURIComponent(game)}/entries`, "score|" + hashKey([game, name, Math.round(score), JSON.stringify(extra)].join("|")), { name, score: Math.round(score), ...extra, createdAt: Date.now() }); },
  };
  // One display name for scores, shared pictures and the message board. It lasts for this browser session; the dialog
  // is prefilled with the last name used. Cancelling posts as Visitor (or Anonymous) and the next session asks again.
  const cleanName = (n) => String(n || "").trim().replace(/[<>]/g, "").slice(0, 20);
  const playerName = () => cleanName(store.get("xp-player-name"));
  const setPlayerName = (n) => { n = cleanName(n); store.set("xp-player-name", n); if (n) store.lset("xp-last-name", n); store.set("xp-name-asked", "1"); dispatchEvent(new Event("xp-name")); return n; };
  let naming = null;
  function askName(force = false) {
    const n = playerName();
    if (n && !force) return Promise.resolve(n);
    if (!force && store.get("xp-name-asked") === "1") return Promise.resolve(n);
    // two posts at once share one dialog
    return (naming ||= askBox("Your Name", [{ label: "Your name, shown to everyone on the leaderboards, My Pictures and the Message Board:", value: n || store.lget("xp-last-name") || store.lget("xp-player-name") || store.lget("xp-board-name") || "" }])
      .then((v) => { store.set("xp-name-asked", "1"); return v ? setPlayerName(v[0]) : playerName(); })
      .finally(() => { naming = null; }));
  }
  const readLocal = (k, d) => { try { const v = JSON.parse(store.lget(k)); return v ?? d; } catch { return d; } };

  // ---------------- Icons (inline SVG) ----------------
  const I = {
    computer: `<svg viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="17" rx="2" fill="#d8d8d0" stroke="#666"/><rect x="6" y="6" width="20" height="13" fill="url(#gsky)"/><path d="M12 21h8l2 5H10z" fill="#bbb" stroke="#666"/><rect x="7" y="26" width="18" height="3" rx="1" fill="#ccc" stroke="#666"/><defs><linearGradient id="gsky" x2="0" y2="1"><stop offset="0" stop-color="#2a6ee7"/><stop offset=".7" stop-color="#8fc3f5"/><stop offset=".71" stop-color="#5aa83a"/></linearGradient></defs></svg>`,
    user: `<svg viewBox="0 0 32 32"><circle cx="16" cy="11" r="6" fill="#f7c58a" stroke="#a66b2b"/><path d="M5 29c1-7 5-10 11-10s10 3 11 10z" fill="#2f71cd" stroke="#0a3c8c"/><path d="M10 9c1-5 11-5 12 0-3-2-9-2-12 0z" fill="#6b3d17"/></svg>`,
    folder: `<svg viewBox="0 0 32 32"><path d="M3 8h10l2 3h14v16H3z" fill="#f2c94c" stroke="#b8860b"/><path d="M3 13h26l-2 14H3z" fill="#ffe08a" stroke="#b8860b"/></svg>`,
    doc: `<svg viewBox="0 0 32 32"><path d="M7 3h13l6 6v20H7z" fill="#fff" stroke="#555"/><path d="M20 3v6h6" fill="#ddd" stroke="#555"/><path d="M10 13h12M10 16h12M10 19h12M10 22h8" stroke="#2f71cd" stroke-width="1.5"/></svg>`,
    resume: `<svg viewBox="0 0 32 32"><path d="M7 3h13l6 6v20H7z" fill="#fff" stroke="#555"/><path d="M20 3v6h6" fill="#ddd" stroke="#555"/><circle cx="13" cy="12" r="2.5" fill="#f7c58a" stroke="#a66b2b"/><path d="M9.5 18c.5-2 2-3 3.5-3s3 1 3.5 3z" fill="#2f71cd"/><path d="M18 11h5M18 14h5M10 21h13M10 24h10" stroke="#888" stroke-width="1.3"/></svg>`,
    mail: `<svg viewBox="0 0 32 32"><rect x="3" y="7" width="26" height="18" rx="1" fill="#fff8dc" stroke="#8a6d1f"/><path d="M3 8l13 10L29 8" fill="none" stroke="#8a6d1f" stroke-width="1.4"/><circle cx="25" cy="23" r="5" fill="#2f71cd"/><path d="M22.5 23h5M25 20.5v5" stroke="#fff" stroke-width="1.6"/></svg>`,
    cmd: `<svg viewBox="0 0 32 32"><rect x="3" y="5" width="26" height="22" rx="1" fill="#000" stroke="#777"/><rect x="3" y="5" width="26" height="4" fill="#2f71cd"/><path d="M7 14l4 3-4 3M13 21h6" stroke="#ddd" stroke-width="1.6" fill="none"/></svg>`,
    mine: `<svg viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26" fill="#c0c0c0" stroke="#666"/><circle cx="16" cy="16" r="7" fill="#111"/><path d="M16 5v22M5 16h22M8 8l16 16M24 8L8 24" stroke="#111" stroke-width="2"/><rect x="13" y="13" width="2.5" height="2.5" fill="#fff"/></svg>`,
    msn: `<svg viewBox="0 0 32 32"><circle cx="12" cy="9" r="5" fill="#4cbf2f" stroke="#1f7a0e"/><path d="M3 26c0-7 4-10 9-10s9 3 9 10z" fill="#4cbf2f" stroke="#1f7a0e"/><circle cx="21" cy="11" r="5" fill="#2f8cf0" stroke="#0a4fa0"/><path d="M13 28c0-7 4-10 8-10s9 3 9 10z" fill="#2f8cf0" stroke="#0a4fa0"/></svg>`,
    ie: `<svg viewBox="0 0 32 32"><circle cx="16" cy="17" r="10" fill="none" stroke="#1e7ae6" stroke-width="4"/><path d="M8 17h16" stroke="#1e7ae6" stroke-width="4"/><path d="M3 22c4-10 18-18 26-16-3-3-12 2-17 6" fill="none" stroke="#f2a900" stroke-width="2"/></svg>`,
    recycle: `<svg viewBox="0 0 32 32"><path d="M8 9h16l-2 19H10z" fill="#d7e6f7" stroke="#4a6fa0"/><rect x="6" y="6" width="20" height="3" rx="1" fill="#b9d0ef" stroke="#4a6fa0"/><path d="M13 13l-1 11M16 13v11M19 13l1 11" stroke="#4a6fa0"/></svg>`,
    notepad: `<svg viewBox="0 0 32 32"><rect x="6" y="5" width="20" height="24" fill="#fff" stroke="#555"/><rect x="6" y="3" width="20" height="5" fill="#5aa0e6" stroke="#2a5a9a"/><path d="M9 12h14M9 15h14M9 18h14M9 21h10" stroke="#999"/></svg>`,
    paint: `<svg viewBox="0 0 32 32"><path d="M5 22c0-9 7-16 14-16 6 0 9 4 9 8 0 5-5 4-7 6-2 3 1 7-5 7-6 0-11-1-11-5z" fill="#f4e2c4" stroke="#8a6d3b"/><circle cx="12" cy="14" r="2" fill="#e53"/><circle cx="18" cy="11" r="2" fill="#3a3"/><circle cx="23" cy="14" r="2" fill="#36e"/><circle cx="11" cy="21" r="2" fill="#fc0"/></svg>`,
    github: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="#24292e"/><path d="M12 26v-3c-3 1-4-1-4.5-2M20 26v-3.5c0-1-.3-1.6-.8-2 3-.4 5-1.6 5-5.5 0-1.2-.4-2.2-1.1-3 .2-.6.3-1.7-.1-3 0 0-1-.3-3.2 1.2a11 11 0 0 0-5.6 0C12 8.7 11 9 11 9c-.4 1.3-.3 2.4-.1 3-.7.8-1.1 1.8-1.1 3 0 3.9 2 5.1 5 5.5-.4.4-.7 1-.8 1.8" fill="none" stroke="#fff" stroke-width="1.5"/></svg>`,
    linkedin: `<svg viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26" rx="4" fill="#0a66c2"/><path d="M9 13v10M9 9v.5M14 23v-10M14 17c0-2.5 1.5-4 3.5-4s3.5 1 3.5 4v6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`,
    instagram: `<svg viewBox="0 0 32 32"><defs><radialGradient id="igg" cx="30%" cy="107%" r="150%"><stop offset="0" stop-color="#fdf497"/><stop offset=".1" stop-color="#fdf497"/><stop offset=".5" stop-color="#fd5949"/><stop offset=".68" stop-color="#d6249f"/><stop offset="1" stop-color="#285aeb"/></radialGradient></defs><rect x="3" y="3" width="26" height="26" rx="7" fill="url(#igg)"/><rect x="8.5" y="8.5" width="15" height="15" rx="4.5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="16" cy="16" r="3.6" fill="none" stroke="#fff" stroke-width="2"/><circle cx="20.6" cy="11.4" r="1.1" fill="#fff"/></svg>`,
    x: `<svg viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26" rx="4" fill="#000"/><path d="M9 8l14 16M23 8L9 24" stroke="#fff" stroke-width="2.2"/></svg>`,
    globe: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#4aa3ff" stroke="#1a5aa8"/><path d="M4 16h24M16 4c-5 6-5 18 0 24M16 4c5 6 5 18 0 24" stroke="#fff" fill="none"/><path d="M9 9c2 2 5 0 6 3s-3 3-2 6 4 1 4 5" stroke="#3cae2c" stroke-width="2.5" fill="none"/></svg>`,
    pdf: `<svg viewBox="0 0 32 32"><path d="M7 3h13l6 6v20H7z" fill="#fff" stroke="#555"/><rect x="5" y="16" width="18" height="8" fill="#d0021b"/><text x="14" y="22.5" font-size="6" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">PDF</text></svg>`,
    project: `<svg viewBox="0 0 32 32"><path d="M3 8h10l2 3h14v16H3z" fill="#f2c94c" stroke="#b8860b"/><path d="M3 13h26l-2 14H3z" fill="#ffe08a" stroke="#b8860b"/><rect x="15" y="16" width="11" height="8" rx="1" fill="#2f71cd"/><path d="M18 19l-1.5 1.5L18 22M23 19l1.5 1.5L23 22" stroke="#fff" fill="none"/></svg>`,
    help: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#2f71cd" stroke="#0a3c8c"/><text x="16" y="22" font-size="17" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">?</text></svg>`,
    info: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#2f71cd" stroke="#0a3c8c"/><text x="16" y="22" font-size="16" font-family="Georgia" font-weight="bold" fill="#fff" text-anchor="middle">i</text></svg>`,
    solitaire: `<svg viewBox="0 0 32 32"><rect x="4" y="6" width="15" height="21" rx="2" fill="#2f5fd0" stroke="#123" transform="rotate(-12 11 16)"/><rect x="12" y="5" width="15" height="21" rx="2" fill="#fff" stroke="#333"/><text x="19.5" y="20" font-size="11" font-family="Arial" fill="#d00" text-anchor="middle">♥</text><text x="14.5" y="11" font-size="6" font-family="Arial" font-weight="bold" fill="#d00">A</text></svg>`,
    snake: `<svg viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26" rx="3" fill="#0b3d0b"/><path d="M8 24V14h8v-6h8" stroke="#7fdb3b" stroke-width="4" fill="none" stroke-linejoin="round"/><circle cx="24" cy="8" r="2.5" fill="#c8ff6a"/><circle cx="12" cy="8" r="2" fill="#ff4136"/></svg>`,
    breakout: `<svg viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26" rx="2" fill="#0a1f5c"/><rect x="5" y="6" width="6" height="3" fill="#e5410c"/><rect x="13" y="6" width="6" height="3" fill="#f2a900"/><rect x="21" y="6" width="6" height="3" fill="#5ca50a"/><rect x="5" y="11" width="6" height="3" fill="#1e7ae6"/><rect x="21" y="11" width="6" height="3" fill="#8a4fd8"/><circle cx="17" cy="19" r="2" fill="#fff"/><rect x="11" y="24" width="10" height="2.5" fill="#c0c0c0"/></svg>`,
    games: `<svg viewBox="0 0 32 32"><path d="M3 8h10l2 3h14v16H3z" fill="#f2c94c" stroke="#b8860b"/><path d="M3 13h26l-2 14H3z" fill="#ffe08a" stroke="#b8860b"/><rect x="11" y="16" width="14" height="8" rx="4" fill="#555"/><path d="M14 18v4M12 20h4" stroke="#fff" stroke-width="1.4"/><circle cx="21" cy="19" r="1" fill="#f55"/><circle cx="23" cy="21" r="1" fill="#5f5"/></svg>`,
    display: `<svg viewBox="0 0 32 32"><rect x="3" y="5" width="26" height="18" rx="2" fill="#d8d8d0" stroke="#666"/><rect x="5" y="7" width="22" height="14" fill="url(#gsky2)"/><path d="M12 23h8l1 4H11z" fill="#bbb" stroke="#666"/><defs><linearGradient id="gsky2" x2="0" y2="1"><stop offset="0" stop-color="#2a6ee7"/><stop offset=".65" stop-color="#8fc3f5"/><stop offset=".66" stop-color="#5aa83a"/></linearGradient></defs></svg>`,
    showdesk: `<svg viewBox="0 0 32 32"><rect x="3" y="6" width="26" height="18" rx="2" fill="#4f95ea" stroke="#fff"/><path d="M3 18c8-5 18-5 26 0v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#4c9b2d"/><rect x="9" y="26" width="14" height="2" fill="#fff"/></svg>`,
    calendar: `<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="22" rx="2" fill="#fff" stroke="#555"/><rect x="4" y="6" width="24" height="6" fill="#d0362f"/><rect x="9" y="3" width="2.5" height="6" rx="1" fill="#555"/><rect x="20.5" y="3" width="2.5" height="6" rx="1" fill="#555"/><text x="16" y="25" font-size="11" font-family="Arial" font-weight="bold" fill="#0a246a" text-anchor="middle">${new Date().getDate()}</text></svg>`,
    calc: `<svg viewBox="0 0 32 32"><rect x="6" y="3" width="20" height="26" rx="2" fill="#d4d0c8" stroke="#555"/><rect x="9" y="6" width="14" height="5" fill="#c8e6a0" stroke="#555"/><g fill="#555"><rect x="9" y="14" width="3" height="3"/><rect x="14.5" y="14" width="3" height="3"/><rect x="20" y="14" width="3" height="3"/><rect x="9" y="19" width="3" height="3"/><rect x="14.5" y="19" width="3" height="3"/><rect x="20" y="19" width="3" height="8" fill="#d0362f"/><rect x="9" y="24" width="8.5" height="3"/></g></svg>`,
    wmp: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="url(#wmpg)" stroke="#1d3d8f"/><path d="M13 10l9 6-9 6z" fill="#fff"/><defs><radialGradient id="wmpg" cx=".35" cy=".3"><stop offset="0" stop-color="#9fd6ff"/><stop offset="1" stop-color="#1f5fcf"/></radialGradient></defs></svg>`,
    pictures: `<svg viewBox="0 0 32 32"><path d="M3 8h10l2 3h14v16H3z" fill="#f2c94c" stroke="#b8860b"/><rect x="9" y="13" width="17" height="12" fill="#fff" stroke="#555"/><path d="M10 24l5-6 3 3 3-4 4 7z" fill="#5aa83a"/><circle cx="21" cy="16" r="1.6" fill="#f2a900"/></svg>`,
    taskmgr: `<svg viewBox="0 0 32 32"><rect x="3" y="5" width="26" height="22" rx="1" fill="#000" stroke="#777"/><rect x="3" y="5" width="26" height="4" fill="#2f71cd"/><path d="M6 22l4-5 3 3 4-8 3 6 3-3 3 2" fill="none" stroke="#3f3" stroke-width="1.6"/></svg>`,
    control: `<svg viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" rx="3" fill="#dfe8f7" stroke="#4a6fa0"/><circle cx="12" cy="12" r="4" fill="#f2a900"/><rect x="18" y="9" width="7" height="6" fill="#5aa83a"/><rect x="7" y="18" width="7" height="7" fill="#1e7ae6"/><path d="M18 22h7M21.5 18.5v7" stroke="#d0362f" stroke-width="2.4"/></svg>`,
    run: `<svg viewBox="0 0 32 32"><rect x="4" y="7" width="24" height="18" rx="2" fill="#fff" stroke="#555"/><rect x="4" y="7" width="24" height="4" fill="#2f71cd"/><path d="M9 20h10M15 16l4 4-4 4" stroke="#215dc6" stroke-width="1.8" fill="none"/></svg>`,
    search: `<svg viewBox="0 0 32 32"><circle cx="13" cy="13" r="8" fill="#dbeeff" stroke="#215dc6" stroke-width="2.5"/><path d="M19 19l8 8" stroke="#8a6d3b" stroke-width="4" stroke-linecap="round"/></svg>`,
    privacy: `<svg viewBox="0 0 32 32"><path d="M16 3l11 4v8c0 7-5 12-11 14C10 27 5 22 5 15V7z" fill="#5aa83a" stroke="#2e6a12"/><path d="M11 16l4 4 7-8" stroke="#fff" stroke-width="2.6" fill="none"/></svg>`,
    pinball: `<svg viewBox="0 0 32 32"><rect x="6" y="2" width="20" height="28" rx="4" fill="#1a1450" stroke="#888"/><circle cx="12" cy="10" r="3" fill="#e5410c"/><circle cx="20" cy="9" r="3" fill="#f2a900"/><circle cx="16" cy="15" r="3" fill="#1e7ae6"/><path d="M9 25l5 2M23 25l-5 2" stroke="#ddd" stroke-width="2" stroke-linecap="round"/><circle cx="17" cy="21" r="1.6" fill="#fff"/></svg>`,
    spider: `<svg viewBox="0 0 32 32"><rect x="4" y="6" width="15" height="21" rx="2" fill="#2f5fd0" stroke="#123" transform="rotate(-12 11 16)"/><rect x="12" y="5" width="15" height="21" rx="2" fill="#fff" stroke="#333"/><circle cx="19.5" cy="15.5" r="3" fill="#111"/><path d="M15 12l2 2M24 12l-2 2M14.5 16h2M24.5 16h-2M15 20l2-2M24 20l-2-2" stroke="#111"/></svg>`,
    stats: `<svg viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" rx="2" fill="#fff" stroke="#4a6fa0"/><rect x="8" y="17" width="4" height="8" fill="#1e7ae6"/><rect x="14" y="11" width="4" height="14" fill="#5aa83a"/><rect x="20" y="7" width="4" height="18" fill="#f2a900"/></svg>`,
    board: `<svg viewBox="0 0 32 32"><rect x="3" y="4" width="26" height="22" rx="2" fill="#c9a26b" stroke="#7a5a2e"/><rect x="6" y="7" width="9" height="8" fill="#fff59d" transform="rotate(-4 10 11)"/><rect x="17" y="8" width="9" height="8" fill="#b3e5fc" transform="rotate(5 21 12)"/><rect x="9" y="17" width="10" height="7" fill="#f8bbd0" transform="rotate(2 14 20)"/><circle cx="10" cy="8" r="1.2" fill="#d0362f"/><circle cx="21" cy="9" r="1.2" fill="#1e7ae6"/><circle cx="14" cy="18" r="1.2" fill="#5aa83a"/></svg>`,
    rebuild: `<svg viewBox="0 0 32 32"><defs><linearGradient id="rbig" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".55" stop-color="#a78bfa"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs><path d="M16 29l13-6.5L16 16 3 22.5z" fill="#06263a" stroke="#22d3ee"/><path d="M16 23.5l13-6.5L16 10.5 3 17z" fill="#1e1b4b" stroke="#a78bfa"/><path d="M16 18l13-6.5L16 5 3 11.5z" fill="url(#rbig)" stroke="#fff" stroke-width=".8"/><path d="M25.5 2.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="#fff"/></svg>`,
    yapless: `<svg viewBox="0 0 32 32"><rect x="3" y="5" width="26" height="19" rx="6" fill="#ff7a32"/><path d="M10 24l-2 5 7-5" fill="#ff7a32"/><path d="M10 12h12M10 17h7" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  };

  // ---------------- Apps ----------------
  const links = P.links;
  const APPS = {
    about:    { title: "About Me", icon: "user", w: 640, h: 470, render: renderAbout },
    projects: { title: "My Projects", icon: "project", w: 660, h: 440, render: renderProjects },
    resume:   { title: "Resume.doc - WordPad", icon: "resume", w: 720, h: 540, render: renderResume },
    contact:  { title: "New Message - Contact Me", icon: "mail", w: 520, h: 420, render: renderContact },
    ie:       { title: "Internet Explorer", icon: "ie", w: 640, h: 440, render: renderIE },
    cmd:      { title: "Command Prompt", icon: "cmd", w: 620, h: 380, render: renderCmd },
    msn:      { title: "MSN Messenger - Chat", icon: "msn", w: 420, h: 460, render: renderMSN },
    mine:     { title: "Minesweeper", icon: "mine", w: 0, h: 0, render: renderMine, fixed: true },
    notepad:  { title: "Untitled - Notepad", icon: "notepad", w: 520, h: 380, render: renderNotepad },
    paint:    { title: "untitled - Paint", icon: "paint", w: 640, h: 460, render: renderPaint },
    recycle:  { title: "Recycle Bin", icon: "recycle", w: 560, h: 360, render: renderRecycle },
    computer: { title: "My Computer", icon: "computer", w: 600, h: 400, render: renderComputer },
    calendar: { title: "Calendar", icon: "calendar", w: 640, h: 470, render: (b, c) => renderCalendar(b, c) },
    games:    { title: "Games", icon: "games", w: 640, h: 520, render: renderGames },
    // the table is 400x600 under 101px of title bar, menu, score line and mission panel: as wide as that leaves it, not wider
    pinball:  { title: "3D Pinball - Space Cadet", icon: "pinball", w: 440, h: 660, fitW: (h) => Math.max(360, Math.round((h - 101) * 2 / 3) + 6), render: lazyGame("pinball") },
    spider:   { title: "Spider Solitaire", icon: "spider", w: 720, h: 540, render: lazyGame("spider") },
    calc:     { title: "Calculator", icon: "calc", w: 270, h: 320, render: lazyExtra("calculator") },
    wmp:      { title: "Windows Media Player", icon: "wmp", w: 500, h: 380, render: lazyExtra("mediaplayer") },
    pictures: { title: "My Pictures", icon: "pictures", w: 580, h: 440, render: lazyExtra("pictures") },
    taskmgr:  { title: "Windows Task Manager", icon: "taskmgr", w: 420, h: 440, render: lazyExtra("taskmgr") },
    control:  { title: "Control Panel", icon: "control", w: 600, h: 420, render: (b, c) => renderControl(b, c) },
    run:      { title: "Run", icon: "run", w: 360, h: 190, render: (b, c) => renderRun(b, c) },
    search:   { title: "Search Results", icon: "search", w: 560, h: 420, render: (b, c) => renderSearch(b, c) },
    stats:    { title: "Site Statistics", icon: "stats", w: 520, h: 400, render: (b, c) => renderStats(b, c) },
    board:    { title: "Message Board", icon: "board", w: 360, h: 480, render: (b, c) => renderBoard(b, c) },
    help:     { title: "Help and Support Center", icon: "help", w: 640, h: 460, render: (b, c) => renderHelp(b, c) },
    privacy:  { title: "Privacy.txt - Notepad", icon: "privacy", w: 560, h: 440, render: (b, c) => renderPrivacy(b, c) },
    display:  { title: "Display Properties", icon: "display", w: 420, h: 470, render: renderDisplay },
    solitaire:{ title: "Solitaire", icon: "solitaire", w: 640, h: 520, render: lazyGame("solitaire") },
    snake:    { title: "Snake", icon: "snake", w: 420, h: 480, render: lazyGame("snake") },
    breakout: { title: "Brick Breaker", icon: "breakout", w: 520, h: 460, render: lazyGame("breakout") },
  };
  // windows that can go true full screen (title-bar ⛶ button or F11)
  ["solitaire", "spider", "mine", "pinball", "snake", "breakout", "wmp", "pictures", "paint"].forEach((k) => (APPS[k].full = true));
  APPS.reset = { title: "Reset Desktop", icon: "showdesk", action: () => askReset() };
  APPS.rebuild = { title: "Visual Rebuild", icon: "rebuild", action: () => runRebuild() };
  const GAME_IDS = ["solitaire", "spider", "mine", "pinball", "snake", "breakout"];
  // Minesweeper's panel: a seven-segment clock and the little face
  const SEG_POLY = { a: "2,.5 11,.5 9,2.5 4,2.5", f: "1,1.5 3,3.5 3,9.5 1,11", b: "12,1.5 12,11 10,9.5 10,3.5", g: "2,11.5 4,10.5 9,10.5 11,11.5 9,12.5 4,12.5", e: "1,12 3,13.5 3,19.5 1,21.5", c: "12,12 12,21.5 10,19.5 10,13.5", d: "4,20.5 9,20.5 11,22.5 2,22.5" };
  const SEG_ON = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg", "-": "g" };
  const lcdDigits = (s) => [...s].map((ch) => `<svg viewBox="0 0 13 23" aria-hidden="true">${Object.entries(SEG_POLY).map(([k, p]) => `<polygon points="${p}" fill="${SEG_ON[ch].includes(k) ? "#ff1a00" : "#3c0000"}"/>`).join("")}</svg>`).join("");
  const faceBase = `<circle cx="10" cy="10" r="8.500" fill="#ffee00" stroke="#000"/>`;
  const MINE_FACE = {
    smile: `<svg viewBox="0 0 20 20">${faceBase}<circle cx="7" cy="8" r="1.200"/><circle cx="13" cy="8" r="1.200"/><path d="M5.500 12c1.500 3 7.500 3 9 0" fill="none" stroke="#000" stroke-width="1.200"/></svg>`,
    ooh: `<svg viewBox="0 0 20 20">${faceBase}<circle cx="7" cy="7.500" r="1.200"/><circle cx="13" cy="7.500" r="1.200"/><ellipse cx="10" cy="13" rx="2.200" ry="2.700" fill="none" stroke="#000" stroke-width="1.200"/></svg>`,
    dead: `<svg viewBox="0 0 20 20">${faceBase}<path d="M5.500 6.500l3 3m0-3l-3 3M11.500 6.500l3 3m0-3l-3 3" stroke="#000" stroke-width="1.200"/><path d="M5.500 15c1.500-3 7.500-3 9 0" fill="none" stroke="#000" stroke-width="1.200"/></svg>`,
    cool: `<svg viewBox="0 0 20 20">${faceBase}<path d="M3 7h14" stroke="#000"/><path d="M4.500 7h4.500l-.5 3h-3.500zM11 7h4.500l-.5 3h-3.500z"/><path d="M6 13c1.500 2.500 6.500 2.500 8 0" fill="none" stroke="#000" stroke-width="1.200"/></svg>`,
  };
  const DESKTOP = ["about", "projects", "resume", "ie", "contact", "msn", "cmd", "calendar", "games", "pictures", "wmp", "paint", "notepad", "stats", "board", "rebuild", "reset", "recycle"];
  const DESK_LABEL = { rebuild: "Visual Rebuild", stats: "Site Stats", board: "Message Board", reset: "Reset Desktop", pinball: "3D Pinball", spider: "Spider Solitaire", calc: "Calculator", wmp: "Media Player", pictures: "My Pictures", taskmgr: "Task Manager", control: "Control Panel", run: "Run", search: "Search", help: "Help and Support", privacy: "Privacy", about: "About Me", resume: "Resume", projects: "My Projects", contact: "Contact Me", ie: "Internet Explorer", cmd: "Command Prompt", msn: "MSN Messenger", mine: "Minesweeper", paint: "Paint", notepad: "Notepad", recycle: "Recycle Bin", computer: "My Computer", games: "Games", calendar: "Calendar", solitaire: "Solitaire", snake: "Snake", breakout: "Brick Breaker", display: "Display" };

  // Games live in games.js and are fetched only when first opened
  let gamesReady;
  const loadGames = () => gamesReady ||= new Promise((ok, fail) => {
    const s = document.createElement("script"); s.src = "games.js?v=41"; s.onload = ok; s.onerror = () => { gamesReady = null; fail(); };
    document.head.appendChild(s);
  });
  let extrasReady;
  const loadExtras = () => extrasReady ||= new Promise((ok, fail) => {
    const s = document.createElement("script"); s.src = "extras.js?v=41"; s.onload = ok; s.onerror = () => { extrasReady = null; fail(); };
    document.head.appendChild(s);
  });
  // Visual Rebuild (rebuild.js): a purely visual, full-screen rebuild of the site, fetched on first use
  let rebuildReady;
  const loadRebuild = () => rebuildReady ||= new Promise((ok, fail) => {
    const s = document.createElement("script"); s.src = "rebuild.js?v=41"; s.onload = ok; s.onerror = () => { rebuildReady = null; fail(); };
    document.head.appendChild(s);
  });
  function runRebuild() {
    closeMenus(); busy();
    if (fsEl()) exitFull();
    loadRebuild().then(() => window.REBUILD({ desktop: $("#desktop"), open: (id) => openApp(id, { key: "rb-" + id }), close: (id) => close("rb-" + id) }))
      .catch(() => msgBox("Visual Rebuild", "Could not load Visual Rebuild. Check your connection.", "⚠️"));
  }
  function lazyExtra(name) {
    return (body, ctx) => {
      body.innerHTML = `<div class="loading">Loading…</div>`;
      loadExtras().then(() => { if (wins.get(ctx.key)?.el === ctx.el) { body.innerHTML = ""; window.EXTRAS[name](body, ctx); } })
        .catch(() => (body.innerHTML = `<div class="loading">Could not load this program. Check your connection.</div>`));
    };
  }
  function lazyGame(name) {
    return (body, ctx) => {
      body.innerHTML = `<div class="loading">Loading…</div>`;
      loadGames().then(() => { if (wins.get(ctx.key)?.el === ctx.el) { body.innerHTML = ""; window.GAMES[name](body, ctx); } })
        .catch(() => (body.innerHTML = `<div class="loading">Could not load the game. Check your connection.</div>`));
    };
  }

  // ---------------- Window manager ----------------
  const wins = new Map(); // key -> {el, task, app, cleanups}
  let z = 10, activeKey = null, cascade = 0;
  const winLayer = $("#windows");

  function openApp(id, opts = {}) {
    const key = opts.key || id;
    if (wins.has(key)) { const w = wins.get(key); restore(key); if (opts.date) w.goto?.(opts.date); return w; }
    const app = opts.app || APPS[id];
    if (!app) return;
    if (app.action) return app.action();
    // a full-screen window hides everything else: message boxes and dialogs open inside it, any other window brings the desktop back
    const inFull = app.dialog ? fsEl() : null;
    if (fsEl() && !inFull) exitFull();
    closeMenus(); busy();
    const el = document.createElement("div");
    el.className = "win";
    el.dataset.key = key;
    const dw = innerWidth, dh = innerHeight - 30;
    // size windows relative to the screen so small laptop screens still fit them
    const h = Math.round(Math.min(app.h || 200, dh * 0.9)), w = Math.round(Math.min(app.fitW ? app.fitW(h) : app.w || 300, dw * 0.92));
    const off = (cascade++ % 6) * 24;
    el.style.left = Math.round(Math.max(6, Math.min(dw - w - 6, (dw - w) / 2 + off - 60))) + "px";
    el.style.top = Math.round(Math.max(6, Math.min(dh - h - 6, (dh - h) / 2 + off - 50))) + "px";
    // a dialog is as tall as its text (a fixed height pushed OK below the fold on long messages); fitWin pulls it back on screen once rendered
    if (!app.fixed) { el.style.width = w + "px"; if (!app.dialog) el.style.height = h + "px"; }
    const fixedSize = app.fixed || app.dialog;
    if (app.dialog) el.classList.add("dialog");
    el.innerHTML = `
      <div class="titlebar">${I[app.icon]}<span class="ttl">${esc(app.title)}</span>
        ${app.full ? `<button class="tbtn fsbtn" data-a="fs" title="Full screen (F11)" aria-label="Full screen">⛶</button>` : ""}${app.dialog ? "" : `<button class="tbtn" data-a="min" title="Minimize" aria-label="Minimize">_</button>`}
        ${fixedSize ? "" : `<button class="tbtn" data-a="max" title="Maximize" aria-label="Maximize">□</button>`}
        <button class="tbtn close" data-a="close" title="Close" aria-label="Close">×</button>
      </div><div class="wbody"></div>${fixedSize ? "" : `<div class="resize"></div>`}`;
    (inFull || winLayer).appendChild(el);
    const task = document.createElement("div");
    task.className = "task";
    task.innerHTML = `${I[app.icon]}<span>${esc(app.title)}</span>`;
    $("#tasks").appendChild(task);
    const rec = { el, task, app, cleanups: [] };
    wins.set(key, rec);

    el.addEventListener("pointerdown", (e) => { if (e.target.closest(".win") === el) focus(key); }); // not for a dialog nested inside it
    task.addEventListener("click", () => {
      if (activeKey === key && !el.classList.contains("min")) minimize(key);
      else restore(key);
    });
    el.querySelector(".titlebar").addEventListener("click", (e) => {
      const a = e.target.closest(".tbtn")?.dataset.a;
      if (a === "close") close(key);
      if (a === "min") minimize(key);
      if (a === "max") toggleMax(el);
      if (a === "fs") toggleFull(el);
    });
    el.querySelector(".titlebar").addEventListener("dblclick", (e) => { if (!fixedSize && !e.target.closest(".tbtn") && document.fullscreenElement !== el) toggleMax(el); });
    drag(el.querySelector(".titlebar"), el, false);
    if (!fixedSize) drag(el.querySelector(".resize"), el, true);

    const ctx = {
      key, el, store, ...opts,
      setTitle: (t) => { el.querySelector(".ttl").textContent = t; task.querySelector("span").textContent = t; },
      close: () => close(key),
      onClose: (fn) => rec.cleanups.push(fn),
      isVisible: () => !document.hidden && !el.classList.contains("min") && wins.has(key),
      isActive: () => activeKey === key,
      alive: () => wins.get(key)?.el === el,
      wait: (ms) => wait(ms, ctx),
      skipWait: () => skipWaits(ctx),
      menu: (bar, menus) => wireMenu(bar, menus),
      sys,
    };
    app.render(el.querySelector(".wbody"), ctx);
    if (app.dialog) fitWin(el); // its height is only known once rendered
    // any menubar without its own handlers still gets working File / View / Help menus
    el.querySelectorAll(".menubar:not([data-wired])").forEach((mb) => wireMenu(mb, defaultMenus(app, ctx)));
    applyOrder(el, key);
    setTimeout(() => { if (activeKey === key && !el.contains(document.activeElement)) el.querySelector(".wbody input:not([readonly]):not([type=radio]):not([type=hidden]), .wbody textarea:not([readonly]), .wbody button, .wbody [tabindex='0']:not([data-mi])")?.focus({ preventScroll: true }); }, 0);
    focusableItems(el);
    focus(key);
    return rec;
  }
  const RUN_ALIAS = { rebuild: "rebuild", mspaint: "paint", "notepad.exe": "notepad", "calc.exe": "calc", "cmd.exe": "cmd", taskmgr: "taskmgr", iexplore: "ie", explorer: "computer", winmine: "mine", sol: "solitaire", spider: "spider", pinball: "pinball", wmplayer: "wmp", control: "control" };
  const sys = {
    windows: () => [...wins].filter(([k]) => !k.startsWith("msg") && !k.startsWith("ask")).map(([k, w]) => ({ key: k, title: w.el.querySelector(".ttl").textContent, minimized: w.el.classList.contains("min"), active: k === activeKey })),
    focus: (k) => { if (wins.has(k)) restore(k); },
    close: (k) => close(k),
    open: (id, o) => { id = RUN_ALIAS[String(id).toLowerCase()] || id; const k = Object.keys(APPS).find((a) => a === id || APPS[a].title.toLowerCase() === String(id).toLowerCase() || (DESK_LABEL[a] || "").toLowerCase() === String(id).toLowerCase()); if (!k) return false; openApp(k, o); return true; },
    msg: (t, h, icon) => msgBox(t, h, icon),
    ask: (t, f) => askBox(t, f),
    confirm: (t, h, ok) => confirmBox(t, h, ok),
    notify: (t, h, o) => notify(t, h, o),
    career: { read: () => Career.read(), record: (g, r) => Career.record(g, r), levelOf: (p) => Career.levelOf(p), rank: (l) => Career.rank(l) },
    photos: [{ src: "photo-full.jpg?v=40", title: "Medhansh.jpg" }, { src: "photo.jpg?v=40", title: "Avatar.jpg" }],
    // Shared data everyone sees. Games: sys.scores.submit(game, score, extra) / sys.scores.top(game, n, ascending)
    scores: { top: (g, n, asc) => Cloud.top(g, n, asc), submit: async (g, s, x) => { await askName(); return Cloud.submit(g, s, x); }, name: () => playerName(), askName },
    pictures: { list: () => Cloud.pictures(), data: (id) => Cloud.pictureData(id), add: async (t, d, w, h) => { await askName(); return Cloud.pictureAdd(t, d, w, h); }, remove: (id) => Cloud.pictureDelete(id) },
    esc,
    P,
  };
  // real full screen where the browser allows it (standard or webkit), otherwise maximize
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const exitFull = () => { try { const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen?.(); p?.catch?.(() => {}); } catch {} };
  const GEOM = ["left", "top", "width", "height", "transform"];
  function toggleFull(el) {
    if (fsEl() === el) return exitFull();
    // the window's own size and place, put back exactly on the way out
    if (!el.dataset.geom) el.dataset.geom = JSON.stringify(GEOM.map((k) => el.style[k]));
    if (el.requestFullscreen) el.requestFullscreen({ navigationUI: "hide" }).catch(() => { delete el.dataset.geom; el.classList.toggle("max"); });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else { delete el.dataset.geom; el.classList.toggle("max"); }
  }
  function onFullChange() {
    const f = fsEl();
    wins.forEach((w) => {
      const on = f === w.el; w.el.classList.toggle("is-full", on);
      const b = w.el.querySelector(".fsbtn"); if (b) { b.setAttribute("aria-pressed", on); b.title = on ? "Exit full screen (F11)" : "Full screen (F11)"; b.setAttribute("aria-label", on ? "Exit full screen" : "Full screen"); }
      if (!on && w.el.dataset.geom) { try { JSON.parse(w.el.dataset.geom).forEach((v, i) => (w.el.style[GEOM[i]] = v)); } catch {} delete w.el.dataset.geom; }
      // dialogs that opened inside a full-screen window go back to the desktop with it
      if (!on) w.el.querySelectorAll(":scope > .wbody ~ .win, :scope > .win").forEach((d) => winLayer.appendChild(d));
    });
    (f || desktopEl).appendChild(balloons);
  }
  document.addEventListener("fullscreenchange", onFullChange); document.addEventListener("webkitfullscreenchange", onFullChange);
  addEventListener("keydown", (e) => {
    if (e.key !== "F11" || !activeKey) return;
    const w = wins.get(activeKey); if (!w?.app.full) return;
    e.preventDefault(); toggleFull(w.el);
  });
  // The hourglass, briefly, whenever a program starts
  function busy(ms = 420) { document.documentElement.classList.add("busy"); clearTimeout(busy.t); busy.t = setTimeout(() => document.documentElement.classList.remove("busy"), ms); }
  // XP's window animation: an outline with a title bar flies between two rectangles. Purely visual, so state never waits on it.
  function fly(a, b) {
    if (!a?.width || !b?.width || reduced() || document.hidden || !Element.prototype.animate) return;
    const g = document.createElement("div"); g.className = "flyrect"; (document.fullscreenElement || document.body).appendChild(g);
    const f = (r) => ({ left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    const an = g.animate([f(a), f(b)], { duration: 190, easing: "cubic-bezier(.3,.1,.5,1)" });
    an.onfinish = an.oncancel = () => g.remove(); setTimeout(() => g.remove(), 500);
  }
  function minimize(key) { const w = wins.get(key); if (!w) return; if (fsEl() === w.el) exitFull(); const from = w.el.getBoundingClientRect(); w.el.classList.add("min"); fly(from, w.task.getBoundingClientRect()); XPS.play("minimize"); if (activeKey === key) activeKey = null; paintActive(); }
  function restore(key) {
    const w = wins.get(key); if (!w) return;
    if (w.el.classList.contains("min")) { const from = w.task.getBoundingClientRect(); w.el.classList.remove("min"); fitWin(w.el); fly(from, w.el.getBoundingClientRect()); XPS.play("restore"); }
    focus(key);
  }
  function toggleMax(el) { const from = el.getBoundingClientRect(); el.classList.toggle("max"); if (!el.classList.contains("max")) fitWin(el); fly(from, el.getBoundingClientRect()); XPS.play(el.classList.contains("max") ? "maximize" : "restore"); }
  function focus(key) {
    const w = wins.get(key); if (!w) return;
    if (activeKey !== key) w.el.style.zIndex = ++z;
    activeKey = key; paintActive();
    // the title bar keeps focus where it was (it prevents default), so a field outside, like the Message Board, would keep the keys
    const a = document.activeElement; if (a && a !== document.body && !w.el.contains(a) && !a.closest?.(".dropdown")) a.blur();
  }
  function paintActive() {
    wins.forEach((w, k) => { const on = k === activeKey; w.el.classList.toggle("inactive", !on); w.task.classList.toggle("active", on); });
  }
  // pressing or tabbing outside every window leaves none active, so games stop taking keys meant for something else
  const OUTSIDE_OK = ".win, .dropdown, .taskbar";
  document.addEventListener("pointerdown", (e) => { if (activeKey && !e.target.closest?.(OUTSIDE_OK)) { activeKey = null; paintActive(); } }, true);
  document.addEventListener("focusin", (e) => {
    const key = e.target.closest?.(".win")?.dataset.key;
    if (key && wins.has(key)) { if (key !== activeKey) focus(key); }
    else if (activeKey && !e.target.closest?.(OUTSIDE_OK)) { activeKey = null; paintActive(); }
  });
  function close(key) {
    const w = wins.get(key); if (!w) return;
    w.el.querySelectorAll(":scope > .win").forEach((d) => close(d.dataset.key)); // dialogs that opened inside it in full screen
    w.cleanups.forEach((fn) => { try { fn(); } catch {} });
    w.el.remove(); w.task.remove(); wins.delete(key);
    closeMenus();
    if (activeKey === key) {
      activeKey = null;
      const top = [...wins].filter(([, x]) => !x.el.classList.contains("min")).sort((a, b) => (+a[1].el.style.zIndex || 0) - (+b[1].el.style.zIndex || 0)).pop();
      if (top) focus(top[0]); else paintActive();
    }
  }
  // keep a window wholly on the screen, so its title-bar buttons and bottom edge stay reachable. The CSS already caps a window at the desktop
  // (max-width / max-height on .win, reversible when the screen grows again); this pulls it inside. Runs after the browser is resized, when a
  // minimized window comes back and when a maximized one is restored (a hidden window measures 0, so it is placed when it shows)
  function fitWin(el) {
    if (el.classList.contains("max") || el.classList.contains("min") || el === fsEl() || el.dataset.geom) return; // a full-screen window keeps its saved place for later
    const dw = innerWidth, dh = innerHeight - 30, w = el.offsetWidth, h = el.offsetHeight;
    const x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
    el.style.left = Math.round(Math.max(0, Math.min(dw - w, x))) + "px"; el.style.top = Math.round(Math.max(0, Math.min(dh - h, y))) + "px";
  }
  let wz; addEventListener("resize", () => { clearTimeout(wz); wz = setTimeout(() => wins.forEach(({ el }) => fitWin(el)), 100); });
  // Drag / resize with pointer capture; updates are batched to one per animation frame
  function drag(handle, el, resize) {
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest(".tbtn") || el.classList.contains("max") || document.fullscreenElement === el || innerWidth <= 640) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, r = el.getBoundingClientRect();
      let dx = 0, dy = 0, raf = 0;
      const pos = () => [Math.min(innerWidth - 60, Math.max(-r.width + 80, r.left + dx)), Math.min(innerHeight - 60, Math.max(0, r.top + dy))];
      el.classList.add("moving");
      const apply = () => {
        raf = 0;
        if (resize) { el.style.width = Math.max(260, Math.min(innerWidth - r.left, r.width + dx)) + "px"; el.style.height = Math.max(140, Math.min(innerHeight - 30 - r.top, r.height + dy)) + "px"; } // not past the screen edge or under the taskbar
        else { const [x, y] = pos(); el.style.transform = `translate3d(${x - r.left}px,${y - r.top}px,0)`; }
      };
      const move = (ev) => { dx = ev.clientX - sx; dy = ev.clientY - sy; raf ||= requestAnimationFrame(apply); };
      const up = () => {
        handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); handle.removeEventListener("pointercancel", up);
        cancelAnimationFrame(raf); el.classList.remove("moving");
        if (resize) apply();
        else { const [x, y] = pos(); el.style.transform = ""; el.style.left = x + "px"; el.style.top = y + "px"; }
      };
      handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up);
    });
  }
  const MB_ICON = {
    "ℹ️": `<svg viewBox="0 0 32 32"><path d="M16 2C8 2 2 7 2 14c0 4 2 7 5 9l-1 7 7-5c1 .2 2 .3 3 .3 8 0 14-5 14-11.300S24 2 16 2z" fill="#fff" stroke="#3a6fc4" stroke-width="1.5"/><circle cx="16" cy="8.500" r="2.200" fill="#1e5fcf"/><rect x="14" y="12.500" width="4" height="9" rx="1" fill="#1e5fcf"/></svg>`,
    "⚠️": `<svg viewBox="0 0 32 32"><path d="M16 2.500 30.500 28h-29z" fill="#ffd93b" stroke="#a87b00" stroke-width="1.500" stroke-linejoin="round"/><rect x="14.300" y="10.500" width="3.400" height="10" rx="1.200" fill="#222"/><circle cx="16" cy="24" r="2" fill="#222"/></svg>`,
    "⛔": `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#e0301e" stroke="#7a1208" stroke-width="1.500"/><path d="M10 10l12 12M22 10 10 22" stroke="#fff" stroke-width="3.600" stroke-linecap="round"/></svg>`,
  };
  const mbIcon = (i) => MB_ICON[i] || i;
  function msgBox(title, text, icon = "ℹ️") {
    XPS.play(icon === "⚠️" ? "exclaim" : icon === "⛔" ? "critical" : "ding");
    openApp(null, { key: "msg" + Date.now() + "_" + cascade, app: { title, icon: "info", w: 360, h: 170, dialog: true, render: (b, ctx) => {
      b.innerHTML = `<div class="msgbox"><span class="msgbox-ico">${mbIcon(icon)}</span><div>${text}</div></div><div class="msgbox-actions"><button class="xpbtn">OK</button></div>`;
      const ok = b.querySelector("button"); ok.onclick = ctx.close; setTimeout(() => ok.focus(), 0);
    } } });
  }
  // Text entry in an XP dialog instead of the browser's own prompt. A string asks for one value; a list of fields returns a list. Cancel resolves null.
  function askBox(title, fields) {
    const list = Array.isArray(fields) ? fields : [{ label: fields }];
    return new Promise((done) => {
      let out = null;
      openApp(null, { key: "ask" + Date.now() + "_" + cascade, app: { title, icon: "info", w: 360, h: 118 + list.length * 34 + (list.length === 1 ? 30 : 0), dialog: true, render: (b, c) => {
        b.innerHTML = `<form class="askbox"><div class="ask-fields ${list.length === 1 ? "one" : ""}">${list.map((f, i) => `<label><span>${esc(f.label)}</span><input data-i="${i}" type="${f.type || "text"}" value="${esc(f.value ?? "")}" spellcheck="false" autocomplete="off"></label>`).join("")}</div><div class="msgbox-actions"><button class="xpbtn">OK</button><button type="button" class="xpbtn cancel">Cancel</button></div></form>`;
        c.onClose(() => done(out));
        b.querySelector(".cancel").onclick = c.close;
        b.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); const v = [...b.querySelectorAll("input")].map((x) => x.value); out = Array.isArray(fields) ? v : v[0]; c.close(); });
        setTimeout(() => { const i = b.querySelector("input"); i.focus(); i.select(); }, 0);
      } } });
    });
  }
  // onYes runs inside the click itself, so a window.open there counts as a user action and isn't blocked
  function confirmBox(title, text, okLabel = "OK", onYes) {
    XPS.play("exclaim");
    return new Promise((done) => {
      let yes = false;
      openApp(null, { key: "ask" + Date.now() + "_" + cascade, app: { title, icon: "info", w: 360, h: 170, dialog: true, render: (b, c) => {
        b.innerHTML = `<div class="msgbox"><span class="msgbox-ico">${MB_ICON["⚠️"]}</span><div>${text}</div></div><div class="msgbox-actions"><button class="xpbtn yes">${esc(okLabel)}</button><button class="xpbtn no">Cancel</button></div>`;
        c.onClose(() => done(yes));
        b.querySelector(".yes").onclick = () => { yes = true; onYes?.(); c.close(); }; b.querySelector(".no").onclick = c.close;
        setTimeout(() => b.querySelector(".no").focus(), 0);
      } } });
    });
  }

  function screenSaver() {
    const ov = document.createElement("div"); ov.className = "saver";
    ov.innerHTML = `<div class="saver-logo"><span class="xp-logo"><span></span><span></span><span></span><span></span></span><b>Windows<sup>xp</sup></b></div>`;
    document.body.appendChild(ov);
    const logo = ov.firstChild; let x = 40, y = 40, vx = 2.2, vy = 1.7, raf;
    const step = () => { const w = logo.offsetWidth, h = logo.offsetHeight; x += vx; y += vy; if (x < 0 || x > innerWidth - w) vx *= -1; if (y < 0 || y > innerHeight - h) vy *= -1; logo.style.transform = `translate(${x}px,${y}px)`; raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    const stop = () => { cancelAnimationFrame(raf); ov.remove(); removeEventListener("keydown", stop, true); idleAt = Date.now(); };
    setTimeout(() => { ov.addEventListener("pointermove", stop, { once: true }); ov.addEventListener("pointerdown", stop, { once: true }); addEventListener("keydown", stop, true); }, 400);
  }

  // ---------------- Menus (menubar dropdowns) ----------------
  // menus: [{ label, items: [{ label, act, key, check, disabled } | "-"] or () => items }]
  let openMenu = null;
  function closeMenus() { openMenu?.remove(); openMenu = null; document.querySelectorAll(".menubar .on").forEach((s) => s.classList.remove("on")); }
  function wireMenu(bar, menus) {
    bar.dataset.wired = "1";
    bar.setAttribute("role", "menubar");
    bar.innerHTML = menus.map((m, i) => `<span data-mi="${i}" role="menuitem" aria-haspopup="true" tabindex="0">${esc(m.label)}</span>`).join("");
    const next = (span, d) => { const all = [...bar.querySelectorAll("[data-mi]")]; return all[(all.indexOf(span) + d + all.length) % all.length]; };
    const openFirst = (span) => { show(span); openMenu?.querySelector("[data-k]:not(.dis)")?.focus(); };
    const show = (span) => {
      closeMenus();
      const m = menus[+span.dataset.mi]; span.classList.add("on");
      const items = typeof m.items === "function" ? m.items() : m.items;
      const dd = document.createElement("div"); dd.className = "dropdown";
      dd.innerHTML = items.map((it, k) => it === "-" ? "<hr>" : `<div data-k="${k}" role="menuitem" tabindex="-1" class="${it.disabled ? "dis" : ""}"><i>${it.check ? "✓" : ""}</i><span>${esc(it.label)}</span>${it.key ? `<kbd>${esc(it.key)}</kbd>` : ""}</div>`).join("");
      const r = span.getBoundingClientRect();
      dd.style.top = r.bottom + "px";
      dd.addEventListener("pointerdown", (e) => e.stopPropagation());
      dd.addEventListener("click", (e) => { const d = e.target.closest("[data-k]"); if (!d || d.classList.contains("dis")) return; closeMenus(); XPS.play("menu"); items[+d.dataset.k].act?.(); });
      dd.addEventListener("keydown", (e) => {
        e.stopPropagation();
        const opts = [...dd.querySelectorAll("[data-k]:not(.dis)")], at = opts.indexOf(document.activeElement);
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (opts.length) opts[e.key === "ArrowDown" ? (at + 1) % opts.length : at <= 0 ? opts.length - 1 : at - 1].focus(); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); const n = next(span, e.key === "ArrowLeft" ? -1 : 1); n.focus(); openFirst(n); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const it = opts[at]; span.focus(); it?.click(); }
        else if (e.key === "Escape") { e.preventDefault(); closeMenus(); span.focus(); }
      });
      (document.fullscreenElement || document.body).appendChild(dd); openMenu = dd;
      dd.style.left = Math.max(0, Math.min(r.left, innerWidth - dd.offsetWidth - 2)) + "px";
      // no room above the taskbar: open upward, as XP did; otherwise cap the height so the list scrolls instead of being cut off
      const room = (document.fullscreenElement ? innerHeight : innerHeight - 30) - r.bottom - 4; // full screen has no taskbar
      if (dd.offsetHeight > room && r.top - dd.offsetHeight >= 0) dd.style.top = r.top - dd.offsetHeight + "px";
      else if (dd.offsetHeight > room) dd.style.maxHeight = Math.max(60, room) + "px";
    };
    bar.addEventListener("pointerdown", (e) => { const s = e.target.closest("[data-mi]"); if (!s) return; e.stopPropagation(); const wk = bar.closest(".win")?.dataset.key; if (wk) focus(wk); s.classList.contains("on") ? closeMenus() : show(s); });
    bar.addEventListener("pointerover", (e) => { if (e.pointerType !== "mouse") return; const s = e.target.closest("[data-mi]"); if (s && openMenu && !s.classList.contains("on")) show(s); });
    bar.addEventListener("keydown", (e) => {
      const s = e.target.closest("[data-mi]"); if (!s) return;
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); openFirst(s); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); next(s, e.key === "ArrowLeft" ? -1 : 1).focus(); }
    });
  }
  document.addEventListener("pointerdown", (e) => { if (openMenu && !e.target.closest?.(".dropdown")) closeMenus(); });
  const defaultMenus = (app, ctx) => [
    { label: "File", items: [{ label: "Close", key: "Alt+W", act: ctx.close }] },
    { label: "View", items: [{ label: "Maximize", act: () => toggleMax(ctx.el) }, { label: "Minimize", act: () => minimize(ctx.key) }] },
    { label: "Help", items: [{ label: `About ${app.title}`, act: () => msgBox("About", `<b>${esc(app.title)}</b><br>Part of ${esc(P.name)}'s portfolio.`) }] },
  ];
  const chrome = (body, { menu = ["File", "Edit", "View", "Favorites", "Tools", "Help"], menus, addr, addrIcon = "folder" } = {}) => {
    body.style.display = "flex"; body.style.flexDirection = "column"; body.style.overflow = "hidden";
    body.innerHTML = `<div class="menubar">${menu.map((m) => `<span>${m}</span>`).join("")}</div>
      ${addr ? `<div class="toolbar"><button disabled>◀ Back</button><button disabled>▶</button><button class="up" data-open="computer">⬆ Up</button></div>
      <div class="addr">Address <div class="field">${I[addrIcon]}<span class="addr-text">${esc(addr)}</span></div></div>` : ""}
      <div class="wbody inner" style="flex:1"></div>`;
    if (menus) wireMenu(body.querySelector(".menubar"), menus);
    return body.querySelector(".inner");
  };
  const taskPane = (sections) => `<div class="taskpane">${sections.map(([h, items]) => `<div class="tp-box"><h4>${h}</h4><div>${items}</div></div>`).join("")}</div>`;
  const yap = (label = "Yap-less") => links.yapless
    ? `<a href="${esc(links.yapless)}" target="_blank" rel="noopener">${I.yapless}${esc(label)}</a>`
    : `<a href="#" data-soon="Yap-less" title="Website coming soon">${I.yapless}${esc(label)} <small class="muted">(coming soon)</small></a>`;
  const ext = (href, label, icon) => !href ? "" : `<a href="${esc(href)}" target="_blank" rel="noopener">${icon ? I[icon] : ""}${esc(label)}</a>`;
  const appLink = (id, label) => `<button class="link" data-open="${id}">${I[APPS[id].icon]}${esc(label)}</button>`;
  document.addEventListener("click", (e) => {
    const bu = e.target.closest("[data-browse-url]");
    if (bu) { e.preventDefault(); const had = wins.has("ie"), w = openApp("ie", { url: bu.dataset.browseUrl }); if (had) w?.navigate?.(bu.dataset.browseUrl); return; }
    const s = e.target.closest("[data-soon]");
    if (s) { e.preventDefault(); msgBox(s.dataset.soon, `The ${esc(s.dataset.soon)} website is coming soon. Check back later!`, "🚧"); return; }
    const b = e.target.closest("[data-open]");
    if (b && !(b.classList.contains("fitem") && !matchMedia("(pointer: coarse)").matches)) openApp(b.dataset.open);
  });
  document.addEventListener("dblclick", (e) => { const f = e.target.closest(".fitem[data-open]"); if (f) openApp(f.dataset.open); });
  document.addEventListener("keydown", (e) => { const f = e.target.closest?.(".fitem[data-open]"); if (f && e.key === "Enter") openApp(f.dataset.open); });

  // ---------------- App renderers ----------------
  function renderAbout(body) {
    const inner = chrome(body, { addr: "C:\\Documents and Settings\\" + P.name + "\\About Me", addrIcon: "user" });
    inner.innerHTML = `<div class="explorer">
      ${taskPane([
        ["Quick Links", appLink("resume", "View my resume") + appLink("projects", "Browse my projects") + appLink("contact", "Send me a message")],
        ["Elsewhere", yap() + ext(links.github, "GitHub", "github") + ext(links.linkedin, "LinkedIn", "linkedin") + ext(links.instagram, "Instagram", "instagram") + ext(links.twitter, "X / Twitter", "x") + ext(links.website, "Website", "globe") || "<span class='muted'>Links coming soon</span>"],
      ])}
      <div class="ex-main doc">
        <div class="about-head">${avatar()}
          <div><h1>${esc(P.name)}</h1><div class="muted">${esc(P.role)}${P.subtitle ? " · " + esc(P.subtitle) : ""} · ${esc(P.location)}</div><p style="margin:6px 0 0">${esc(P.tagline)}</p></div></div>
        <h2>About</h2>${P.bio.map((p) => `<p>${esc(p)}</p>`).join("")}
        <h2>Currently</h2><ul>${(P.experience || []).filter((x) => /present/i.test(x.years)).map((x) => `<li><b>${esc(x.title)}</b>, ${x.org === "Yap-less" ? yap() : esc(x.org)}</li>`).join("")}${P.education?.[0] ? `<li>${esc(P.education[0].degree)}, ${esc(P.education[0].school)}</li>` : ""}</ul>
        <p class="about-more">Skills, education, awards and certifications are in my ${appLink("resume", "Resume")}. Things I've built are in ${appLink("projects", "My Projects")}.</p>
      </div></div>`;
  }

  function renderProjects(body, ctx) {
    const inner = chrome(body, { addr: "C:\\My Documents\\My Projects" });
    inner.innerHTML = `<div class="explorer">
      ${taskPane([
        ["File and Folder Tasks", `<span>Double-click a project to open it.</span>`],
        ["Other Places", ext(links.github, "All repositories", "github") + appLink("about", "About Me") + appLink("resume", "Resume")],
        ["Details", `<span><b>My Projects</b><br>File Folder<br>${P.projects.length} objects</span>`],
      ])}
      <div class="ex-main"><div class="grid-items">${P.projects.map((p, i) => `<div class="fitem" data-i="${i}">${I.project}<span>${esc(p.name)}</span><small>${esc(p.year)}</small></div>`).join("")}</div></div></div>`;
    const items = inner.querySelectorAll(".fitem");
    items.forEach((it) => {
      it.addEventListener("click", () => { items.forEach((x) => x.classList.remove("sel")); it.classList.add("sel"); });
      it.addEventListener("dblclick", () => openProject(+it.dataset.i));
      it.addEventListener("keydown", (e) => e.key === "Enter" && openProject(+it.dataset.i));
      if (matchMedia("(pointer: coarse)").matches) it.addEventListener("click", () => openProject(+it.dataset.i));
    });
  }
  function openProject(i) {
    const p = P.projects[i];
    openApp(null, { key: "proj" + i, app: { title: p.name + " - Project", icon: "project", w: 520, h: 360, render: (b) => {
      const inner = chrome(b, { addr: "C:\\My Documents\\My Projects\\" + p.name });
      inner.innerHTML = `<div class="doc"><h1>${esc(p.name)}</h1><div class="muted">${esc(p.year)}</div>
        <h2>Description</h2><p>${esc(p.desc)}</p>
        <h2>Built with</h2><div class="chips">${(p.stack || []).map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>
        <h2>Links</h2><p>${[p.github && `<a href="${esc(p.github)}" target="_blank" rel="noopener">Source code on GitHub</a>`, p.url && `<a href="${esc(p.url)}" data-browse-url="${esc(p.url)}">Live demo (opens in Internet Explorer)</a>`].filter(Boolean).join(" &nbsp;·&nbsp; ") || '<span class="muted">Links coming soon</span>'}</p></div>`;
    } } });
  }

  function renderResume(body, ctx) {
    body.style.display = "flex"; body.style.flexDirection = "column"; body.style.overflow = "hidden";
    body.innerHTML = `<div class="menubar"></div>
      <div class="toolbar">${links.resumePdf ? `<a class="xpbtn" style="text-decoration:none;color:#000" href="${esc(links.resumePdf)}" download="${esc(P.name.replace(/\s+/g, "_"))}_Resume.pdf">⬇ Download PDF</a>` : ""}<button class="rprint">🖨 Print</button></div><div class="ruler"></div>
      <div class="wordpad-bg rframe-wrap"><iframe class="rframe" src="resume.html?embed=1" title="Resume"></iframe></div>`;
    const fr = body.querySelector(".rframe"), print = () => fr.contentWindow?.print();
    const printKey = (e) => { if (ctx.isActive() && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "p") { e.preventDefault(); print(); } };
    addEventListener("keydown", printKey); ctx.onClose(() => removeEventListener("keydown", printKey));
    body.querySelector(".rprint").onclick = print;
    ctx.menu(body.querySelector(".menubar"), [
      { label: "File", items: [{ label: "Print...", key: "Ctrl+P", act: print }, ...(links.resumePdf ? [{ label: "Download PDF", act: () => body.querySelector("[download]").click() }] : []), { label: "Open in new tab", act: () => window.open("resume.html", "_blank", "noopener") }, "-", { label: "Exit", act: ctx.close }] },
      { label: "Help", items: [{ label: "About", act: () => msgBox("Resume", "The same page is printed to resume.pdf, so both always match.") }] },
    ]);
  }

  // Contact: visitor picks email or phone, verifies their email with a 4-digit code (api/otp), then the
  // message is emailed to the site owner (api/contact). Nothing is stored in a database.
  const api = async (path, data) => {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch("/api/" + path, data ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: ctl.signal } : { signal: ctl.signal, cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(j.error || "Server unavailable"), { status: r.status, body: j });
      return j;
    } finally { clearTimeout(t); }
  };
  function renderContact(body, ctx) {
    const inner = chrome(body, { menus: [
      { label: "File", items: [{ label: "Email instead", act: () => mailto() }, "-", { label: "Close", act: ctx.close }] },
      { label: "Help", items: [{ label: "About", act: () => msgBox("Contact", `Your email is verified with a 4-digit code before the message reaches ${esc(P.name)}.<br>Your details are only used to reply to you. See <a href="#" data-open="privacy">Privacy</a>.`) }] },
    ] });
    inner.innerHTML = `<form class="form contact" novalidate>
      <div class="cstep"><b>1</b> Your details <span>›</span> <b>2</b> Verify email <span>›</span> <b>3</b> Sent</div>
      <label><span>To:</span><input value="${esc(P.name)}" readonly tabindex="-1"></label>
      <div class="cvia" role="radiogroup" aria-label="How should I reach you?"><span>Reach me by:</span><label><input type="radio" name="via" value="email" checked> Email</label><label><input type="radio" name="via" value="phone"> Phone</label></div>
      <label><span>Name:</span><input name="name" maxlength="80" autocomplete="name" placeholder="your name"></label>
      <label><span>Email:</span><input name="email" type="email" maxlength="120" autocomplete="email" placeholder="you@example.com (we'll send a code)"></label>
      <label class="cphone hidden"><span>Phone:</span><input name="phone" type="tel" maxlength="20" autocomplete="tel" placeholder="+91 98765 43210"></label>
      <label><span>Subject:</span><input name="subject" maxlength="140" placeholder="what's this about?"></label>
      <input name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <textarea name="message" maxlength="4000" placeholder="Write your message..."></textarea>
      <div class="ccode hidden"><span>Enter the 4-digit code sent to <b class="cto"></b>:</span><input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="4" pattern="[0-9]{4}" placeholder="••••"><button type="button" class="xpbtn cresend">Resend</button></div>
      <div class="cerr" role="alert"></div>
      <div class="cfoot"><span class="muted cnote">Your email is verified with a one-time code (valid 5 minutes).</span><button class="xpbtn csend" type="submit">Send code</button></div></form>`;
    const form = inner.querySelector("form"), err = form.querySelector(".cerr"), btn = form.querySelector(".csend"), F = form.elements;
    const steps = form.querySelectorAll(".cstep b");
    let token = null, sentTo = "", cooldown = 0, cdTimer, sending = false;
    const step = (n) => steps.forEach((s, i) => s.classList.toggle("on", i === n - 1));
    const mailto = () => location.href = `mailto:${links.email}?subject=${encodeURIComponent(F.subject.value)}&body=${encodeURIComponent(`${F.message.value}\n\n- ${F.name.value}${F.phone.value ? "\n" + F.phone.value : ""}`)}`;
    const fail = (msg, fields = {}) => { Object.keys(fields).forEach((k) => F[k]?.classList.add("bad")); err.innerHTML = msg; };
    const unavailable = () => fail(`Verified messages aren't available right now. <a href="#" class="cmail">Email me directly</a> instead.`);
    err.addEventListener("click", (e) => { if (e.target.closest(".cmail")) { e.preventDefault(); mailto(); } });
    form.querySelectorAll('[name="via"]').forEach((r) => r.addEventListener("change", () => { form.querySelector(".cphone").classList.toggle("hidden", F.via.value !== "phone"); resetCode("You changed how to reach you, so a new code is needed."); }));
    step(1);
    api("otp").then((j) => { if (!j.enabled) { form.querySelector(".cnote").textContent = "Verified messages are not set up yet."; } }).catch(() => {});
    const validate = () => {
      const bad = {}, d = { via: F.via.value, name: F.name.value.trim(), email: F.email.value.trim(), phone: F.phone.value.trim(), subject: F.subject.value.trim(), message: F.message.value.trim() };
      if (!d.name) bad.name = "Please enter your name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) bad.email = "Please enter a valid email address.";
      if (d.via === "phone" && !/^\+?[0-9 ()-]{7,20}$/.test(d.phone)) bad.phone = "Please enter a valid phone number.";
      if (!d.subject) bad.subject = "Please add a subject.";
      if (d.message.length < 5) bad.message = "Please write a message.";
      return [d, bad];
    };
    const tickCooldown = () => { const b = form.querySelector(".cresend"); b.disabled = cooldown > 0; b.textContent = cooldown > 0 ? `Resend (${cooldown}s)` : "Resend"; if (cooldown-- > 0) cdTimer = setTimeout(tickCooldown, 1000); };
    async function sendCode() {
      if (sending) return;
      const [d, bad] = validate();
      if (Object.keys(bad).length) return fail(esc(Object.values(bad).join(" ")), bad);
      const rb = form.querySelector(".cresend");
      sending = true; rb.disabled = true; btn.disabled = true; btn.textContent = "Sending code…";
      try {
        token = (await api("otp", { email: d.email, via: d.via, phone: d.phone, subject: d.subject, message: d.message })).token; sentTo = d.email.toLowerCase();
        form.querySelector(".cto").textContent = d.email; form.querySelector(".ccode").classList.remove("hidden");
        btn.textContent = "Verify & send"; step(2); F.code.value = ""; F.code.focus();
        clearTimeout(cdTimer); cooldown = 30; tickCooldown();
      } catch (e) {
        btn.textContent = token ? "Verify & send" : "Send code"; // a failed resend keeps the code already in the inbox usable
        if (!e.status || e.status === 404 || e.status >= 500) unavailable(); else fail(esc(e.message), e.body?.field ? { [e.body.field]: 1 } : {});
      } finally { sending = false; btn.disabled = false; if (cooldown <= 0) rb.disabled = false; }
    }
    // the code is tied to the exact message and contact choice, so changing either needs a new one
    const resetCode = (msg) => { if (token) { token = null; form.querySelector(".ccode").classList.add("hidden"); btn.textContent = "Send code"; step(1); err.textContent = msg; } };
    ["subject", "message", "phone"].forEach((n) => F[n].addEventListener("input", () => resetCode("You changed the message, so a new code is needed.")));
    async function verifyAndSend() {
      const [d, bad] = validate();
      if (Object.keys(bad).length) return fail(esc(Object.values(bad).join(" ")), bad);
      if (d.email.toLowerCase() !== sentTo) { form.querySelector(".ccode").classList.add("hidden"); token = null; btn.textContent = "Send code"; step(1); return fail("Your email changed. Send a new code."); }
      if (!/^\d{4}$/.test(F.code.value.trim())) return fail("Enter the 4-digit code from the email.", { code: 1 });
      btn.disabled = true; btn.textContent = "Sending…";
      try {
        await api("contact", { ...d, token, code: F.code.value.trim(), website: F.website.value });
        step(3); clearTimeout(cdTimer);
        inner.innerHTML = `<div class="csent"><b>✅ Message sent!</b><p>Thanks, ${esc(d.name)}. Your email is verified and I'll get back to you ${d.via === "phone" ? `at ${esc(d.phone)}` : `at ${esc(d.email)}`}.</p><button class="xpbtn">Close</button></div>`;
        inner.querySelector("button").onclick = ctx.close;
      } catch (e) {
        btn.disabled = false; btn.textContent = "Verify & send";
        if (!e.status || e.status === 404 || e.status >= 500) unavailable(); else fail(esc(e.message), e.body?.errors || {});
      }
    }
    form.addEventListener("submit", (e) => { e.preventDefault(); form.querySelectorAll(".bad").forEach((x) => x.classList.remove("bad")); err.textContent = ""; token ? verifyAndSend() : sendCode(); });
    form.querySelector(".cresend").addEventListener("click", () => { F.code.disabled = true; sendCode().finally(() => { F.code.disabled = false; F.code.focus(); }); });
    F.code.addEventListener("input", () => { F.code.value = F.code.value.replace(/\D/g, "").slice(0, 4); if (F.code.value.length === 4 && token) form.requestSubmit(); });
    ctx.onClose(() => clearTimeout(cdTimer));
    setTimeout(() => F.name.focus(), 0);
  }

  function renderIE(body, ctx) {
    body.style.display = "flex"; body.style.flexDirection = "column"; body.style.overflow = "hidden";
    body.innerHTML = `<div class="menubar"></div>
      <div class="toolbar"><button class="ieback" title="Back">◀ Back</button><button class="iefwd" title="Forward">▶</button><button class="iestop" title="Stop (Esc)" disabled>✕ Stop</button><button class="iereload" title="Refresh (F5)">⟳</button><button class="iehome" title="Home">🏠 Home</button><button class="ienew" title="Open this page in a new tab">↗ New tab</button><span class="iethrob" aria-hidden="true">${I.ie}</span></div>
      <form class="addr ieaddr">Address <div class="field">${I.ie}<input class="ieurl" spellcheck="false" autocomplete="off" aria-label="Address"></div><button class="xpbtn">Go</button></form>
      <div class="iebar hidden">Some sites refuse to be shown inside other pages. If this stays blank, use <a href="#" class="ieopen">open in a new tab</a>.</div>
      <div class="ieview"><div class="iehomepage"></div><iframe class="ieframe hidden" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe></div>
      <div class="statusbar"><span class="iestat">Done</span><span class="ieprog hidden" role="progressbar" aria-label="Loading"><i></i></span></div>`;
    const $b = (q) => body.querySelector(q), urlIn = $b(".ieurl"), frame = $b(".ieframe"), home = $b(".iehomepage"), bar = $b(".iebar"), stat = $b(".iestat");
    const hist = [], HOME = "about:favorites"; let pos = -1;
    const L = [["GitHub", links.github, "github"], ["LinkedIn", links.linkedin, "linkedin"], ["Instagram", links.instagram, "instagram"], ["X / Twitter", links.twitter, "x"], ["Website", links.website, "globe"], ["Email", "mailto:" + links.email, "mail"], ["Resume (PDF)", links.resumePdf, "pdf"]].filter(([, u]) => u && u !== "mailto:");
    const demos = P.projects.filter((p) => p.url);
    home.innerHTML = `<div class="ie-home"><h1>${esc(P.name)}'s Favorites</h1><div class="muted">Type an address or a search above, or pick a page.</div>
      <h3>Live projects (open right here)</h3><div class="link-cards">${demos.map((p) => `<a class="link-card" href="${esc(p.url)}" data-browse>${I.globe}<span><b>${esc(p.name)}</b><small>${esc(p.url.replace(/^https?:\/\//, ""))}</small></span></a>`).join("")}</div>
      <h3>Profiles (open in a new tab)</h3><div class="link-cards">${links.yapless ? `<a class="link-card" href="${esc(links.yapless)}" target="_blank" rel="noopener">${I.yapless}<span><b>Yap-less</b><small>${esc(links.yapless.replace(/^https?:\/\//, ""))}</small></span></a>` : `<a class="link-card" href="#" data-soon="Yap-less">${I.yapless}<span><b>Yap-less</b><small>Founder &amp; CEO (coming soon)</small></span></a>`}${L.map(([n, u, ic]) => `<a class="link-card" href="${esc(u)}" target="_blank" rel="noopener">${I[ic]}<span><b>${esc(n)}</b><small>${esc(u.replace(/^(https?:\/\/|mailto:)/, ""))}</small></span></a>`).join("")}</div></div>`;
    const normalize = (q) => {
      q = q.trim(); if (!q || q === HOME) return HOME;
      if (/^https?:\/\//i.test(q)) return q;
      // dotted words are an address only with a real-looking ending, so "node.js" and "3.14" still search
      const m = q.match(/^([\w-]+(?:\.[\w-]+)+)(:\d+)?(\/\S*)?$/), end = m?.[1].split(".").pop().toLowerCase();
      if (m && (/^\d{1,3}(\.\d{1,3}){3}$/.test(m[1]) || (/^[a-z]{2,}$/.test(end) && !/^(js|ts|jsx|tsx|py|rb|java|cpp|cs|go|rs|php|html|htm|css|json|md|txt|csv|xml|yml|yaml|sh|exe|dll|pdf|png|jpg|jpeg|gif|svg|zip)$/.test(end)))) return "https://" + q;
      return "https://www.bing.com/search?q=" + encodeURIComponent(q);
    };
    // ---- loading, stopping and failing like a normal browser ----
    const SANDBOX = frame.getAttribute("sandbox"), PROXY_SANDBOX = "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox";
    let ctl = null, loadT = 0, loading = 0, failed = 0, viaProxy = false, loads = 0;
    const busy = (on, text) => {
      loading = on ? show.n : 0; $b(".iethrob").classList.toggle("on", !!on); $b(".ieprog").classList.toggle("hidden", !on);
      $b(".iestop").disabled = !on; if (text) stat.textContent = text;
    };
    const page = (title, text) => `<div style="font:13px Tahoma,sans-serif;padding:18px 22px;color:#000"><h2 style="font:bold 16px Tahoma,sans-serif;color:#0a246a;margin:0 0 10px">${title}</h2><p>${text}</p></div>`;
    const WHY = {
      login: "This page asks for a password. Logins never go through the portfolio's browser, so your details stay between you and the site.",
      post: "This form sends information to the site, which only works on the site's own page.",
      challenge: "The site wants to check that you're a person, which only works on its own page.",
      refused: "This site doesn't accept visits through the portfolio's browser, but its own page should work.",
      toolarge: "This page is too large to show here.",
      timeout: "The page took too long to load here.",
      empty: "This page didn't load properly inside this window.",
      mixed: "This is an http:// page, which browsers block inside a secure page.",
      error: "Internet Explorer couldn't load this page here.",
    };
    // a page that can't work here ends in the same choice as Vision Assist: open it in a new tab, or stay
    function fail(kind, n = show.n) {
      if (n !== show.n || failed === n) return; failed = n; viaProxy = false;
      clearTimeout(loadT); ctl?.abort(); busy(false, "Couldn't show the page here");
      const why = esc(WHY[kind] || WHY.error);
      frame.setAttribute("sandbox", SANDBOX); frame.removeAttribute("src"); frame.srcdoc = page("This page can't be shown here", why);
      offerTab(hist[pos], why);
    }
    function stop() {
      if (!loading) return;
      show.n++; viaProxy = false; clearTimeout(loadT); ctl?.abort(); busy(false, "Stopped");
      frame.setAttribute("sandbox", SANDBOX); frame.removeAttribute("src"); frame.srcdoc = page("Navigation to the webpage was canceled", "Press Refresh to try again.");
    }
    function show(url) {
      urlIn.value = url === HOME ? "" : url; urlIn.placeholder = "Type a web address or search the web";
      $b(".ieback").disabled = pos <= 0; $b(".iefwd").disabled = pos >= hist.length - 1; $b(".ienew").disabled = url === HOME;
      ctx.setTitle(url === HOME ? "Favorites - Internet Explorer" : url.replace(/^https?:\/\/(www\.)?/, "").split(/[/?#]/)[0] + " - Internet Explorer");
      clearTimeout(show.t); clearTimeout(loadT); ctl?.abort(); viaProxy = false;
      const n = show.n = (show.n || 0) + 1;
      if (url === HOME) { busy(false, "Done"); frame.classList.add("hidden"); frame.removeAttribute("srcdoc"); frame.src = "about:blank"; home.classList.remove("hidden"); bar.classList.add("hidden"); return; }
      home.classList.add("hidden"); frame.classList.remove("hidden"); bar.classList.add("hidden");
      busy(true, "Opening page " + url + "…");
      // a page that never finishes ends in the same honest choice instead of a blank frame
      loadT = setTimeout(() => fail("timeout", n), 20000);
      // ask the server whether the site allows framing; if not, or if it's plain http (blocked as mixed content), show it through the sandboxed proxy
      const c = (ctl = new AbortController()); setTimeout(() => c.abort(), 10000);
      fetch(`/api/proxy?check=1&url=${encodeURIComponent(url)}`, { signal: c.signal }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((j) => {
        if (n !== show.n) return;
        if (j?.blocked) { clearTimeout(loadT); busy(false, "Cannot find server"); frame.setAttribute("sandbox", SANDBOX); frame.removeAttribute("src"); frame.srcdoc = page("Internet Explorer cannot display the webpage", "The address can't be reached. Check that it's typed correctly."); return; }
        if (j?.timeout) return fail("timeout", n); // the page itself would only time out too
        if (j?.challenge) return fail("challenge", n);
        if (!j && /^http:/i.test(url) && location.protocol === "https:") return fail("mixed", n);
        const proxied = !!j && (j.frameable === false || /^http:/i.test(url));
        frame.setAttribute("sandbox", proxied ? PROXY_SANDBOX : SANDBOX);
        bar.firstChild.textContent = proxied ? "Shown through the portfolio's proxy, so logins and some interactive sites may not work. You can also " : "Some sites refuse to be shown inside other pages. If this stays blank, use ";
        // a site can still refuse a direct frame, and this window can't see that, so the way out is always on offer
        show.t = setTimeout(() => n === show.n && bar.classList.remove("hidden"), proxied ? 600 : 2500);
        frame.removeAttribute("srcdoc");
        viaProxy = proxied; loads = 0;
        // n tells this page's messages from those of the page it replaces
        frame.src = proxied ? `/api/proxy?url=${encodeURIComponent(url)}&n=${n}` : url;
      });
    }
    // Bing's result links are script-driven redirects with the real address inside, base64 after "a1"
    const unwrapLink = (u) => { try { const a = new URL(u), v = a.searchParams.get("u"); if (/(^|\.)bing\.com$/i.test(a.hostname) && a.pathname === "/ck/a" && v?.startsWith("a1")) return atob(v.slice(2).replace(/-/g, "+").replace(/_/g, "/")); } catch {} return u; };
    // pages shown through the proxy report their address, title, link clicks and failures back here
    const onMsg = (e) => {
      // the current page unloading when this window didn't ask: it navigated itself, usually onto an error page with no load event.
      // Checked first: by the time this arrives the page is gone, so e.source can't be matched
      if (viaProxy && typeof e.data?.xpLeft === "string" && e.data.xpLeft && frame.getAttribute("src")?.endsWith(e.data.xpLeft)) { const n = show.n; setTimeout(() => fail("empty", n), 1500); return; }
      if (!viaProxy || e.source !== frame.contentWindow || !e.data || typeof e.data !== "object" || pos < 0 || hist[pos] === HOME) return;
      const d = e.data;
      if (typeof d.xpFail === "string") return fail(d.xpFail);
      if (typeof d.xpNav === "string") { const to = unwrapLink(d.xpNav); return /^https?:/i.test(to) ? go(to) : undefined; }
      // redirects and in-page navigation: the address bar follows, without a new history entry
      if (typeof d.xpUrl === "string" && /^https?:/i.test(d.xpUrl) && !d.xpUrl.includes("/api/proxy?url=") && d.xpUrl !== hist[pos]) { hist[pos] = d.xpUrl; if (document.activeElement !== urlIn) urlIn.value = d.xpUrl; }
      if (typeof d.xpTitle === "string" && d.xpTitle) ctx.setTitle(d.xpTitle.slice(0, 80) + " - Internet Explorer");
      if (d.xpLoaded && loading) { clearTimeout(loadT); busy(false, "Done"); }
    };
    addEventListener("message", onMsg); ctx.onClose(() => { removeEventListener("message", onMsg); clearTimeout(loadT); ctl?.abort(); });
    // a real page finished (not the blank one a new navigation starts from)
    // a proxied copy that navigates itself lands on an error page: the proxy refuses it, and most sites refuse the frame
    frame.addEventListener("load", () => { if (viaProxy && ++loads > 1) return fail("empty"); if (loading && (frame.hasAttribute("srcdoc") || frame.getAttribute("src") !== "about:blank")) { clearTimeout(loadT); busy(false, "Done"); } });
    // pages that can't work inside this window (data.js projects marked newTab) are offered in a new tab instead
    const origin = (u) => { try { return new URL(u).origin; } catch { return ""; } };
    const offerTab = (url, why) => confirmBox("Internet Explorer", `${why}<br><br>Open <b>${esc(origin(url).replace(/^https?:\/\//, ""))}</b> in a new tab?`, "Open in new tab", () => window.open(url, "_blank", "noopener"));
    const go = (q) => {
      const url = normalize(q), own = url !== HOME && P.projects.find((p) => p.newTab && p.url && origin(p.url) === origin(url));
      if (own) { offerTab(url, esc(own.newTab)); if (pos < 0) go(HOME); else urlIn.value = hist[pos] === HOME ? "" : hist[pos]; return; } // Cancel stays put, history unchanged
      hist.splice(pos + 1); hist.push(url); pos = hist.length - 1; show(url);
    };
    ctx.navigate = go; wins.get(ctx.key).navigate = go;
    $b(".ieaddr").addEventListener("submit", (e) => { e.preventDefault(); go(urlIn.value); });
    $b(".ieback").onclick = () => { if (pos > 0) show(hist[--pos]); };
    $b(".iefwd").onclick = () => { if (pos < hist.length - 1) show(hist[++pos]); };
    $b(".iereload").onclick = () => { const u = hist[pos]; if (u && u !== HOME) show(u); };
    $b(".iehome").onclick = () => go(HOME);
    $b(".iestop").onclick = stop;
    const openTab = () => { const u = hist[pos]; if (u && u !== HOME) window.open(u, "_blank", "noopener"); };
    $b(".ienew").onclick = openTab; $b(".ieopen").addEventListener("click", (e) => { e.preventDefault(); openTab(); });
    home.addEventListener("click", (e) => { const a = e.target.closest("[data-browse]"); if (a) { e.preventDefault(); go(a.getAttribute("href")); } });
    ctx.menu(body.querySelector(".menubar"), [
      { label: "File", items: [{ label: "Open in new tab", act: openTab }, "-", { label: "Close", act: ctx.close }] },
      { label: "View", items: () => [{ label: "Back", key: "Alt+←", disabled: pos <= 0, act: () => $b(".ieback").click() }, { label: "Forward", key: "Alt+→", disabled: pos >= hist.length - 1, act: () => $b(".iefwd").click() }, { label: "Stop", key: "Esc", disabled: !loading, act: stop }, { label: "Refresh", key: "F5", act: () => $b(".iereload").click() }, { label: "Home", act: () => go(HOME) }] },
      { label: "Favorites", items: () => [...demos.map((p) => ({ label: p.name, act: () => go(p.url) })), "-", { label: "Wikipedia", act: () => go("https://en.wikipedia.org") }] },
      { label: "Help", items: [{ label: "About Internet Explorer", act: () => msgBox("Internet Explorer", "A real browser inside the portfolio. Sites that block being shown inside other pages are loaded through a sandboxed proxy, so most pages open here; logins and very interactive apps work best in a New tab.") }] },
    ]);
    const f5 = (e) => {
      if (!ctx.isActive()) return;
      if (e.key === "F5") { e.preventDefault(); $b(".iereload").click(); }
      else if (e.key === "Escape" && loading) { e.preventDefault(); stop(); }
      else if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); $b(e.key === "ArrowLeft" ? ".ieback" : ".iefwd").click(); }
    };
    addEventListener("keydown", f5); ctx.onClose(() => removeEventListener("keydown", f5));
    go(ctx.url || HOME);
  }

  function renderCmd(body, ctx) {
    body.innerHTML = `<div class="cmd"><div class="out"></div><div class="line"><span class="prompt">C:\\Documents and Settings\\${esc(P.name.split(" ")[0])}&gt;</span><input spellcheck="false" autocomplete="off"></div></div>`;
    const root = body.querySelector(".cmd"), out = body.querySelector(".out"), input = body.querySelector("input"), prompt = body.querySelector(".prompt").textContent;
    const hist = []; let hi = -1;
    const print = (t = "") => { out.textContent += t + "\n"; root.scrollTop = root.scrollHeight; };
    print(`Windows XP Portfolio Edition Command Interpreter\n(C) Copyright 1985-2001 Microsoft Corp.\n\nType "help" for a list of commands.\n`);
    root.addEventListener("click", () => input.focus());
    setTimeout(() => input.focus(), 50);
    const CMDS = {
      help: () => `Available commands:
  ABOUT       - Displays biography
  SKILLS      - Displays technical skills
  PROJECTS    - Lists showcase projects
  RESUME      - Opens the resume
  CONTACT     - Lists contact email and profiles
  WHOAMI      - Displays current user
  DATE / TIME - Displays current date and time
  DIR / LS    - Lists files in current folder
  TREE        - Displays folder hierarchy
  CALC [expr] - Evaluates maths (e.g. calc 24*7)
  PING [host] - Measures real round-trip time to a website (e.g. ping github.com)
  ECHO [text] - Prints text
  COLOR [code]- 0a=green 0b=cyan 0c=red 0e=yellow 0f=white 07=default
  GAMES       - Lists the games you can play
  START [app] - Launches an app: ${Object.keys(APPS).filter((k) => k !== "recycle").join(", ")}
  MATRIX      - Digital rain
  VER         - Displays version
  SYSTEMINFO  - Displays system configuration
  CLS / CLEAR - Clears the screen
  EXIT        - Closes the window`,
      about: () => `${P.name} - ${P.role}${P.subtitle ? "\n" + P.subtitle : ""}\nLocation: ${P.location}\n\n${P.bio.join("\n")}`,
      skills: () => "Technical Proficiencies:\n" + Object.entries(P.skills).map(([k, v]) => `  • ${(k + ":").padEnd(13)} ${v.join(", ")}`).join("\n"),
      projects: () => P.projects.map((p, i) => `${i + 1}. ${p.name} - ${p.desc} (${(p.stack || []).join(", ")})${[p.github, p.url].filter(Boolean).map((u) => "\n   " + u).join("")}`).join("\n"),
      resume: () => (openApp("resume"), "Opening Resume.doc..."),
      contact: () => "Contact Channels:\n" + [["Email", links.email], ["Yap-less", links.yapless || "website coming soon"], ["GitHub", links.github], ["LinkedIn", links.linkedin], ["Instagram", links.instagram], ["X / Twitter", links.twitter], ["Website", links.website]].filter(([, v]) => v).map(([k, v]) => `  ${(k + ":").padEnd(13)}${v}`).join("\n"),
      whoami: () => `${P.hostname.toLowerCase()}\\${P.name.split(" ")[0].toLowerCase()}`,
      date: () => "Current date is: " + new Date().toLocaleDateString(),
      time: () => "Current time is: " + new Date().toLocaleTimeString(),
      ver: () => "Microsoft Windows XP [Version 5.1.2600] - Portfolio Edition",
      dir: () => ` Volume in drive C has no label.\n\n Directory of C:\\Documents and Settings\\${P.name.split(" ")[0]}\n\n` + ["About Me.txt", "Resume.doc", "My Projects"].map((f, i) => `${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}  09:${String(10 + i).padStart(2, "0")} AM    ${f.includes(".") ? "         4,096" : "<DIR>         "} ${f}`).join("\n"),
      tree: () => `Folder PATH listing for Volume C\nC:.\n├── My Documents\n│   ├── About Me.txt\n│   ├── Resume.doc\n│   └── My Projects\n${P.projects.map((p, i) => `│       ${i === P.projects.length - 1 ? "└" : "├"}── ${p.name}`).join("\n")}\n└── Program Files\n    ├── Calendar\n    ├── Games\n    │   ├── Solitaire\n    │   ├── Minesweeper\n    │   ├── Snake\n    │   ├── Brick Breaker\n    │   ├── 3D Pinball\n    │   └── Spider Solitaire\n    ├── Calculator\n    ├── MSN Messenger\n    ├── Notepad\n    ├── Paint\n    ├── Task Manager\n    └── Windows Media Player`,
      ping: (arg) => {
        const host = (arg || location.host).replace(/^https?:\/\//, "").split(/[/?#\s]/)[0];
        if (!/^[\w.-]+(:\d+)?$/.test(host)) return "Ping request could not find host. Please check the name and try again.";
        print(`
Pinging ${host} over HTTPS:
`);
        (async () => {
          const times = [];
          for (let i = 0; i < 4; i++) {
            const t0 = performance.now();
            try { await fetch(`https://${host}/favicon.ico?ping=${Date.now()}`, { mode: "no-cors", cache: "no-store" }); const ms = Math.round(performance.now() - t0); times.push(ms); print(`Reply from ${host}: time=${ms}ms`); }
            catch { print("Request timed out."); }
            await new Promise((r) => setTimeout(r, 400));
          }
          const n = times.length;
          print(`
Ping statistics for ${host}:
    Packets: Sent = 4, Received = ${n}, Lost = ${4 - n} (${(4 - n) * 25}% loss)${n ? `
Approximate round trip times in milli-seconds:
    Minimum = ${Math.min(...times)}ms, Maximum = ${Math.max(...times)}ms, Average = ${Math.round(times.reduce((a, b) => a + b, 0) / n)}ms` : ""}
`);
        })();
        return "";
      },
      systeminfo: () => `Host Name:                 ${P.hostname}\nOS Name:                   Microsoft Windows XP Professional\nOS Version:                5.1.2600 Service Pack 3\nRegistered Owner:          ${P.name}\nSystem Type:               X86-based PC\nTotal Physical Memory:     65,536 MB\nCoffee Level:              Critically Low`,
      matrix: () => { matrix(); return ""; },
    };
    CMDS.games = () => "Games:\n" + GAME_IDS.map((id) => `  ${id.padEnd(10)} ${APPS[id].title}`).join("\n") + "\n\nType START <name> to play, e.g. start snake";
    CMDS.ls = CMDS.dir;
    const ALIAS = { calculator: "calc", taskmanager: "taskmgr", mediaplayer: "wmp", wmplayer: "wmp", "3dpinball": "pinball", spidersolitaire: "spider", controlpanel: "control", mypictures: "pictures", pictures: "pictures", minesweeper: "mine", brick: "breakout", bricks: "breakout", brickbreaker: "breakout", wordpad: "resume", explorer: "computer", mycomputer: "computer", settings: "display", properties: "display", terminal: "cmd" };
    let mx;
    ctx.onClose(() => clearInterval(mx));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" && hist.length) { hi = hi <= 0 ? hist.length - 1 : hi - 1; input.value = hist[hi]; e.preventDefault(); return; }
      if (e.key === "ArrowDown" && hist.length) { hi = hi === -1 || hi >= hist.length - 1 ? -1 : hi + 1; input.value = hi === -1 ? "" : hist[hi]; e.preventDefault(); return; }
      if (e.key !== "Enter") return;
      const raw = input.value; input.value = ""; print(prompt + raw);
      const line = raw.trim(); if (!line) return;
      hist.push(line); hi = -1;
      const [c, ...rest] = line.split(/\s+/); const arg = rest.join(" "); const cmd = c.toLowerCase();
      if (cmd === "cls" || cmd === "clear") { out.textContent = ""; return; }
      if (cmd === "exit") { ctx.close(); return; }
      if (cmd === "echo") { print(arg); return; }
      if (cmd === "color") { const m = { "0a": "#0f0", "0b": "#0ff", "0c": "#f55", "0e": "#ff0", "0f": "#fff", "07": "#c0c0c0" }; if (m[arg]) root.style.color = m[arg]; else print("Usage: color 0a"); return; }
      if (cmd === "calc" && !arg) { openApp("calc"); print("Starting Calculator..."); return; }
      if (cmd === "calc") { try { if (!/^[\d+\-*/().%\s^]+$/.test(arg)) throw 0; print(String(Function(`"use strict";return (${arg.replace(/\^/g, "**").replace(/(^|[^\w).])-\s*(\d+(?:\.\d+)?)\s*\*\*\s*(\d+(?:\.\d+)?)/g, "$1-($2**$3)")})`)())); } catch { print("Invalid expression."); } return; }
      if (cmd === "start") { const a = ALIAS[arg.toLowerCase().replace(/\s+/g, "")] || arg.toLowerCase(); if (!arg) print("Usage: start <app>  (" + Object.keys(APPS).join(", ") + ")"); else if (Object.hasOwn(APPS, a)) { openApp(a); print(`Starting ${APPS[a].title}...`); } else print(`The system cannot find the program '${arg}'.`); return; }
      if (Object.hasOwn(CMDS, cmd)) { const r = CMDS[cmd](arg); if (r) print(r); return; }
      print(`'${c}' is not recognized as an internal or external command,\noperable program or batch file. Type "help" for a list of commands.`);
    });
    let mxCanvas;
    function matrix() {
      mxCanvas?.remove();
      const cv = mxCanvas = document.createElement("canvas");
      cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
      body.style.position = "relative"; body.appendChild(cv);
      const g = cv.getContext("2d"); cv.width = body.clientWidth; cv.height = body.clientHeight;
      const cols = Math.floor(cv.width / 12), drops = Array(cols).fill(0);
      let n = 0;
      clearInterval(mx); mx = setInterval(() => {
        g.fillStyle = "rgba(0,0,0,.08)"; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = "#0f0"; g.font = "12px monospace";
        drops.forEach((y, i) => { g.fillText(String.fromCharCode(0x30a0 + Math.random() * 96), i * 12, y * 12); drops[i] = y * 12 > cv.height && Math.random() > .97 ? 0 : y + 1; });
        if (++n > 150) { clearInterval(mx); cv.remove(); print("[Matrix Stream Completed]"); input.focus(); }
      }, 33);
    }
  }

  function renderMSN(body, ctx) {
    body.innerHTML = `<div class="msn"><div class="msn-to">To: <b>${esc(P.name)}</b> &lt;${esc(links.email)}&gt;</div><div class="msn-log"></div>
      <div class="msn-bar"><textarea placeholder="Ask about my skills, projects, education, contact..."></textarea><div style="display:flex;flex-direction:column;gap:4px"><button class="xpbtn send">Send</button><button class="xpbtn nudge">Nudge</button><button class="xpbtn emo" title="Choose an emoticon" aria-label="Choose an emoticon">🙂</button></div></div><div class="emopick hidden" role="listbox" aria-label="Emoticons">${"🙂 😄 😉 😎 😂 😍 🤔 😮 😢 😡 👍 👎 👋 🙏 🎉 ❤️ 🔥 💻 🤖 ☕".split(" ").map((e) => `<button type="button" role="option">${e}</button>`).join("")}</div></div>`;
    const log = body.querySelector(".msn-log"), ta = body.querySelector("textarea");
    const say = (who, text) => { const p = document.createElement("p"); p.innerHTML = `<b>${esc(who)} says:</b><br><span class="${who === "You" ? "" : "them"}">${esc(text).replace(/\(Y\)/g, "👍").replace(/\(H\)/g, "😎").replace(/:-D/g, "😄").replace(/:-\)/g, "🙂")}</span>`; log.appendChild(p); log.scrollTop = log.scrollHeight; };
    const first = P.name.split(" ")[0];
    say(first, `Hey there :-) Welcome to my XP portfolio! Ask me about my skills, projects, education or how to reach me. Or click Nudge!`);
    const reply = (q) => {
      q = q.toLowerCase();
      if (/yap.?less|founder|ceo|company|startup/.test(q)) return links.yapless ? `I'm the Founder & CEO of Yap-less. Check it out: ${links.yapless} (Y)` : `I'm the Founder & CEO of Yap-less. The website is coming soon (Y)`;
      if (/speak|hindi|french|english|spoken|languages you/.test(q)) return P.languages?.length ? "I speak " + P.languages.join(", ") + "." : "Mostly English!";
      if (/award|honou?r|achiev|rank|chess|percentile/.test(q)) return P.achievements?.length ? "Highlights: " + P.achievements.slice(0, 3).join("; ") + "." : "Coming soon!";
      if (/certif|course/.test(q)) return P.certifications?.length ? P.certifications.join("; ") + "." : "Coming soon!";
      if (/where|location|live|city|based/.test(q)) return `I'm based in ${P.location}.`;
      if (/skill|stack|tech|language/.test(q)) return "My toolbox: " + Object.values(P.skills).flat().slice(0, 12).join(", ") + ".";
      if (/project|built|work on|portfolio/.test(q)) return "Some things I've built: " + P.projects.map((p) => p.name).join(", ") + ". Open 'My Projects' on the desktop for details!";
      if (/educat|study|college|university|degree/.test(q)) return P.education?.[0] ? P.education[0].degree + " at " + P.education[0].school + " (" + P.education[0].years + ")." : "Education details are coming soon.";
      if (/experience|intern|job/.test(q)) return P.experience?.length ? P.experience.map((x) => `${x.title} @ ${x.org}`).join("; ") + "." : "Experience details are coming soon.";
      if (/contact|email|reach|hire|mail/.test(q)) return (links.email ? `Email me at ${links.email}, or use` : "Use") + " the Contact Me app. I'm open to new opportunities (Y)";
      if (/resume|cv/.test(q)) { openApp("resume"); return "Opening my resume for you!"; }
      if (/\b(hi|hello|hey|yo)\b/.test(q)) return "Hello! :-D What would you like to know?";
      return "Good question! Try asking about my skills, projects, Yap-less, education, awards or how to contact me.";
    };
    const send = () => { const t = ta.value.trim(); if (!t) return; ta.value = ""; say("You", t); setTimeout(() => wins.has(ctx.key) && say(first, reply(t)), 600); };
    body.querySelector(".send").onclick = send;
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
    const pick = body.querySelector(".emopick");
    body.querySelector(".emo").onclick = (e) => { e.stopPropagation(); pick.classList.toggle("hidden"); };
    pick.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; ta.setRangeText(b.textContent, ta.selectionStart, ta.selectionEnd, "end"); pick.classList.add("hidden"); ta.focus(); });
    body.addEventListener("click", (e) => { if (!e.target.closest(".emopick, .emo")) pick.classList.add("hidden"); });
    body.querySelector(".nudge").onclick = () => {
      ctx.el.classList.remove("shake"); void ctx.el.offsetWidth; ctx.el.classList.add("shake");
      say("You", "*sent a nudge*"); setTimeout(() => wins.has(ctx.key) && say(first, "Whoa, that shook my screen! I'm awake and ready to code! (H)"), 700);
    };
  }

  function renderMine(body, ctx) {
    const LEVELS = { Beginner: [9, 9, 10], Intermediate: [16, 16, 40], Expert: [30, 16, 99] };
    const custom = (ctx.store.lget("xp-mine-custom") || "").split("x").map(Number);
    if (custom.length === 3 && custom.every((n) => n > 0)) LEVELS.Custom = custom;
    let level = ctx.store.lget("xp-mine-level") || "Beginner"; if (!LEVELS[level]) level = "Beginner";
    let markMode = ctx.store.lget("xp-mine-marks") !== "0", sound = ctx.store.lget("xp-mine-sound") !== "0", marks = new Set(), hover = null;
    let best = {}; try { best = JSON.parse(ctx.store.lget("xp-mine-best") || "{}"); } catch {}
    let W, H, M, grid, opened, flags, over, won, started, timer, secs, t0, fx = 0, endRun = 0, blasts = [];
    body.classList.add("mine-body");
    body.innerHTML = `<div class="menubar"></div>
      <div class="mine-levels" role="radiogroup" aria-label="Difficulty">${Object.keys(LEVELS).map((l) => `<button data-l="${l}" role="radio">${l}</button>`).join("")}<span class="mine-best"></span></div>
      <div class="mine-area"><div class="mine-wrap"><div class="mine-top"><span class="lcd left"></span><button class="smiley" aria-label="New game"></button><span class="lcd time"></span></div>
        <div class="mine-board"><div class="mine-grid"></div><div class="mine-end hidden"></div><canvas class="mine-fx"></canvas></div></div></div>`;
    const g = body.querySelector(".mine-grid"), smile = body.querySelector(".smiley"), lLeft = body.querySelector(".left"), lTime = body.querySelector(".time");
    const endEl = body.querySelector(".mine-end"), fxCv = body.querySelector(".mine-fx"); let bestEl = body.querySelector(".mine-best");
    const snd = (name) => { if (sound) XPS.play(name, true); };
    const setLevel = (l) => { level = l; ctx.store.lset("xp-mine-level", l); reset(true); };
    ctx.menu(body.querySelector(".menubar"), [
      { label: "Game", items: () => [{ label: "New", key: "F2", act: () => reset() }, "-", ...Object.keys(LEVELS).map((l) => ({ label: l === "Custom" ? `Custom (${LEVELS.Custom.join("×")})` : l, check: l === level, act: () => setLevel(l) })), { label: "Custom...", act: askCustom }, "-", { label: "Marks (?)", check: markMode, act: () => { markMode = !markMode; ctx.store.lset("xp-mine-marks", markMode ? "1" : "0"); } }, { label: "Sound", check: sound, act: () => { sound = !sound; ctx.store.lset("xp-mine-sound", sound ? "1" : "0"); } }, { label: "Best Times...", act: showBest }, "-", { label: "Exit", act: ctx.close }] },
      { label: "Help", items: [{ label: "How to play", act: () => msgBox("Minesweeper", "Left-click to reveal a square. Right-click (or long-press, or hover + Space) to flag it; with Marks on, a second right-click adds a ?.<br>Click or middle-click a revealed number to open its neighbours once its flags are placed.<br>Pick a difficulty above the board, or set your own with Game > Custom.") }] },
    ]);
    body.querySelector(".mine-levels").addEventListener("click", (e) => { const b = e.target.closest("[data-l]"); if (b && b.dataset.l !== level) setLevel(b.dataset.l); });
    async function askCustom() {
      const [w, h, m] = LEVELS.Custom || [20, 12, 40];
      const v = await askBox("Custom Field", [{ label: "Width:", value: w, type: "number" }, { label: "Height:", value: h, type: "number" }, { label: "Mines:", value: m, type: "number" }]); if (!v || !ctx.alive()) return;
      let [cw, ch, cm] = v.map((n) => parseInt(n, 10));
      if (!(cw > 0 && ch > 0 && cm > 0)) return msgBox("Minesweeper", "Width, height and mines must all be numbers above zero.", "⚠️");
      cw = Math.max(5, Math.min(40, cw)); ch = Math.max(5, Math.min(24, ch)); cm = Math.max(1, Math.min(cw * ch - 10, cm));
      LEVELS.Custom = [cw, ch, cm]; ctx.store.lset("xp-mine-custom", `${cw}x${ch}x${cm}`); setLevel("Custom");
      paintLevelButtons();
    }
    const paintLevelButtons = () => { body.querySelector(".mine-levels").innerHTML = Object.keys(LEVELS).map((l) => `<button data-l="${l}" role="radio">${l}</button>`).join("") + `<span class="mine-best"></span>`; bestEl = body.querySelector(".mine-best"); paintLevel(); };
    // a Custom record only counts for that exact board size
    const bestKey = (l = level) => (l === "Custom" ? "Custom " + LEVELS.Custom.join("x") : l);
    function showBest() { msgBox("Fastest Mine Sweepers", Object.keys(LEVELS).map((l) => `<b>${l === "Custom" ? bestKey(l) : l}:</b> ${best[bestKey(l)] != null ? best[bestKey(l)] + " seconds" : "—"}`).join("<br>"), "🏆"); }
    const paintLevel = () => {
      body.querySelectorAll("[data-l]").forEach((b) => { const on = b.dataset.l === level; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
      bestEl.textContent = best[bestKey()] != null ? `Best: ${best[bestKey()]}s` : "";
    };
    const pad = (n) => { n = Math.max(-99, Math.min(999, n)); return n < 0 ? "-" + String(-n).padStart(2, "0") : String(n).padStart(3, "0"); };
    const setLcd = (el, n) => { const s = pad(n); if (el.dataset.v !== s) { el.dataset.v = s; el.innerHTML = lcdDigits(s); el.setAttribute("aria-label", s); } };
    const face = (f) => { if (smile.dataset.f !== f) { smile.dataset.f = f; smile.innerHTML = MINE_FACE[f]; } };
    const nb = (i) => { const x = i % W, y = (i / W) | 0, r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < W && ny < H) r.push(ny * W + nx); } return r; };
    // keep the auto-sized window centred on screen whenever the board size changes
    const recenter = () => requestAnimationFrame(() => {
      if (ctx.el.classList.contains("max") || innerWidth <= 640) return;
      const r = ctx.el.getBoundingClientRect();
      // centred, but a board taller than the screen starts at the top edge rather than running under the taskbar
      ctx.el.style.left = Math.round(Math.max(0, Math.min(Math.max(6, (innerWidth - r.width) / 2), innerWidth - r.width))) + "px";
      ctx.el.style.top = Math.round(Math.max(0, Math.min(Math.max(6, (innerHeight - 30 - r.height) / 2), innerHeight - 30 - r.height))) + "px";
    });
    function reset(resized) {
      [W, H, M] = LEVELS[level]; endRun++; ctx.skipWait(); // an old game's end delay would swallow the next Space
      clearInterval(timer); cancelAnimationFrame(fx); blasts.forEach(clearTimeout); blasts = []; grid = Array(W * H).fill(0); opened = new Set(); flags = new Set(); marks = new Set(); over = false; won = false; started = false; secs = 0;
      face("smile"); setLcd(lLeft, M); setLcd(lTime, 0);
      endEl.classList.add("hidden"); g.classList.remove("won", "lost");
      fxCv.getContext("2d").clearRect(0, 0, fxCv.width, fxCv.height);
      g.style.gridTemplateColumns = `repeat(${W}, 18px)`;
      g.innerHTML = grid.map((_, i) => `<button class="cell" data-i="${i}" aria-label="Square ${(i % W) + 1}, ${((i / W) | 0) + 1}"></button>`).join("");
      paintLevel();
      if (resized) recenter();
    }
    function plant(safe) {
      const avoid = new Set([safe, ...nb(safe)]); let n = 0;
      while (n < M) { const i = (Math.random() * W * H) | 0; if (grid[i] !== -1 && !avoid.has(i)) { grid[i] = -1; n++; } }
      grid.forEach((v, i) => { if (v !== -1) grid[i] = nb(i).filter((j) => grid[j] === -1).length; });
      started = true; t0 = performance.now(); timer = setInterval(() => { setLcd(lTime, ++secs); snd("tick"); }, 1000);
    }
    function open(i) {
      // iterative flood fill (avoids deep recursion on Expert boards)
      const stack = [i], before = opened.size;
      while (stack.length) {
        const k = stack.pop();
        if (opened.has(k) || flags.has(k)) continue;
        opened.add(k); marks.delete(k); const c = g.children[k]; c.classList.add("open"); c.classList.remove("mark"); c.textContent = "";
        if (grid[k] === -1) { c.classList.add("boom"); lose(k); return; }
        if (grid[k]) { c.textContent = grid[k]; c.classList.add("n" + grid[k]); } else stack.push(...nb(k));
      }
      if (opened.size - before > 1) snd("flip"); else if (opened.size > before) snd("flick");
    }
    function chord(i) {
      const around = nb(i);
      if (grid[i] > 0 && around.filter((j) => flags.has(j)).length === grid[i]) around.forEach((j) => !over && open(j));
    }
    const dist = (a, b) => Math.hypot(a % W - b % W, ((a / W) | 0) - ((b / W) | 0));
    // ripple delay: cells light up outward from where the game ended
    const wave = (from, cls) => { [...g.children].forEach((c, i) => { c.style.animationDelay = dist(i, from) * 28 + "ms"; c.classList.add(cls); }); };
    function lose(at) {
      over = true; clearInterval(timer); face("dead"); g.classList.add("lost"); snd("boom");
      sys.career.record("mine", { won: false, mode: level, pts: 2 });
      // the other mines go off one after another, outward from the one that was hit
      const mines = [];
      grid.forEach((v, i) => {
        const c = g.children[i];
        if (v === -1 && i !== at && !flags.has(i)) mines.push(i);
        if (v !== -1 && flags.has(i)) { c.classList.remove("flag"); c.classList.add("open", "xflag"); }
      });
      mines.sort((a, b) => dist(a, at) - dist(b, at));
      const span = Math.min(900, mines.length * 45);
      mines.forEach((i, n) => {
        const c = g.children[i], d = (n / Math.max(1, mines.length)) * span;
        c.style.animationDelay = d + "ms"; c.classList.add("open", "mine", "blast");
        if (n % Math.ceil(mines.length / 8) === 0) blasts.push(setTimeout(() => snd("pop"), d));
      });
      ctx.el.classList.remove("shake"); void ctx.el.offsetWidth; ctx.el.classList.add("shake");
      const run = ++endRun;
      ctx.wait(span + 500).then((skipped) => {
        if (run !== endRun) return;
        if (skipped) { blasts.forEach(clearTimeout); [...g.querySelectorAll(".blast")].forEach((c) => { c.style.animationDelay = "0ms"; }); }
        showEnd(false);
      });
    }
    function check(last) {
      if (over || opened.size !== W * H - M) return;
      over = true; won = true; clearInterval(timer); face("cool"); setLcd(lLeft, 0); g.classList.add("won"); snd("tada");
      const time = Math.max(1, Math.round((performance.now() - t0) / 1000));
      grid.forEach((v, i) => { if (v === -1) { flags.add(i); g.children[i].classList.remove("mark"); g.children[i].classList.add("flag"); } });
      const record = best[bestKey()] == null || time < best[bestKey()];
      if (record) { best[bestKey()] = time; ctx.store.lset("xp-mine-best", JSON.stringify(best)); }
      sys.career.record("mine", { won: true, mode: level, time, pts: { Beginner: 15, Intermediate: 50, Expert: 150 }[level] || 25 });
      wave(last, "glow"); confetti(); paintLevel();
      const run = ++endRun;
      ctx.wait(650).then(() => { if (run === endRun) showEnd(true, time, record); });
    }
    function worldTimes(el, time) {
      if (!LEVELS[level] || level === "Custom") return;
      const game = "mine-" + level, box = el.querySelector(".mworld"); if (!box) return;
      box.innerHTML = "<small>Loading world best times…</small>";
      const draw = (rows, mine) => (box.innerHTML = rows.length ? `<b>World best · ${esc(level)}</b><ol>${rows.slice(0, 5).map((r) => `<li class="${r.id === mine ? "me" : ""}">${esc(r.name)} <span>${r.score}s</span></li>`).join("")}</ol>` : "<small>No world times yet.</small>");
      (time ? sys.scores.submit(game, time) : Promise.resolve(null)).then((m) => sys.scores.top(game, 5, true).then((rows) => draw(rows, m?.id))).catch(() => (box.innerHTML = "<small>Offline – world times unavailable.</small>"));
    }
    function showEnd(didWin, time, record) {
      endEl.innerHTML = didWin
        ? `<b>You win!</b><span>${level} cleared in <b>${time}s</b></span><div class="mworld"></div>${record ? `<span class="rec">New best time!</span>` : `<span>Best: ${best[bestKey()]}s</span>`}<div><button class="xpbtn again">Play again</button>${level !== "Expert" && level !== "Custom" ? `<button class="xpbtn harder">Try ${level === "Beginner" ? "Intermediate" : "Expert"}</button>` : ""}</div>`
        : `<b>Boom!</b><span>You hit a mine.</span><div><button class="xpbtn again">Try again</button></div>`;
      endEl.classList.remove("hidden");
      if (didWin) worldTimes(endEl, time);
      endEl.querySelector(".again").onclick = () => reset();
      endEl.querySelector(".harder")?.addEventListener("click", () => setLevel(level === "Beginner" ? "Intermediate" : "Expert"));
      endEl.querySelector(".again").focus();
    }
    function confetti() {
      if (reduced()) return;
      const board = fxCv.parentElement, w = board.clientWidth, h = board.clientHeight;
      fxCv.width = w; fxCv.height = h;
      const c = fxCv.getContext("2d"), colors = ["#e5410c", "#f2a900", "#ffd640", "#5ca50a", "#1e7ae6", "#8a4fd8", "#fff"];
      const ps = Array.from({ length: Math.min(160, 40 + W * H / 3) }, () => ({ x: w / 2 + (Math.random() - .5) * 40, y: h * .55, vx: (Math.random() - .5) * 9, vy: -Math.random() * 9 - 4, r: Math.random() * 6.3, vr: (Math.random() - .5) * .4, s: 4 + Math.random() * 5, col: colors[(Math.random() * colors.length) | 0] }));
      const end = performance.now() + 2600;
      const step = (t) => {
        c.clearRect(0, 0, w, h);
        ps.forEach((p) => { p.vy += .28; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.col; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); });
        if (t < end && ctx.isVisible()) fx = requestAnimationFrame(step); else c.clearRect(0, 0, w, h);
      };
      fx = requestAnimationFrame(step);
    }
    function flag(c) {
      const i = +c.dataset.i; if (opened.has(i) || over) return;
      if (flags.has(i)) { flags.delete(i); c.classList.remove("flag"); if (markMode) { marks.add(i); c.textContent = "?"; c.classList.add("mark"); } }
      else if (marks.has(i)) { marks.delete(i); c.textContent = ""; c.classList.remove("mark"); }
      else { flags.add(i); c.classList.add("flag"); snd("place"); }
      setLcd(lLeft, M - flags.size);
    }
    // middle-click chords; hovering a square and pressing Space flags it (or chords a number)
    g.addEventListener("pointerdown", (e) => { if (e.button !== 1) return; e.preventDefault(); const c = e.target.closest(".cell"); if (c && !over && opened.has(+c.dataset.i)) { chord(+c.dataset.i); check(+c.dataset.i); } });
    g.addEventListener("pointerover", (e) => (hover = e.target.closest(".cell")));
    g.addEventListener("pointerleave", () => (hover = null));
    const space = (e) => {
      if (e.key !== " " || !hover || !ctx.isActive() || e.target.closest?.("input, textarea")) return;
      e.preventDefault(); const i = +hover.dataset.i;
      if (opened.has(i)) { chord(i); check(i); } else flag(hover);
    };
    addEventListener("keydown", space); ctx.onClose(() => removeEventListener("keydown", space));
    g.addEventListener("click", (e) => {
      const c = e.target.closest(".cell"); if (!c || over || lpFired) return;
      const i = +c.dataset.i; if (flags.has(i)) return; if (!started) plant(i);
      if (opened.has(i)) chord(i); else open(i);
      check(i);
    });
    let lp, lpFired = false;
    g.addEventListener("contextmenu", (e) => { e.preventDefault(); const c = e.target.closest(".cell"); if (c && !lpFired) flag(c); });
    // long-press to flag on touch screens
    g.addEventListener("pointerdown", (e) => {
      if (!over) face("ooh");
      const c = e.target.closest(".cell");
      if (c && e.pointerType === "touch") lp = setTimeout(() => { lpFired = true; flag(c); }, 400);
    });
    const pup = () => { clearTimeout(lp); if (lpFired) setTimeout(() => (lpFired = false), 150); if (!over) face("smile"); };
    addEventListener("pointerup", pup); addEventListener("pointercancel", pup);
    const f2 = (e) => { if (e.key === "F2" && ctx.isActive()) { e.preventDefault(); reset(); } };
    addEventListener("keydown", f2);
    smile.onclick = () => { snd("menu"); reset(); };
    ctx.onClose(() => { clearInterval(timer); clearTimeout(lp); cancelAnimationFrame(fx); blasts.forEach(clearTimeout); removeEventListener("keydown", f2); removeEventListener("pointerup", pup); removeEventListener("pointercancel", pup); });
    ctx.el.__g = { grid: () => grid, W: () => W, H: () => H, M: () => M, over: () => over, won: () => won, opened: () => opened.size };
    reset(true);
  }

  const NOTE_DEFAULT = () => `Hi! Thanks for visiting my portfolio.\n\nThis notepad is shared: everyone who visits sees the same text.\n\nThings to try:\n - Open "Command Prompt" and type help\n - Play Solitaire, Minesweeper, Snake or Brick Breaker\n - Add tasks and reminders in the Calendar\n - Browse the web in Internet Explorer\n - Draw something in Paint\n - Right-click the desktop > Properties to change the wallpaper\n\n- ${P.name}`;
  function renderNotepad(body, ctx) {
    const inner = chrome(body, { menus: [
      { label: "File", items: [{ label: "New", act: async () => { if (!ta.value.trim() || await confirmBox("Notepad", "Clear the shared note for everyone?", "Clear")) { ta.value = ""; queue(); } } }, { label: "Save As...", key: "Ctrl+S", act: () => download(new Blob([ta.value], { type: "text/plain" }), "note.txt") }, { label: "Reload from server", act: () => pull(true) }, "-", { label: "Exit", act: ctx.close }] },
      { label: "Edit", items: [{ label: "Select All", key: "Ctrl+A", act: () => ta.select() }, { label: "Time/Date", key: "F5", act: () => insert(new Date().toLocaleString()) }] },
      { label: "Format", items: () => [{ label: "Word Wrap", check: wrap, act: () => { wrap = !wrap; ta.style.whiteSpace = wrap ? "pre-wrap" : "pre"; } }, { label: "Bigger font", act: () => font(2) }, { label: "Smaller font", act: () => font(-2) }] },
      { label: "Help", items: [{ label: "About Notepad", act: () => msgBox("About Notepad", "This note is shared with everyone who visits and is saved to the server as you type.<br>If the server can't be reached, it's kept in this browser and synced later.") }] },
    ] });
    inner.style.overflow = "hidden";
    inner.innerHTML = `<textarea class="notepad" spellcheck="false" placeholder="Start typing... (shared with everyone)"></textarea>`;
    body.insertAdjacentHTML("beforeend", `<div class="statusbar"><span class="nstat">Connecting…</span><span class="nchars"></span></div>`);
    const ta = inner.querySelector("textarea"), stat = body.querySelector(".nstat"), chars = body.querySelector(".nchars");
    let wrap = true, size = 14, timer, lastRemote = 0, dirty = store.lget("xp-notepad-dirty") === "1", saving = false, pushes = 0;
    const status = (t) => { stat.textContent = t; chars.textContent = `${ta.value.length.toLocaleString()} / 20,000`; };
    const local = (v) => store.lset("xp-notepad", v);
    async function push() {
      clearTimeout(timer); timer = 0; const text = ta.value; local(text); saving = true; pushes++;
      try { const r = await Cloud.notePut(text); lastRemote = r.updatedAt; dirty = false; store.lset("xp-notepad-dirty", "0"); status("☁ Saved · shared with everyone"); }
      catch (e) {
        // a rejected save will never succeed, so don't retry it or block other people's edits behind it
        if (e.status >= 400 && e.status < 500 && e.status !== 429) { dirty = false; store.lset("xp-notepad-dirty", "0"); status("⚠ Not saved: " + (e.status === 403 ? "the server refused this text." : e.message)); }
        else { dirty = true; store.lset("xp-notepad-dirty", "1"); status(e.status === 429 ? "Saving too fast, retrying…" : "💾 Offline · saved in this browser"); if (e.status === 429) timer = setTimeout(push, 3000); }
      } finally { saving = false; }
    }
    const queue = () => { local(ta.value); status("Saving…"); clearTimeout(timer); timer = setTimeout(push, 800); };
    async function pull(force) {
      const before = ta.value, seen = pushes;
      try {
        const r = await Cloud.noteGet();
        if (dirty && !force) return push(); // our offline edits win once we're back online
        // updatedAt is just a version stamp (each writer's own clock), so any different value means someone else wrote.
        // Text the visitor is typing or saving is never replaced.
        const idle = !timer && !saving && pushes === seen && ta.value === before;
        if (force || (r.updatedAt !== lastRemote && idle)) {
          lastRemote = r.updatedAt;
          const pos = ta.selectionStart; ta.value = r.text ?? NOTE_DEFAULT(); ta.selectionStart = ta.selectionEnd = Math.min(pos, ta.value.length); local(ta.value);
        }
        if (force || idle) status("☁ Up to date · shared with everyone");
      } catch { status("💾 Offline · saved in this browser"); }
    }
    const insert = (t) => { const s = ta.selectionStart, e = ta.selectionEnd; t = t.slice(0, Math.max(0, ta.maxLength - ta.value.length + (e - s))); if (!t && s === e) return; ta.setRangeText(t, s, e, "end"); queue(); ta.focus(); };
    const font = (d) => { size = Math.max(10, Math.min(28, size + d)); ta.style.fontSize = size + "px"; };
    ta.value = store.lget("xp-notepad") ?? NOTE_DEFAULT();
    ta.maxLength = 20000; status("Connecting…"); pull();
    ta.addEventListener("input", queue);
    const poll = setInterval(() => ctx.isVisible() && !timer && pull(), 15000);
    ta.addEventListener("blur", () => { if (timer) push(); });
    const keys = (e) => {
      if (!ctx.isActive()) return;
      if (e.key === "F5") { e.preventDefault(); insert(new Date().toLocaleString()); }
      if (e.key.toLowerCase() === "s" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); download(new Blob([ta.value], { type: "text/plain" }), "note.txt"); }
    };
    addEventListener("keydown", keys);
    ctx.onClose(() => { clearInterval(poll); removeEventListener("keydown", keys); if (timer) push(); });
  }
  function download(blob, name) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function renderPaint(body, ctx) {
    const colors = ["#000000", "#808080", "#800000", "#808000", "#008000", "#008080", "#000080", "#800080", "#808040", "#004040", "#0080ff", "#004080", "#8000ff", "#804000",
                    "#ffffff", "#c0c0c0", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ffff80", "#00ff80", "#80ffff", "#8080ff", "#ff0080", "#ff8040"];
    const G = (d) => `<svg viewBox="0 0 16 16" aria-hidden="true">${d}</svg>`;
    const TOOLS = [
      ["pencil", "Pencil", G('<path d="M3 13l1-3 7-7 2 2-7 7z" fill="#f2c94c" stroke="#7a5a1e"/><path d="M3 13l1-3 2 2z" fill="#333"/>')],
      ["brush", "Brush", G('<path d="M10 2l4 4-5 5-4-4z" fill="#8a6d3b"/><path d="M5 7l4 4c-1 2-3 3-6 3 0-3 1-5 2-7z" fill="#1e7ae6"/>')],
      ["spray", "Airbrush", G('<rect x="5" y="6" width="6" height="8" rx="1" fill="#c0c0c0" stroke="#555"/><rect x="7" y="3" width="2" height="3" fill="#555"/><g fill="#d0362f"><circle cx="3" cy="3" r=".8"/><circle cx="2" cy="6" r=".8"/><circle cx="4.5" cy="1.5" r=".7"/></g>')],
      ["eraser", "Eraser", G('<path d="M2 11l6-6 5 5-4 4H5z" fill="#f8bbd0" stroke="#a0566e"/><path d="M2 11l3 3" stroke="#a0566e"/><path d="M5 14h9" stroke="#888"/>')],
      ["fill", "Fill with color", G('<path d="M3 8l5-5 5 5-5 5z" fill="#fff" stroke="#333"/><path d="M4 9h8l-4 4z" fill="#1e7ae6"/><path d="M13 9c1 2 1 3 0 3s-1-1 0-3z" fill="#1e7ae6"/>')],
      ["picker", "Pick color", G('<path d="M11 2l3 3-2 2-3-3z" fill="#555"/><path d="M9 4l3 3-6 6H3v-3z" fill="#bfe3ff" stroke="#333"/>')],
      ["line", "Line", G('<path d="M2 14L14 2" stroke="#000" stroke-width="1.6"/>')],
      ["rect", "Rectangle", G('<rect x="2.5" y="4.5" width="11" height="8" fill="none" stroke="#000" stroke-width="1.4"/>')],
      ["ellipse", "Ellipse", G('<ellipse cx="8" cy="8.5" rx="6" ry="4.5" fill="none" stroke="#000" stroke-width="1.4"/>')],
      ["text", "Text", G('<text x="8" y="13" font-size="12" font-family="Times New Roman,serif" font-weight="bold" text-anchor="middle">A</text>')],
    ];
    const SIZED = ["pencil", "brush", "spray", "eraser", "line"], SHAPES = ["rect", "ellipse"];
    const inner = chrome(body, { menus: [
      { label: "File", items: [{ label: "New", act: () => { snap(); clear(); } }, { label: "Open...", act: () => fileIn.click() }, { label: "Save As PNG...", key: "Ctrl+S", act: () => save() }, { label: "Share to My Pictures...", act: () => share() }, "-", { label: "Exit", act: ctx.close }] },
      { label: "Edit", items: () => [{ label: "Undo", key: "Ctrl+Z", disabled: !undo.length, act: () => doUndo() }, { label: "Redo", key: "Ctrl+Y", disabled: !redo.length, act: () => doRedo() }, "-", { label: "Clear Image", act: () => { snap(); clear(); } }] },
      { label: "View", items: () => [{ label: "Tool Box", check: !toolsEl.hidden, act: () => (toolsEl.hidden = !toolsEl.hidden) }, { label: "Color Box", check: !paletteEl.hidden, act: () => (paletteEl.hidden = !paletteEl.hidden) }] },
      { label: "Image", items: [{ label: "Flip Horizontal", act: () => transform(-1, 1) }, { label: "Flip Vertical", act: () => transform(1, -1) }, { label: "Invert Colors", key: "Ctrl+I", act: () => invert() }, "-", { label: "Clear Image", act: () => { snap(); clear(); } }] },
      { label: "Colors", items: [{ label: "Edit Colors...", act: () => { editingFg = true; picker.value = fg; picker.click(); } }, { label: "Swap fore/back", act: () => { [fg, bg] = [bg, fg]; paintSwatch(); } }] },
      { label: "Help", items: [{ label: "Help Topics", act: () => msgBox("Paint", "Left-click draws with the foreground color, right-click with the background color.<br>Pick a size below the tools. Shapes: hold Shift for squares/circles.") }] },
    ] });
    inner.style.overflow = "hidden";
    inner.innerHTML = `<div class="paint">
        <div class="paint-tools" role="toolbar" aria-label="Tools">
          <div class="pt-grid">${TOOLS.map(([id, t, ic]) => `<button data-t="${id}" title="${t}" aria-label="${t}" aria-pressed="false">${ic}</button>`).join("")}</div>
          <div class="pt-opts" aria-label="Tool options">
            <div class="sizes">${[1, 3, 6, 12].map((s) => `<button data-s="${s}" title="${s}px" aria-label="${s} pixel"><i style="height:${Math.min(s, 9)}px"></i></button>`).join("")}</div>
            <div class="modes">${[["outline", "Outline"], ["both", "Outline and fill"], ["fill", "Fill only"]].map(([m, t]) => `<button data-m="${m}" title="${t}" aria-label="${t}"><i class="m-${m}"></i></button>`).join("")}</div>
            <div class="nopt">No options</div>
          </div>
          <div class="pt-name"></div></div>
        <div class="paint-area"><canvas width="800" height="520"></canvas></div></div>
      <div class="paint-bottom"><div class="swatch"><i class="bgc"></i><i class="fgc"></i></div><div class="palette">${colors.map((c) => `<i style="background:${c}" data-c="${c}"></i>`).join("")}</div>
        <input type="color" class="picker" hidden><input type="file" accept="image/*" class="filein" hidden></div>
      <div class="statusbar"><span class="pstat">For Help, click Help Topics on the Help Menu.</span><span class="ppos"></span></div>`;
    body.appendChild(inner.querySelector(".paint-bottom")); body.appendChild(inner.querySelector(".statusbar"));
    const cv = inner.querySelector("canvas"), g = cv.getContext("2d", { willReadFrequently: true });
    const toolsEl = inner.querySelector(".paint-tools"), paletteEl = body.querySelector(".paint-bottom"), picker = body.querySelector(".picker"), fileIn = body.querySelector(".filein");
    const posEl = body.querySelector(".ppos");
    let shapeMode = "outline";
    let tool = "pencil", size = 3, fg = "#000000", bg = "#ffffff", undo = [], redo = [], drawing = null, editingFg = true;
    const clear = () => { g.save(); g.globalCompositeOperation = "source-over"; g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.restore(); };
    const snap = () => { undo.push(g.getImageData(0, 0, cv.width, cv.height)); if (undo.length > 15) undo.shift(); redo = []; };
    const doUndo = () => { if (!undo.length) return; redo.push(g.getImageData(0, 0, cv.width, cv.height)); g.putImageData(undo.pop(), 0, 0); };
    const doRedo = () => { if (!redo.length) return; undo.push(g.getImageData(0, 0, cv.width, cv.height)); g.putImageData(redo.pop(), 0, 0); };
    const save = () => cv.toBlob((b) => b && download(b, "untitled.png"));
    async function share() {
      const title = ((await askBox("Share Drawing", [{ label: "Name (everyone sees it in My Pictures):", value: "My drawing" }]))?.[0] || "").trim().slice(0, 80); if (!title) return;
      try {
        await loadExtras(); const { data, w, h } = await window.EXTRAS.compressImage(cv);
        await sys.pictures.add(title, data, w, h);
        msgBox("Paint", `"${esc(title)}" was added to My Pictures for everyone to see.`);
        dispatchEvent(new Event("xp-pictures-changed")); wins.get("pictures") && sys.focus("pictures");
      } catch (e) { msgBox("Paint", `Couldn't share the drawing: ${esc(e.message || "offline")}`, "⚠️"); }
    }
    function transform(sx, sy) { snap(); const img = document.createElement("canvas"); img.width = cv.width; img.height = cv.height; img.getContext("2d").drawImage(cv, 0, 0); g.save(); g.setTransform(sx, 0, 0, sy, sx < 0 ? cv.width : 0, sy < 0 ? cv.height : 0); g.drawImage(img, 0, 0); g.restore(); }
    function invert() { snap(); const d = g.getImageData(0, 0, cv.width, cv.height), a = d.data; for (let i = 0; i < a.length; i += 4) { a[i] = 255 - a[i]; a[i + 1] = 255 - a[i + 1]; a[i + 2] = 255 - a[i + 2]; } g.putImageData(d, 0, 0); }
    const paintSwatch = () => { body.querySelector(".fgc").style.background = fg; body.querySelector(".bgc").style.background = bg; };
    const setTool = (t) => {
      tool = t;
      toolsEl.querySelectorAll("[data-t]").forEach((b) => { const on = b.dataset.t === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      // the options box shows what matters for the chosen tool
      toolsEl.querySelector(".sizes").hidden = !SIZED.includes(t); toolsEl.querySelector(".modes").hidden = !SHAPES.includes(t); toolsEl.querySelector(".nopt").hidden = SIZED.includes(t) || SHAPES.includes(t);
      toolsEl.querySelector(".pt-name").textContent = TOOLS.find((x) => x[0] === t)[1];
      body.querySelector(".pstat").textContent = { pencil: "Draws a free-form line one pixel wide.", brush: "Draws using a brush with the selected size.", spray: "Draws using an airbrush of the selected size.", eraser: "Erases a portion of the picture, using the selected eraser shape.", fill: "Fills an area with the current drawing color.", picker: "Picks up a color from the picture for drawing.", line: "Draws a straight line. Hold Shift for 45° steps.", rect: "Draws a rectangle. Hold Shift for a square.", ellipse: "Draws an ellipse. Hold Shift for a circle.", text: "Inserts text into the picture." }[t];
      cv.style.cursor = t === "text" ? "text" : t === "fill" || t === "picker" ? "cell" : "crosshair";
    };
    const setSize = (s) => { size = s; toolsEl.querySelectorAll("[data-s]").forEach((b) => b.classList.toggle("on", +b.dataset.s === s)); };
    const setMode = (m) => { shapeMode = m; toolsEl.querySelectorAll("[data-m]").forEach((b) => b.classList.toggle("on", b.dataset.m === m)); };
    setTool("pencil"); setSize(3); setMode("outline"); clear(); paintSwatch();
    toolsEl.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.t) setTool(b.dataset.t); else if (b.dataset.s) setSize(+b.dataset.s); else if (b.dataset.m) setMode(b.dataset.m); });
    paletteEl.addEventListener("click", (e) => { const c = e.target.dataset.c; if (c) { fg = c; paintSwatch(); } });
    paletteEl.addEventListener("contextmenu", (e) => { const c = e.target.dataset.c; if (c) { e.preventDefault(); bg = c; paintSwatch(); } });
    paletteEl.addEventListener("dblclick", (e) => { if (e.target.dataset.c) { editingFg = true; picker.value = fg; picker.click(); } });
    picker.addEventListener("input", () => { if (editingFg) fg = picker.value; else bg = picker.value; paintSwatch(); });
    body.querySelector(".fgc").onclick = () => { editingFg = true; picker.value = fg; picker.click(); };
    body.querySelector(".bgc").onclick = () => { editingFg = false; picker.value = bg; picker.click(); };
    fileIn.addEventListener("change", () => {
      const f = fileIn.files[0]; if (!f) return;
      const img = new Image(); img.onload = () => { snap(); clear(); const s = Math.min(cv.width / img.width, cv.height / img.height, 1); g.drawImage(img, 0, 0, img.width * s, img.height * s); URL.revokeObjectURL(img.src); };
      img.src = URL.createObjectURL(f); fileIn.value = "";
    });

    const pos = (e) => { const r = cv.getBoundingClientRect(); return [Math.min(cv.width - 1, Math.max(0, Math.round((e.clientX - r.left) * cv.width / r.width))), Math.min(cv.height - 1, Math.max(0, Math.round((e.clientY - r.top) * cv.height / r.height)))]; };
    const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    function flood(x, y, color) {
      const d = g.getImageData(0, 0, cv.width, cv.height), a = d.data, W = cv.width, H = cv.height;
      const i0 = (y * W + x) * 4, t = [a[i0], a[i0 + 1], a[i0 + 2], a[i0 + 3]], c = [...hex(color), 255];
      if (t.every((v, k) => v === c[k])) return;
      const seen = new Uint8Array(W * H);
      const same = (i) => !seen[i >> 2] && Math.abs(a[i] - t[0]) < 24 && Math.abs(a[i + 1] - t[1]) < 24 && Math.abs(a[i + 2] - t[2]) < 24 && Math.abs(a[i + 3] - t[3]) < 24;
      const stack = [[x, y]];
      while (stack.length) {
        let [px, py] = stack.pop(), i = (py * W + px) * 4;
        while (py >= 0 && same(i)) { py--; i -= W * 4; }
        py++; i += W * 4; let l = false, r = false;
        while (py < H && same(i)) {
          a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; a[i + 3] = 255; seen[i >> 2] = 1;
          if (px > 0) { if (same(i - 4)) { if (!l) { stack.push([px - 1, py]); l = true; } } else l = false; }
          if (px < W - 1) { if (same(i + 4)) { if (!r) { stack.push([px + 1, py]); r = true; } } else r = false; }
          py++; i += W * 4;
        }
      }
      g.putImageData(d, 0, 0); return true;
    }
    function shape(d, x, y, shift) {
      g.clearRect(0, 0, cv.width, cv.height); g.drawImage(d.base, 0, 0);
      g.strokeStyle = d.color; g.fillStyle = d.alt; g.lineWidth = size; g.lineCap = "round";
      let w = x - d.x, h = y - d.y;
      if (shift && d.tool !== "line") { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w) * m; h = Math.sign(h) * m; }
      if (shift && d.tool === "line") { const a = Math.round(Math.atan2(h, w) / (Math.PI / 4)) * (Math.PI / 4), L = Math.hypot(w, h); w = Math.round(Math.cos(a) * L); h = Math.round(Math.sin(a) * L); }
      g.beginPath();
      if (d.tool === "line") { g.moveTo(d.x, d.y); g.lineTo(d.x + w, d.y + h); }
      else if (d.tool === "rect") g.rect(d.x, d.y, w, h);
      else g.ellipse(d.x + w / 2, d.y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 7);
      if (d.tool === "line") return g.stroke();
      if (shapeMode === "fill") { g.fillStyle = d.color; g.fill(); }
      else { if (shapeMode === "both") g.fill(); g.stroke(); }
    }
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    cv.addEventListener("pointerdown", (e) => {
      const [x, y] = pos(e), color = e.button === 2 ? bg : fg, alt = e.button === 2 ? fg : bg;
      if (tool === "picker") { const p = g.getImageData(x, y, 1, 1).data; const c = "#" + [p[0], p[1], p[2]].map((v) => v.toString(16).padStart(2, "0")).join(""); if (e.button === 2) bg = c; else fg = c; paintSwatch(); setTool("pencil"); return; }
      if (tool === "text") { askBox("Paint", "Text:").then((t) => { if (t) { snap(); g.fillStyle = color; g.font = `${10 + size * 3}px Tahoma, sans-serif`; g.fillText(t, x, y); } }); return; }
      if (tool === "fill") { const prev = g.getImageData(0, 0, cv.width, cv.height); if (flood(x, y, color)) { undo.push(prev); if (undo.length > 30) undo.shift(); redo = []; } return; }
      if (!["line", "rect", "ellipse"].includes(tool)) snap();
      cv.setPointerCapture(e.pointerId);
      drawing = { tool, x, y, lx: x, ly: y, color, alt, base: ["line", "rect", "ellipse"].includes(tool) ? (() => { const b = document.createElement("canvas"); b.width = cv.width; b.height = cv.height; b.getContext("2d").drawImage(cv, 0, 0); return b; })() : null };
      if (tool === "pencil" || tool === "brush" || tool === "eraser") { g.fillStyle = tool === "eraser" ? bg : color; const s = tool === "pencil" ? Math.max(1, size / 2) : tool === "brush" ? size * 1.5 : size * 3; g.fillRect(x - s / 2, y - s / 2, s, s); }
    });
    cv.addEventListener("pointermove", (e) => {
      const [x, y] = pos(e); posEl.textContent = `${x}, ${y}`;
      const d = drawing; if (!d) return;
      if (d.base) { if (!d.snapped) { snap(); d.snapped = true; } return shape(d, x, y, e.shiftKey); }
      if (d.tool === "spray") { g.fillStyle = d.color; const r = size * 3 + 4; for (let k = 0; k < 18; k++) { const a = Math.random() * 6.283, m = Math.random() * r; g.fillRect(x + Math.cos(a) * m, y + Math.sin(a) * m, 1, 1); } return; }
      g.strokeStyle = d.tool === "eraser" ? bg : d.color; g.lineCap = g.lineJoin = d.tool === "pencil" ? "square" : "round";
      g.lineWidth = d.tool === "pencil" ? Math.max(1, size / 2) : d.tool === "brush" ? size * 1.5 : size * 3;
      g.beginPath(); g.moveTo(d.lx, d.ly); g.lineTo(x, y); g.stroke(); d.lx = x; d.ly = y;
    });
    const end = () => (drawing = null);
    cv.addEventListener("lostpointercapture", end);
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    cv.addEventListener("pointerleave", () => (posEl.textContent = ""));
    const keys = (e) => {
      if (!ctx.isActive() || !(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z") { e.preventDefault(); doUndo(); } else if (k === "y") { e.preventDefault(); doRedo(); } else if (k === "s") { e.preventDefault(); save(); } else if (k === "i") { e.preventDefault(); invert(); }
    };
    addEventListener("keydown", keys); ctx.onClose(() => removeEventListener("keydown", keys));
  }

  function renderRecycle(body) {
    const inner = chrome(body, { addr: "Recycle Bin", addrIcon: "recycle", menus: [
      { label: "File", items: [{ label: "Restore all", act: () => [...trash].forEach((id) => addToDesktop(id)) }, { label: "Empty Recycle Bin", act: emptyBin }] },
      { label: "Help", items: [{ label: "About Recycle Bin", act: () => msgBox("Recycle Bin", "Drag desktop icons or folder items here to delete their shortcuts. Drag them back out, or click Restore, to undo.") }] },
    ] });
    const junk = [["old_resume_FINAL_v7.doc", "doc"], ["bugs_i_fixed_at_3am.txt", "notepad"], ["hackathon_sleep_schedule", "folder"], ["tabs_vs_spaces_debate.txt", "notepad"]];
    inner.innerHTML = `<div class="explorer">${taskPane([["Recycle Bin Tasks", `<button class="link empty">${I.recycle}Empty the Recycle Bin</button>${trash.length ? `<button class="link restore">${I.folder}Restore all items</button>` : ""}`],
        ["Details", `<span>${trash.length + junk.length} objects<br>Drag an item onto the desktop to restore it.</span>`]])}
      <div class="ex-main"><div class="grid-items">${trash.map((id) => `<div class="fitem" data-open="${id}" title="Deleted shortcut">${I[APPS[id].icon]}<span>${esc(DESK_LABEL[id] || APPS[id].title)}</span><small>Shortcut</small></div>`).join("")}${junk.map(([n, ic]) => `<div class="fitem" data-id="${esc(n)}">${I[ic]}<span>${esc(n)}</span></div>`).join("")}</div></div></div>`;
    inner.querySelector(".empty").onclick = emptyBin;
    inner.querySelector(".restore")?.addEventListener("click", () => [...trash].forEach((id) => addToDesktop(id)));
  }
  function emptyBin() {
    if (trash.length) { gone = [...new Set([...gone, ...trash])]; extra = extra.filter((id) => !trash.includes(id)); trash = []; saveDesk(); buildIcons(); refreshRecycle(); msgBox("Recycle Bin", "Deleted shortcuts are gone (drag any app back from My Computer, or use Reset Desktop).<br>The joke files stay — they're part of my character development.", "🗑️"); }
    else msgBox("Recycle Bin", "Nice try. These files are part of my character development.", "⚠️");
  }

  function renderComputer(body) {
    const inner = chrome(body, { addr: "My Computer", addrIcon: "computer" });
    const items = ["about", "resume", "projects", "contact", "ie", "cmd", "msn", "calendar", "games", "pictures", "wmp", "paint", "notepad", "stats", "board", "calc", "taskmgr", "control", "display", "recycle"];
    inner.innerHTML = `<div class="explorer">${taskPane([["System Tasks", `<span>Owner: <b>${esc(P.name)}</b><br>Host: ${esc(P.hostname)}</span>` + appLink("display", "Change wallpaper")], ["Other Places", appLink("about", "About Me") + appLink("projects", "My Projects")]])}
      <div class="ex-main"><div class="grid-items">${items.map((id) => `<div class="fitem" data-open="${id}">${I[APPS[id].icon]}<span>${esc(DESK_LABEL[id])}</span></div>`).join("")}</div></div></div>`;
  }

  function renderGames(body, ctx) {
    const inner = chrome(body, { addr: "C:\\Program Files\\Games", addrIcon: "games" });
    const blurb = { spider: "1, 2 or 4 suits", pinball: "Rank up with missions", solitaire: "Klondike, Draw 1 or 3", mine: "3 levels plus custom", snake: "10 maze levels", breakout: "12 designed levels" };
    const paint = () => {
      const d = Career.read(), lv = Career.levelOf(d.pts), from = Career.needFor(lv), to = Career.needFor(lv + 1), best = (id, g) => (id === "mine" ? (g.bestTime ? g.bestTime + "s" : "—") : g.bestScore ? g.bestScore.toLocaleString() : "—");
      inner.innerHTML = `<div class="explorer">${taskPane([
        ["Player", `<span class="pcard"><span class="pname">${esc(playerName() || "No name yet")} <a href="#" class="pname-change">Change name…</a></span><b>Level ${lv}: ${esc(Career.rank(lv))}</b><span class="xpbar" role="progressbar" aria-valuenow="${d.pts - from}" aria-valuemax="${to - from}"><i style="width:${Math.round((d.pts - from) / (to - from) * 100)}%"></i></span><small>${d.pts - from} of ${to - from} XP to level ${lv + 1}</small></span>`],
        [`Trophies (${d.trophies.length}/${TROPHIES.length})`, TROPHIES.map(([k, t, how]) => `<span class="trophy ${d.trophies.includes(k) ? "got" : ""}" title="${esc(how)}">${d.trophies.includes(k) ? "★" : "☆"} ${esc(t)}</span>`).join("")],
      ])}
      <div class="ex-main"><div class="grid-items">${GAME_IDS.map((id) => `<div class="fitem" data-open="${id}" title="${esc(blurb[id])}">${I[APPS[id].icon]}<span>${esc(DESK_LABEL[id])}</span><small>${esc(blurb[id])}</small></div>`).join("")}</div>
        <table class="gstats"><thead><tr><th>Game</th><th>Played</th><th>Won</th><th>Streak</th><th>Level</th><th>Best</th></tr></thead><tbody>${GAME_IDS.map((id) => { const g = d.games[id] || {}; return `<tr><td>${esc(DESK_LABEL[id])}</td><td>${g.played || 0}</td><td>${g.won || 0}</td><td>${g.bestStreak || 0}</td><td>${g.bestLevel || "—"}</td><td>${best(id, g)}</td></tr>`; }).join("")}</tbody></table></div></div>`;
      applyOrder(ctx.el, ctx.key); focusableItems(ctx.el);
    };
    paint(); addEventListener("xp-career", paint); addEventListener("xp-name", paint); ctx.onClose(() => { removeEventListener("xp-career", paint); removeEventListener("xp-name", paint); });
    inner.addEventListener("click", (e) => { if (e.target.closest(".pname-change")) { e.preventDefault(); askName(true); } });
  }

  // ---------------- Player career: every game earns XP points, and points earn levels ----------------
  const RANKS = ["Guest", "Limited User", "User", "Power User", "Help Desk", "Network Admin", "Sysadmin", "Domain Admin", "Administrator", "Root"];
  const sumPlayed = (d) => Object.values(d.games).reduce((n, g) => n + (g.played || 0), 0);
  const TROPHIES = [
    ["first", "First Win", "Win any game", (d) => Object.values(d.games).some((g) => g.won > 0)],
    ["regular", "Regular", "Finish 25 games", (d) => sumPlayed(d) >= 25],
    ["allround", "All-Rounder", "Finish a game of all six", (d) => GAME_IDS.every((id) => d.games[id]?.played)],
    ["streak", "On a Roll", "Win 5 in a row in one game", (d) => Object.values(d.games).some((g) => g.bestStreak >= 5)],
    ["expert", "Mine Expert", "Clear Minesweeper on Expert", (d, g, r) => g === "mine" && r.won && r.mode === "Expert"],
    ["quick", "Speed Dealer", "Win Solitaire in under 3 minutes", (d, g, r) => g === "solitaire" && r.won && r.time < 180],
    ["spider4", "Arachnologist", "Win Spider with 4 suits", (d, g, r) => g === "spider" && r.won && r.mode === "4suit"],
    ["snake5", "Nibbler", "Reach level 5 in Snake", (d) => d.games.snake?.bestLevel >= 5],
    ["brick5", "Wrecking Ball", "Reach level 5 in Brick Breaker", (d) => d.games.breakout?.bestLevel >= 5],
    ["admiral", "Admiral", "Reach the rank of Admiral in Pinball", (d) => d.games.pinball?.bestLevel >= 6],
    ["lvl5", "Power Trip", "Reach career level 5", (d) => Career.levelOf(d.pts) >= 5],
  ];
  const Career = {
    read() { const d = readLocal("xp-career", {}); return { pts: +d.pts > 0 ? +d.pts : 0, games: d.games && typeof d.games === "object" ? d.games : {}, trophies: Array.isArray(d.trophies) ? d.trophies : [] }; },
    // level n+1 starts at 50*n*(n+1) points: 100, 300, 600, 1000...
    levelOf: (pts) => Math.floor((Math.sqrt(1 + pts / 12.5) - 1) / 2) + 1,
    needFor: (lv) => 50 * (lv - 1) * lv,
    rank: (lv) => RANKS[Math.min(lv, RANKS.length) - 1],
    // r: { won, score, level, time (seconds), mode, pts } from a finished game
    record(game, r) {
      const d = this.read(), g = d.games[game] ||= {}, before = this.levelOf(d.pts);
      g.played = (g.played || 0) + 1;
      if (r.won) { g.won = (g.won || 0) + 1; g.streak = (g.streak || 0) + 1; g.bestStreak = Math.max(g.bestStreak || 0, g.streak); if (r.time && (!g.bestTime || r.time < g.bestTime)) g.bestTime = r.time; } else g.streak = 0;
      if (r.score > (g.bestScore || 0)) g.bestScore = r.score;
      if (r.level > (g.bestLevel || 0)) g.bestLevel = r.level;
      d.pts += Math.max(0, Math.round(r.pts || 0));
      const fresh = TROPHIES.filter(([k, , , test]) => !d.trophies.includes(k) && test(d, game, r));
      fresh.forEach(([k]) => { d.trophies.push(k); d.pts += 50; });
      store.lset("xp-career", JSON.stringify(d));
      const after = this.levelOf(d.pts);
      fresh.forEach(([, t, how]) => notify("Trophy unlocked: " + t, how, { sound: "levelup" }));
      if (after > before) notify(`Level ${after} reached`, `You are now a ${this.rank(after)}. See your record in the Games folder.`, { sound: "tada", onClick: () => openApp("games") });
      dispatchEvent(new Event("xp-career"));
    },
  };

  // ---------------- Control Panel, Run, Search, Help, Privacy ----------------
  function renderControl(body) {
    const inner = chrome(body, { addr: "Control Panel", addrIcon: "control" });
    const items = [["display", "Appearance and Themes", "Wallpaper, screen saver"], ["sounds", "Sounds and Audio Devices", "Startup sounds, volume"], ["datetime", "Date and Time", "Calendar and reminders"], ["network", "Network Connections", "Your real connection"], ["taskmgr", "Performance and Maintenance", "Task Manager"], ["user", "User Accounts", "About the owner"], ["reset", "Reset Desktop", "Back to normal"], ["privacy", "Privacy and Terms", "How data is used"]];
    inner.innerHTML = `<div class="explorer">${taskPane([["See Also", appLink("help", "Help and Support") + appLink("run", "Run...")]])}
      <div class="ex-main"><h3 class="cp-h">Pick a category</h3><div class="cp-grid">${items.map(([k, t, d]) => `<button class="cp-item" data-k="${k}">${I[{ sounds: "wmp", datetime: "calendar", network: "ie", user: "user" }[k] || APPS[k]?.icon || "control"]}<span><b>${t}</b><small>${d}</small></span></button>`).join("")}</div></div></div>`;
    inner.querySelector(".cp-grid").addEventListener("click", (e) => {
      const k = e.target.closest("[data-k]")?.dataset.k; if (!k) return;
      if (k === "sounds") return soundsDialog();
      if (k === "datetime") return openApp("calendar");
      if (k === "network") { e.stopPropagation(); return toggleTray("net"); }
      if (k === "user") return openApp("about");
      openApp(k);
    });
  }
  function soundsDialog() {
    const EVENTS = [["startup", "Windows Startup"], ["logon", "Windows Logon"], ["logoff", "Windows Logoff"], ["shutdown", "Windows Shutdown"], ["ding", "Information"], ["exclaim", "Exclamation"], ["critical", "Critical Stop"], ["notify", "Notify"], ["balloon", "Balloon"], ["minimize", "Minimize"], ["restore", "Restore"], ["menu", "Menu Command"], ["start", "Start Navigation"], ["recycle", "Empty Recycle Bin"], ["tada", "Tada"]];
    openApp(null, { key: "sounds", app: { title: "Sounds and Audio Devices Properties", icon: "wmp", w: 400, h: 400, render: (b, c) => {
      b.innerHTML = `<div class="disp"><div class="tabs"><span class="on">Sounds</span></div><div class="disp-pane"><label><input type="checkbox" class="snd-on" ${store.lget("xp-sounds") !== "0" ? "checked" : ""}> Play the Windows sound scheme</label>
        <label>Program events:</label><div class="wall-list snd-list">${EVENTS.map(([k, t]) => `<div data-s="${k}" tabindex="0">🔊 ${esc(t)}</div>`).join("")}</div>
        <p class="muted">Click an event to hear it. Games have their own Sound switch in the Game menu. Volume and mute are in the speaker icon on the taskbar.</p></div><div class="disp-actions"><button class="xpbtn ok">OK</button></div></div>`;
      b.querySelector(".snd-on").onchange = (e) => store.lset("xp-sounds", e.target.checked ? "1" : "0");
      const list = b.querySelector(".snd-list"), hear = (d) => { if (!d) return; list.querySelectorAll(".sel").forEach((x) => x.classList.remove("sel")); d.classList.add("sel"); XPS.play(d.dataset.s, true); };
      list.onclick = (e) => hear(e.target.closest("[data-s]"));
      list.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hear(e.target.closest("[data-s]")); } };
      b.querySelector(".ok").onclick = c.close;
    } } });
  }
  function renderRun(body, ctx) {
    body.innerHTML = `<form class="runbox"><div class="msgbox"><span class="msgbox-ico">🏃</span><div>Type the name of a program, folder or website, and the portfolio will open it for you.</div></div>
      <label class="runrow">Open: <input class="runin" list="runlist" spellcheck="false" autocomplete="off"></label><datalist id="runlist">${Object.keys(APPS).filter((k) => !APPS[k].action).map((k) => `<option value="${k}">`).join("")}<option value="notepad"><option value="calc"><option value="cmd"><option value="https://en.wikipedia.org"></datalist>
      <div class="msgbox-actions"><button class="xpbtn">OK</button><button type="button" class="xpbtn rcancel">Cancel</button></div></form>`;
    const f = body.querySelector("form"), inp = body.querySelector(".runin");
    body.querySelector(".rcancel").onclick = ctx.close;
    f.addEventListener("submit", (e) => {
      e.preventDefault(); const v = inp.value.trim(); if (!v) return;
      const alias = RUN_ALIAS[v.toLowerCase()];
      if (!alias && (/^(https?:\/\/|www\.)/i.test(v) || /\.(?!exe$)[a-z]{2,}(\/|$)/i.test(v))) { ctx.close(); const had = wins.has("ie"), w = openApp("ie", { url: v }); if (had) w?.navigate?.(v); return; }
      if (sys.open(alias || v.toLowerCase())) return ctx.close();
      msgBox(v, `Windows cannot find '${esc(v)}'. Make sure you typed the name correctly, and then try again.`, "⛔");
    });
    setTimeout(() => inp.focus(), 0);
  }
  function renderSearch(body, ctx) {
    const inner = chrome(body, { addr: "Search Results", addrIcon: "search" });
    inner.innerHTML = `<div class="explorer"><div class="ex-main"><div class="sbar"><label>What are you looking for?</label><input class="sq" placeholder="e.g. CARLA, Python, Yap-less" autocomplete="off"><small class="muted">Searches apps, projects, skills and the resume.</small></div><div class="sres"></div></div></div>`;
    const q = inner.querySelector(".sq"), out = inner.querySelector(".sres");
    const corpus = [
      ...Object.keys(APPS).filter((k) => !APPS[k].action).map((k) => ({ t: DESK_LABEL[k] || APPS[k].title, d: "Program", icon: APPS[k].icon, open: k })),
      ...P.projects.map((p, i) => ({ t: p.name, d: p.desc, icon: "project", proj: i, extra: (p.stack || []).join(" ") })),
      ...Object.entries(P.skills || {}).map(([k, v]) => ({ t: k, d: v.join(", "), icon: "resume", open: "resume" })),
      ...(P.experience || []).map((x) => ({ t: `${x.title} - ${x.org}`, d: x.points.join(" "), icon: "resume", open: "resume" })),
      ...(P.achievements || []).map((a) => ({ t: a, d: "Honors & Awards", icon: "resume", open: "resume" })),
    ];
    const run = () => {
      const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      const hits = words.length ? corpus.filter((c) => words.every((w) => (c.t + " " + c.d + " " + (c.extra || "")).toLowerCase().includes(w))) : [];
      out.innerHTML = !words.length ? `<p class="muted">Type above to search.</p>` : hits.length ? `<p class="muted">${hits.length} result${hits.length === 1 ? "" : "s"}</p>` + hits.slice(0, 40).map((h, i) => `<div class="shit" tabindex="0" data-i="${i}">${I[h.icon] || I.doc}<span><b>${esc(h.t)}</b><small>${esc(h.d.slice(0, 140))}</small></span></div>`).join("") : `<p class="muted">Search is complete. There are no results to display.</p>`;
      out.onclick = out.onkeydown = (e) => { if (e.type === "keydown" && e.key !== "Enter") return; const h = hits[+e.target.closest("[data-i]")?.dataset.i]; if (!h) return; h.proj != null ? openProject(h.proj) : openApp(h.open); };
    };
    q.addEventListener("input", run); run(); setTimeout(() => q.focus(), 0);
  }
  function renderHelp(body) {
    const inner = chrome(body, { addr: "Help and Support Center", addrIcon: "help" });
    const topics = [
      ["Getting around", "Double-click a desktop icon to open it (one tap on a phone). Drag windows by their title bar; drag icons to rearrange them. The Start button lists everything."],
      ["Shortcuts", "Ctrl+Esc or Win: Start menu · Alt+W: close window · Alt+T: Task Manager · Alt+R: Run · F2: new game · F11: full screen (games, Paint, Pictures, Media Player) · Delete: remove a desktop shortcut · Space: skip any start-up screen, loading screen or animation."],
      ["Games and levels", "Snake has 10 maze levels and Brick Breaker has 12 designed levels. Pinball ranks you up through missions. Every finished game earns XP points toward your career level; see your level and trophies in the Games folder."],
      ["Shared Notepad and Calendar", "The Notepad and Calendar are shared by everyone who visits. Changes are saved to the server as you type."],
      ["Shared with everyone", "Message Board posts, My Pictures uploads and world leaderboard scores are public too. Your name for them is the one you choose."],
      ["Contacting me", "Open Contact Me, choose email or phone, and verify your email with the 4-digit code. Only then is the message sent."],
      ["Something looks wrong?", "Use Reset Desktop (desktop icon, Start menu or right-click) to restore icons, wallpaper and deleted shortcuts."],
      ["Privacy", "See Privacy.txt for what is stored and why."],
    ];
    inner.innerHTML = `<div class="explorer">${taskPane([["Pick a task", appLink("reset", "Reset the desktop") + appLink("contact", "Contact me") + appLink("privacy", "Privacy and terms") + appLink("taskmgr", "See what's running")]])}
      <div class="ex-main doc"><h1>Help and Support Center</h1><p class="muted">Windows XP Portfolio Edition</p>${topics.map(([h, t]) => `<h2>${h}</h2><p>${t}</p>`).join("")}</div></div>`;
  }
  function renderPrivacy(body) {
    const inner = chrome(body, { menu: ["File", "Edit", "Format", "View", "Help"] });
    inner.innerHTML = `<textarea class="notepad" readonly>${esc(`PRIVACY NOTICE AND TERMS OF USE
Last updated: ${new Date().getFullYear()}

This is the personal portfolio of ${P.name} (${P.location}).

WHAT IS STORED
- Contact Me: your name, email, optional phone number and message. Your email
  is verified with a one-time code first; then the message is emailed to me.
  Nothing from the contact form is stored in a database.
- Shared Notepad and Calendar: anything you type there is public. Everyone who
  visits can see and change it. Please don't put personal information in them.
- Message Board and My Pictures: posts and uploads are public, along with the
  name you give. Anyone can delete a shared picture.
- World leaderboards: when you finish a game, your score and the name you give
  are saved and shown to everyone.
- Site Statistics: this site counts page views and returning browsers. The
  counters hold only totals, nothing about you.
- Your browser keeps small preferences (icon layout, wallpaper, volume, your
  name, your own best scores) in local storage. These stay on your device.
- Hosting (Vercel) and visit analytics (Vercel Web Analytics, no cookies) see
  anonymous technical data such as pages viewed, country and browser.

WHAT IS NOT DONE
- No ads, no selling or sharing your details, no mailing lists.

YOUR CHOICES
- Ask me to delete a message you sent: ${links.email}
- Clear this site's local storage in your browser to reset your preferences.

TERMS
- The site is provided as is, for fun and to show my work.
- Don't post abusive or illegal content in the shared Notepad, Calendar,
  Message Board, My Pictures or leaderboard names; it may be removed.
`)}</textarea>`;
    inner.style.overflow = "hidden";
  }

  // ---------------- Site statistics (own counters in Firestore) ----------------
  const dayId = (d) => "d-" + d.toISOString().slice(0, 10); // UTC, so every visitor counts into the same day
  function countVisit() {
    // one view per browser session; a "visitor" is a browser we haven't seen before (overall / today)
    if (store.get("xp-counted")) return; store.set("xp-counted", "1");
    const today = dayId(new Date()), seen = store.lget("xp-seen"), seenDay = store.lget("xp-seen-day");
    Cloud.count(["site", today], { site: !seen, [today]: seenDay !== today }).then(() => { store.lset("xp-seen", "1"); store.lset("xp-seen-day", today); }).catch(() => store.set("xp-counted", ""));
  }
  function renderStats(body, ctx) {
    const inner = chrome(body, { addr: "Site Statistics", addrIcon: "stats" });
    inner.innerHTML = `<div class="statwin"><div class="stat-cards"><div><b class="sv">…</b><span>Total page views</span></div><div><b class="su">…</b><span>Unique visitors</span></div><div><b class="tv">…</b><span>Views today</span></div><div><b class="tu">…</b><span>Visitors today</span></div></div>
      <h4>Traffic, last 14 days (UTC)</h4><div class="stat-chart"></div><p class="muted stat-note">Counted on this site: one view per browser session, one visitor per new browser. Refreshes every 30 seconds.</p></div>`;
    const $s = (q) => inner.querySelector(q), note = $s(".stat-note").textContent;
    async function load() {
      const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * 864e5));
      try {
        const st = await Cloud.stats(["site", ...days.map(dayId)]);
        const n = (v) => (v || 0).toLocaleString();
        $s(".stat-note").textContent = note;
        $s(".sv").textContent = n(st.site?.views); $s(".su").textContent = n(st.site?.visitors);
        const t = st[dayId(new Date())]; $s(".tv").textContent = n(t?.views); $s(".tu").textContent = n(t?.visitors);
        const max = Math.max(1, ...days.map((d) => st[dayId(d)]?.views || 0));
        $s(".stat-chart").innerHTML = days.map((d) => { const v = st[dayId(d)]?.views || 0, u = st[dayId(d)]?.visitors || 0; return `<div class="bar" title="${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}: ${v} views, ${u} visitors"><i style="height:${Math.round(v / max * 100)}%"></i><em style="height:${Math.round(u / max * 100)}%"></em><small>${d.getUTCDate()}</small></div>`; }).join("");
      } catch { $s(".stat-note").textContent = "Statistics are unavailable right now (offline)."; }
    }
    load(); const t = setInterval(() => ctx.isVisible() && load(), 30000); ctx.onClose(() => clearInterval(t));
  }

  // ---------------- Message board (open: no sign-in, anyone can post to anyone) ----------------
  // the docked board and the Message Board window share one cooldown, one post in flight and one refresh
  const boardState = { last: 0, busy: false };
  function renderBoard(body, ctx = null) {
    const docked = !ctx;
    body.classList.add("mboard");
    body.innerHTML = `${docked ? `<div class="mb-head">${I.board}<b>Message Board</b><button class="mb-min" title="Hide" aria-label="Hide message board">–</button></div>` : ""}
      <form class="mb-form"><div class="mb-row"><input name="from" maxlength="20" placeholder="Your name (optional)" aria-label="Your name" autocomplete="off"><input name="to" maxlength="30" placeholder="To (optional)" aria-label="To"></div>
        <textarea name="text" maxlength="280" placeholder="Leave a message for anyone…" aria-label="Message" required></textarea>
        <div class="mb-row"><small class="mb-count">0 / 280</small><button class="xpbtn">Post</button></div></form>
      <div class="mb-list" aria-live="polite"><p class="muted">Loading messages…</p></div>`;
    const form = body.querySelector("form"), list = body.querySelector(".mb-list"), F = form.elements;
    F.from.value = playerName();
    // typing here changes the name everywhere for this session
    F.from.addEventListener("change", () => { F.from.value = setPlayerName(F.from.value); });
    const showName = () => { if (document.activeElement !== F.from) F.from.value = playerName(); };
    addEventListener("xp-name", showName); if (ctx) ctx.onClose(() => removeEventListener("xp-name", showName));
    let sig = null;
    const ago = (t) => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? "just now" : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : new Date(t).toLocaleDateString([], { month: "short", day: "numeric" }); };
    const paint = (rows) => {
      list.innerHTML = rows.length ? rows.map((m) => `<div class="mb-msg"><div class="mb-meta"><b>${esc(m.from)}</b> → <span>${esc(m.to)}</span><time data-t="${m.createdAt}" title="${new Date(m.createdAt).toLocaleString()}">${ago(m.createdAt)}</time></div><p>${esc(m.text)}</p></div>`).join("") : `<p class="muted">No messages yet. Be the first!</p>`;
    };
    async function load() {
      try { const rows = await Cloud.board(50); const n = rows.map((r) => r.id).join(); if (n !== sig) { sig = n; paint(rows); } else list.querySelectorAll("time[data-t]").forEach((el) => (el.textContent = ago(+el.dataset.t))); }
      catch { if (sig == null) list.innerHTML = `<p class="muted">Messages are unavailable right now.</p>`; }
    }
    F.text.addEventListener("input", () => (body.querySelector(".mb-count").textContent = `${F.text.value.length} / 280`));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = F.text.value.trim(); if (!text) return;
      if (boardState.busy) return; // Ctrl+Enter submits even while the button is disabled
      if (Date.now() - boardState.last < 15000) return msgBox("Message Board", "Please wait a few seconds before posting again.", "⚠️");
      const btn = form.querySelector("button"); boardState.busy = true; btn.disabled = true;
      try {
        // a name typed in the field counts as the answer; otherwise ask once this session
        if (cleanName(F.from.value) && !playerName()) setPlayerName(F.from.value);
        const from = (await askName()) || "Anonymous", to = (F.to.value.trim() || "Everyone").slice(0, 30);
        await Cloud.post(from, to, text); boardState.last = Date.now(); F.text.value = ""; F.to.value = ""; body.querySelector(".mb-count").textContent = "0 / 280"; dispatchEvent(new Event("xp-board")); }
      catch { msgBox("Message Board", "Couldn't post right now. Please try again: it won't be posted twice.", "⚠️"); }
      finally { boardState.busy = false; btn.disabled = false; }
    });
    const refresh = () => { sig = null; load(); };
    addEventListener("xp-board", refresh); if (ctx) ctx.onClose(() => removeEventListener("xp-board", refresh));
    F.text.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) form.requestSubmit(); });
    // the docked board is hidden by CSS on small screens and before log-on; those screens use the Message Board window
    if (!docked || innerWidth > 900) load();
    const t = setInterval(() => !document.hidden && (docked ? boardEl.offsetWidth > 0 : ctx.isVisible()) && load(), 30000);
    if (ctx) ctx.onClose(() => clearInterval(t));
    if (docked) body.querySelector(".mb-min").onclick = () => { boardEl.classList.add("hidden"); store.lset("xp-board-hidden", "1"); boardTab.classList.remove("hidden"); layoutIcons(false); };
  }

  // ---------------- Wallpapers / Display Properties ----------------
  const WALLS = { bliss: "Bliss", azul: "Azul", autumn: "Autumn", ripple: "Ripple", sunset: "Sunset", stars: "Starfield", teal: "Classic Teal", black: "Black" };
  const desktopEl = $("#desktop");
  const setWall = (w) => { if (!WALLS[w]) w = "bliss"; Object.keys(WALLS).forEach((k) => desktopEl.classList.toggle("wp-" + k, k === w)); store.lset("xp-wall", w); };
  setWall(store.lget("xp-wall") || "bliss");
  function renderDisplay(body, ctx) {
    let pick = store.lget("xp-wall") || "bliss";
    body.innerHTML = `<div class="disp"><div class="tabs"><span class="on" data-tab="desk">Desktop</span><span data-tab="theme">Themes</span><span data-tab="saver">Screen Saver</span></div>
      <div class="disp-pane"><div class="monitor"><div class="mon-screen wp-${pick}"></div><div class="mon-base"></div></div>
      <label>Background:</label><div class="wall-list">${Object.entries(WALLS).map(([k, v]) => `<div data-w="${k}" class="${k === pick ? "sel" : ""}"><i class="wp-${k}"></i>${v}</div>`).join("")}</div></div>
      <div class="disp-actions"><button class="xpbtn ok">OK</button><button class="xpbtn cancel">Cancel</button><button class="xpbtn apply">Apply</button></div></div>`;
    const screen = body.querySelector(".mon-screen"), pane = body.querySelector(".disp-pane"), deskHTML = pane.innerHTML;
    body.querySelector(".tabs").addEventListener("click", (e) => {
      const t = e.target.closest("[data-tab]"); if (!t) return;
      body.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("on", x === t));
      if (t.dataset.tab === "desk") { pane.innerHTML = deskHTML; return renderDisplay(body, ctx); }
      pane.innerHTML = t.dataset.tab === "theme"
        ? `<label>Theme:</label><div class="wall-list"><div class="sel"><i class="wp-bliss"></i>Windows XP (Luna Blue)</div></div><p class="muted">Luna is the only theme on this machine. Change the wallpaper on the Desktop tab.</p>`
        : `<div class="monitor"><div class="mon-screen saver-mini"><span class="xp-logo tiny"><span></span><span></span><span></span><span></span></span></div><div class="mon-base"></div></div><label>Screen saver: Windows XP</label><label>Wait: <select class="saver-wait">${[[0, "Never"], [1, "1 minute"], [5, "5 minutes"], [10, "10 minutes"]].map(([m, t]) => `<option value="${m}" ${String(m) === (store.lget("xp-saver-wait") ?? "5") ? "selected" : ""}>${t}</option>`).join("")}</select></label><button class="xpbtn preview" style="align-self:flex-start">Preview</button><p class="muted">Move the mouse or press a key to stop the screen saver.</p>`;
      pane.querySelector(".preview")?.addEventListener("click", screenSaver);
      pane.querySelector(".saver-wait")?.addEventListener("change", (ev) => store.lset("xp-saver-wait", ev.target.value));
    });
    body.querySelector(".wall-list").addEventListener("click", (e) => {
      const d = e.target.closest("[data-w]"); if (!d) return; pick = d.dataset.w;
      body.querySelectorAll("[data-w]").forEach((x) => x.classList.toggle("sel", x === d)); screen.className = "mon-screen wp-" + pick;
    });
    body.querySelector(".wall-list").addEventListener("dblclick", () => { setWall(pick); ctx.close(); });
    body.querySelector(".apply").onclick = () => setWall(pick);
    body.querySelector(".ok").onclick = () => { setWall(pick); ctx.close(); };
    body.querySelector(".cancel").onclick = ctx.close;
  }

  // ---------------- Desktop icons (draggable, snap to grid, positions saved) ----------------
  // The desktop holds the default icons plus any shortcuts dragged out of folders; icons dropped on the Recycle Bin move there.
  const iconsEl = $("#icons");
  // the message board lives on the right side of the desktop; on narrow screens it's a desktop icon instead
  const boardEl = document.createElement("aside"); boardEl.className = "board-dock"; boardEl.setAttribute("aria-label", "Message board");
  const boardTab = document.createElement("button"); boardTab.className = "board-tab hidden"; boardTab.innerHTML = `${I.board}<span>Messages</span>`; boardTab.title = "Show the message board";
  $("#desktop").insertBefore(boardEl, $("#windows")); $("#desktop").appendChild(boardTab);
  if (store.lget("xp-board-hidden") === "1") { boardEl.classList.add("hidden"); boardTab.classList.remove("hidden"); }
  boardTab.onclick = () => { boardEl.classList.remove("hidden"); boardTab.classList.add("hidden"); store.lset("xp-board-hidden", "0"); layoutIcons(false); };
  const FIXED = ["computer", "recycle", "reset"];
  const readList = (k) => { try { return JSON.parse(store.lget(k) || "[]").filter((id) => APPS[id]); } catch { return []; } };
  let trash = readList("xp-trash"), extra = readList("xp-desk-extra"), gone = readList("xp-gone");
  let ICONS = [], iconEls = [];
  const CELL_W = 84, CELL_H = 86, PAD = 6;
  function buildIcons() {
    ICONS = [...new Set(["computer", ...DESKTOP, ...extra])].filter((id) => !trash.includes(id) && !gone.includes(id));
    iconsEl.innerHTML = ICONS.map((id) => `<div class="dicon" tabindex="0" data-id="${id}" role="button" aria-label="${esc(DESK_LABEL[id] || APPS[id].title)}">${I[APPS[id].icon]}<span>${esc(DESK_LABEL[id] || APPS[id].title)}</span></div>`).join("");
    iconEls = [...iconsEl.children];
    layoutIcons(false);
  }
  const saveDesk = () => { store.lset("xp-trash", JSON.stringify(trash)); store.lset("xp-desk-extra", JSON.stringify(extra)); store.lset("xp-gone", JSON.stringify(gone)); };
  function addToDesktop(id, x, y) {
    if (!APPS[id]) return;
    trash = trash.filter((t) => t !== id); gone = gone.filter((t) => t !== id);
    if (!DESKTOP.includes(id) && id !== "computer" && !extra.includes(id)) extra.push(id);
    if (x != null) iconPos[id] = { c: Math.max(0, Math.min(cols() - 1, Math.round((x - PAD - 40) / CELL_W))), r: Math.max(0, Math.min(rows() - 1, Math.round((y - PAD - 40) / CELL_H))) };
    Object.keys(iconPos).forEach((k) => k !== id && iconPos[k].c === iconPos[id]?.c && iconPos[k].r === iconPos[id]?.r && delete iconPos[k]);
    saveDesk(); store.lset("xp-icons", JSON.stringify(iconPos)); buildIcons(); refreshRecycle();
  }
  function moveToTrash(ids) {
    ids = ids.filter((id) => !FIXED.includes(id));
    if (!ids.length) return;
    trash = [...new Set([...trash, ...ids])]; ids.forEach((id) => delete iconPos[id]); XPS.play("recycle");
    saveDesk(); store.lset("xp-icons", JSON.stringify(iconPos)); buildIcons(); refreshRecycle();
  }
  let iconPos = {};
  try { iconPos = JSON.parse(store.lget("xp-icons") || "{}"); } catch {}
  const rows = () => Math.max(1, Math.floor((innerHeight - 30 - PAD) / CELL_H));
  const boardWidth = () => (innerWidth > 900 && !boardEl.classList.contains("hidden") ? 300 : 0);
  const cols = () => Math.max(1, Math.floor((innerWidth - PAD - boardWidth()) / CELL_W));
  const cellKey = (c, r) => c + "," + r;
  const phone = () => innerWidth <= 640;
  function layoutIcons(reset) {
    if (phone()) {
      // phone home screen: fixed 4-column grid in a simple order, nothing saved
      const C = 4, cw = Math.floor((innerWidth - 12) / C);
      iconsEl.classList.add("phone");
      iconEls.forEach((el, i) => { el.style.width = cw + "px"; el.style.transform = `translate(${6 + (i % C) * cw}px,${8 + ((i / C) | 0) * 100}px)`; });
      iconsEl.style.setProperty("--rows", Math.ceil(iconEls.length / C));
      return;
    }
    iconsEl.classList.remove("phone"); iconsEl.style.height = ""; iconEls.forEach((el) => (el.style.width = ""));
    if (reset) iconPos = {};
    const R = rows(), C = cols(), taken = new Set();
    // keep saved spots that still fit on screen, then flow the rest top-to-bottom
    ICONS.forEach((id) => { const p = iconPos[id]; if (p && p.c < C && p.r < R && !taken.has(cellKey(p.c, p.r))) taken.add(cellKey(p.c, p.r)); else delete iconPos[id]; });
    // like real XP: Recycle Bin lives in the bottom-right corner unless the user moved it
    if (ICONS.includes("recycle") && !iconPos.recycle) {
      let c = C - 1, r = R - 1; while (taken.has(cellKey(c, r)) && r > 0) r--;
      iconPos.recycle = { c, r }; taken.add(cellKey(c, r));
    }
    let n = 0;
    ICONS.forEach((id) => {
      if (iconPos[id]) return;
      while (taken.has(cellKey((n / R) | 0, n % R))) n++;
      iconPos[id] = { c: (n / R) | 0, r: n % R }; taken.add(cellKey(iconPos[id].c, iconPos[id].r));
    });
    iconEls.forEach((el) => { const p = iconPos[el.dataset.id]; el.style.transform = `translate(${PAD + p.c * CELL_W}px,${PAD + p.r * CELL_H}px)`; });
    if (reset) store.lset("xp-icons", JSON.stringify(iconPos));
  }
  function askReset() {
    openApp(null, { key: "askreset", app: { title: "Reset Desktop", icon: "showdesk", w: 380, h: 190, render: (b, c) => {
      b.innerHTML = `<div class="msgbox"><span class="msgbox-ico">↺</span><div><b>Reset the desktop to normal?</b><br>This closes all windows and restores the icon layout, wallpaper and any deleted shortcuts. Your notes and calendar are kept.</div></div><div class="msgbox-actions"><button class="xpbtn yes">Reset</button><button class="xpbtn no">Cancel</button></div>`;
      b.querySelector(".yes").onclick = () => { c.close(); resetDesktop(); };
      b.querySelector(".no").onclick = c.close; setTimeout(() => b.querySelector(".no").focus(), 0);
    } } });
  }
  function resetDesktop() {
    [...wins.keys()].forEach(close);
    try { Object.keys(localStorage).filter((k) => /^xp-(icons|trash|desk-extra|gone|order-|wall)/.test(k)).forEach((k) => localStorage.removeItem(k)); } catch {}
    trash = []; extra = []; gone = []; iconPos = {}; setWall("bliss");
    buildIcons(); layoutIcons(true);
  }
  buildIcons();
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => layoutIcons(false), 150); });

  const coarse = matchMedia("(pointer: coarse)").matches;
  const selectIcons = (els) => iconEls.forEach((x) => x.classList.toggle("sel", els.includes(x)));
  // what is under the pointer, ignoring whatever is being dragged
  const dropTarget = (x, y, skip) => document.elementsFromPoint(x, y).find((el) => !skip.some((s) => s.contains(el)));
  iconsEl.addEventListener("pointerdown", (e) => {
    const d = e.target.closest(".dicon"); if (!d || e.button !== 0) return;
    e.stopPropagation();
    if (phone()) { const t0 = Date.now(), x0 = e.clientX, y0 = e.clientY; d.addEventListener("pointerup", (u) => { if (Date.now() - t0 < 600 && Math.hypot(u.clientX - x0, u.clientY - y0) < 10) openApp(d.dataset.id); }, { once: true }); return; } closeMenus(); closeTray(); hideCtx();
    if (e.ctrlKey || e.metaKey) { d.classList.toggle("sel"); return; }
    if (!d.classList.contains("sel")) selectIcons([d]);
    const group = iconEls.filter((x) => x.classList.contains("sel"));
    const sx = e.clientX, sy = e.clientY; let moved = false, raf = 0, dx = 0, dy = 0, hover = null;
    d.setPointerCapture(e.pointerId);
    const move = (ev) => {
      dx = ev.clientX - sx; dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      if (!moved) { moved = true; group.forEach((x) => x.classList.add("dragging")); }
      const t = dropTarget(ev.clientX, ev.clientY, group)?.closest('.dicon[data-id="recycle"]');
      if (t !== hover) { hover?.classList.remove("drop-over"); hover = t; hover?.classList.add("drop-over"); }
      raf ||= requestAnimationFrame(() => { raf = 0; group.forEach((x) => { const p = iconPos[x.dataset.id]; x.style.transform = `translate(${PAD + p.c * CELL_W + dx}px,${PAD + p.r * CELL_H + dy}px)`; }); });
    };
    const up = (ev) => {
      d.removeEventListener("pointermove", move); d.removeEventListener("pointerup", up); d.removeEventListener("pointercancel", up);
      cancelAnimationFrame(raf); hover?.classList.remove("drop-over");
      if (!moved) { if (coarse) openApp(d.dataset.id); else selectIcons([d]); return; }
      group.forEach((x) => x.classList.remove("dragging"));
      if (hover) { moveToTrash(group.map((x) => x.dataset.id)); return layoutIcons(false); }
      const R = rows(), C = cols(), dc = Math.round(dx / CELL_W), dr = Math.round(dy / CELL_H);
      const others = new Set(ICONS.filter((id) => !group.some((x) => x.dataset.id === id)).map((id) => cellKey(iconPos[id].c, iconPos[id].r)));
      group.forEach((x) => {
        const p = iconPos[x.dataset.id];
        let c = Math.max(0, Math.min(C - 1, p.c + dc)), r = Math.max(0, Math.min(R - 1, p.r + dr));
        // find the nearest free cell if the drop spot is taken
        for (let ring = 0; others.has(cellKey(c, r)) && ring < 40; ring++) {
          let found = false;
          for (let oc = -ring; oc <= ring && !found; oc++) for (let or = -ring; or <= ring && !found; or++) {
            const nc = c + oc, nr = r + or;
            if (nc >= 0 && nr >= 0 && nc < C && nr < R && !others.has(cellKey(nc, nr))) { c = nc; r = nr; found = true; }
          }
        }
        iconPos[x.dataset.id] = { c, r }; others.add(cellKey(c, r));
      });
      store.lset("xp-icons", JSON.stringify(iconPos));
      layoutIcons(false);
    };
    d.addEventListener("pointermove", move); d.addEventListener("pointerup", up); d.addEventListener("pointercancel", up);
  });
  iconsEl.addEventListener("dblclick", (e) => { const d = e.target.closest(".dicon"); if (d) openApp(d.dataset.id); });
  iconsEl.addEventListener("keydown", (e) => {
    const d = e.target.closest(".dicon"); if (!d) return;
    if (e.key === "Enter") openApp(d.dataset.id);
    if (e.key === "Delete") { const sel = iconEls.filter((x) => x.classList.contains("sel")); moveToTrash((sel.length ? sel : [d]).map((x) => x.dataset.id)); }
    if (e.key.startsWith("Arrow")) { e.preventDefault(); const i = iconEls.indexOf(d) + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1); const n = iconEls[(i + iconEls.length) % iconEls.length]; selectIcons([n]); n.focus(); }
  });

  // ---------------- Files and folders inside windows ----------------
  // Drag an item to reorder it (order is remembered per window), drop it on the desktop to make a shortcut,
  // or on the Recycle Bin icon to delete its shortcut.
  const itemId = (it) => it.dataset.open || it.dataset.i || it.dataset.id || it.textContent.trim();
  function applyOrder(winEl, key) {
    let order; try { order = JSON.parse(store.lget("xp-order-" + key) || "null"); } catch {}
    if (!order) return;
    winEl.querySelectorAll(".grid-items").forEach((grid) => {
      const items = [...grid.children];
      items.sort((a, b) => ((order.indexOf(itemId(a)) + 1) || 999) - ((order.indexOf(itemId(b)) + 1) || 999)).forEach((it) => grid.appendChild(it));
    });
  }
  document.addEventListener("pointerdown", (e) => {
    const it = e.target.closest?.(".grid-items .fitem"); if (!it || e.button !== 0 || e.pointerType === "touch") return;
    const grid = it.parentElement, winEl = it.closest(".win"), key = winEl?.dataset.key;
    grid.querySelectorAll(".fitem").forEach((x) => x.classList.toggle("sel", x === it));
    const sx = e.clientX, sy = e.clientY; let ghost = null, hover = null;
    const move = (ev) => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      if (!ghost) {
        ghost = it.cloneNode(true); ghost.className = "fitem drag-ghost"; document.body.appendChild(ghost);
        it.classList.add("drag-src");
      }
      ghost.style.transform = `translate(${ev.clientX - 46}px,${ev.clientY - 30}px)`;
      const under = dropTarget(ev.clientX, ev.clientY, [ghost]);
      const over = under?.closest(".fitem");
      if (over && over !== it && over.parentElement === grid) {
        const r = over.getBoundingClientRect();
        grid.insertBefore(it, ev.clientX > r.left + r.width / 2 ? over.nextSibling : over);
      }
      const bin = under?.closest('.dicon[data-id="recycle"]');
      const desk = it.dataset.open && !under?.closest(".win, .taskbar") ? desktopEl : null;
      const tgt = bin || desk;
      if (tgt !== hover) { hover?.classList.remove("drop-over"); hover = tgt; hover?.classList.add("drop-over"); }
    };
    const up = (ev) => {
      removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      if (!ghost) return;
      ghost.remove(); it.classList.remove("drag-src"); hover?.classList.remove("drop-over");
      const id = it.dataset.open;
      if (hover?.classList.contains("dicon") && id) moveToTrash([id]);
      else if (hover === desktopEl && id && APPS[id]) addToDesktop(id, ev.clientX, ev.clientY);
      if (key) store.lset("xp-order-" + key, JSON.stringify([...grid.children].map(itemId)));
      lastDrag = performance.now();
    };
    addEventListener("pointermove", move); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  });
  // swallow the click that follows a drag (only if it arrives right away) so the item doesn't also open
  let lastDrag = -1e9;
  addEventListener("click", (c) => { if (performance.now() - lastDrag < 80) { lastDrag = -1e9; c.stopPropagation(); c.preventDefault(); } }, true);
  function focusableItems(root) { root.querySelectorAll(".fitem").forEach((f) => { f.tabIndex = 0; f.setAttribute("role", "button"); }); }
  function refreshRecycle() {
    const w = wins.get("recycle"); if (!w) return;
    const b = w.el.querySelector(".wbody"); w.cleanups.forEach((f) => f()); w.cleanups = []; renderRecycle(b); applyOrder(w.el, "recycle"); focusableItems(w.el);
  }

  // rubber-band selection on empty desktop
  const marquee = document.createElement("div"); marquee.className = "marquee hidden"; desktopEl.appendChild(marquee);
  desktopEl.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target !== desktopEl && e.target !== iconsEl && e.target !== winLayer) return;
    selectIcons([]);
    if (e.pointerType !== "mouse") return;
    const sx = e.clientX, sy = e.clientY, rects = iconEls.map((el) => [el, el.getBoundingClientRect()]);
    const move = (ev) => {
      const x = Math.min(sx, ev.clientX), y = Math.min(sy, ev.clientY), w = Math.abs(ev.clientX - sx), h = Math.abs(ev.clientY - sy);
      if (w + h < 4) return;
      marquee.classList.remove("hidden"); Object.assign(marquee.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
      selectIcons(rects.filter(([, r]) => r.right > x && r.left < x + w && r.bottom > y && r.top < y + h).map(([el]) => el));
    };
    const up = () => { marquee.classList.add("hidden"); removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
    addEventListener("pointermove", move); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  });

  // ---------------- Start menu ----------------
  const sm = $("#startMenu"), startBtn = $("#startBtn");
  const left = [["ie", "Internet Explorer", "Browse the web"], ["contact", "Contact Me", "Send me a message"], null, ["about", "About Me"], ["resume", "Resume"], ["projects", "My Projects"], ["cmd", "Command Prompt"], ["msn", "MSN Messenger"], ["wmp", "Windows Media Player"], ["paint", "Paint"]];
  $("#smLeft").innerHTML = left.map((x) => x ? `<li data-open="${x[0]}" tabindex="0" role="menuitem">${I[APPS[x[0]].icon]}<span>${x[2] ? `<b>${x[1]}</b><small>${x[2]}</small>` : x[1]}</span></li>` : "<hr>").join("") + `<hr><li class="sm-all" id="smAll" tabindex="0" role="menuitem" aria-haspopup="true"><b>All Programs</b><i class="sm-go">▶</i></li>`;
  $("#smRight").innerHTML = [
    `<li data-open="computer" tabindex="0" role="menuitem">${I.computer}<b>My Computer</b></li>`, `<li data-open="pictures" tabindex="0" role="menuitem">${I.pictures}My Pictures</li>`, `<li data-open="games" tabindex="0" role="menuitem">${I.games}Games</li>`, `<li data-open="calendar" tabindex="0" role="menuitem">${I.calendar}Calendar</li>`, `<li data-open="board" tabindex="0" role="menuitem">${I.board}Message Board</li>`, `<li data-open="stats" tabindex="0" role="menuitem">${I.stats}Site Statistics</li>`, "<hr>",
    `<li data-open="control" tabindex="0" role="menuitem">${I.control}Control Panel</li>`, `<li data-open="taskmgr" tabindex="0" role="menuitem">${I.taskmgr}Task Manager</li>`, `<li data-open="calc" tabindex="0" role="menuitem">${I.calc}Calculator</li>`, `<li data-open="notepad" tabindex="0" role="menuitem">${I.notepad}Notepad</li>`, "<hr>",
    `<li data-open="help" tabindex="0" role="menuitem">${I.help}Help and Support</li>`, `<li data-open="search" tabindex="0" role="menuitem">${I.search}Search</li>`, `<li data-open="run" tabindex="0" role="menuitem">${I.run}Run...</li>`,
  ].join("");
  // All Programs fly-out, with Accessories and Games as sub-folders
  const smFly = document.createElement("div"); smFly.id = "smProg"; smFly.className = "sm-fly hidden"; smFly.setAttribute("role", "menu"); $("#desktop").appendChild(smFly);
  const flyItem = (id) => `<li data-open="${id}" tabindex="-1" role="menuitem">${I[APPS[id].icon]}<span>${esc(DESK_LABEL[id] || APPS[id].title)}</span></li>`;
  const flyFolder = (name, ids) => `<li class="sm-folder" tabindex="-1" role="menuitem" aria-haspopup="true">${I.folder}<span>${name}</span><i class="sm-go">▶</i><ul role="menu">${ids.map(flyItem).join("")}</ul></li>`;
  smFly.innerHTML = `<ul>${flyFolder("Accessories", ["calc", "cmd", "notepad", "paint", "taskmgr", "control", "display"])}${flyFolder("Games", GAME_IDS)}${["ie", "msn", "wmp", "contact", "about", "projects", "resume", "pictures", "calendar", "board", "stats", "help"].map(flyItem).join("")}</ul>`;
  const showFly = (on, focusFirst) => { smFly.classList.toggle("hidden", !on); $("#smAll").classList.toggle("on", on); if (!on) smFly.querySelectorAll(".open").forEach((x) => x.classList.remove("open")); else if (focusFirst) smFly.querySelector("li")?.focus(); };
  $("#smAll").addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") showFly(true); });
  sm.addEventListener("pointerover", (e) => { const li = e.target.closest("li"); if (e.pointerType === "mouse" && li && li.id !== "smAll") showFly(false); });
  smFly.addEventListener("click", (e) => {
    const li = e.target.closest("li"); if (!li) return;
    if (li.classList.contains("sm-folder")) { e.stopPropagation(); smFly.querySelectorAll(".sm-folder").forEach((x) => x.classList.toggle("open", x === li && !x.classList.contains("open"))); }
  });
  smFly.addEventListener("keydown", (e) => {
    const li = e.target.closest("li"); if (!li) return;
    const peers = [...li.parentElement.children], i = peers.indexOf(li);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); peers[(i + (e.key === "ArrowDown" ? 1 : -1) + peers.length) % peers.length].focus(); }
    else if (e.key === "ArrowRight" && li.classList.contains("sm-folder")) { e.preventDefault(); e.stopPropagation(); li.classList.add("open"); li.querySelector("li")?.focus(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); const up = li.parentElement.closest(".sm-folder"); if (up) { up.classList.remove("open"); up.focus(); } else { showFly(false); $("#smAll").focus(); } }
    else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); li.click(); if (li.classList.contains("sm-folder")) li.querySelector("li")?.focus(); }
  });
  sm.addEventListener("keydown", (e) => {
    const items = [...sm.querySelectorAll("li[tabindex]")], i = items.indexOf(document.activeElement);
    if (e.key === "Enter" && i >= 0) { e.preventDefault(); items[i].click(); }
    if (e.key === "ArrowRight" && document.activeElement?.id === "smAll") { e.preventDefault(); showFly(true, true); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus(); }
  });
  const toggleStart = (on) => { const was = !sm.classList.contains("hidden"); sm.classList.toggle("hidden", !on); startBtn.classList.toggle("on", on); if (!on) showFly(false); if (on && !was) XPS.play("start"); if (on) { closeTray(); setTimeout(() => sm.querySelector("li[tabindex]")?.focus({ preventScroll: true }), 0); } };
  startBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleStart(sm.classList.contains("hidden")); });
  sm.addEventListener("click", (e) => { const li = e.target.closest("li"); if (!li) return; if (li.id === "smAll") { e.stopPropagation(); showFly(true, true); } else toggleStart(false); });
  document.addEventListener("click", (e) => { if (!sm.contains(e.target) && !startBtn.contains(e.target)) toggleStart(false); hideCtx(); });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && e.ctrlKey && !e.shiftKey) { toggleStart(sm.classList.contains("hidden")); return; }
    if (e.key === "Escape" && !e.ctrlKey) { toggleStart(false); closeTray(); closeMenus(); hideCtx(); shut.classList.add("hidden"); }
    // browsers and the OS keep Ctrl+W, Alt+F4, Ctrl+Shift+Esc and Win+R for themselves in a normal tab, so Alt+W, Alt+T and Alt+R are the ones Help advertises
    if (activeKey && ((e.altKey && e.key === "F4") || (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "w") || ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "w"))) { e.preventDefault(); close(activeKey); }
    metaAlone = e.key === "Meta" && !e.repeat;
  });

  addEventListener("keydown", (e) => {
    const alt = e.altKey && !e.ctrlKey && !e.metaKey;
    if ((e.ctrlKey && e.shiftKey && e.key === "Escape") || (alt && e.key.toLowerCase() === "t")) { e.preventDefault(); openApp("taskmgr"); }
    if ((e.metaKey && !/Mac|iP(hone|ad)/.test(navigator.platform) && e.key.toLowerCase() === "r") || (alt && e.key.toLowerCase() === "r")) { e.preventDefault(); metaAlone = false; openApp("run"); }
  });
  let metaAlone = false;
  addEventListener("keyup", (e) => { if (e.key === "Meta" && metaAlone) toggleStart(sm.classList.contains("hidden")); metaAlone = false; });

  // ---------------- Context menu ----------------
  const ctxEl = $("#ctxMenu");
  const hideCtx = () => ctxEl.classList.add("hidden");
  desktopEl.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".win, .taskbar, .start-menu, .tray-pop, .board-dock, .board-tab, .balloons")) return hideCtx();
    e.preventDefault();
    const icon = e.target.closest(".dicon");
    ctxEl.innerHTML = icon
      ? `<div data-c="open" data-id="${icon.dataset.id}"><b>Open</b></div><hr><div data-c="arrange">Arrange Icons</div>`
      : `<div data-c="arrange">Arrange Icons</div><div data-c="refresh">Refresh</div><hr><div data-c="notepad">New Text Document</div><div data-c="cmd">Open Command Prompt</div><div data-c="games">Games</div><hr><div data-c="reset">Reset Desktop</div><div data-c="display">Properties</div>`;
    ctxEl.classList.remove("hidden");
    ctxEl.style.left = Math.max(0, Math.min(e.clientX, innerWidth - ctxEl.offsetWidth - 4)) + "px";
    ctxEl.style.top = Math.max(0, Math.min(e.clientY, innerHeight - 30 - ctxEl.offsetHeight - 4)) + "px";
  });
  ctxEl.addEventListener("click", (e) => {
    const t = e.target.closest("[data-c]"); if (!t) return; const c = t.dataset.c; hideCtx();
    if (c === "refresh") { iconsEl.style.opacity = 0; setTimeout(() => (iconsEl.style.opacity = 1), 120); }
    if (c === "arrange") layoutIcons(true);
    if (c === "reset") askReset();
    if (c === "open") openApp(t.dataset.id);
    if (["notepad", "cmd", "games", "display"].includes(c)) openApp(c);
  });

  // ---------------- Taskbar: show desktop, tray popups, clock ----------------
  $("#showDesk").addEventListener("click", () => {
    const vis = [...wins.values()].filter((w) => !w.el.classList.contains("min"));
    if (vis.length) { vis.forEach((w) => { const r = w.el.getBoundingClientRect(); w.el.classList.add("min"); fly(r, w.task.getBoundingClientRect()); }); XPS.play("minimize"); desktopEl._restore = vis; activeKey = null; paintActive(); }
    else {
      const back = (desktopEl._restore || []).filter((w) => w.el.isConnected); desktopEl._restore = null;
      back.forEach((w) => { w.el.classList.remove("min"); fly(w.task.getBoundingClientRect(), w.el.getBoundingClientRect()); }); if (back.length) XPS.play("restore");
      const top = back.sort((a, b) => (+a.el.style.zIndex || 0) - (+b.el.style.zIndex || 0)).pop(); if (top) focus(top.el.dataset.key);
    }
  });
  const trayPop = $("#trayPop");
  let trayOpen = null;
  function closeTray() { trayPop.classList.add("hidden"); trayOpen = null; }
  // Real connection info. Browsers never expose the Wi-Fi network name (SSID), so it isn't shown.
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const net = { ping: null, testing: false };
  const netInfo = () => {
    const t = conn?.type, labels = { wifi: "Wi-Fi", ethernet: "Ethernet", cellular: "Mobile data", bluetooth: "Bluetooth", wimax: "WiMAX", none: "No connection" };
    return { online: navigator.onLine, kind: labels[t] || (conn ? "Network connection" : "Network connection"), eff: conn?.effectiveType, down: conn?.downlink, rtt: conn?.rtt, save: conn?.saveData };
  };
  const strength = () => { if (!navigator.onLine) return 0; const r = net.ping ?? netInfo().rtt; if (r == null) return 3; return r < 80 ? 4 : r < 160 ? 3 : r < 350 ? 2 : 1; };
  async function testPing() {
    if (net.testing || !navigator.onLine) return; net.testing = true; if (trayOpen === "net") renderPop();
    const times = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      try { await fetch(`${location.origin}/vercel.json?ping=${Date.now()}${i}`, { method: "HEAD", cache: "no-store" }); times.push(performance.now() - t0); } catch {}
    }
    net.ping = times.length ? Math.round(Math.min(...times)) : null; net.testing = false;
    paintTray(); if (trayOpen === "net") renderPop();
  }
  conn?.addEventListener?.("change", () => { paintTray(); if (trayOpen === "net") renderPop(); });
  let vol = parseInt(store.lget("xp-vol"), 10), muted = store.lget("xp-mute") === "1"; if (!(vol >= 0 && vol <= 100)) vol = 70;
  // Media Player changes the same stored volume, so read it again whenever it matters
  function readVol() { const v = parseInt(store.lget("xp-vol"), 10), m = store.lget("xp-mute"); if (v >= 0 && v <= 100) vol = v; if (m != null) muted = m === "1"; }
  addEventListener("xp-volume", () => paintTray());
  const bars = (n) => `<span class="sig">${[1, 2, 3, 4].map((k) => `<i class="${k <= n ? "on" : ""}" style="height:${k * 3}px"></i>`).join("")}</span>`;
  const POPS = {
    vol: () => `<h4>Volume</h4><div class="vol"><input type="range" min="0" max="100" value="${vol}" class="vslider" aria-label="Volume"><b class="vval">${vol}</b></div><label><input type="checkbox" class="mute" ${muted ? "checked" : ""}> Mute</label>`,
    net: () => {
      const n = netInfo(), row = (k, v) => `<div class="nrow"><span>${k}</span><b>${v}</b></div>`;
      return `<h4>Network Connection</h4>
        <div class="net cur">${bars(strength())}<span><b>${esc(n.online ? n.kind : "Offline")}</b><small class="${n.online ? "" : "bad"}">${n.online ? "Connected" : "Not connected"}</small></span></div>
        <div class="nstats">${row("Status", n.online ? "Online" : "Offline")}
          ${row("Quality", n.eff ? n.eff.toUpperCase().replace("SLOW-", "Slow ") + "-class" : "Not reported by this browser")}
          ${row("Speed (est.)", n.down != null ? `${n.down >= 10 ? Math.round(n.down) : n.down} Mbps` : "Not reported")}
          ${row("Latency (est.)", n.rtt != null ? `${n.rtt} ms` : "Not reported")}
          ${row("Ping to this site", net.testing ? "Testing…" : net.ping != null ? `${net.ping} ms` : "—")}
          ${n.save ? row("Data saver", "On") : ""}</div>
        <button class="xpbtn nping" ${net.testing || !n.online ? "disabled" : ""}>Test connection</button>
        <p class="muted">Your browser doesn't share the Wi-Fi network's name with websites, so it isn't shown.</p>`;
    },
    bat: () => `<h4>Power Meter</h4><div class="bat-big"><div class="bat-shell"><i style="width:${bat.level}%" class="${bat.level < 20 ? "low" : ""}"></i></div><b>${bat.level}%</b></div>
      <p>${bat.charging ? "⚡ Plugged in, charging" : "On battery"}${bat.real ? "" : " <small class='muted'>(simulated)</small>"}</p>
      <label><input type="radio" name="pp" ${powerPlan === "bal" ? "checked" : ""} value="bal"> Balanced</label><label><input type="radio" name="pp" ${powerPlan === "save" ? "checked" : ""} value="save"> Power saver</label><label><input type="radio" name="pp" ${powerPlan === "perf" ? "checked" : ""} value="perf"> High performance</label>`,
    clock: () => {
      const now = new Date(), y = calMonth.getFullYear(), m = calMonth.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
      const cells = Array(first).fill("").concat(Array.from({ length: days }, (_, i) => i + 1));
      return `<h4>Date and Time</h4><div class="bigtime">${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</div><div class="muted">${now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
        <div class="cal-head"><button class="cprev" aria-label="Previous month">◀</button><b>${calMonth.toLocaleDateString([], { month: "long", year: "numeric" })}</b><button class="cnext" aria-label="Next month">▶</button></div>
        <div class="cal">${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<b>${d}</b>`).join("")}${cells.map((d) => { if (!d) return "<span></span>"; const k = dkey(new Date(y, m, d)); return `<button data-day="${k}" class="${y === now.getFullYear() && m === now.getMonth() && d === now.getDate() ? "today" : ""} ${Tasks.list.some((t) => t.date === k && !t.done) ? "busy" : ""}">${d}</button>`; }).join("")}</div>
        <div class="cal-today-list">${Tasks.on(dkey(now)).filter((t) => !t.done).slice(0, 3).map((t) => `<div>${t.time ? `<small>${fmtTime(t.time)}</small> ` : ""}${esc(t.text)}</div>`).join("") || `<small class="muted">No tasks today.</small>`}</div>
        <button class="xpbtn copen">📅 Open Calendar</button>
        <div class="muted" style="margin-top:6px">Time zone: ${esc(Intl.DateTimeFormat().resolvedOptions().timeZone || "Local")}</div>`;
    },
  };
  let calMonth = new Date(); calMonth.setDate(1);
  let powerPlan = store.lget("xp-power") || "bal";
  const bat = { level: 87, charging: true, real: false };
  if (navigator.getBattery) navigator.getBattery().then((b) => {
    const upd = () => { bat.level = Math.round(b.level * 100); bat.charging = b.charging; bat.real = true; paintTray(); if (trayOpen === "bat") renderPop(); };
    upd(); b.addEventListener("levelchange", upd); b.addEventListener("chargingchange", upd);
  }).catch(() => {});
  function paintTray() {
    readVol();
    $("#tVol").textContent = muted || vol === 0 ? "🔇" : vol < 40 ? "🔈" : "🔊";
    $("#tNet").classList.toggle("off", !navigator.onLine);
    $("#tNet").querySelectorAll(".wifi-ico i").forEach((b, i) => b.classList.toggle("dim", i >= Math.max(1, strength() - 1)));
    $("#tNet").title = navigator.onLine ? `${netInfo().kind}: connected${net.ping != null ? ` (${net.ping} ms)` : ""}` : "Not connected";
    $("#tBat").innerHTML = `<span class="bat-mini"><i style="width:${bat.level}%" class="${bat.level < 20 ? "low" : ""}"></i></span>${bat.charging ? "<small>⚡</small>" : ""}`;
    $("#tBat").title = `${bat.level}% ${bat.charging ? "(charging)" : "remaining"}`;
  }
  function renderPop() {
    readVol();
    trayPop.innerHTML = POPS[trayOpen]();
    const btn = $("#t" + { vol: "Vol", net: "Net", bat: "Bat", clock: "Clock" }[trayOpen]).getBoundingClientRect();
    trayPop.style.right = Math.max(4, Math.min(innerWidth - btn.right - 30, innerWidth - trayPop.offsetWidth - 4)) + "px"; // under its button, but not past the left edge
  }
  function toggleTray(which) {
    if (trayOpen === which) return closeTray();
    if (which === "clock") { calMonth = new Date(); calMonth.setDate(1); }
    if (which === "net" && net.ping == null) setTimeout(testPing, 0);
    toggleStart(false); trayOpen = which; trayPop.classList.remove("hidden"); renderPop();
  }
  [["tVol", "vol"], ["tNet", "net"], ["tBat", "bat"], ["tClock", "clock"]].forEach(([id, w]) => $("#" + id).addEventListener("click", (e) => { e.stopPropagation(); toggleTray(w); }));
  trayPop.addEventListener("click", (e) => {
    e.stopPropagation();
    const day = e.target.closest("[data-day]");
    if (day) { closeTray(); openApp("calendar", { date: day.dataset.day }); return; }
    if (e.target.closest(".copen")) { closeTray(); openApp("calendar"); return; }
    if (e.target.closest(".cprev")) { calMonth.setMonth(calMonth.getMonth() - 1); renderPop(); }
    if (e.target.closest(".cnext")) { calMonth.setMonth(calMonth.getMonth() + 1); renderPop(); }
    if (e.target.closest(".nping")) testPing();
  });
  trayPop.addEventListener("input", (e) => {
    if (e.target.classList.contains("vslider")) { vol = +e.target.value; trayPop.querySelector(".vval").textContent = vol; store.lset("xp-vol", vol); paintTray(); }
  });
  trayPop.addEventListener("change", (e) => {
    if (e.target.classList.contains("mute")) { muted = e.target.checked; store.lset("xp-mute", muted ? "1" : "0"); }
    if (e.target.name === "pp") { powerPlan = e.target.value; store.lset("xp-power", powerPlan); }
    paintTray();
  });
  document.addEventListener("click", (e) => { if (trayOpen && !trayPop.contains(e.target)) closeTray(); });
  addEventListener("online", paintTray); addEventListener("offline", paintTray);
  paintTray();

  // Clock: update exactly on the minute instead of polling
  let clockT;
  const tick = () => {
    clearTimeout(clockT);
    const now = new Date();
    $("#clock").textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    $("#tClock").title = now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (trayOpen === "clock") { const bt = trayPop.querySelector(".bigtime"); if (bt) bt.textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }); }
    clockT = setTimeout(tick, trayOpen === "clock" ? 1000 - now.getMilliseconds() : 60000 - now.getSeconds() * 1000 - now.getMilliseconds());
  };
  tick();
  $("#tClock").addEventListener("click", () => setTimeout(tick, 0));

  // ---------------- Calendar, tasks and reminders ----------------
  // Tasks live in this browser: [{ id, date: "YYYY-MM-DD", time: "HH:MM" | "", text, done, remind, notified, snooze }]
  const dkey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  // Tasks are shared by everyone (server). Reminder state (notified/snooze) is per device.
  const SHARED = ["date", "time", "text", "done", "remind"];
  const Tasks = {
    list: readLocal("xp-tasks", []).filter((t) => t && t.id && t.date),
    save() { store.lset("xp-tasks", JSON.stringify(this.list)); paintBell(); wins.forEach((w, k) => k === "calendar" && w.refresh?.()); },
    on(date) { return this.list.filter((t) => t.date === date).sort((a, b) => (a.time || "99").localeCompare(b.time || "99")); },
    due(t) { return t.snooze || (t.time ? new Date(`${t.date}T${t.time}`).getTime() : null); },
    // _busy and _m tell a running sync that the snapshot it fetched may already be out of date
    _c: new Map(), _busy: 0, _m: 0,
    async _write(p) { this._busy++; try { return await p; } finally { this._busy--; this._m++; } },
    // one POST per task, however many callers ask; an edit or delete made meanwhile is replayed once the id is known
    create(t) {
      if (!this._c.has(t)) {
        const sent = JSON.stringify(pick(t));
        this._c.set(t, this._write(Cloud.taskCreate(pick(t))).then(async (r) => {
          Object.assign(t, { id: r.id, createdAt: r.createdAt, updatedAt: r.updatedAt, pending: false });
          if (t.removed) await this._write(Cloud.taskDelete(r.id)).catch(() => {});
          else if (JSON.stringify(pick(t)) !== sent) await this.push(t);
        }).finally(() => this._c.delete(t)));
      }
      return this._c.get(t);
    },
    // sends a task's shared fields; a network failure leaves it marked dirty for the next sync
    async push(t) {
      t.dirty = true;
      try { await this._write(Cloud.taskUpdate(t.id, pick(t))); delete t.dirty; }
      catch (e) {
        if (e.status === 404) { delete t.dirty; this.list = this.list.filter((x) => x !== t); }
        else if (e.status && e.status < 500) { delete t.dirty; msgBox("Calendar", esc(e.message), "⚠️"); this._sig = null; this.sync(); }
      }
      this.save();
    },
    // deletes on the server; a network failure keeps the id so the next sync can finish the job
    async forget(t) {
      if (t.pending) { t.removed = true; return; }
      try { await this._write(Cloud.taskDelete(t.id)); }
      catch (e) { if (!e.status || e.status >= 500) store.lset("xp-task-gone", JSON.stringify([...readLocal("xp-task-gone", []), t.id])); }
    },
    sync() { return this._run ||= this._sync().finally(() => (this._run = null)); },
    async _sync() {
      try {
        // send anything changed while offline, then take the server's list
        for (const t of this.list.filter((x) => x.pending)) {
          try { await this.create(t); }
          catch (e) { if (e.status >= 400 && e.status < 500) { this.list = this.list.filter((x) => x !== t); this.save(); } else throw e; }
        }
        for (const t of this.list.filter((x) => x.dirty)) await this.push(t);
        if (this.list.some((t) => t.dirty)) return;
        const gone = readLocal("xp-task-gone", []);
        for (const id of gone) await this._write(Cloud.taskDelete(id));
        if (gone.length) store.lset("xp-task-gone", JSON.stringify(readLocal("xp-task-gone", []).filter((id) => !gone.includes(id))));
        const m = this._m;
        const tasks = (await Cloud.tasks()).sort((a, b) => a.date.localeCompare(b.date));
        if (this._m !== m || this._busy) return;
        const mine = new Map(this.list.map((t) => [t.id, t]));
        const sig = JSON.stringify(tasks.map((t) => [t.id, t.updatedAt]));
        if (sig === this._sig && !this.list.some((t) => t.pending)) return;
        this._sig = sig;
        this.list = tasks.map((t) => ({ ...t, notified: mine.get(t.id)?.notified ?? (Tasks.due(t) != null && Tasks.due(t) < Date.now()), snooze: mine.get(t.id)?.snooze || null }));
        this.save();
      } catch {}
    },
    async add(t) {
      const task = { id: "tmp-" + Date.now().toString(36), done: false, notified: false, ...t, pending: true };
      this.list.push(task); this.save();
      try { await this.create(task); this.save(); }
      catch (e) { if (e.status === 400 || e.status === 403 || e.status === 429) { this.list = this.list.filter((x) => x !== task); this.save(); msgBox("Calendar", esc(e.message), "⚠️"); } }
    },
    async update(id, patch) {
      const t = this.list.find((x) => x.id === id); if (!t) return;
      Object.assign(t, patch); this.save();
      const shared = Object.fromEntries(Object.entries(patch).filter(([k]) => SHARED.includes(k)));
      if (!Object.keys(shared).length || t.pending) return;
      await this.push(t);
    },
    async remove(id) {
      const t = this.list.find((x) => x.id === id);
      this.list = this.list.filter((x) => x.id !== id); this.save();
      if (t) await this.forget(t);
    },
    async clearDone() {
      const done = this.list.filter((t) => t.done);
      this.list = this.list.filter((t) => !t.done); this.save();
      for (const t of done) await this.forget(t);
    },
  };
  const pick = (t) => Object.fromEntries(SHARED.map((k) => [k, t[k]]).filter(([, v]) => v !== undefined));
  const fmtTime = (hm) => { if (!hm) return ""; const [h, m] = hm.split(":").map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); };

  function renderCalendar(body, ctx) {
    let view = new Date(); view.setDate(1);
    let sel = ctx.date || dkey(new Date()), editing = null;
    if (ctx.date) { const d = new Date(ctx.date + "T00:00"); view = new Date(d.getFullYear(), d.getMonth(), 1); }
    body.classList.add("calapp");
    const inner = chrome(body, { menus: [
      { label: "File", items: [{ label: "New Task", key: "Alt+N", act: () => input.focus() }, { label: "Export tasks (.json)", act: () => download(new Blob([JSON.stringify(Tasks.list, null, 2)], { type: "application/json" }), "tasks.json") }, "-", { label: "Exit", act: ctx.close }] },
      { label: "View", items: [{ label: "Today", act: () => { const n = new Date(); view = new Date(n.getFullYear(), n.getMonth(), 1); sel = dkey(n); paint(); } }, { label: "Previous Month", act: () => move(-1) }, { label: "Next Month", act: () => move(1) }] },
      { label: "Tools", items: () => [{ label: "Clear completed tasks", act: () => Tasks.clearDone() },
        { label: notifyLabel(), disabled: !("Notification" in window) || Notification.permission !== "default", act: askNotify }] },
      { label: "Help", items: [{ label: "About Calendar", act: () => msgBox("Calendar", "This calendar is shared: everyone who visits sees and can edit the same tasks.<br>Click a day, type a task and press Enter. Give it a time and tick 🔔 to get a reminder in your browser.") }] },
    ] });
    inner.innerHTML = `<div class="cal-app">
      <div class="cal-left"><div class="cal-head"><button class="cprev" aria-label="Previous month">◀</button><b class="cmonth"></b><button class="cnext" aria-label="Next month">▶</button></div>
        <div class="cal big"></div><button class="xpbtn ctoday">Today</button>
        <div class="cal-up"><h5>Upcoming reminders</h5><div class="uplist"></div></div><div class="cal-sync"></div></div>
      <div class="cal-right"><h3 class="cday"></h3>
        <form class="cal-add"><input class="ctext" placeholder="Add a task… (press Enter)" maxlength="140" required>
          <input type="time" class="ctime" aria-label="Time"><label title="Remind me"><input type="checkbox" class="crem" checked> 🔔</label><button class="xpbtn">Add</button></form>
        <ul class="task-list"></ul><p class="muted cempty">No tasks for this day.</p></div></div>`;
    const $c = (s) => inner.querySelector(s), input = $c(".ctext"), timeIn = $c(".ctime"), remIn = $c(".crem");
    const move = (n) => { view.setMonth(view.getMonth() + n); paint(); };
    function paint() {
      const now = new Date(), y = view.getFullYear(), m = view.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
      $c(".cmonth").textContent = view.toLocaleDateString([], { month: "long", year: "numeric" });
      const busy = new Set(Tasks.list.filter((t) => !t.done).map((t) => t.date));
      $c(".cal.big").innerHTML = ["S", "M", "T", "W", "T", "F", "S"].map((d) => `<b>${d}</b>`).join("") + Array(first).fill("<span></span>").join("") +
        Array.from({ length: days }, (_, i) => { const k = dkey(new Date(y, m, i + 1)); return `<button data-d="${k}" class="${k === dkey(now) ? "today" : ""} ${k === sel ? "sel" : ""} ${busy.has(k) ? "busy" : ""}">${i + 1}</button>`; }).join("");
      const sd = new Date(sel + "T00:00");
      $c(".cday").textContent = sd.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      const items = Tasks.on(sel);
      $c(".task-list").innerHTML = items.map((t) => editing === t.id
        ? `<li data-id="${esc(t.id)}" class="editing"><input class="etext" value="${esc(t.text)}" maxlength="140"><input type="time" class="etime" value="${t.time || ""}"><button class="xpbtn esave">Save</button></li>`
        : `<li data-id="${esc(t.id)}" class="${t.done ? "done" : ""}"><input type="checkbox" class="tdone" ${t.done ? "checked" : ""} aria-label="Done"><span class="ttext">${esc(t.text)}</span>
           ${t.time ? `<small class="ttime">${fmtTime(t.time)}</small>` : ""}<button class="tbell ${t.remind && t.time ? "on" : ""}" title="${t.time ? "Toggle reminder" : "Set a time to enable reminders"}" ${t.time ? "" : "disabled"}>🔔</button>
           <button class="tedit" title="Edit" aria-label="Edit">✏️</button><button class="tdel" title="Delete" aria-label="Delete">✕</button></li>`).join("");
      $c(".cempty").hidden = items.length > 0;
      const up = Tasks.list.filter((t) => t.remind && !t.done && !t.notified && Tasks.due(t) > Date.now()).sort((a, b) => Tasks.due(a) - Tasks.due(b)).slice(0, 4);
      $c(".uplist").innerHTML = up.length ? up.map((t) => `<div data-go="${t.date}"><b>${esc(t.text)}</b><small>${new Date(Tasks.due(t)).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></div>`).join("") : `<small class="muted">Nothing scheduled.</small>`;
    }
    $c(".cprev").onclick = () => move(-1); $c(".cnext").onclick = () => move(1);
    $c(".ctoday").onclick = () => { const n = new Date(); view = new Date(n.getFullYear(), n.getMonth(), 1); sel = dkey(n); paint(); };
    $c(".cal.big").addEventListener("click", (e) => { const b = e.target.closest("[data-d]"); if (b) { sel = b.dataset.d; editing = null; paint(); input.focus(); } });
    $c(".uplist").addEventListener("click", (e) => { const g = e.target.closest("[data-go]"); if (g) { sel = g.dataset.go; const d = new Date(sel + "T00:00"); view = new Date(d.getFullYear(), d.getMonth(), 1); paint(); } });
    $c(".cal-add").addEventListener("submit", (e) => {
      e.preventDefault(); const text = input.value.trim(); if (!text) return;
      const remind = remIn.checked && !!timeIn.value;
      Tasks.add({ date: sel, time: timeIn.value, text, remind });
      if (remind) askNotify(true);
      input.value = ""; timeIn.value = ""; input.focus();
    });
    $c(".task-list").addEventListener("click", (e) => {
      const li = e.target.closest("li"); if (!li) return; const id = li.dataset.id, t = Tasks.list.find((x) => x.id === id); if (!t) return;
      if (e.target.closest(".tdel")) Tasks.remove(id);
      else if (e.target.closest(".tbell")) { const on = !t.remind; Tasks.update(id, { remind: on, notified: false, snooze: null }); if (on) askNotify(true); }
      else if (e.target.closest(".tedit")) { editing = id; paint(); $c(".task-list .editing .etext")?.focus(); }
      else if (e.target.closest(".esave")) saveEdit(li);
    });
    $c(".task-list").addEventListener("change", (e) => { if (e.target.classList.contains("tdone")) Tasks.update(e.target.closest("li").dataset.id, { done: e.target.checked }); });
    $c(".task-list").addEventListener("keydown", (e) => { if (e.target.closest(".editing")) { if (e.key === "Enter") saveEdit(e.target.closest("li")); if (e.key === "Escape") { editing = null; paint(); } } });
    function saveEdit(li) {
      const text = li.querySelector(".etext").value.trim(), time = li.querySelector(".etime").value; editing = null;
      if (text) Tasks.update(li.dataset.id, { text, time, notified: false, snooze: null, remind: Tasks.list.find((x) => x.id === li.dataset.id).remind && !!time }); else paint();
    }
    const keys = (e) => { if (ctx.isActive() && e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "n") { e.preventDefault(); input.focus(); } };
    addEventListener("keydown", keys); ctx.onClose(() => removeEventListener("keydown", keys));
    wins.get(ctx.key).refresh = () => { if (!editing) paint(); };
    const syncLabel = () => { const el = $c(".cal-sync"); if (el) { el.textContent = (Cloud.ok ? "☁ " : "💾 ") + Cloud.label(); el.classList.toggle("off", Cloud.ok === false); } };
    document.addEventListener("cloud", syncLabel); ctx.onClose(() => document.removeEventListener("cloud", syncLabel)); syncLabel();
    Tasks.sync();
    const poll = setInterval(() => ctx.isVisible() && !editing && document.activeElement?.closest?.(".cal-add") == null && Tasks.sync(), 20000);
    ctx.onClose(() => clearInterval(poll));
    wins.get(ctx.key).goto = (d) => { sel = d; const x = new Date(d + "T00:00"); view = new Date(x.getFullYear(), x.getMonth(), 1); editing = null; paint(); };
    paint(); setTimeout(() => input.focus(), 0);
  }
  const notifyLabel = () => !("Notification" in window) ? "Desktop notifications unavailable" : Notification.permission === "granted" ? "Desktop notifications: on" : Notification.permission === "denied" ? "Desktop notifications: blocked" : "Enable desktop notifications";
  function askNotify(quiet) { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {}); else if (!quiet) msgBox("Notifications", notifyLabel()); }

  // Reminder engine: checks every 15s; reminders missed while the site was closed are shown on the next visit
  const chime = () => XPS.play("notify", true);
  const balloons = document.createElement("div"); balloons.className = "balloons"; desktopEl.appendChild(balloons);
  // A tray balloon that closes itself: tips, level-ups and trophies
  function notify(title, text, { sound = "balloon", ms = 8000, onClick } = {}) {
    const b = document.createElement("div"); b.className = "balloon tip";
    b.innerHTML = `<button class="bx" aria-label="Dismiss">✕</button><b>${MB_ICON["ℹ️"]}${esc(title)}</b><p>${esc(text)}</p>`;
    balloons.appendChild(b); XPS.play(sound);
    b.addEventListener("click", (e) => { if (!e.target.closest(".bx")) onClick?.(); b.remove(); });
    setTimeout(() => b.isConnected && b.classList.add("fade"), ms - 600);
    setTimeout(() => b.remove(), ms);
  }
  function balloon(t, missed, when = Tasks.due(t)) {
    const b = document.createElement("div"); b.className = "balloon"; b.dataset.id = t.id;
    b.innerHTML = `<button class="bx" aria-label="Dismiss">✕</button><b>🔔 ${missed ? "Missed reminder" : "Reminder"}</b><p>${esc(t.text)}</p><small>${new Date(when).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</small>
      <div><button class="xpbtn bsnooze">Snooze 5 min</button><button class="xpbtn bdone">Done</button><button class="xpbtn bopen">Open</button></div>`;
    balloons.appendChild(b);
    b.addEventListener("click", (e) => {
      if (e.target.closest(".bsnooze")) Tasks.update(t.id, { snooze: Date.now() + 5 * 60000, notified: false });
      else if (e.target.closest(".bdone")) Tasks.update(t.id, { done: true });
      else if (e.target.closest(".bopen")) openApp("calendar", { date: t.date });
      else if (!e.target.closest(".bx")) return;
      b.remove();
    });
    setTimeout(() => b.isConnected && b.classList.add("fade"), 60000);
  }
  // the first tab to reach a reminder claims it in this browser's storage, so the others stay quiet
  function claimReminder(k, now) {
    const seen = readLocal("xp-rem-fired", {});
    if (seen[k]) return false;
    for (const o of Object.keys(seen)) if (now - seen[o] > 8 * 864e5) delete seen[o];
    seen[k] = now; store.lset("xp-rem-fired", JSON.stringify(seen));
    return true;
  }
  function checkReminders(first) {
    const now = Date.now();
    let changed = false;
    Tasks.list.forEach((t) => {
      const due = Tasks.due(t);
      if (!t.remind || t.done || t.notified || !due || due > now) return;
      // with several tabs open, a visible one gets the first chance (they all check every 15 s)
      if (document.hidden && now - due < 20000) return;
      const missed = now - due > 2 * 60000;
      const when = due; t.notified = true; t.snooze = null; changed = true;
      if (first && now - due > 7 * 864e5) return; // ignore anything older than a week
      if (!claimReminder(t.id + "|" + due, now)) return;
      balloon(t, missed, when); if (!missed) chime();
      if (document.hidden && "Notification" in window && Notification.permission === "granted") { try { new Notification("Reminder", { body: t.text, icon: P.photo, tag: t.id }); } catch {} }
    });
    if (changed) Tasks.save();
  }
  setInterval(() => { checkReminders(); paintBell(); }, 15000);
  document.addEventListener("visibilitychange", () => !document.hidden && checkReminders());
  function paintBell() {
    const today = dkey(new Date()), n = Tasks.list.filter((t) => t.date === today && !t.done).length, el = $("#tBell");
    if (!el) return; el.hidden = !n; el.querySelector("b").textContent = n; el.title = `${n} task${n === 1 ? "" : "s"} today`;
  }

  paintBell();
  renderBoard(boardEl);
  countVisit();
  // Vercel Web Analytics (cookie-free): only load it when it's switched on for the project, so there's no 404
  if (/\.vercel\.app$/.test(location.hostname)) fetch("/_vercel/insights/script.js", { method: "HEAD" }).then((r) => { if (r.ok) { const sc = document.createElement("script"); sc.defer = true; sc.src = "/_vercel/insights/script.js"; document.head.appendChild(sc); } }).catch(() => {});
  (window.requestIdleCallback || ((f) => setTimeout(f, 3000)))(() => { if (!navigator.connection?.saveData) { const l = document.createElement("link"); l.rel = "prefetch"; l.href = "games.js?v=41"; document.head.appendChild(l); } });
  (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(() => Tasks.sync().then(() => { checkReminders(true); paintBell(); }));
  setInterval(() => !document.hidden && !wins.has("calendar") && Tasks.sync(), 60000);
  $("#tBell").addEventListener("click", (e) => { e.stopPropagation(); openApp("calendar"); });

  // ---------------- Boot / login / shutdown flow ----------------
  ["#loginAvatar", "#smAvatar"].forEach((s) => ($(s).outerHTML = avatar().replace('class="avatar ', `id="${s.slice(1)}" class="avatar `)));
  document.querySelectorAll(".boot-owner").forEach((el) => (el.textContent = P.name));
  document.title = P.name + " - Portfolio XP";
  $("#loginName").textContent = $("#smName").textContent = P.name;
  $("#loginRole").textContent = P.role;
  const show = (id) => ["#post", "#boot", "#welcome", "#login", "#desktop", "#blackout"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
  // Every step below is a skippable wait: Space (or a tap on the screen) cuts it short. A newer step cancels an older one.
  let flow = 0;
  const pauseStep = async (ms, run) => { const skipped = await wait(ms); return run !== flow ? null : skipped; };
  ["#post", "#boot", "#welcome"].forEach((s) => $(s).addEventListener("pointerdown", () => skipWaits()));
  const welcomeScreen = (word, text) => { $("#welcomeWord").textContent = word; $("#welcomeMsg").textContent = text; show("#welcome"); };
  async function boot() {
    const run = ++flow, out = $("#postText"), year = new Date().getFullYear();
    const kb = Math.round((navigator.deviceMemory || 4) * 1048576), cores = navigator.hardwareConcurrency || 1;
    const lines = [`Portfolio BIOS v2.0, An XP-Ready Ally`, `Copyright (C) 2001-${year}, ${P.name}`, "", `Main Processor : ${cores} logical core${cores > 1 ? "s" : ""}`];
    show("#post"); out.textContent = lines.join("\n") + "\nMemory Testing :      0K";
    for (let i = 1; i <= 10; i++) { const s = await pauseStep(55, run); if (s === null) return; if (s) return toLogin(run); out.textContent = lines.join("\n") + `\nMemory Testing : ${String(Math.round(kb * i / 10)).padStart(7)}K${i === 10 ? " OK" : ""}`; }
    XPS.play("post");
    lines.push(`Memory Testing : ${String(kb).padStart(7)}K OK`, "");
    for (const l of ["Detecting Primary Master ... PORTFOLIO-XP HDD", "Detecting Primary Slave  ... None", "Detecting Keyboard ....... OK", "Detecting Mouse .......... OK"]) { const s = await pauseStep(130, run); if (s === null) return; if (s) return toLogin(run); lines.push(l); out.textContent = lines.join("\n"); }
    const s0 = await pauseStep(1850, run); if (s0 === null) return; if (s0) return toLogin(run); // the BIOS screen stays up a moment after the last line
    show("#boot");
    const s1 = await pauseStep(2800, run); if (s1 === null) return;
    toLogin(run);
  }
  function toLogin(run) { if (run === flow) show("#login"); }
  async function logon() {
    const first = store.get("xp-logged") !== "1", run = ++flow;
    if (first) {
      welcomeScreen("welcome", "Loading your personal settings..."); XPS.play("logon");
      if (await pauseStep(1500, run) === null) return;
    }
    show("#desktop"); store.set("xp-logged", "1");
    if (first) {
      XPS.play("startup"); desktopEl.classList.add("arrive"); setTimeout(() => desktopEl.classList.remove("arrive"), 1500);
      if (store.lget("xp-toured") !== "1") { store.lset("xp-toured", "1"); setTimeout(() => notify("Take a tour of Portfolio XP", "Click here to see what this computer can do.", { ms: 12000, onClick: () => openApp("help") }), 2600); }
    }
    if (!store.get("xp-welcomed")) { store.set("xp-welcomed", "1"); setTimeout(() => openApp("about"), 300); }
  }
  $("#userTile").addEventListener("click", logon);
  const shut = $("#shutdown"), logoffBox = $("#logoffBox");
  $("#smShutdown").onclick = $("#loginOff").onclick = () => { toggleStart(false); XPS.play("exclaim"); shut.classList.remove("hidden"); };
  $("#smReset").onclick = () => { toggleStart(false); askReset(); };
  $("#smLogoff").onclick = () => { toggleStart(false); XPS.play("exclaim"); logoffBox.classList.remove("hidden"); };
  const endSession = () => { closeTray(); hideCtx(); [...wins.keys()].forEach((k) => close(k)); store.set("xp-logged", ""); };
  logoffBox.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-act]")?.dataset.act; if (!a) return;
    logoffBox.classList.add("hidden");
    if (a === "cancel") return;
    const run = ++flow;
    if (a === "switch") { show("#login"); return; }
    endSession(); welcomeScreen("logging off", "Saving your settings..."); XPS.play("logoff");
    if (await pauseStep(1500, run) === null) return;
    show("#login");
  });
  shut.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-act]")?.dataset.act; if (!a) return;
    shut.classList.add("hidden");
    if (a === "cancel") return;
    endSession();
    const run = ++flow, msg = $("#blackoutMsg"), on = $("#powerOn");
    on.classList.add("hidden");
    if (a === "standby") {
      XPS.play("minimize"); show("#blackout"); msg.classList.remove("safe"); msg.textContent = "Computer sleeping... click or press a key to wake.";
      const wake = () => { $("#blackout").onclick = null; removeEventListener("keydown", wake); XPS.play("restore"); show("#login"); }; $("#blackout").onclick = wake; addEventListener("keydown", wake);
      return;
    }
    welcomeScreen(a === "restart" ? "restarting" : "shutting down", "Saving your settings..."); XPS.play("shutdown");
    if (await pauseStep(1400, run) === null) return;
    $("#welcomeMsg").textContent = "Windows is shutting down...";
    if (await pauseStep(1000, run) === null) return;
    if (a === "restart") { msg.classList.remove("safe"); msg.textContent = ""; show("#blackout"); if (await pauseStep(500, run) === null) return; boot(); return; }
    show("#blackout"); msg.classList.add("safe"); msg.textContent = "It is now safe to turn off your computer."; on.classList.remove("hidden");
  });
  $("#powerOn").onclick = (e) => { e.stopPropagation(); boot(); };

  // screen saver after the wait chosen in Display Properties (never over Media Player or full screen)
  let idleAt = Date.now();
  ["pointermove", "pointerdown", "keydown", "wheel"].forEach((t) => addEventListener(t, () => (idleAt = Date.now()), { passive: true, capture: true }));
  setInterval(() => {
    const mins = +(store.lget("xp-saver-wait") ?? 5);
    if (!mins || document.hidden || document.fullscreenElement || $("#desktop").classList.contains("hidden") || $(".saver") || wins.has("wmp")) return;
    if (Date.now() - idleAt >= mins * 60000) screenSaver();
  }, 15000);

  if (store.get("xp-logged")) logon(); else boot();
})();
