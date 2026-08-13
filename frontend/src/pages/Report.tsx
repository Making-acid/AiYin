import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReport } from "../api/exam";
import { useLanguage } from "../i18n";
import type { ExamReport } from "../types";

export function Report() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
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
      setError(t("reportLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page report-page">
        <div className="loading">{t("generatingReport")}</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="page report-page">
        <div className="error-state">
          <p>{error || t("reportNotFound")}</p>
          <button className="btn-primary" onClick={() => navigate("/exam")}>
            {t("tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  const { report: score } = report;
  const bandColor = score.overall_band >= 7 ? "good" : score.overall_band >= 5.5 ? "average" : "needs-work";

  const criteria = [
    { label: t("fluencyCoherence"), value: score.fluency_coherence },
    { label: t("lexicalResource"), value: score.lexical_resource },
    { label: t("grammarAccuracy"), value: score.grammatical_range_accuracy },
    { label: t("pronunciation"), value: score.pronunciation },
  ];

  return (
    <div className="page report-page">
      <button className="back-btn" onClick={() => navigate("/")}>
        {t("back")}
      </button>

      <div className="report-container">
        <h1>{t("reportTitle")}</h1>

        <div className={`overall-score ${bandColor}`}>
          <div className="score-label">{t("estimatedBand")}</div>
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

        <div className={`report-analysis-note ${report.audio_analysis?.status === "complete" ? "used" : "fallback"}`}>
          <strong>{t("scoringEvidence")}</strong>
          <p>
            {report.audio_analysis?.status === "complete"
              ? t(report.audio_analysis.engine === "whisperx" ? "scoringUsedWhisperX" : "scoringUsedWhisper")
              : t("scoringUsedBrowserFallback")}
          </p>
        </div>

        <div className="report-summary">
          <h3>{t("summary")}</h3>
          <p>{score.summary}</p>
        </div>

        <div className="report-suggestions">
          <h3>{t("suggestions")}</h3>
          <ul>
            {score.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="report-actions">
          <button className="btn-primary" onClick={() => navigate("/exam")}>
            {t("takeAnotherTest")}
          </button>
          <button className="btn-secondary" onClick={() => navigate("/free-chat")}>
            {t("practiceFreeChat")}
          </button>
        </div>
      </div>
    </div>
  );
}
