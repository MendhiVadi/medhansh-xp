# Portfolio XP

A Windows XP-style portfolio: boot screen, login, and a desktop with draggable windows, Start menu, taskbar and system tray.

## Features
- **Desktop:** draggable desktop icons and folder items; drag items to the Recycle Bin or onto the desktop; wallpapers via Display Properties.
- **Tray popups:** Wi-Fi, battery, volume and calendar.
- **Apps:** About Me, Resume (WordPad), My Projects (Explorer), Contact Me, My Links (IE), Command Prompt (`help`), MSN Messenger, Notepad (autosaves), Recycle Bin, My Computer.
- **Paint** with full menus.
- **Games:** Solitaire, Minesweeper (3 levels), Snake, Brick Breaker, Tic-Tac-Toe.

## Personalise it
- Edit **`data.js`**: name, bio, education, experience, projects, skills and links.
- Replace `photo.jpg` (400x400, login/avatar) and `photo-full.jpg` (900x1200, About Me and social preview).
- Add your resume as `resume.pdf` in this folder so the Download PDF button works.

## Cache busting
Assets are cached for a year (see `vercel.json`). After editing any asset, bump the `?v=N` number on its tag in `index.html` (`style.css`, `data.js`, `app.js`, `games.js`), and also the `games.js?v=N` URL inside `app.js`, so browsers fetch the new files.

## Run locally
```bash
python -m http.server 5173
```
Then open http://localhost:5173.

## Deploy
Static HTML/CSS/JS, no build step. Drag the folder into Vercel, or run `vercel` (and `vercel --prod`) from this folder with the Vercel CLI. `vercel.json` sets caching and security headers.
