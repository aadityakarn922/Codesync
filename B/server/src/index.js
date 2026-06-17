require("dotenv").config();

const express = require("express");
const cors = require("cors");
const vm = require("vm");

const connectDB = require("./db/connection");
const Room = require("./models/room");

const app = express();

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

// Create / Join Room
app.post("/room", async (req, res) => {
  console.log("🔥 ROOM API HIT");

  try {
    console.log("BODY:", req.body);

    const { roomId } = req.body;

    if (!roomId) {
      console.log("❌ No roomId received");
      return res.status(400).json({ error: "roomId missing" });
    }

    let room;
    if (useInMemoryRooms) {
      room = inMemoryRooms.get(roomId);
    } else {
      room = await Room.findOne({ roomId });
    }

    console.log("🔍 Room found:", room);

    if (!room) {
      console.log("🆕 Creating room");
      if (useInMemoryRooms) {
        room = { roomId, code: "", language: "javascript" };
        inMemoryRooms.set(roomId, room);
      } else {
        room = await Room.create({ roomId, code: "" });
      }
    }

    console.log("✅ Room success:", room);

    res.json(room);

  } catch (err) {
    console.log("🔥 ROOM ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//
app.post("/code", async (req, res) => {
  try {
    const { roomId, code, language } = req.body;

    if (useInMemoryRooms) {
      const existing = inMemoryRooms.get(roomId) || {
        roomId,
        code: "",
        language: "javascript",
      };
      existing.code = code;
      existing.language = language;
      inMemoryRooms.set(roomId, existing);
    } else {
      await Room.findOneAndUpdate(
        { roomId },
        {
          code,
          language,
        },
        {
          new: true,
          upsert: true,
        }
      );
    }

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

// Get Code + Language
app.get("/code/:roomId", async (req, res) => {
  try {
    if (useInMemoryRooms) {
      const room = inMemoryRooms.get(req.params.roomId);
      if (!room) {
        return res.json({
          code: "",
          language: "javascript",
        });
      }
      return res.json({
        code: room.code,
        language: room.language,
      });
    }

    const room = await Room.findOne({
      roomId: req.params.roomId,
    });

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

// Run JavaScript code only
app.post("/run", async (req, res) => {
  try {
    const { language, code } = req.body;

    if (language !== "javascript") {
      return res.json({
        output: "Only JavaScript execution is supported in this mode.",
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
