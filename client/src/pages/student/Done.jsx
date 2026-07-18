import ResultParts, { MarkedPassage } from "./ResultParts";

export default function Done({ L, result, onBack }) {
  const individualMiscues = (result.marked || []).filter(w => w.type);
  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 44 }}>🎉</div>
        <h2 style={{ margin: "8px 0 4px", fontSize: 24, fontWeight: 700 }}>{L.doneTitle}</h2>
        <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>{L.doneSub}</div>
      </div>
      <ResultParts L={L} r={result} individualMiscues={result.marked ? individualMiscues : undefined} />
      {result.marked && result.marked.length > 0 && <MarkedPassage L={L} marked={result.marked} />}
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button onClick={onBack} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "12px 24px", borderRadius: 10, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}>{L.backDash}</button>
      </div>
    </>
  );
}
