import { useState } from "react";
import { api } from "../api";
import { GREEN, ACCENT } from "../theme";

const LETTERS = ["A", "B", "C", "D"];
const optionInput = { flex: 1, fontFamily: "inherit", fontSize: 12.5, padding: "7px 9px", border: "1px solid var(--input-border)", borderRadius: 7, outline: "none", background: "var(--card-bg)", color: "var(--text)" };

export function blankQuestion() {
  return { text: "", options: ["", "", "", ""], correct: 0 };
}

function LetterButton({ letter, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? "Correct answer" : `Mark ${letter} as the correct answer`}
      style={{
        width: 26, height: 26, flexShrink: 0, border: "none", cursor: "pointer", borderRadius: "50%",
        background: active ? GREEN : "var(--chip-bg)", color: active ? "#fff" : "var(--text-muted)",
        fontFamily: "inherit", fontSize: 11.5, fontWeight: 700
      }}
    >{active ? "✓" : letter}</button>
  );
}

function QuestionRow({ q, index, onChange, onRemove }) {
  const incomplete = !q.text.trim() || q.options.some(o => !o.trim());
  function setText(text) { onChange(index, { ...q, text }); }
  function setOption(oi, value) { const next = [...q.options]; next[oi] = value; onChange(index, { ...q, options: next }); }
  function setCorrect(oi) { onChange(index, { ...q, correct: oi }); }

  return (
    <div style={{ background: "var(--subtle-bg)", borderRadius: 10, padding: 12, border: incomplete ? "1px solid oklch(0.75 0.15 60)" : "1px solid transparent" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)" }}>{index + 1}.</span>
        <input
          value={q.text} onChange={e => setText(e.target.value)} placeholder="Question text"
          style={{ flex: 1, fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "6px 8px", border: "1px solid var(--input-border)", borderRadius: 7, outline: "none", background: "var(--card-bg)", color: "var(--text)" }}
        />
        <button type="button" onClick={() => onRemove(index)} title="Remove question" style={{ border: "none", cursor: "pointer", background: "none", fontFamily: "inherit", fontSize: 14, color: "#B3261E", fontWeight: 700, padding: "0 4px" }}>✕</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginLeft: 22 }}>
        {q.options.map((o, oi) => (
          <div key={oi} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LetterButton letter={LETTERS[oi]} active={q.correct === oi} onClick={() => setCorrect(oi)} />
            <input value={o} onChange={e => setOption(oi, e.target.value)} placeholder={`Choice ${LETTERS[oi]}`} style={optionInput} />
          </div>
        ))}
      </div>
      {incomplete && <div style={{ fontSize: 10.5, color: "oklch(0.55 0.15 60)", marginTop: 6, marginLeft: 22 }}>Fill in the question and all 4 choices.</div>}
    </div>
  );
}

// `questions` / `setQuestions` hold [{ text, options: [4 strings], correct: 0-3 }].
export default function QuestionEditor({ questions, setQuestions, importPath = "/teacher/parse-questions" }) {
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  function addBlank() { setQuestions([...questions, blankQuestion()]); }
  function updateAt(i, q) { setQuestions(questions.map((old, j) => (j === i ? q : old))); }
  function removeAt(i) { setQuestions(questions.filter((_, j) => j !== i)); }

  async function importFromFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportError("");
    try {
      const { questions: texts } = await api.upload(importPath, file);
      // Imported questions bring text only — choices still need to be typed in.
      setQuestions([...questions, ...texts.map(text => ({ text, options: ["", "", "", ""], correct: 0 }))]);
    } catch (err) { setImportError(err.message); } finally { setImporting(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {questions.map((q, i) => <QuestionRow key={i} q={q} index={i} onChange={updateAt} onRemove={removeAt} />)}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={addBlank} style={{ flex: 1, border: "1.5px dashed var(--input-border)", cursor: "pointer", padding: "9px 12px", borderRadius: 8, background: "none", color: ACCENT, fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>+ Add question</button>
        <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "1.5px dashed var(--input-border)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "var(--text-muted)", fontWeight: 600, cursor: "pointer", background: "none" }}>
          📎 {importing ? "Reading file…" : "Import from DOCX / PDF"}
          <input type="file" accept=".docx,.pdf" onChange={importFromFile} style={{ display: "none" }} />
        </label>
      </div>
      {importError && <div style={{ fontSize: 11.5, color: "#B3261E", marginTop: 6 }}>{importError}</div>}
      <div style={{ fontSize: 10.5, color: "var(--text-faint-2)", marginTop: 6 }}>Click a letter to mark that choice correct. Imported questions bring the question text only — their choices still need to be filled in.</div>
    </div>
  );
}
