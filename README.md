# Portfolio XP

Medhansh Khattar's portfolio as a Windows XP desktop in the browser. Live at https://medhansh-xp.vercel.app

## Features
- **Desktop:** boot and login screens, draggable windows, Start menu, taskbar and Show Desktop. Icons snap to a grid and remember their spot. Drag folder items to reorder them, onto the desktop to make a shortcut, or onto the Recycle Bin to delete one. Reset Desktop is a desktop icon and is also in the Start menu and the right-click menu.
- **Tray:** real network status and ping (browsers don't expose the Wi-Fi name), battery, volume and a clock with a mini calendar.
- **Apps:** About Me, Resume (WordPad), My Projects, Contact Me (stores messages), Internet Explorer (a working in-page browser), Command Prompt (`help`), MSN Messenger, Notepad (shared), Paint, Calendar (shared tasks and reminders), Display Properties (wallpapers and a screen saver), My Computer and Recycle Bin.
- **Message Board:** an open board docked on the right of the desktop (a window on small screens). Anyone can post to anyone, no sign-in. Posts can't be edited or deleted from the site; remove unwanted ones in the Firebase console (`board` collection) or with `firebase firestore:delete board/<id>`.
- **Site Statistics:** total views, unique visitors and a 14-day traffic chart, counted in Firestore (`stats` collection).
- **Games:** Solitaire, Minesweeper (3 levels plus custom), Snake and Brick Breaker. They load only when first opened.

The Notepad and Calendar tasks are stored in Firestore (project `resume-41921`), so everyone sees the same notes and tasks. The browser talks to Firestore directly; `firestore.rules` allows only the shared notepad and tasks and validates every field. If Firestore can't be reached, the apps keep working from the visitor's browser and sync later. Icon positions, wallpaper, reminder state and game scores stay per browser.

- **Contact Me** emails you the message only after the visitor verifies their email with a 4-digit code (`api/otp.js`, `api/contact.js`). It needs two Vercel environment variables, set once:
  `GMAIL_USER` (your Gmail address) and `GMAIL_APP_PASSWORD` (an App Password from https://myaccount.google.com/apppasswords; needs 2-Step Verification). Until they're set, the form offers "Email me directly" instead.
- Change the rules in `firestore.rules`, then run `firebase deploy --only firestore:rules`.
- The Firebase web config in `data.js` is public by design; no secret keys are used by the site.

## Personalise it
- Edit **`data.js`**. Every app reads from it.
- `photo.jpg` (400x400) is the avatar on the login screen, Start menu and About Me. `photo-full.jpg` (900x1200) is the social-preview image.
- `resume.pdf` is printed from `resume.html`, which also reads `data.js`. After changing `data.js`, regenerate it with the server running:

```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --no-pdf-header-footer --virtual-time-budget=5000 --print-to-pdf=resume.pdf http://localhost:5173/resume.html
```

## Cache busting
JS, CSS and images are cached for a year (see `vercel.json`). After changing one, bump the `?v=N` number everywhere it appears: `index.html` (style, data, app, games prefetch, photos and social images), the `games.js?v=N` and `extras.js?v=N` URLs and `sys.photos` in `app.js`, `photo` in `data.js`, and the `data.js` tag in `resume.html`.

## Run locally
```bash
python -m http.server 5173
```
Then open http://localhost:5173.

## Deploy
Static HTML/CSS/JS with no build step. Run `vercel --prod` from this folder. `vercel.json` sets the caching headers and `nosniff`, Referrer-Policy and Permissions-Policy.
