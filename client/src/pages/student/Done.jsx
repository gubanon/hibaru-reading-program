import { levelColor } from "../../theme";

function timeText(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Done({ L, result, onBack }) {
  // Fixed presentation order: Reading Rate → Word Score → Comprehension →
  // Reading Level.
  const stats = [
    { label: L.readingRate, value: `${result.wpm} wpm`, sub: `${timeText(result.seconds)} ${L.readingTime}`, color: "var(--text)" },
    { label: L.wordScore, value: `${result.score}%`, sub: `${result.tm} ${L.miscuesDetected}`, color: levelColor(result.level) },
    { label: L.comprehension, value: `${result.correct}/${result.items}`, sub: `${result.acc}% · ${result.compLevel}`, color: levelColor(result.compLevel) },
    { label: L.readingLevel, value: result.level, sub: L.wordReadingLevel, color: levelColor(result.level) }
  ];
  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 44 }}>🎉</div>
        <h2 style={{ margin: "8px 0 4px", fontSize: 24, fontWeight: 700 }}>{L.doneTitle}</h2>
        <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>{L.doneSub}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, maxWidth: 820, margin: "0 auto 20px" }}>
        {stats.map((d, i) => (
          <div key={i} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 13, padding: 18, textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".05em" }}>{d.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: d.color }}>{d.value}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{d.sub}</div>
          </div>
        ))}
      </div>
      {result.totalSeconds > 0 && (
        <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--text-faint)", marginBottom: 16 }}>
          ⏱ {timeText(result.totalSeconds)} {L.totalTime}
        </div>
      )}
      <div style={{ textAlign: "center" }}>
        <button onClick={onBack} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "12px 24px", borderRadius: 10, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}>{L.backDash}</button>
      </div>
    </>
  );
}
