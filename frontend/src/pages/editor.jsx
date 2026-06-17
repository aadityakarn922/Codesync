import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import MonacoEditor from "@monaco-editor/react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const LANGUAGES = ["javascript"];

function CodeEditor() {
  const { roomId } = useParams();

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [runOutput, setRunOutput] = useState("");
  const [running, setRunning] = useState(false);

  const saveTimeoutRef = useRef(null);

  // Save code with debounce
  const saveCode = (value) => {
    const newCode = value || "";
    setCode(newCode);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await axios.post(`${API_URL}/code`, {
          roomId,
          code: newCode,
          language,
        });
      } catch (err) {
        console.error("Failed to save code", err);
      }
    }, 500);
  };

  // Fetch room code
  useEffect(() => {
    const fetchCode = async () => {
      try {
        const res = await axios.get(`${API_URL}/code/${roomId}`);

        if (res.data) {
          setCode(res.data.code || "");

          if (res.data.language) {
            setLanguage(res.data.language);
          }
        }
      } catch (err) {
        console.error("Failed to fetch code", err);
      }
    };

    fetchCode();

    const interval = setInterval(fetchCode, 2000);

    return () => {
      clearInterval(interval);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [roomId]);

  // Run code
  const runCode = async () => {
    if (!code.trim()) {
      setRunOutput("No code to run");
      return;
    }

    if (language !== "javascript") {
      setRunOutput("Only JavaScript execution is supported.");
      return;
    }

    setRunning(true);
    setRunOutput("Running...");

    try {
      const res = await axios.post(`${API_URL}/run`, {
        language,
        code,
      });

      const output = res.data?.output;
      if (!output) {
        setRunOutput("No output returned from server");
      } else {
        setRunOutput(output);
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.output || err.message;
      setRunOutput(`Error running code: ${errorMessage}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="editor-page">
      <header className="editor-header">
        <h2>Room: {roomId}</h2>
      </header>

      <div className="editor-main">
        {/* Editor Section */}
        <div className="editor-column">
          <div className="controls">
            <label>Language:</label>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>

            <button
              className="run-btn"
              onClick={runCode}
              disabled={running}
            >
              {running ? "Running..." : "Run"}
            </button>
          </div>

          <div className="editor-wrapper">
            <MonacoEditor
              height="600px"
              language={language}
              value={code}
              onChange={saveCode}
              options={{
                minimap: {
                  enabled: false,
                },
                automaticLayout: true,
                fontSize: 14,
              }}
            />
          </div>
        </div>

        {/* Output Section */}
        <div className="output-column">
          <div className="output-title">Output</div>

          <pre className="output-preview">
            {runOutput || "No output yet"}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default CodeEditor;