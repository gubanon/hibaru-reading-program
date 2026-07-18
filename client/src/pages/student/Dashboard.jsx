import { useEffect, useState } from "react";
import { api } from "../../api";
import { NAVY, levelColor, statusMeta , ACCENT, GREEN } from "../../theme";
import ResultDetail from "./ResultDetail";

function submittedText(L, ts) {
  return `✓ ${L.submittedOn} ${new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

export default function Dashboard({ L, tasks, onStart, onProfile }) {
  const [results, setResults] = useState(null);
  const [detailId, setDetailId] = useState(null);

  useEffect(() => { api.get("/student/results").then(d => setResults(d.results)); }, [tasks]);

  if (detailId) return <ResultDetail L={L} submissionId={detailId} onBack={() => setDetailId(null)} />;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Hi! 👋</h2>
        <div style={{ flex: 1 }} />
        <button onClick={onProfile} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "8px 16px", borderRadius: 9, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: ACCENT }}>👤 {L.myProfile}</button>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 20 }}>{L.tasksSub}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {tasks.map(t => {
          const sm = statusMeta[t.status] || statusMeta["not-started"];
          const cta = t.status === "not-started" ? L.ctaStart : L.ctaRetry + ` (${t.attempts} ${L.attempts})`;
          return (
            <div key={t.id} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 22, display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 52, height: 52, borderRadius: 13, background: "#E9EDF7", display: "grid", placeItems: "center", fontSize: 24 }}>📖</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{t.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 3 }}>{t.genre} · {t.words} {L.wordsLbl} · {t.timeLimit} · {L.due} {t.deadline}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>{t.instructions}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: sm.bg, color: sm.color, display: "inline-block", marginBottom: 6 }}>{sm.label}</div>
                {t.status === "turned-in" && t.submittedAt && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: GREEN, marginBottom: 7 }}>{submittedText(L, t.submittedAt)}</div>
                )}
                <br />
                <button onClick={() => onStart(t.id)} style={{ border: "none", cursor: "pointer", padding: "11px 20px", borderRadius: 10, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700 }}>{cta}</button>
              </div>
            </div>
          );
        })}
        {!tasks.length && <div style={{ border: "1.5px dashed #DDDACE", borderRadius: 12, padding: 18, fontSize: 13, color: "var(--text-faint)", textAlign: "center" }}>No reading tasks assigned yet.</div>}
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>📊 {L.myResults}</div>
        {results && results.length > 0 ? (
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr .8fr .9fr 1.1fr 1fr .8fr", gap: 8, padding: "11px 18px", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".04em", borderBottom: "1px solid var(--divider)" }}>
              <div>TASK</div><div>DATE</div><div>WPM</div><div>SCORE</div><div>COMPREHENSION</div><div>PROFILE</div><div></div>
            </div>
            {results.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr .8fr .9fr 1.1fr 1fr .8fr", gap: 8, padding: "12px 18px", alignItems: "center", borderBottom: "1px solid var(--divider)", fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>{r.title}</div>
                <div style={{ color: "var(--text-faint)" }}>{new Date(r.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                <div>{r.wpm} wpm</div>
                <div style={{ fontWeight: 600, color: levelColor(r.level) }}>{r.score}%</div>
                <div>{r.correct}/{r.items} ({r.acc}%)</div>
                <div style={{ fontWeight: 700, color: levelColor(r.profile) }}>{r.profile}</div>
                <div>
                  <button onClick={() => setDetailId(r.submissionId)} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "6px 10px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: ACCENT }}>{L.viewDetails}</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ border: "1.5px dashed #DDDACE", borderRadius: 12, padding: 18, fontSize: 13, color: "var(--text-faint)", textAlign: "center" }}>{L.noResults}</div>
        )}
      </div>
    </>
  );
}
