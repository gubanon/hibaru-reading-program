import { useState } from "react";
import { api } from "../../api";
import { NAVY , ACCENT } from "../../theme";

export default function Quiz({ L, assignment, onSubmitted }) {
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const answeredAll = Object.keys(answers).length >= assignment.questions.length;

  async function submit() {
    if (!answeredAll) return;
    setBusy(true);
    setError("");
    try {
      const { result } = await api.post(`/student/assignments/${assignment.id}/quiz`, { answers });
      onSubmitted(result);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: ".08em" }}>{L.step3}</div>
        <h2 style={{ margin: "8px 0 4px", fontSize: 23, fontWeight: 700 }}>{L.step3Title}</h2>
        <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>{L.step3Sub}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {assignment.questions.map((q, qi) => (
          <div key={q.id} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{qi + 1}. {q.text}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              {q.options.map((o, oi) => {
                const sel = answers[qi] === oi;
                return (
                  <button key={oi} onClick={() => setAnswers({ ...answers, [qi]: oi })}
                    style={{ border: `2px solid ${sel ? NAVY : "var(--card-border)"}`, cursor: "pointer", padding: "11px 14px", borderRadius: 10, background: sel ? "#E9EDF7" : "var(--card-bg)", fontFamily: "inherit", fontSize: 13.5, textAlign: "left", color: "var(--text)", display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ fontWeight: 700, color: ACCENT }}>{["A", "B", "C", "D"][oi]}.</span><span>{o}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {error && <div style={{ textAlign: "center", color: "#B3261E", fontSize: 13, marginTop: 14 }}>{error}</div>}
      <div style={{ textAlign: "center", marginTop: 22 }}>
        <button disabled={!answeredAll || busy} onClick={submit}
          style={{ border: "none", cursor: answeredAll ? "pointer" : "default", padding: "14px 32px", borderRadius: 11, background: answeredAll ? "oklch(0.55 0.13 155)" : "#C9C7BC", color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 700 }}>
          {answeredAll ? L.submitBtn : `${L.answerAll} (${Object.keys(answers).length}/${assignment.questions.length})`}
        </button>
      </div>
    </>
  );
}
