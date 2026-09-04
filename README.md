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

