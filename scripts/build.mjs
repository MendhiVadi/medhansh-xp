// Builds the deployable site into dist/: minified JS and CSS, a copyright banner, and a host lock in every script.
// The source files stay readable and unlocked, so local development and tests/ run on them as before.
// GUARD_LOCAL=1 also lets localhost through the lock, for testing a build on this machine.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { transform } from "esbuild";

const OUT = "dist";
const ORIGINAL = "https://medhansh-xp.vercel.app/";
const HOST = new URL(ORIGINAL).hostname;
// this account's Vercel preview and project URLs all end in this
const PREVIEW_SUFFIX = "-medhanshkhattar05-8450s-projects.vercel.app";
const LOCAL = process.env.GUARD_LOCAL ? ["localhost", "127.0.0.1"] : [];
const SCRIPTS = ["data.js", "sound.js", "app.js", "games.js", "extras.js", "rebuild.js", "rebuild-mk1.js"];
const COPY = ["resume.pdf", "photo.jpg", "photo-full.jpg", "robots.txt"];
const BANNER = "/*! Copyright (c) 2026 Medhansh Khattar. All rights reserved. Not licensed for copying, reuse or redistribution. */\n";

// hashes rather than names, so searching a copy for the domain doesn't find the check
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const min = async (code, loader) => (await transform(code, { loader, minify: true, legalComments: "none", charset: "utf8" })).code;

// runs first in every script: anywhere but the real site, send the visitor to the original and stop
const guard = await min(`(function(){
  var f = ${fnv}, l = location.hostname;
  if ([${[HOST, ...LOCAL].map(fnv).join(",")}].indexOf(f(l)) < 0 && f(l.slice(-${PREVIEW_SUFFIX.length})) !== ${fnv(PREVIEW_SUFFIX)}) {
    location.replace(atob("${Buffer.from(ORIGINAL).toString("base64")}"));
    throw new Error("Unauthorized copy");
  }
})();`, "js");

// app.js only: no native right-click menu outside text fields (paste still works), no view-source, save-page or devtools keys.
// Ctrl+S is only stopped from reaching the browser, so Notepad's own save still runs.
const deter = await min(`(function(){
  document.addEventListener("contextmenu", function (e) { if (!(e.target.closest && e.target.closest("input,textarea,[contenteditable]"))) e.preventDefault(); });
  addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase(), c = e.ctrlKey || e.metaKey;
    if (k === "f12" || (c && (e.shiftKey || e.altKey) && "ijc".indexOf(k) >= 0 && k) || (c && !e.shiftKey && !e.altKey && (k === "u" || k === "s"))) e.preventDefault();
  });
  console.log("%c© Medhansh Khattar. All rights reserved.", "font:bold 14px Tahoma,sans-serif");
})();`, "js");

const read = (f) => fs.readFileSync(f, "utf8");
const version = createHash("sha256").update([...SCRIPTS, "style.css", "index.html", "resume.html", "scripts/build.mjs"].map(read).join("\0") + LOCAL).digest("hex").slice(0, 10);
// assets are cached as immutable, so every build gets a new ?v= on its scripts and styles
const stamp = (s) => s.replace(/(\.(?:js|css))\?v=\d+/g, `$1?v=${version}`);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const f of SCRIPTS) fs.writeFileSync(`${OUT}/${f}`, BANNER + guard + (f === "app.js" ? deter : "") + (await min(stamp(read(f)), "js")));
fs.writeFileSync(`${OUT}/style.css`, BANNER + (await min(read("style.css"), "css")));
fs.writeFileSync(`${OUT}/index.html`, stamp(read("index.html")).replace(/<!--[\s\S]*?-->\s*/g, ""));
fs.writeFileSync(`${OUT}/resume.html`, stamp(read("resume.html")));
for (const f of COPY) fs.copyFileSync(f, `${OUT}/${f}`);
console.log(`Built ${OUT}/ (v=${version}${LOCAL.length ? ", localhost allowed" : ""})`);
