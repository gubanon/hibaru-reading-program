import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useCamera } from "../../hooks/useCamera";
import { NAVY , ACCENT } from "../../theme";

function timeText(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Read({ L, assignment, timerStart, onTimerStart, onFinished }) {
  // 3-second preparation countdown — the assignment timer, mic, and
  // transcription only start once it reaches zero.
  const [countdown, setCountdown] = useState(timerStart ? 0 : 3);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const intervalRef = useRef(null);
  const { transcript, start, stop, supported, error: speechError } = useSpeechRecognition();
  const { videoRef, error: camError } = useCamera(true);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
    // Countdown finished — start (or resume) the continuous assignment
    // timer, which keeps running through the comprehension questions and
    // only stops when the student submits their answers.
    const startedAt = timerStart || Date.now();
    if (!timerStart) onTimerStart(startedAt);
    start();
    intervalRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => {
      stop();
      clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  async function finish() {
    setBusy(true);
    clearInterval(intervalRef.current);
    stop();
    const seconds = Math.max(1, elapsed);
    const result = await api.post(`/student/assignments/${assignment.id}/finish-reading`, { seconds, transcript });
    onFinished({ ...result, seconds });
  }

  if (countdown > 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, letterSpacing: ".08em", marginBottom: 10 }}>{L.getReady}</div>
        <div style={{ fontSize: 96, fontWeight: 700, color: NAVY, lineHeight: 1 }}>{countdown}</div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 14 }}>{L.readingStartsIn} {countdown}…</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 18, alignItems: "start" }}>
      <div style={{ flex: 1, background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 26 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: ".08em", marginBottom: 8 }}>{L.step2}</div>
        <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 700 }}>{assignment.title}</h2>
        <div style={{ fontSize: 16.5, lineHeight: 2, color: "var(--text)" }}>{assignment.passage}</div>
      </div>
      <div style={{ width: 230, display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 84 }}>
        <div style={{ background: NAVY, borderRadius: 14, padding: 14, color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: ".06em" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF5252", animation: "recblink 1.2s infinite" }} /> {L.camOn}
          </div>
          <div style={{ marginTop: 10, height: 110, borderRadius: 9, overflow: "hidden", background: "#0B1226" }}>
            {camError ? (
              <div style={{ height: "100%", display: "grid", placeItems: "center", fontSize: 10.5, color: "#AEB8D4", padding: 8, textAlign: "center" }}>{camError}</div>
            ) : (
              <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 26, marginTop: 10 }}>
            {[0.7, 0.9, 0.6, 0.8, 0.75].map((d, i) => (
              <div key={i} style={{ flex: 1, background: "#F5B301", borderRadius: 2, height: "100%", animation: `micpulse ${d}s ${i * 0.05}s infinite` }} />
            ))}
          </div>
          {!supported && <div style={{ marginTop: 8, fontSize: 10.5, color: "#F5B301" }}>Speech recognition isn't supported in this browser — try Chrome or Edge for live transcription.</div>}
          {speechError && <div style={{ marginTop: 8, fontSize: 10.5, color: "#F5B301" }}>{speechError}</div>}
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".06em" }}>{L.timeLbl}</div>
          <div style={{ fontSize: 32, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{timeText(elapsed)}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{L.limitLbl} {assignment.timeLimit}</div>
        </div>
        <button disabled={busy} onClick={finish} style={{ border: "none", cursor: "pointer", padding: 14, borderRadius: 11, background: "oklch(0.55 0.13 155)", color: "#fff", fontFamily: "inherit", fontSize: 14.5, fontWeight: 700 }}>{L.finished}</button>
      </div>
    </div>
  );
}
