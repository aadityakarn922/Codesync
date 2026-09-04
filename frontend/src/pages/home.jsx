import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://codesync-pkuf.onrender.com";

const RECENT_KEY = "codesync.recentRooms";

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const id = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return id.toUpperCase();
}

function getRecentRooms() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecentRoom(roomId) {
  const recent = getRecentRooms().filter((r) => r !== roomId);
  recent.unshift(roomId);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)));
}

function Home() {
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const recentRooms = getRecentRooms();

  const goToRoom = (id) => navigate(`/editor/${encodeURIComponent(id)}`);

  const joinRoom = async (e) => {
    e?.preventDefault();

    const id = roomId.trim();
    setError("");

    if (!id) {
      setError("Enter a room ID to continue.");
      return;
    }
    if (!ROOM_ID_PATTERN.test(id)) {
      setError("Room ID must be 3–32 characters (letters, numbers, - or _).");
      return;
    }

    setJoining(true);
    try {
      await axios.post(`${API_URL}/room`, { roomId: id });
      pushRecentRoom(id);
      goToRoom(id);
    } catch (err) {
      console.error("Error joining room", err);
      setError(err.response?.data?.error || "Could not reach the server. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const createRoom = () => {
    const id = generateRoomId();
    setRoomId(id);
    setError("");
    joinRoom();
  };

  return (
    <div className="home-page">
      <div className="hero">
        <div className="badge">Real-time collaborative coding</div>
        <h1 className="title">
          CodeSync<span className="dot">.</span>
        </h1>
        <p className="subtitle">
          Write JavaScript or Python together in a shared room. Live sync, instant run, zero lag.
        </p>
      </div>

      <div className="card">
        <form onSubmit={joinRoom}>
          <label className="field-label" htmlFor="roomId">
            Room ID
          </label>
          <div className="room-input-row">
            <input
              id="roomId"
              type="text"
              placeholder="e.g. MYROOM2024"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              maxLength={32}
              autoFocus
            />
          </div>

          {error && <p className="field-error">{error}</p>}

          <div className="actions">
            <button className="primary-btn" type="submit" disabled={joining}>
              {joining ? "Joining…" : "Join Room"}
            </button>
            <button className="ghost-btn" type="button" onClick={createRoom} disabled={joining}>
              + New Room
            </button>
          </div>
        </form>

        {recentRooms.length > 0 && (
          <div className="recent">
            <span className="recent-label">Recent rooms</span>
            <div className="recent-list">
              {recentRooms.map((id) => (
                <button key={id} className="recent-chip" onClick={() => goToRoom(id)}>
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="features">
        <div className="feature">
          <span className="feature-icon">👥</span>
          <b>Live collaboration</b>
          <span>Everyone in the room sees changes instantly via Socket.IO.</span>
        </div>
        <div className="feature">
          <span className="feature-icon">⚡</span>
          <b>Zero-lag editor</b>
          <span>Uncontrolled Monaco + debounced sync keeps typing buttery smooth.</span>
        </div>
        <div className="feature">
          <span className="feature-icon">▶</span>
          <b>Run JavaScript &amp; Python</b>
          <span>Execute code right in the room with Ctrl+Enter.</span>
        </div>
      </div>

      <footer className="home-footer">
        Powered by React + Vite, Express + Socket.IO, MongoDB
      </footer>
    </div>
  );
}

export default Home;