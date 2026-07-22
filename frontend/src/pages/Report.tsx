import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReport } from "../api/client";
import type { ExamReport } from "../types";

export function Report() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ExamReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionId) {
      fetchReport(sessionId);
    }
  }, [sessionId]);

  const fetchReport = async (id: string) => {
    try {
      const data = await getReport(id);
      setReport(data);
    } catch (err) {
      setError("Failed to load report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page report-page">
        <div className="loading">Generating your score report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="page report-page">
        <div className="error-state">
          <p>{error || "Report not found."}</p>
          <button className="btn-primary" onClick={() => navigate("/exam")}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { report: score } = report;
  const bandColor = score.overall_band >= 7 ? "good" : score.overall_band >= 5.5 ? "average" : "needs-work";

  const criteria = [
    { label: "Fluency & Coherence", value: score.fluency_coherence },
    { label: "Lexical Resource", value: score.lexical_resource },
    { label: "Grammatical Range & Accuracy", value: score.grammatical_range_accuracy },
    { label: "Pronunciation", value: score.pronunciation },
  ];

  return (
    <div className="page report-page">
      <button className="back-btn" onClick={() => navigate("/")}>
        ← Home
      </button>

      <div className="report-container">
        <h1>IELTS Speaking Score Report</h1>

        <div className={`overall-score ${bandColor}`}>
          <div className="score-label">Estimated Band Score</div>
          <div className="score-value">{score.overall_band.toFixed(1)}</div>
        </div>

        <div className="criteria-grid">
          {criteria.map((c) => (
            <div key={c.label} className="criteria-card">
              <div className="criteria-label">{c.label}</div>
              <div className="criteria-score">{c.value.toFixed(1)}</div>
            </div>
          ))}
        </div>

        <div className="report-summary">
          <h3>Summary</h3>
          <p>{score.summary}</p>
        </div>

        <div className="report-suggestions">
          <h3>Suggestions for Improvement</h3>
          <ul>
            {score.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="report-actions">
          <button className="btn-primary" onClick={() => navigate("/exam")}>
            Take Another Test
          </button>
          <button className="btn-secondary" onClick={() => navigate("/free-chat")}>
            Practice Free Chat
          </button>
        </div>
      </div>
    </div>
  );
}
