import { useEffect, useState } from "react";
import { api } from "../../api";
import { MISCUE_TYPES, levelColor, GREEN } from "../../theme";

function timeText(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Student-facing detailed feedback for one submitted task: exact miscues
// (counts + marked-up passage) and each comprehension question with the
// student's answer vs the correct one.
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

  const m = r.metrics;
  // Fixed order: Reading Rate → Word Score → Comprehension → Reading Level.
  const stats = [
    { label: L.readingRate, value: `${m.wpm} wpm`, sub: `${timeText(r.seconds)} ${L.readingTime}`, color: "var(--text)" },
    { label: L.wordScore, value: `${m.score}%`, sub: `${m.tm} ${L.miscuesDetected}`, color: levelColor(m.level) },
    { label: L.comprehension, value: `${m.correct}/${m.items}`, sub: `${m.acc}% · ${m.compLevel}`, color: levelColor(m.compLevel) },
    { label: L.readingLevel, value: m.level, sub: L.wordReadingLevel, color: levelColor(m.level) }
  ];
  const bars = MISCUE_TYPES.map(t => ({ ...t, count: r.miscues[t.key] || 0 })).filter(b => b.count > 0);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>{L.backDash}</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{r.title}</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
            {L.submittedOn} {new Date(r.submittedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            {r.totalSeconds > 0 && <> · ⏱ {timeText(r.totalSeconds)} {L.totalTime}</>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {stats.map((d, i) => (
          <div key={i} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 13, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".05em" }}>{d.label}</div>
            <div style={{ fontSize: 23, fontWeight: 700, marginTop: 4, color: d.color }}>{d.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{d.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 18, alignItems: "start", marginBottom: 20 }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{L.miscueDetails} <span style={{ color: "var(--text-faint)", fontWeight: 500 }}>· {m.tm}</span></div>
          {bars.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bars.map(b => (
                <div key={b.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                  <span style={{ color: "var(--text-muted)", flex: 1 }}>{b.label} <i style={{ color: "var(--text-faint-2)" }}>{b.fil}</i></span>
                  <span style={{ fontWeight: 700 }}>{b.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: GREEN, fontWeight: 600 }}>{L.noMiscues}</div>
          )}
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{L.markedPassage}</div>
          <div style={{ fontSize: 14.5, lineHeight: 2.1 }}>
            {r.marked.map((w, i) => {
              const t = MISCUE_TYPES.find(x => x.key === w.type);
              return (
                <span key={i}>
                  <span title={t ? t.label : ""} style={{ background: t ? t.color.replace(")", " / 0.18)") : "transparent", borderBottom: t ? `2.5px solid ${t.color}` : "none", borderRadius: 4, padding: t ? "1px 3px" : 0 }}>{w.word}</span>{" "}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{L.answersReview}</div>
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
