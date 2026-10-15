# CodeSync

CodeSync is a real-time collaborative code editor where multiple users can join a shared room and write JavaScript or Python together. It features smooth, lag-free typing, live synchronization via Socket.IO, and instant code execution for both JavaScript and Python support.

## ✨ Features

- 🔗 Join or create rooms using a Room ID (or generate a new one)
- 👥 **Real-time collaboration** via Socket.IO — edits sync instantly to everyone in the room
- ⚡ Execute JavaScript &amp; Python code instantly (`Ctrl+Enter` shortcut + auto-run option)
- 🖱️ **Zero-lag editing** — uncontrolled Monaco binding + debounced sync keeps typing buttery smooth even on large files
- 🔗 Copy invite link to share your room
- 🟢 Live connection & presence indicator (shows online users)
- 🕘 Recent rooms remembered in the browser
- 📱 Responsive dark-theme UI

## 🛠️ Tech Stack

**Frontend**
- React (Vite)
- Monaco Editor (`@monaco-editor/react`)
- Socket.IO client
- Axios
- React Router

**Backend**
- Node.js
- Express.js
- Socket.IO
- MongoDB + Mongoose (with in-memory fallback when no DB is configured)

## ⚠️ Known issue: can't type `c` on a Vercel deployment

If you open a deployed copy of CodeSync (e.g. `*.vercel.app`) while logged into Vercel, the **Vercel Toolbar** is injected into the page. Its **Comment** tool is bound to the `c` key, so pressing `c` opens the comment `+` cursor instead of typing the letter `c`.

This toolbar is added by Vercel at deploy time — it is **not** part of this repo's code, so it can't be removed by editing the app.

**Fixes (pick one):**

- **Keep the toolbar, free the key:** Toolbar → **Preferences → Keyboard Shortcuts → Comment**, then clear the binding or change it to a modifier combo (e.g. `Ctrl/Cmd + Shift + C`). Avoid a bare `?` — that just moves the problem and `?` is used constantly in JS/TS.
- **This tab only:** Toolbar menu → **Disable for Session** (or press `Cmd/Ctrl` + `.`).
- **Permanently:** Vercel Dashboard → your project → **Settings → General → Vercel Toolbar** → set **Preview** and **Production** to **Off**, save, then **redeploy**.
- **Seeing it on `localhost` too?** That's the **Vercel browser extension** — disable it, or open it and turn off **Always Activate**.

