import { useRef, useState } from "react";
import { api } from "../../api";
import { NAVY , ACCENT } from "../../theme";

const SpeechRecognitionImpl = typeof window !== "undefined"
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export default function Vocab({ L, lang, assignment, practiced, setPracticed, onNext }) {
  const [activeWord, setActiveWord] = useState(null);
  const [warn, setWarn] = useState("");
  const recRef = useRef(null);

  const vocabAll = Object.keys(practiced).length >= assignment.vocab.length;

  function practiceWord(w) {
    if (practiced[w]) return;
    setWarn("");
    if (!SpeechRecognitionImpl) {
      // No mic support in this browser — still let the student mark it practiced.
      markPracticed(w);
      return;
    }
    const rec = new SpeechRecognitionImpl();
    rec.lang = lang === "fil" ? "fil-PH" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recRef.current = rec;
    setActiveWord(w);
    rec.onresult = () => markPracticed(w);
    rec.onerror = (e) => {
      setActiveWord(null);
      if (e.error !== "aborted") setWarn("Didn't catch that — tap the word and try again.");
    };
    rec.onend = () => setActiveWord(a => (a === w ? null : a));
    try { rec.start(); } catch { markPracticed(w); }
  }

  async function markPracticed(w) {
    setActiveWord(null);
    const { practiced: fresh } = await api.post(`/student/assignments/${assignment.id}/practice`, { word: w });
    setPracticed(fresh);
  }

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: ".08em" }}>{L.step1}</div>
        <h2 style={{ margin: "8px 0 4px", fontSize: 23, fontWeight: 700 }}>{L.step1Title}</h2>
        <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>{L.step1Sub}</div>
        {warn && <div style={{ fontSize: 12.5, color: "#B3261E", marginTop: 8 }}>{warn}</div>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 26 }}>
        {assignment.vocab.map(v => {
          const done = !!practiced[v.word];
          const listening = activeWord === v.word;
          return (
            <button key={v.word} onClick={() => practiceWord(v.word)}
              style={{ border: `2px solid ${done ? "oklch(0.7 0.1 155)" : listening ? NAVY : "var(--input-border)"}`, cursor: "pointer", padding: "18px 14px", borderRadius: 14, background: done ? "oklch(0.96 0.03 155)" : "var(--card-bg)", fontFamily: "inherit", textAlign: "center" }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--text)" }}>{v.word}</div>
              <div style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.5, color: "var(--text-muted)" }}>{lang === "fil" ? v.defFil : v.def}</div>
              <div style={{ fontSize: 12, marginTop: 8, fontWeight: 600, color: done ? "oklch(0.5 0.12 155)" : listening ? NAVY : "var(--text-faint)" }}>
                {done ? L.unlocked : listening ? L.listening : L.tapSay}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ textAlign: "center" }}>
        <button onClick={onNext} disabled={!vocabAll}
          style={{ border: "none", cursor: vocabAll ? "pointer" : "default", padding: "14px 32px", borderRadius: 11, background: vocabAll ? NAVY : "#C9C7BC", color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 700 }}>
          {vocabAll ? L.startReading : `${L.unlockFirst.replace("{n}", assignment.vocab.length)} (${Object.keys(practiced).length}/${assignment.vocab.length})`}
        </button>
      </div>
    </>
  );
}
