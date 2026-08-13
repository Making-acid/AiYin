import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./i18n";
import { TrainingLanguageProvider } from "./i18n/trainingLang";
import { Home } from "./pages/Home";
import { Exam } from "./pages/Exam";
import { FreeChat } from "./pages/FreeChat";
import { Report } from "./pages/Report";
import { Settings } from "./pages/Settings";
import { Legal } from "./pages/Legal";
import { Memory } from "./pages/Memory";
import { AzureSpeechHelp } from "./pages/AzureSpeechHelp";

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <TrainingLanguageProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/exam" element={<Exam />} />
            <Route path="/free-chat" element={<FreeChat />} />
            <Route path="/report/:sessionId" element={<Report />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/memory" element={<Memory />} />
            <Route path="/help/azure-speech" element={<AzureSpeechHelp />} />
          </Routes>
        </TrainingLanguageProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
