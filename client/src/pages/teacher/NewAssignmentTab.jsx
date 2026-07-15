import { useEffect, useState } from "react";
import { api } from "../../api";
import { FAINT, NAVY, ACCENT } from "../../theme";
import { Toast } from "../../components/ui";
import QuestionEditor from "../../components/QuestionEditor";
import PassageUpload from "../../components/PassageUpload";

function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

const fieldLabel = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5 };
const inputStyle = { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14, padding: "10px 12px", border: "1px solid var(--input-border)", borderRadius: 8, outline: "none" };

export default function NewAssignmentTab({ onCreated }) {
  const [classes, setClasses] = useState([]);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [passage, setPassage] = useState("");
  const [classId, setClassId] = useState("");
  const [genre, setGenre] = useState("Fiction");
  const [attempts, setAttempts] = useState("3");
  const [timeLimit, setTimeLimit] = useState("10");
  const [sensitivity, setSensitivity] = useState("Default");
  const [deadline, setDeadline] = useState("");
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(false);

  useEffect(() => {
    api.get("/teacher/classrooms").then(d => {
      setClasses(d.classrooms);
      if (d.classrooms.length) setClassId(d.classrooms[0].id);
    });
  }, [onCreated]);

  async function createAssignment() {
    setError("");
    if (!title.trim() || !passage.trim()) { setError("Please add a title and passage."); return; }
    if (!classId) { setError("Please create a classroom first."); return; }
    if (questions.some(q => !q.text.trim() || q.options.some(o => !o.trim()))) {
      setError("Every question needs its text and all 4 answer choices filled in.");
      return;
    }
    try {
      await api.post("/teacher/assignments", {
        title, instructions, passage, classId, genre, attempts,
        timeLimit: timeLimit === "None" ? "No limit" : `${timeLimit} minutes`,
        sensitivity, deadline, questions
      });
      setTitle(""); setInstructions(""); setPassage(""); setQuestions([]);
      setToast(true);
      setTimeout(() => setToast(false), 3500);
      onCreated && onCreated();
    } catch (e) { setError(e.message); }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>New Reading Assignment</h2>
        <span style={{ fontSize: 12.5, color: FAINT }}>Bagong Takdang-Aralin</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, alignItems: "start" }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={fieldLabel}>TITLE · PAMAGAT</div>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Name of the reading task" />
          </div>
          <div>
            <div style={fieldLabel}>INSTRUCTIONS · PANUTO</div>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Clear directions for the students" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
              <div style={fieldLabel}>READING PASSAGE (upload or paste)</div>
              <div style={{ fontSize: 11.5, color: ACCENT, fontWeight: 600 }}>{wordCount(passage)} words</div>
            </div>
            <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical", lineHeight: 1.6 }} value={passage} onChange={e => setPassage(e.target.value)} placeholder="Paste the passage text here, or upload a file below — word count updates automatically" />
            <div style={{ marginTop: 8 }}>
              <PassageUpload onExtracted={text => setPassage(p => (p.trim() ? p.trim() + "\n\n" + text : text))} />
            </div>
          </div>
          <div>
            <div style={fieldLabel}>COMPREHENSION QUESTIONS ({questions.length})</div>
            <QuestionEditor questions={questions} setQuestions={setQuestions} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 13 }}>
            <div>
              <div style={fieldLabel}>TARGET CLASSROOM</div>
              <select style={{ ...inputStyle, padding: "9px 10px" }} value={classId} onChange={e => setClassId(e.target.value)}>
                {classes.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <div style={fieldLabel}>GENRE</div>
              <select style={{ ...inputStyle, padding: "9px 10px" }} value={genre} onChange={e => setGenre(e.target.value)}>
                <option value="Fiction">Fiction</option><option value="Non-Fiction">Non-Fiction</option><option value="Poetry">Poetry</option><option value="Informational">Informational</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={fieldLabel}>ATTEMPTS</div>
                <select style={{ ...inputStyle, padding: "9px 10px" }} value={attempts} onChange={e => setAttempts(e.target.value)}>
                  <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="Unlimited">Unlimited</option>
                </select>
              </div>
              <div>
                <div style={fieldLabel}>TIME LIMIT</div>
                <select style={{ ...inputStyle, padding: "9px 10px" }} value={timeLimit} onChange={e => setTimeLimit(e.target.value)}>
                  <option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="None">None</option>
                </select>
              </div>
            </div>
            <div>
              <div style={fieldLabel}>PRONUNCIATION SENSITIVITY</div>
              <select style={{ ...inputStyle, padding: "9px 10px" }} value={sensitivity} onChange={e => setSensitivity(e.target.value)}>
                <option value="Relaxed">Relaxed</option><option value="Default">Default</option><option value="Strict">Strict</option>
              </select>
            </div>
            <div>
              <div style={fieldLabel}>DEADLINE</div>
              <input type="date" style={{ ...inputStyle, padding: "9px 10px" }} value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
          {error && <div style={{ color: "#B3261E", fontSize: 13, fontWeight: 600 }}>{error}</div>}
          <button onClick={createAssignment} style={{ border: "none", cursor: "pointer", padding: 14, borderRadius: 10, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 14.5, fontWeight: 700 }}>Assign to class →</button>
          {toast && <Toast>✓ Assignment posted to the classroom.</Toast>}
        </div>
      </div>
    </>
  );
}
