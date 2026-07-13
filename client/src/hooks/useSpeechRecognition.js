import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognitionImpl = typeof window !== "undefined"
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

// Wraps the browser's Web Speech API for live transcription during monitored
// reading. Chrome/Edge support it; Safari/Firefox largely don't — `supported`
// lets callers show a fallback instead of silently producing empty transcripts.
export function useSpeechRecognition({ lang = "en-US" } = {}) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const recRef = useRef(null);
  const finalRef = useRef("");
  const wantListeningRef = useRef(false);

  const supported = !!SpeechRecognitionImpl;

  const start = useCallback(() => {
    if (!SpeechRecognitionImpl) { setError("Speech recognition isn't supported in this browser. Try Chrome or Edge."); return; }
    finalRef.current = "";
    setTranscript("");
    setError(null);
    const rec = new SpeechRecognitionImpl();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + " ";
        else interim += t;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(`Microphone error: ${e.error}`);
    };
    rec.onend = () => {
      // Some browsers auto-stop after a period of silence — restart
      // transparently as long as the student hasn't pressed "finished".
      if (wantListeningRef.current) {
        try { rec.start(); } catch { /* already starting */ }
      }
    };
    recRef.current = rec;
    wantListeningRef.current = true;
    setListening(true);
    try { rec.start(); } catch (e) { setError(String(e)); }
  }, [lang]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    setListening(false);
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* noop */ }
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { transcript, listening, supported, error, start, stop };
}
