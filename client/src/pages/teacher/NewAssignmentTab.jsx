import { useEffect, useState } from "react";
import { api } from "../../api";
import { FAINT, NAVY } from "../../theme";
import { Toast } from "../../components/ui";

function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

const fieldLabel = { fontSize: 12, fontWeight: 600, color: "#6B6A63", marginBottom: 5 };
const inputStyle = { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14, padding: "10px 12px", border: "1px solid #E0DED5", borderRadius: 8, outline: "none" };
const dropZone = { flex: 1, border: "1.5px dashed #DDDACE", borderRadius: 8, padding: 10, fontSize: 11.5, color: "#A9A89E", fontFamily: "monospace", textAlign: "center", background: "repeating-linear-gradient(45deg,#FCFBF8,#FCFBF8 8px,#F6F5F0 8px,#F6F5F0 16px)" };

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
  const [newQ, setNewQ] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    api.get("/teacher/classrooms").then(d => {
      setClasses(d.classrooms);
      if (d.classrooms.length) setClassId(d.classrooms[0].id);
    });
  }, [onCreated]);

  function addQuestion() {
    const q = newQ.trim();
    if (!q) return;
    setQuestions([...questions, q]);
    setNewQ("");
  }

  async function importQuestions(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setError("");
    try {
      const { questions: qs } = await api.upload("/teacher/parse-questions", file);
      setQuestions([...questions, ...qs]);
    } catch (err) { setError(err.message); } finally { setImporting(false); }
  }

  async function createAssignment() {
    setError("");
    if (!title.trim() || !passage.trim()) { setError("Please add a title and passage."); return; }
    if (!classId) { setError("Please create a classroom first."); return; }
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
        <div style={{ background: "#fff", border: "1px solid #E7E5DD", borderRadius: 14, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
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
              <div style={{ fontSize: 11.5, color: NAVY, fontWeight: 600 }}>{wordCount(passage)} words</div>
            </div>
            <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical", lineHeight: 1.6 }} value={passage} onChange={e => setPassage(e.target.value)} placeholder="Paste the passage text here — word count updates automatically" />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <div style={dropZone}>📄 paste text above — file/image upload not yet supported</div>
              <div style={dropZone}>🎬 optional video attachment (coming soon)</div>
            </div>
          </div>
          <div>
            <div style={fieldLabel}>COMPREHENSION QUESTIONS ({questions.length})</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="Type a question, then Add" onKeyDown={e => e.key === "Enter" && addQuestion()} />
              <button onClick={addQuestion} style={{ border: "none", cursor: "pointer", padding: "9px 16px", borderRadius: 8, background: "#F0EEE7", color: "#26251F", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>Add</button>
            </div>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8, border: "1.5px dashed #DDDACE", borderRadius: 8, padding: 10, fontSize: 12, color: "#6B6A63", fontWeight: 600, cursor: "pointer", background: "#FCFBF8" }}>
              📎 {importing ? "Reading file…" : "Upload questions from DOCX / PDF"}
              <input type="file" accept=".docx,.pdf" onChange={importQuestions} style={{ display: "none" }} />
            </label>
            <div style={{ fontSize: 10.5, color: "#A9A89E", marginTop: 4 }}>One question per line, ending with "?" — they'll be added to the list below.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
              {questions.map((q, i) => (
                <div key={i} style={{ fontSize: 12.5, padding: "7px 10px", background: "#FAF9F5", borderRadius: 7, color: "#4A4940" }}>{i + 1}. {q}</div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fff", border: "1px solid #E7E5DD", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 13 }}>
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
