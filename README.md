# CodeSync

CodeSync is a real-time collaborative code editor where multiple users can join a shared room and write JavaScript together. It features smooth, lag-free typing, live synchronization via Socket.IO, and instant code execution.

## ✨ Features

- 🔗 Join or create rooms using a Room ID (or generate a new one)
- 👥 **Real-time collaboration** via Socket.IO — edits sync instantly to everyone in the room
- ⚡ Execute JavaScript code instantly (`Ctrl+Enter` shortcut + auto-run option)
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

## 🚀 Getting Started

### Backend

```bash
cd B
npm install
cp .env.example .env   # set MONGO_URL
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # optional: set VITE_API_URL
npm run dev
```

> No `VITE_API_URL`? The frontend defaults to the deployed backend at `https://codesync-pkuf.onrender.com`.

## 🧠 The lag fix

The original editor passed the current code back into Monaco's `value` prop on every keystroke, forcing Monaco to re-diff and repaint the whole document. The new editor is **uncontrolled**: user typing is captured via `onChange` into a ref and synced, while `value` is only pushed programmatically for initial load and remote updates (guarded with a `syncing` flag to prevent echo loops). Combined with Socket.IO broadcasting instead of 2s polling, this removes both the typing jank and the lost-update risk.

## 📝 Scripts

| Project  | Command        | Description                     |
| -------- | -------------- | ------------------------------- |
| backend  | `npm run dev`  | Start server with nodemon       |
| backend  | `npm start`    | Start server                    |
| frontend | `npm run dev`  | Vite dev server                 |
| frontend | `npm run build`| Production build                |
| frontend | `npm run lint` | ESLint                          |
| frontend | `npm run preview` | Preview production build    |