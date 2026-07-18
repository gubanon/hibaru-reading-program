import { MISCUE_TYPES, levelColor, GREEN } from "../../theme";

function timeText(secs) {
  const m = Math.floor((secs || 0) / 60), s = (secs || 0) % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: ".07em", margin: "22px 0 10px" }}>{children}</div>;
}

function Tile({ label, value, sub, color }) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 13, padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".05em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: color || "var(--text)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{sub}</div>}
    </div>
  );
}

// The 5-row Phil-IRI profile matrix, with the row that produced this
// student's result highlighted.
const MATRIX = [
  { wrl: "Independent", rcl: "Independent", frl: "Independent" },
  { wrl: "Independent", rcl: "Instructional", frl: "Instructional" },
  { wrl: "Instructional", rcl: "Independent", frl: "Instructional" },
  { wrl: "Instructional", rcl: "Instructional", frl: "Instructional" },
  { wrl: "Frustration (either)", rcl: "Any level", frl: "Frustration", frustration: true }
];

function matrixRowIndex(level, compLevel) {
  if (level === "Frustration" || compLevel === "Frustration") return 4;
  return MATRIX.findIndex(r => r.wrl === level && r.rcl === compLevel);
}

// Shared PART A / B / C presentation of one submission's results.
// `r` needs: wpm, score, level, acc, correct, items, compLevel, profile,
// tm, words, seconds, totalSeconds, miscues; `individualMiscues` (optional)
// is [{word, type}] for the every-single-miscue list.
export default function ResultParts({ L, r, individualMiscues }) {
  const rowIdx = matrixRowIndex(r.level, r.compLevel);
  return (
    <>
      <SectionTitle>{L.partA}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Tile label={L.timeReadingLbl} value={timeText(r.seconds)} sub={`${r.seconds}s`} />
        <Tile label={L.combinedTimeLbl} value={timeText(r.totalSeconds)} sub={r.totalSeconds ? `${r.totalSeconds}s` : "—"} />
        <Tile label={L.readingRate} value={`${r.wpm} wpm`} />
        <Tile label={L.compScoreLbl} value={`${r.correct}/${r.items}`} sub={`${r.acc}% · ${r.compLevel}`} color={levelColor(r.compLevel)} />
      </div>

      <SectionTitle>{L.partB}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: individualMiscues ? "1fr 1fr" : "1fr", gap: 12, alignItems: "start" }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 13, padding: 16 }}>
          {MISCUE_TYPES.map(t => (
            <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "3px 0" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
              <span style={{ color: "var(--text-muted)", flex: 1 }}>{t.label} <i style={{ color: "var(--text-faint-2)" }}>{t.fil}</i></span>
              <span style={{ fontWeight: 700 }}>{(r.miscues && r.miscues[t.key]) || 0}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--divider)", marginTop: 8, paddingTop: 8, display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><b>{L.totalMiscuesLbl}</b><b>{r.tm}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}><span>{L.wordsInPassage}</span><span>{r.words}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><b>{L.wordScore}</b><b style={{ color: levelColor(r.level) }}>{r.score}% · {r.level}</b></div>
          </div>
        </div>
        {individualMiscues && (
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 13, padding: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".04em", marginBottom: 8 }}>{L.miscueDetails} · {individualMiscues.length}</div>
            {individualMiscues.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
                {individualMiscues.map((mw, i) => {
                  const t = MISCUE_TYPES.find(x => x.key === mw.type);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                      <span style={{ color: "var(--text-faint-2)", width: 20, textAlign: "right" }}>{i + 1}.</span>
                      <span style={{ fontWeight: 700 }}>{mw.word}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "#fff", background: t?.color || "var(--text-faint)", padding: "2px 8px", borderRadius: 999 }}>{t?.label || mw.type}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: GREEN, fontWeight: 600 }}>{L.noMiscues}</div>
            )}
          </div>
        )}
      </div>

      <SectionTitle>{L.partC}</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "stretch" }}>
        <div style={{ border: `2px solid ${levelColor(r.profile)}`, borderRadius: 13, padding: "16px 26px", display: "grid", placeItems: "center", textAlign: "center", background: "var(--card-bg)" }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".05em" }}>{L.readingLevel}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: levelColor(r.profile) }}>{r.profile}</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{L.wordReadingLbl} {r.level} × {L.compShortLbl} {r.compLevel}</div>
          </div>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 13, padding: 12, fontSize: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontWeight: 700, color: "var(--text-faint)", fontSize: 10.5, letterSpacing: ".04em", padding: "2px 8px" }}>
            <div>{L.wordReadingLbl} (WRL)</div><div>{L.compShortLbl} (RCL)</div><div>{L.readingLevel} (FRL)</div>
          </div>
          {MATRIX.map((row, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: "4px 8px", borderRadius: 7,
              background: i === rowIdx ? "var(--subtle-bg)" : "transparent",
              border: i === rowIdx ? `1.5px solid ${levelColor(row.frl)}` : "1.5px solid transparent",
              color: i === rowIdx ? "var(--text)" : "var(--text-faint)"
            }}>
              <div>{row.wrl}</div><div>{row.rcl}</div><div style={{ fontWeight: 700, color: i === rowIdx ? levelColor(row.frl) : undefined }}>{row.frl}</div>
            </div>
          ))}
          <div style={{ fontSize: 10.5, color: "var(--text-faint-2)", marginTop: 6, padding: "0 8px" }}>{L.profileMatrixNote}</div>
        </div>
      </div>
    </>
  );
}
