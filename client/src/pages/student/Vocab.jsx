import { useRef, useState } from "react";
import { api } from "../../api";
import { NAVY , ACCENT } from "../../theme";

const SpeechRecognitionImpl = typeof window !== "undefined"
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9À-ɏ\s]/g, "").trim();
}

export default function Vocab({ L, lang, assignment, practiced, setPracticed, onNext }) {
  const [activeWord, setActiveWord] = useState(null);
  const [warn, setWarn] = useState("");
  const recRef = useRef(null);

  const vocabAll = Object.keys(practiced).length >= assignment.vocab.length;
  // Words unlock strictly in order: only the first unpracticed word is
  // tappable; everything after it stays locked until it's said correctly.
  const nextWord = assignment.vocab.find(v => !practiced[v.word])?.word ?? null;

  function practiceWord(w) {
    if (practiced[w] || w !== nextWord) return;
    setWarn("");
    if (!SpeechRecognitionImpl) {
      // No mic support in this browser — still let the student mark it practiced.
      markPracticed(w);
      return;
    }
    const rec = new SpeechRecognitionImpl();
    rec.lang = lang === "fil" ? "fil-PH" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    recRef.current = rec;
    setActiveWord(w);
    rec.onresult = (e) => {
      // High-sensitivity evaluation: the word only unlocks when one of the
      // recognizer's guesses IS the target word (or contains it as an exact
      // whole word) — no partial/fuzzy credit.
      const target = normalize(w);
      const alts = Array.from(e.results[0]).map(alt => normalize(alt.transcript));
      const said = alts.some(t => t === target || t.split(/\s+/).includes(target));
      if (said) markPracticed(w);
      else { setActiveWord(null); setWarn(L.tryAgainWord); }
    };
    rec.onerror = (e) => {
      setActiveWord(null);
      if (e.error !== "aborted") setWarn("Didn't catch that — tap the word and try again.");
    };
    rec.onend = () => setActiveWord(a => (a === w ? null : a));
    try { rec.start(); } catch { markPracticed(w); }
  }

  async function markPracticed(w) {
    setActiveWord(null);
    setWarn("");
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
          const isNext = v.word === nextWord;
          const locked = !done && !isNext;
          return (
            <button key={v.word} onClick={() => practiceWord(v.word)} disabled={locked}
              style={{ border: `2px solid ${done ? "oklch(0.7 0.1 155)" : listening ? NAVY : "var(--input-border)"}`, cursor: locked ? "default" : "pointer", padding: "18px 14px", borderRadius: 14, background: done ? "oklch(0.96 0.03 155)" : "var(--card-bg)", fontFamily: "inherit", textAlign: "center", opacity: locked ? 0.45 : 1 }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: "var(--text)" }}>{v.word}</div>
              <div style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.5, color: "var(--text-muted)" }}>{lang === "fil" ? v.defFil : v.def}</div>
              <div style={{ fontSize: 12, marginTop: 8, fontWeight: 600, color: done ? "oklch(0.5 0.12 155)" : listening ? NAVY : "var(--text-faint)" }}>
                {done ? L.unlocked : listening ? L.listening : locked ? L.lockedWord : L.tapSay}
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
