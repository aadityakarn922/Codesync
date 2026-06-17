require("dotenv").config();

const express = require("express");
const cors = require("cors");
const vm = require("vm");

const connectDB = require("./db/connection");
const Room = require("./models/room");

const app = express();



app.use(cors({
  origin: "https://codesync-ofbq.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());
(async () => {
  try {
    await connectDB();
    console.log("DB ready");
  } catch (err) {
    console.error("DB failed", err);
    process.exit(1);
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

    let room = await Room.findOne({ roomId });

    console.log("🔍 Room found:", room);

    if (!room) {
      console.log("🆕 Creating room");
      room = await Room.create({ roomId, code: "" });
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
