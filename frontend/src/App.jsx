import { HashRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import CodeEditor from "./pages/editor"
import "./App.css";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor/:roomId" element={<CodeEditor />} />
      </Routes>
    </HashRouter>
  );
}

export default App;