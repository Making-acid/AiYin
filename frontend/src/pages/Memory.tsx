import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteExamMemory, getExamMemory } from "../api/exam";
import { useLanguage } from "../i18n";
import type { ExamMemorySummary, ScoreCriterion } from "../types";

const CRITERIA: ScoreCriterion[] = [
  "fluency_coherence",
  "lexical_resource",
  "grammatical_range_accuracy",
  "pronunciation",
];

export function Memory() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [memory, setMemory] = useState<ExamMemorySummary | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setMemory(await getExamMemory());
    } catch {
      setError(t("memoryLoadFailed"));
    }
  };

  useEffect(() => { load(); }, []);

  const criterionLabel = (key: ScoreCriterion | null) => {
    if (!key) return "—";
    const labels: Record<ScoreCriterion, string> = {
      overall_band: t("overall_band"),
      fluency_coherence: t("fluency_coherence"),
      lexical_resource: t("lexical_resource"),
      grammatical_range_accuracy: t("grammatical_range_accuracy"),
      pronunciation: t("pronunciation"),
    };
    return labels[key];
  };
  const remove = async (id: string) => {
    if (!window.confirm(t("deleteMemoryConfirm"))) return;
    try {
      await deleteExamMemory(id);
      await load();
    } catch {
      setError(t("memoryDeleteFailed"));
    }
  };

  return (
    <div className="page memory-page">
      <button className="back-btn" onClick={() => navigate("/")}>{t("back")}</button>
      <div className="memory-container">
        <header className="memory-header">
          <h1>{t("examMemory")}</h1>
          <p>{t("examMemoryDesc")}</p>
        </header>
        {error && <div className="error-state">{error}</div>}
        {memory && memory.attempt_count === 0 && <div className="memory-empty">{t("noExamMemory")}</div>}
        {memory && memory.attempt_count > 0 && (
          <>
            <section className="memory-overview">
              <div><strong>{memory.attempt_count}</strong><span>{t("completedAttempts")}</span></div>
              <div><strong>{memory.averages.overall_band?.toFixed(1) ?? "—"}</strong><span>{t("averageBand")}</span></div>
              <div><strong>{criterionLabel(memory.weakest_criterion)}</strong><span>{t("focusArea")}</span></div>
            </section>
            <section className="memory-averages">
              {CRITERIA.map((key) => (
                <div className="memory-average" key={key}>
                  <span>{criterionLabel(key)}</span>
                  <strong>{memory.averages[key]?.toFixed(1) ?? "—"}</strong>
                </div>
              ))}
            </section>
            <section className="memory-attempts">
              <h2>{t("pastAttempts")}</h2>
              {memory.attempts.map((attempt) => (
                <article className="memory-attempt" key={attempt.session_id}>
                  <button className="memory-attempt-main" onClick={() => navigate(`/report/${attempt.session_id}`)}>
                    <strong>{attempt.report.overall_band.toFixed(1)}</strong>
                    <span>{new Date(attempt.completed_at).toLocaleString()}</span>
                    <small>{attempt.report.summary}</small>
                  </button>
                  <button className="memory-delete" onClick={() => remove(attempt.session_id)}>{t("deleteMemory")}</button>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
