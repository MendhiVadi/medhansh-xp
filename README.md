# Portfolio XP

Medhansh Khattar's portfolio as a Windows XP desktop in the browser. Live at https://medhansh-xp.vercel.app

## Features
- **Desktop:** boot and login screens, draggable windows, Start menu, taskbar and Show Desktop. Icons snap to a grid and remember their spot. Drag folder items to reorder them, onto the desktop to make a shortcut, or onto the Recycle Bin to delete one. Reset Desktop is in the Start menu and the right-click menu.
- **Tray:** Wi-Fi, battery, volume and a clock with a mini calendar.
- **Apps:** About Me, Resume (WordPad), My Projects, Contact Me, My Links, Command Prompt (`help`), MSN Messenger, Notepad, Paint, Calendar (tasks and reminders), Display Properties (wallpapers and a screen saver), My Computer and Recycle Bin.
- **Games:** Solitaire, Minesweeper (3 levels), Snake, Brick Breaker and Tic-Tac-Toe. They load only when first opened.

Visitor data (icon positions, notes, tasks, high scores) is stored in each visitor's browser. There is no backend.

## Personalise it
- Edit **`data.js`**. Every app reads from it.
- `photo.jpg` (400x400) is the avatar on the login screen, Start menu and About Me. `photo-full.jpg` (900x1200) is the social-preview image.
- `resume.pdf` is printed from `resume.html`, which also reads `data.js`. After changing `data.js`, regenerate it with the server running:

```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --no-pdf-header-footer --virtual-time-budget=5000 --print-to-pdf=resume.pdf http://localhost:5173/resume.html
```

## Cache busting
JS, CSS and images are cached for a year (see `vercel.json`). After changing one, bump the `?v=N` number everywhere it appears: `index.html` (style, data, app, games prefetch, photos and social images), the `games.js?v=N` URL in `app.js`, `photo` in `data.js`, and the `data.js` tag in `resume.html`.

## Run locally
```bash
python -m http.server 5173
```
Then open http://localhost:5173.

## Deploy
Static HTML/CSS/JS with no build step. Run `vercel --prod` from this folder. `vercel.json` sets the caching headers and `nosniff`, Referrer-Policy and Permissions-Policy.
