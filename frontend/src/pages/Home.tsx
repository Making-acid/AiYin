import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchConfig } from "../api/client";

export function Home() {
  const navigate = useNavigate();
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = async () => {
    try {
      const config = await fetchConfig();
      setIsConfigured(config.is_configured);
    } catch {
      setIsConfigured(false);
    }
  };

  return (
    <div className="page home-page">
      <div className="home-hero">
        <h1>IELTS Speaking Practice</h1>
        <p className="home-subtitle">AI-Powered IELTS Speaking Assistant</p>
        <p className="home-desc">
          Practice your English speaking skills with an AI examiner.
          Choose a mode below to get started.
        </p>
      </div>

      {isConfigured === false && (
        <div className="setup-banner">
          <p>API key not configured. Please set it up before starting.</p>
          <button className="btn-primary" onClick={() => navigate("/settings")}>
            Configure API Key
          </button>
        </div>
      )}

      <div className="mode-cards">
        <div className="mode-card" onClick={() => navigate("/exam")}>
          <div className="mode-icon">📝</div>
          <h2>Exam Mode</h2>
          <p>
            Simulate a full IELTS Speaking test with Part 1, 2, and 3.
            Get an estimated band score and detailed feedback.
          </p>
          <span className="mode-action">Start Exam →</span>
        </div>

        <div className="mode-card" onClick={() => navigate("/free-chat")}>
          <div className="mode-icon">💬</div>
          <h2>Free Chat</h2>
          <p>
            Practice casual English conversation with an AI partner.
            No pressure, no scoring—just practice.
          </p>
          <span className="mode-action">Start Chat →</span>
        </div>
      </div>

      <button className="settings-link" onClick={() => navigate("/settings")}>
        ⚙ Settings
      </button>
    </div>
  );
}
