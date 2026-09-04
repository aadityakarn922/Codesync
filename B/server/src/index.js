require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const vm = require("vm");
const { execSync } = require("child_process");
const { mkdirSync, writeFileSync, rmSync } = require("fs");
const { join } = require("path");

const connectDB = require("./db/connection");
const Room = require("./models/room");

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,https://codesync-pkuf.onrender.com,https://codesync-ofbq.vercel.app").split(",");

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy does not allow access from this origin."));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
}));

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy does not allow access from this origin."));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let useInMemoryRooms = false;
const inMemoryRooms = new Map();

(async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      useInMemoryRooms = true;
      console.warn("Running with in-memory room storage. Data will not persist across restarts.");
    } else {
      console.log("DB ready");
    }
  } catch (err) {
    console.error("DB failed", err);
    useInMemoryRooms = true;
  }
})();

// Home Route
app.get("/", (req, res) => {
  res.send("working");
});


app.post("/room", async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId missing" });
    }

    await setRoomState(roomId, {});

    res.json({ roomId, success: true });

  } catch (err) {
    console.log(" ROOM ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//
app.post("/code", async (req, res) => {
  try {
    const { roomId, code, language } = req.body;
    if (!roomId) return res.status(400).json({ error: "roomId missing" });

    await setRoomState(roomId, { code, language });

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to save code",
    });
  }
});


app.get("/code/:roomId", async (req, res) => {
  try {
    const room = await getRoomState(req.params.roomId);

    if (!room) {
      return res.json({
        code: "",
        language: "javascript",
      });
    }

    res.json({
      code: room.code,
      language: room.language,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error",
    });
  }
});


app.post("/run", async (req, res) => {
  try {
    const { language, code } = req.body;

    if (language === "python" || language === "py") {
      return res.json({ output: runPython(code) });
    }

    if (language !== "javascript") {
      return res.json({
        output: "Only JavaScript and Python execution are supported.",
      });
    }

    const outputLines = [];
    const sandbox = {
      console: {
        log: (...args) => outputLines.push(args.map((item) => String(item)).join(" ")),
        error: (...args) => outputLines.push(args.map((item) => String(item)).join(" ")),
      },
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
    };

    const context = vm.createContext(sandbox);
    const script = new vm.Script(code, { timeout: 1000, filename: "user-code.js" });

    script.runInContext(context, { timeout: 1000 });

    return res.json({
      output: outputLines.length ? outputLines.join("\n") : "(No output)",
    });
  } catch (err) {
    console.error(err);

    return res.json({
      output: `Error running code: ${err.message}`,
    });
  }
});

// --- Python execution helper ---
const PY_MAX_CHARS = 20000;
const PY_MAX_LINES = 2000;
const PY_TIMEOUT_MS = 4000;

function runPython(code) {
  const dir = join(require("os").tmpdir(), "codesync-run-" + Date.now());
  const file = join(dir, "main.py");

  const truncatedCode = code.length > PY_MAX_CHARS ? code.slice(0, PY_MAX_CHARS) : code;

  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, truncatedCode, "utf8");

    const stdout = execSync(`python3 "${file}"`, {
      timeout: PY_TIMEOUT_MS,
      maxBuffer: 1 << 20,
    }).toString("utf8");

    return limitOutput(stdout);
  } catch (err) {
    if (err.timedOut) {
      return "Error: Execution timed out (max 4s).";
    }

    // Python tracebacks reference the temp file path — clean it up.
    const cleanTraceback = (err.stderr ? err.stderr.toString("utf8") : err.message)
      .split("\n")
      .filter((line) => !line.includes(dir))
      .join("\n")
      .replace(file, "main.py");

    return limitOutput(cleanTraceback.trim() || `Error running code: ${cleanTraceback}`);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

function limitOutput(text) {
  const lines = text.split("\n");
  const output = lines.length > PY_MAX_LINES
    ? lines.slice(0, PY_MAX_LINES).join("\n") + "\n...(output truncated)"
    : text;
  return output.trim() === "" ? "(No output)" : output;
}

// --- Shared room state helper ---
async function getRoomState(roomId) {
  if (useInMemoryRooms) {
    return inMemoryRooms.get(roomId) || null;
  }
  return Room.findOne({ roomId });
}

async function setRoomState(roomId, patch) {
  if (useInMemoryRooms) {
    const existing = inMemoryRooms.get(roomId) || { roomId, code: "", language: "javascript" };
    Object.assign(existing, patch);
    inMemoryRooms.set(roomId, existing);
    return existing;
  }
  return Room.findOneAndUpdate(
    { roomId },
    { ...patch, language: patch.language || "javascript" },
    { new: true, upsert: true }
  );
}

// --- Socket.IO real-time collaboration ---

const clientsInRoom = new Map(); // roomId -> Set(socket.id)

function roomPresence(roomId) {
  return clientsInRoom.get(roomId)?.size ?? 0;
}

function broadcastPresence(roomId) {
  io.to(roomId).emit("presence", { count: roomPresence(roomId) });
}

io.on("connection", (socket) => {
  let currentRoom = null;

  const emitRoomCode = (roomId) => {
    getRoomState(roomId).then((room) => {
      socket.emit("room-code", {
        code: room?.code || "",
        language: room?.language || "javascript",
        source: "initial",
      });
    });
  };

  socket.on("join-room", ({ roomId }) => {
    if (!roomId) return;

    if (currentRoom && currentRoom !== roomId) {
      clientsInRoom.get(currentRoom)?.delete(socket.id);
      socket.leave(currentRoom);
      broadcastPresence(currentRoom);
    }

    currentRoom = roomId;
    socket.join(roomId);

    if (!clientsInRoom.has(roomId)) clientsInRoom.set(roomId, new Set());
    clientsInRoom.get(roomId).add(socket.id);

    console.log(`Socket ${socket.id} joined room ${roomId}`);

    // Ensure the room exists
    setRoomState(roomId, {})
      .then(() => {
        emitRoomCode(roomId);
        broadcastPresence(roomId);
      })
      .catch((err) => console.error("Failed to ensure room:", err));
  });

  socket.on("room-code-request", () => {
    if (currentRoom) emitRoomCode(currentRoom);
  });

  socket.on("code-change", async ({ roomId, code, language }) => {
    if (!roomId) return;
    try {
      const patch = { code };
      if (language) patch.language = language;
      await setRoomState(roomId, patch);
      socket.broadcast.to(roomId).emit("code-change", { code });
    } catch (err) {
      console.error("Failed to persist code:", err);
    }
  });

  socket.on("run-code", async ({ code, language, requestId }) => {
    const lang = language || "javascript";
    const respond = (payload) => socket.emit("run-result", { requestId, ...payload });

    if (lang === "python" || lang === "py") {
      return respond({ output: runPython(code) });
    }

    if (lang !== "javascript") {
      return respond({ output: "Only JavaScript and Python execution are supported." });
    }

    const outputLines = [];
    const sandbox = {
      console: {
        log: (...args) => outputLines.push(args.map((item) => String(item)).join(" ")),
        error: (...args) => outputLines.push(args.map((item) => String(item)).join(" ")),
        warn: (...args) => outputLines.push(args.map((item) => String(item)).join(" ")),
      },
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
    };

    try {
      const context = vm.createContext(sandbox);
      const script = new vm.Script(code, { timeout: 1000, filename: "user-code.js" });
      script.runInContext(context, { timeout: 1000 });

      respond({ output: outputLines.length ? outputLines.join("\n") : "(No output)" });
    } catch (err) {
      respond({ output: `Error running code: ${err.message}` });
    }
  });

  socket.on("disconnect", () => {
    if (currentRoom && clientsInRoom.has(currentRoom)) {
      clientsInRoom.get(currentRoom).delete(socket.id);
      if (clientsInRoom.get(currentRoom).size === 0) clientsInRoom.delete(currentRoom);
      broadcastPresence(currentRoom);
      console.log(`Socket ${socket.id} left room ${currentRoom}`);
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
