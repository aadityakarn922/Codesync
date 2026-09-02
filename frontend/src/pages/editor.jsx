import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import MonacoEditor from "@monaco-editor/react";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "https://codesync-pkuf.onrender.com";

const LANGUAGES = ["javascript"];

function CodeEditor() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [language] = useState("javascript");
  const [runOutput, setRunOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState(1);
  const [copied, setCopied] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [toast, setToast] = useState("");
  const [editorReady, setEditorReady] = useState(false);

  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const codeRef = useRef("");
  const syncingRef = useRef(false);
  const typedRef = useRef(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1800);
  }, []);

  const runCode = useCallback(async () => {
    const code = editorRef.current?.getValue?.() ?? codeRef.current;
    if (!code?.trim()) {
      setRunOutput("No code to run");
      return;
    }
    setRunning(true);
    setRunOutput("Running...");

    const requestId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const onResult = (data) => {
      if (data.requestId !== requestId) return;
      setRunOutput(data.output ?? "(No output)");
      setRunning(false);
    };

    if (socketRef.current?.connected) {
      socketRef.current.once("run-result", onResult);
      socketRef.current.emit("run-code", {
        code,
        language: "javascript",
        requestId,
      });
    } else {
      try {
        const res = await axios.post(`${API_URL}/run`, { language: "javascript", code });
        setRunOutput(res.data?.output ?? "(No output)");
      } catch (err) {
        const errorMessage = err.response?.data?.output || err.message;
        setRunOutput(`Error running code: ${errorMessage}`);
      } finally {
        setRunning(false);
      }
    }
  }, []);

  // Copy invite link
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("Could not copy link");
    }
  };

  // Keyboard shortcut: Ctrl/Cmd+Enter to run
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [runCode]);

  // Auto-run
  useEffect(() => {
    if (!autoRun) return;
    const id = window.setInterval(() => {
      if (codeRef.current?.trim()) runCode();
    }, 4000);
    return () => window.clearInterval(id);
  }, [autoRun, runCode]);

  // Socket connection + realtime sync
  useEffect(() => {
    if (!roomId) return;

    const socket = io(API_URL, { autoConnect: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-room", { roomId });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("presence", (data) => {
      setPresence(Math.max(1, data?.count ?? 1));
    });

    socket.on("room-code", (data) => {
      if (data?.source === "initial") {
        const value = data.code ?? "";
        // If the user already started typing before the initial sync lands,
        // keep their local edits.
        if (!typedRef.current) {
          syncingRef.current = true;
          codeRef.current = value;
          editorRef.current?.setValue(value);
          syncingRef.current = false;
        }
      }
    });

    socket.on("code-change", (data) => {
      if (!data?.code) return;
      syncingRef.current = true;
      codeRef.current = data.code;
      editorRef.current?.setValue(data.code);
      syncingRef.current = false;
    });

    return () => {
      socket.off("room-code");
      socket.off("code-change");
      socket.off("disconnect");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  // Fetch initial code via REST fallback (if sockets unavailable)
  useEffect(() => {
    if (!roomId) return;
    const fetchCode = async () => {
      try {
        const res = await axios.get(`${API_URL}/code/${roomId}`);
        if (res.data) {
          const fetched = res.data.code || "";
          // Only apply if the user hasn't started typing (avoids clobbering)
          if (!typedRef.current && !codeRef.current) {
            syncingRef.current = true;
            codeRef.current = fetched;
            if (editorRef.current) editorRef.current.setValue(fetched);
            syncingRef.current = false;
          }
        }
      } catch (err) {
        console.error("Failed to fetch code", err);
      }
    };
    const id = window.setTimeout(fetchCode, 800);
    return () => window.clearTimeout(id);
  }, [roomId]);

  const handleEditorChange = useCallback((value) => {
    const newCode = value || "";
    codeRef.current = newCode;
    typedRef.current = true;

    if (syncingRef.current) return;

    setEditorReady(true);

    if (socketRef.current?.connected) {
      socketRef.current.emit("code-change", { roomId, code: newCode });
    } else {
      // Direct REST save (debounced) as fallback
      if (window.__saveTimeout) window.clearTimeout(window.__saveTimeout);
      window.__saveTimeout = window.setTimeout(async () => {
        try {
          await axios.post(`${API_URL}/code`, { roomId, code: newCode });
        } catch (err) {
          console.error("Failed to save code", err);
        }
      }, 600);
    }
  }, [roomId]);

  return (
    <div className="editor-page">
      <header className="editor-header">
        <div className="brand">
          <span className="logo-dot" />
          <h2>CodeSync</h2>
        </div>

        <div className="room-info">
          <span className="room-label">Room</span>
          <code className="room-id">{roomId}</code>
          <button className="icon-btn" onClick={copyLink} title="Copy invite link">
            {copied ? "✓" : "🔗"}
          </button>
        </div>

        <div className="header-actions">
          <label className="switch-label" title="Auto-run every 4s">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
            />
            Auto-run
          </label>

          <button className="leave-btn" onClick={() => navigate("/")}>
            Leave
          </button>

          <span className={`conn-badge ${connected ? "online" : "offline"}`}>
            <span className="conn-dot" />
            {connected ? `${presence} online` : "connecting…"}
          </span>
        </div>
      </header>

      <div className="editor-main">
        {/* Editor Section */}
        <section className="editor-column">
          <div className="controls">
            <label className="muted">Language:</label>
            <select className={`lang-select ${connected ? "" : "offline"}`} value={language} disabled>
              <option value="javascript">JavaScript</option>
            </select>

            <div className="controls-spacer" />

            <span className="shortcut-hint">
              <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run
            </span>

            <button className="run-btn" onClick={runCode} disabled={running}>
              {running ? "Running…" : "▶ Run"}
            </button>
          </div>

          <div className={`editor-wrapper ${editorReady ? "ready" : ""}`}>
            <MonacoEditor
              height="100%"
              theme="vs-dark"
              language={language}
              defaultValue=""
              onChange={handleEditorChange}
              onMount={(editor) => {
                editorRef.current = editor;
                if (codeRef.current) {
                  syncingRef.current = true;
                  editor.setValue(codeRef.current);
                  syncingRef.current = false;
                }
                editor.focus();
              }}
              options={{
                minimap: { enabled: false, scale: 50 },
                automaticLayout: true,
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                lineHeight: 21,
                padding: { top: 12, bottom: 12 },
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                smoothScrolling: true,
                renderWhitespace: "none",
                scrollBeyondLastLine: false,
                tabSize: 2,
                wordWrap: "off",
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true, indentation: true },
                scrollbar: {
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10,
                  useShadows: false,
                },
                quickSuggestions: { other: true, comments: true, strings: true },
                suggest: { showWords: true },
                formatOnPaste: true,
                autoIndent: "full",
                renderLineHighlight: "all",
              }}
              loading={<div className="editor-loading">Loading editor…</div>}
            />
          </div>
        </section>

        {/* Output Section */}
        <section className="output-column">
          <div className="output-header">
            <div className="output-title">Output</div>
            <button
              className="clear-btn"
              onClick={() => {
                setRunOutput("");
                setRunning(false);
              }}
            >
              Clear
            </button>
          </div>

          <div className={`output-preview ${running ? "working" : ""}`}>
            <pre>{runOutput || (running ? "Running…" : "No output yet · Press Run or Ctrl+Enter")}</pre>
          </div>
        </section>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default CodeEditor;