import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import CodeEditor from "./pages/editor"
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor/:roomId" element={<CodeEditor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;