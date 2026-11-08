# Portfolio XP

Medhansh Khattar's portfolio as a Windows XP desktop in the browser. Live at https://medhansh-xp.vercel.app

## Features
- **Desktop:** boot and login screens, draggable windows, Start menu, taskbar and Show Desktop. Icons snap to a grid and remember their spot. Drag folder items to reorder them, onto the desktop to make a shortcut, or onto the Recycle Bin to delete one. Reset Desktop is a desktop icon and is also in the Start menu and the right-click menu.
- **Tray:** real network status and ping (browsers don't expose the Wi-Fi name), battery, volume and a clock with a mini calendar.
- **Apps:** About Me, Resume (WordPad), My Projects, Contact Me (verified, emailed to you, nothing stored), Internet Explorer (a working in-page browser with Back, Forward, Stop and Refresh; sites that refuse framing, and plain http pages, go through a sandboxed proxy, `api/proxy.js`, which never relays logins, cookies or form posts; pages that can't work here, such as logins, bot checks and camera apps, offer a new tab instead), Command Prompt (`help`), MSN Messenger, Notepad (shared), Paint, Calculator, Windows Media Player (built-in synthesized tracks, plus your own songs from File > Open, + Add music or drag and drop: they stay in your browser, kept with IndexedDB, never uploaded), My Pictures (shared; anyone can add or delete), Calendar (shared tasks and reminders), Display Properties (wallpapers and a screen saver preview), Visual Rebuild (a purely visual, ~50 second full-screen show in which a swarm of cursor agents rebuilds the site in four captioned phases, with a HUD for the phase, swarm size and clock: 01 the back end, typed in from the real source into blueprint panels (firestore.rules, api/otp.js, the Firestore collections, a vercel deploy, the mailer) and wired up; 02 the front end modules built on top of the dimmed back end while needles stitch threads between the layers; 03 ten real app windows, two or three on screen at a time, each outlined as a wireframe, painted top to bottom and filled in piece by piece with a job for every agent (text typed in, text boxes outlined, images resized from the corner, title-bar buttons drawn, Paint tools and colours picked and a little scene drawn, three commands run in Command Prompt, a chat and a Nudge in MSN, the Calendar drawn while photos are thrown onto it and a task added and ticked, the Minesweeper grid drawn and mined, cards dealt, and About Me scrolled page by page as it is built), each minimised once its swarm is done with it; 04 the windows fly away, the wallpaper opens, icons, taskbar and tray are placed and the swarm flies home into the Start button; Space or Esc skips; `rebuild.js`, loaded on first use. The first version, Mark 1, is kept as `rebuild-mk1.js` and plays from Run: `rebuild mk1`), Control Panel, Task Manager, Run, Search, Help, Privacy, My Computer and Recycle Bin.
- **Message Board:** an open board docked on the right of the desktop (a window on small screens). Anyone can post to anyone, no sign-in. Posts can't be edited or deleted from the site; remove unwanted ones in the Firebase console (`board` collection) or with `firebase firestore:delete board/<id>`.
- **Site Statistics:** total views, unique visitors and a 14-day traffic chart, counted in Firestore (`stats` collection).
- **Games:** Solitaire, Spider Solitaire, Minesweeper (3 levels plus custom), Snake, Brick Breaker and 3D Pinball, with public world leaderboards (`scores` collection). They load only when first opened (`games.js`).
  - **Levels:** Snake is a campaign through 10 mazes (Level Select unlocks the ones you've reached; Endless and wrap-around are options). Brick Breaker has 12 designed levels with steel, unbreakable, bomb and power-up bricks, then repeats them harder. Pinball ranks you from Cadet to Fleet Admiral by finishing the mission on its panel (bumpers, the spinner, drop targets, the black hole, slingshots, the top lanes).
  - **Pinball controls:** hold Space or ↓ to pull the plunger; flippers on Z / Left Shift / ← and / / M / Right Shift / →; nudge with X, . or ↑ (too many nudges at once is a TILT); P pauses, F2 starts again. On touch screens, tap either half of the table and use the Launch button.
  - **Career and trophies:** every finished game earns XP points toward a career level (level n+1 starts at 50·n·(n+1) points, from Guest up to Root), and 11 trophies unlock along the way. The Games folder shows your level, trophies and per-game records. Solitaire and Spider count a game abandoned after a move as a loss.
- **Sounds:** an XP-style sound scheme synthesized in the browser (`sound.js`, no audio files): start-up, log on and off, window, menu and game sounds. Control Panel > Sounds plays each one; the tray's volume control sets their level and has a Mute box, and each game has its own Sound switch.
- **Space to skip:** every start-up screen, splash, deal, level banner and end-of-game pause can be cut short with Space or a tap (not while typing in a field).
- **Shortcuts:** Alt+W closes a window, Alt+T opens Task Manager, Alt+R opens Run, Ctrl+Esc opens Start, F11 goes full screen. Browsers and Windows keep Ctrl+W, Alt+F4, Ctrl+Shift+Esc and Win+R for themselves in a normal tab, so those only work as fallbacks.

Shared data lives in Firestore (project `resume-41921`), and the browser talks to it directly. `firestore.rules` is the only gatekeeper and validates every field: `shared/notepad` and `tasks` (anyone can edit), `pictures` (add and delete), `scores` and `board` (add only), `stats` (visit counters, +1 at most), `otp` (code attempt counters, written by `api/contact.js`) and `limits` (rate-limit counters for the contact form and the browser proxy, under keyed hashes so no address is stored; old ones can be deleted at any time). If Firestore can't be reached, the Notepad and Calendar keep working from the visitor's browser and sync later. Icon positions, wallpaper, reminder state and personal best scores stay per browser.

- **Contact Me** emails you the message only after the visitor verifies their email with a 4-digit code (`api/otp.js`, `api/contact.js`). It needs two Vercel environment variables, set once:
  `GMAIL_USER` (your Gmail address) and `GMAIL_APP_PASSWORD` (an App Password from https://myaccount.google.com/apppasswords; needs 2-Step Verification). Until they're set, the form offers "Email me directly" instead. Optional: `CONTACT_TO`, if messages should go to a different address.
- Change the rules in `firestore.rules`, then run `firebase deploy --only firestore:rules`.
- The Firebase web config in `data.js` is public by design; no secret keys are used by the site.

## Personalise it
- Edit **`data.js`**. Every app reads from it. The serverless functions don't: if you use your own Firebase project, also change the project id and key in `api/_mail.js`.
- `photo.jpg` (400x400) is the avatar on the login screen, Start menu and About Me. `photo-full.jpg` (900x1200) is the social-preview image.
- `resume.pdf` is printed from `resume.html`, which also reads `data.js`. After changing `data.js`, regenerate it with the server running:

```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --no-pdf-header-footer --virtual-time-budget=5000 --print-to-pdf=resume.pdf http://localhost:5173/resume.html
```

## Cache busting
JS, CSS and images are cached for a year (see `vercel.json`). After changing one, bump the `?v=N` number everywhere it appears: `index.html` (style, data, sound, app, photos and social images), the `games.js?v=N` (loader and prefetch), `extras.js?v=N` and `rebuild.js?v=N`, `rebuild-mk1.js?v=N` URLs and `sys.photos` in `app.js`, `photo` in `data.js`, and the `data.js` tag in `resume.html`.

## Run locally
```bash
python -m http.server 5173
```
Then open http://localhost:5173.

## Tests
`tests/` drives a local copy of the site in headless Chrome over the DevTools protocol, with Firestore faked inside the page, so nothing reaches production. They need Node 22+ (for the global `WebSocket`).

```bash
npm install
node tests/api-test.mjs .
node tests/shell-e2e.mjs . shots
node tests/games-e2e.mjs . shots
```

- `api-test.mjs`: the contact-form codes and the browser proxy's address checks (the live proxy checks skip themselves when offline).
- `shell-e2e.mjs`: the desktop, apps, Notepad sync and the in-site browser (its proxy checks need internet access).
- `games-e2e.mjs`: start-up and sounds, then all six games: bots that play Snake, Brick Breaker and Pinball through their levels, real mouse drags in the card games, interrupted delays, every menu item, random keys and clicks, reduced motion and phone layout.
- The second argument is a folder for screenshots. `ONLY=<text>` runs just the tests whose name contains it, `SEED=<n>` changes the random input, and `CHROME=<path>` picks the browser (otherwise the usual Windows, macOS and Linux locations are tried).

## Deploy
Static HTML/CSS/JS with no build step. Run `vercel --prod` from this folder. `vercel.json` sets the caching headers and `nosniff`, Referrer-Policy and Permissions-Policy. Rule changes deploy separately with `firebase deploy --only firestore:rules`.
