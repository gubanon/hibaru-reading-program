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
  const L = strings(lang);

  const loadTasks = useCallback(() => api.get("/student/tasks").then(d => setTasks(d.tasks)), []);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function startTask(id) {
    const { assignment, submission } = await api.get(`/student/assignments/${id}`);
    await api.post(`/student/assignments/${id}/start`);
    setActiveAssignment(assignment);
    setPracticed({});
    setReadingResult(null);
    setQuizResult(null);
    setStep("vocab");
  }

  function backToDash() {
    setStep("dash");
    setActiveAssignment(null);
    loadTasks();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F6F5F1" }}>
      <TopBar roleLabel="🧑‍🎓 Student" />
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 28px 60px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #E0DED5", padding: 3, borderRadius: 9 }}>
            <button onClick={() => setLang("en")} style={{ border: "none", cursor: "pointer", padding: "6px 14px", borderRadius: 7, fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: lang === "en" ? NAVY : "#fff", color: lang === "en" ? "#fff" : "#4A4940" }}>ENGLISH</button>
            <button onClick={() => setLang("fil")} style={{ border: "none", cursor: "pointer", padding: "6px 14px", borderRadius: 7, fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: lang === "fil" ? NAVY : "#fff", color: lang === "fil" ? "#fff" : "#4A4940" }}>FILIPINO</button>
          </div>
        </div>

        {step === "dash" && <Dashboard L={L} tasks={tasks} onStart={startTask} onProfile={() => setStep("profile")} />}
        {step === "profile" && <Profile L={L} onBack={() => setStep("dash")} />}
        {step === "vocab" && activeAssignment && (
          <Vocab L={L} lang={lang} assignment={activeAssignment} practiced={practiced} setPracticed={setPracticed}
            onNext={() => setStep("read")} />
        )}
        {step === "read" && activeAssignment && (
          <Read L={L} assignment={activeAssignment}
            onFinished={result => { setReadingResult(result); setStep("quiz"); }} />
        )}
        {step === "quiz" && activeAssignment && (
          <Quiz L={L} assignment={activeAssignment}
            onSubmitted={result => { setQuizResult(result); setStep("done"); }} />
        )}
        {step === "done" && quizResult && (
          <Done L={L} result={quizResult} onBack={backToDash} />
        )}
      </div>
    </div>
  );
}
