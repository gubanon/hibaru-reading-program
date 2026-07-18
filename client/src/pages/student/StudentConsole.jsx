import { useEffect, useState, useCallback } from "react";
import TopBar from "../../components/TopBar";
import { api } from "../../api";
import { strings } from "../../i18n";
import { NAVY } from "../../theme";
import Dashboard from "./Dashboard";
import Profile from "./Profile";
import Vocab from "./Vocab";
import Read from "./Read";
import Quiz from "./Quiz";
import Done from "./Done";

export default function StudentConsole() {
  const [lang, setLang] = useState("en");
  const [step, setStep] = useState("dash");
  const [tasks, setTasks] = useState([]);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [practiced, setPracticed] = useState({});
  const [readingResult, setReadingResult] = useState(null); // { seconds, wpm, score, level, tm }
  const [quizResult, setQuizResult] = useState(null);
  // Wall-clock ms when the reading countdown finished — the one continuous
  // assignment timer that runs through reading AND comprehension.
  const [timerStart, setTimerStart] = useState(null);
  const L = strings(lang);

  const loadTasks = useCallback(() => api.get("/student/tasks").then(d => setTasks(d.tasks)), []);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Light polling while on the dashboard so teacher-side changes (new
  // assignments, edits, deletions) show up without a manual refresh.
  useEffect(() => {
    if (step !== "dash") return;
    const t = setInterval(loadTasks, 20000);
    return () => clearInterval(t);
  }, [step, loadTasks]);

  async function startTask(id) {
    const { assignment } = await api.get(`/student/assignments/${id}`);
    await api.post(`/student/assignments/${id}/start`);
    setActiveAssignment(assignment);
    setPracticed({});
    setReadingResult(null);
    setQuizResult(null);
    setTimerStart(null);
    setStep("vocab");
  }

  async function finishedReading(result) {
    setReadingResult(result);
    // Re-fetch before the quiz so any edits the teacher made after this
    // student started (question changes especially) apply immediately.
    try {
      const { assignment: fresh } = await api.get(`/student/assignments/${activeAssignment.id}`);
      setActiveAssignment(fresh);
    } catch { /* keep the copy we have if the refetch fails */ }
    setStep("quiz");
  }

  function backToDash() {
    setStep("dash");
    setActiveAssignment(null);
    setTimerStart(null);
    loadTasks();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      <TopBar roleLabel="🧑‍🎓 Student" />
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 28px 60px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 4, background: "var(--card-bg)", border: "1px solid var(--input-border)", padding: 3, borderRadius: 9 }}>
            <button onClick={() => setLang("en")} style={{ border: "none", cursor: "pointer", padding: "6px 14px", borderRadius: 7, fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: lang === "en" ? NAVY : "var(--card-bg)", color: lang === "en" ? "#fff" : "var(--text-muted)" }}>ENGLISH</button>
            <button onClick={() => setLang("fil")} style={{ border: "none", cursor: "pointer", padding: "6px 14px", borderRadius: 7, fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: lang === "fil" ? NAVY : "var(--card-bg)", color: lang === "fil" ? "#fff" : "var(--text-muted)" }}>FILIPINO</button>
          </div>
        </div>

        {step === "dash" && <Dashboard L={L} tasks={tasks} onStart={startTask} onProfile={() => setStep("profile")} />}
        {step === "profile" && <Profile L={L} onBack={() => setStep("dash")} />}
        {step === "vocab" && activeAssignment && (
          <Vocab L={L} lang={lang} assignment={activeAssignment} practiced={practiced} setPracticed={setPracticed}
            onNext={() => setStep("read")} />
        )}
        {step === "read" && activeAssignment && (
          <Read L={L} assignment={activeAssignment} timerStart={timerStart} onTimerStart={setTimerStart}
            onFinished={finishedReading} />
        )}
        {step === "quiz" && activeAssignment && (
          <Quiz L={L} assignment={activeAssignment} timerStart={timerStart}
            onSubmitted={result => { setQuizResult(result); setStep("done"); }} />
        )}
        {step === "done" && quizResult && (
          <Done L={L} result={quizResult} onBack={backToDash} />
        )}
      </div>
    </div>
  );
}
