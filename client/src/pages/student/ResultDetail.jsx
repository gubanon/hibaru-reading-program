import { useEffect, useState } from "react";
import { api } from "../../api";
import { MISCUE_TYPES } from "../../theme";
import ResultParts from "./ResultParts";

function timeText(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Student-facing detailed feedback for one submitted task, in the required
// PART A / B / C order, plus the marked-up passage and every comprehension
// question with the student's answer vs the correct one.
export default function ResultDetail({ L, submissionId, onBack }) {
  const [r, setR] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/student/submissions/${submissionId}/report`)
      .then(d => setR(d.report))
      .catch(e => setError(e.message));
  }, [submissionId]);

  if (error) return <div style={{ color: "#B3261E", fontSize: 13 }}>{error}</div>;
  if (!r) return null;

  const flat = { ...r.metrics, seconds: r.seconds, totalSeconds: r.totalSeconds, miscues: r.miscues };
  const individualMiscues = r.marked.filter(w => w.type);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button onClick={onBack} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>{L.backDash}</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{r.title}</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
            {L.submittedOn} {new Date(r.submittedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            {r.totalSeconds > 0 && <> · ⏱ {timeText(r.totalSeconds)} {L.totalTime}</>}
          </div>
        </div>
      </div>

      <ResultParts L={L} r={flat} individualMiscues={individualMiscues} />

      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: ".07em", margin: "22px 0 10px" }}>{L.markedPassage.toUpperCase()}</div>
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 18, fontSize: 14.5, lineHeight: 2.1, marginBottom: 8 }}>
        {r.marked.map((w, i) => {
          const t = MISCUE_TYPES.find(x => x.key === w.type);
          return (
            <span key={i}>
              <span title={t ? t.label : ""} style={{ background: t ? t.color.replace(")", " / 0.18)") : "transparent", borderBottom: t ? `2.5px solid ${t.color}` : "none", borderRadius: 4, padding: t ? "1px 3px" : 0 }}>{w.word}</span>{" "}
            </span>
          );
        })}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: ".07em", margin: "22px 0 10px" }}>{L.answersReview.toUpperCase()}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {r.questions.map(q => {
          const gotIt = q.chosen === q.correct;
          return (
            <div key={q.n} style={{ background: "var(--card-bg)", border: `1.5px solid ${gotIt ? "oklch(0.7 0.1 155)" : "oklch(0.7 0.12 25)"}`, borderRadius: 13, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{gotIt ? "✅" : "❌"}</span>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{q.n}. {q.text}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginLeft: 26 }}>
                {q.options.map((o, oi) => {
                  const isCorrect = oi === q.correct;
                  const isChosen = oi === q.chosen;
                  return (
                    <div key={oi} style={{
                      fontSize: 13, padding: "8px 12px", borderRadius: 9,
                      background: isCorrect ? "oklch(0.95 0.04 155)" : isChosen ? "oklch(0.95 0.04 25)" : "var(--subtle-bg)",
                      border: `1.5px solid ${isCorrect ? "oklch(0.7 0.1 155)" : isChosen ? "oklch(0.7 0.12 25)" : "transparent"}`,
                      color: (isCorrect || isChosen) ? "#26251F" : "var(--text-muted)"
                    }}>
                      <b>{["A", "B", "C", "D"][oi]}.</b> {o}
                      {isCorrect && <span style={{ fontSize: 11, fontWeight: 700, color: "oklch(0.45 0.1 155)", marginLeft: 6 }}>✓ {L.correctAnswer}</span>}
                      {isChosen && !isCorrect && <span style={{ fontSize: 11, fontWeight: 700, color: "oklch(0.5 0.14 25)", marginLeft: 6 }}>{L.yourAnswer}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
