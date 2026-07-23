import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./components/Live2DCharacter";
import { Home } from "./pages/Home";
import { Exam } from "./pages/Exam";
import { FreeChat } from "./pages/FreeChat";
import { Report } from "./pages/Report";
import { Settings } from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/free-chat" element={<FreeChat />} />
          <Route path="/report/:sessionId" element={<Report />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
