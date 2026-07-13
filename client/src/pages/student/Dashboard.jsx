import { useEffect, useState } from "react";
import { api } from "../../api";
import { NAVY, levelColor, statusMeta } from "../../theme";

export default function Dashboard({ L, tasks, onStart, onProfile }) {
  const [results, setResults] = useState(null);

  useEffect(() => { api.get("/student/results").then(d => setResults(d.results)); }, [tasks]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Hi! 👋</h2>
        <div style={{ flex: 1 }} />
        <button onClick={onProfile} style={{ border: "1px solid #E0DED5", cursor: "pointer", padding: "8px 16px", borderRadius: 9, background: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: NAVY }}>👤 {L.myProfile}</button>
      </div>
      <div style={{ fontSize: 13.5, color: "#6B6A63", marginBottom: 20 }}>{L.tasksSub}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {tasks.map(t => {
          const sm = statusMeta[t.status] || statusMeta["not-started"];
          const cta = t.status === "not-started" ? L.ctaStart : L.ctaRetry + ` (${t.attempts} ${L.attempts})`;
          return (
            <div key={t.id} style={{ background: "#fff", border: "1px solid #E7E5DD", borderRadius: 14, padding: 22, display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 52, height: 52, borderRadius: 13, background: "#E9EDF7", display: "grid", placeItems: "center", fontSize: 24 }}>📖</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{t.title}</div>
                <div style={{ fontSize: 12.5, color: "#8A897F", marginTop: 3 }}>{t.genre} · {t.words} {L.wordsLbl} · {t.timeLimit} · {L.due} {t.deadline}</div>
                <div style={{ fontSize: 12.5, color: "#6B6A63", marginTop: 6 }}>{t.instructions}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: sm.bg, color: sm.color, display: "inline-block", marginBottom: 9 }}>{sm.label}</div><br />
                <button onClick={() => onStart(t.id)} style={{ border: "none", cursor: "pointer", padding: "11px 20px", borderRadius: 10, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700 }}>{cta}</button>
              </div>
            </div>
          );
        })}
        {!tasks.length && <div style={{ border: "1.5px dashed #DDDACE", borderRadius: 12, padding: 18, fontSize: 13, color: "#8A897F", textAlign: "center" }}>No reading tasks assigned yet.</div>}
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>📊 {L.myResults}</div>
        {results && results.length > 0 ? (
          <div style={{ background: "#fff", border: "1px solid #E7E5DD", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr .8fr .9fr 1.1fr 1fr", gap: 8, padding: "11px 18px", fontSize: 11, fontWeight: 700, color: "#8A897F", letterSpacing: ".04em", borderBottom: "1px solid #EFEDE6" }}>
              <div>TASK</div><div>DATE</div><div>WPM</div><div>SCORE</div><div>COMPREHENSION</div><div>PROFILE</div>
            </div>
            {results.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr .8fr .9fr 1.1fr 1fr", gap: 8, padding: "12px 18px", alignItems: "center", borderBottom: "1px solid #F4F2EC", fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>{r.title}</div>
                <div style={{ color: "#8A897F" }}>{new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                <div>{r.wpm} wpm</div>
                <div style={{ fontWeight: 600, color: levelColor(r.level) }}>{r.score}%</div>
                <div>{r.correct}/{r.items} ({r.acc}%)</div>
                <div style={{ fontWeight: 700, color: levelColor(r.profile) }}>{r.profile}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ border: "1.5px dashed #DDDACE", borderRadius: 12, padding: 18, fontSize: 13, color: "#8A897F", textAlign: "center" }}>{L.noResults}</div>
        )}
      </div>
    </>
  );
}
