import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import { FAINT, NAVY, GREEN, ACCENT } from "../../theme";
import { Toast } from "../../components/ui";
import QuestionEditor from "../../components/QuestionEditor";
import PassageUpload from "../../components/PassageUpload";

const fieldLabel = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5 };
const inputStyle = { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14, padding: "10px 12px", border: "1px solid var(--input-border)", borderRadius: 8, outline: "none" };

function wordCount(text) { return (text || "").trim().split(/\s+/).filter(Boolean).length; }

function ListView({ groups, onEdit, onView, onPrint, onDocx, onDelete, saveToast }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Assignments</h2>
        <span style={{ fontSize: 12.5, color: FAINT }}>Mga Takdang-Aralin · grouped by month, newest first</span>
      </div>
      {saveToast && <div style={{ marginBottom: 12 }}><Toast>✓ Assignment updated.</Toast></div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 12 }}>
        {groups.map(g => (
          <div key={g.name}>
            <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: ".06em", marginBottom: 8 }}>{g.name}</div>
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden" }}>
              {g.items.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", borderBottom: "1px solid var(--divider)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#E9EDF7", display: "grid", placeItems: "center", fontSize: 19 }}>📄</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button onClick={() => onEdit(a.id)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: ACCENT, textAlign: "left" }}>{a.title}</button>
                    <div style={{ fontSize: 12, color: FAINT, marginTop: 2 }}>{a.dateText} · {a.meta}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 3, color: a.complete ? GREEN : a.partial ? "#B8860B" : "var(--text-faint-2)" }}>✓ {a.doneText}</div>
                  </div>
                  <div style={{ display: "flex", gap: 7 }}>
                    <button onClick={() => onView(a.id)} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "7px 13px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12, fontWeight: 600 }}>👁 View</button>
                    <button onClick={() => onPrint(a.id)} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "7px 13px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12, fontWeight: 600 }}>🖨 Print</button>
                    <button onClick={() => onDocx(a)} style={{ border: "none", cursor: "pointer", padding: "7px 13px", borderRadius: 8, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 12, fontWeight: 600 }}>⬇ DOCX</button>
                    <button onClick={() => onDelete(a)} title="Delete assignment" style={{ border: "1px solid oklch(0.85 0.06 25)", cursor: "pointer", padding: "7px 13px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "#B3261E" }}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!groups.length && <div style={{ color: FAINT, fontSize: 13 }}>No assignments yet — create one from "New Assignment".</div>}
      </div>
    </>
  );
}

function EditView({ id, onBack, onSaved }) {
  const [a, setA] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { api.get(`/teacher/assignments/${id}`).then(d => setA(d.assignment)); }, [id]);

  if (!a) return null;

  function set(field, value) { setA({ ...a, [field]: value }); }
  async function save() {
    setError("");
    if (!a.title.trim() || !a.passage.trim()) { setError("Title and passage are required."); return; }
    if (a.questions.some(q => !q.text.trim() || q.options.some(o => !o.trim()))) {
      setError("Every question needs its text and all 4 answer choices filled in.");
      return;
    }
    try {
      await api.put(`/teacher/assignments/${id}`, {
        title: a.title, instructions: a.instructions, passage: a.passage, genre: a.genre,
        attempts: a.attempts, timeLimit: a.timeLimit, sensitivity: a.sensitivity,
        deadlineISO: a.deadlineISO, questions: a.questions
      });
      onSaved();
    } catch (e) { setError(e.message); }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>← Cancel</button>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Edit Assignment</h2>
        <div style={{ flex: 1 }} />
        <button onClick={save} style={{ border: "none", cursor: "pointer", padding: "10px 22px", borderRadius: 9, background: GREEN, color: "#fff", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700 }}>✓ Save / Update</button>
      </div>
      {error && <div style={{ color: "#B3261E", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, alignItems: "start" }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <div><div style={fieldLabel}>TITLE · PAMAGAT</div><input style={inputStyle} value={a.title} onChange={e => set("title", e.target.value)} /></div>
          <div><div style={fieldLabel}>INSTRUCTIONS · PANUTO</div><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={a.instructions} onChange={e => set("instructions", e.target.value)} /></div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
              <div style={fieldLabel}>READING PASSAGE</div>
              <div style={{ fontSize: 11.5, color: ACCENT, fontWeight: 600 }}>{wordCount(a.passage)} words</div>
            </div>
            <textarea style={{ ...inputStyle, minHeight: 140, resize: "vertical", lineHeight: 1.6 }} value={a.passage} onChange={e => set("passage", e.target.value)} />
            <div style={{ marginTop: 8 }}>
              <PassageUpload onExtracted={text => set("passage", a.passage.trim() ? a.passage.trim() + "\n\n" + text : text)} />
            </div>
          </div>
          <div>
            <div style={fieldLabel}>COMPREHENSION QUESTIONS</div>
            <QuestionEditor questions={a.questions} setQuestions={qs => set("questions", qs)} />
          </div>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 13 }}>
          <div>
            <div style={fieldLabel}>GENRE</div>
            <select style={{ ...inputStyle, padding: "9px 10px" }} value={a.genre} onChange={e => set("genre", e.target.value)}>
              <option value="Fiction">Fiction</option><option value="Non-Fiction">Non-Fiction</option><option value="Poetry">Poetry</option><option value="Informational">Informational</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={fieldLabel}>ATTEMPTS</div>
              <select style={{ ...inputStyle, padding: "9px 10px" }} value={a.attempts} onChange={e => set("attempts", e.target.value)}>
                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="Unlimited">Unlimited</option>
              </select>
            </div>
            <div>
              <div style={fieldLabel}>TIME LIMIT</div>
              <select style={{ ...inputStyle, padding: "9px 10px" }} value={a.timeLimit} onChange={e => set("timeLimit", e.target.value)}>
                <option value="5 minutes">5 minutes</option><option value="10 minutes">10 minutes</option><option value="15 minutes">15 minutes</option><option value="No limit">No limit</option>
              </select>
            </div>
          </div>
          <div>
            <div style={fieldLabel}>PRONUNCIATION SENSITIVITY</div>
            <select style={{ ...inputStyle, padding: "9px 10px" }} value={a.sensitivity} onChange={e => set("sensitivity", e.target.value)}>
              <option value="Relaxed">Relaxed</option><option value="Default">Default</option><option value="Strict">Strict</option>
            </select>
          </div>
          <div>
            <div style={fieldLabel}>DEADLINE</div>
            <input type="date" style={{ ...inputStyle, padding: "9px 10px" }} value={a.deadlineISO} onChange={e => set("deadlineISO", e.target.value)} />
          </div>
        </div>
      </div>
    </>
  );
}

function ViewSheet({ id, onBack }) {
  const [a, setA] = useState(null);
  useEffect(() => { api.get(`/teacher/assignments/${id}`).then(d => setA(d.assignment)); }, [id]);
  if (!a) return null;
  return (
    <>
      <div data-noprint="1" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>← Back</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => api.download(`/teacher/assignments/${id}/docx`, `Assignment - ${a.title}.docx`)} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>⬇ DOCX</button>
        <button onClick={() => window.print()} style={{ border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 8, background: "var(--ink)", color: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>🖨 Print</button>
      </div>
      <div data-print-area="1" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 32, maxWidth: 780, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "2px solid #22335E", paddingBottom: 12, marginBottom: 16 }}>
          <img src="/assets/hibaru-logo-sm.png" alt="" style={{ height: 44 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".08em" }}>READING ASSIGNMENT · {a.className}</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 21, fontWeight: 700 }}>{a.title}</h2>
          </div>
          <img src="/assets/taft-logo.png" alt="" style={{ height: 44 }} />
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12 }}>{a.genre} · {a.wordCount} words · Attempts: {a.attempts} · {a.timeLimit} · Sensitivity: {a.sensitivity} · Due {a.deadlineISO}</div>
        <div style={{ fontSize: 13.5, fontStyle: "italic", color: "var(--text-muted)", padding: "12px 14px", background: "var(--subtle-bg)", borderRadius: 10, marginBottom: 18 }}>{a.instructions}</div>
        <div style={{ fontSize: 15.5, lineHeight: 1.9, marginBottom: 22 }}>{a.passage}</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Comprehension Questions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {a.questions.map((q, i) => (
            <div key={i}>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 5 }}>{i + 1}. {q.text}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 18px", marginLeft: 16 }}>
                {q.options.map((o, oi) => (
                  <div key={oi} style={{ fontSize: 13, color: "var(--text-muted)" }}><b style={{ color: "#22335E" }}>{["A", "B", "C", "D"][oi]}.</b> {o}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function AssignmentsTab() {
  const [groups, setGroups] = useState([]);
  const [mode, setMode] = useState("list");
  const [activeId, setActiveId] = useState(null);
  const [saveToast, setSaveToast] = useState(false);

  const load = useCallback(() => api.get("/teacher/assignments").then(d => setGroups(d.groups)), []);
  useEffect(() => { load(); }, [load]);

  function onSaved() {
    setMode("list");
    setActiveId(null);
    setSaveToast(true);
    load();
    setTimeout(() => setSaveToast(false), 3000);
  }
  function onPrint(id) { setActiveId(id); setMode("view"); setTimeout(() => window.print(), 300); }

  if (mode === "edit" && activeId) return <EditView id={activeId} onBack={() => setMode("list")} onSaved={onSaved} />;
  if (mode === "view" && activeId) return <ViewSheet id={activeId} onBack={() => setMode("list")} />;

  async function onDelete(a) {
    if (!confirm(`Delete "${a.title}"? This also removes all student submissions for it and can't be undone.`)) return;
    await api.del(`/teacher/assignments/${a.id}`);
    load();
  }

  return (
    <ListView
      groups={groups}
      saveToast={saveToast}
      onEdit={id => { setActiveId(id); setMode("edit"); }}
      onView={id => { setActiveId(id); setMode("view"); }}
      onPrint={onPrint}
      onDocx={a => api.download(`/teacher/assignments/${a.id}/docx`, `Assignment - ${a.title}.docx`)}
      onDelete={onDelete}
    />
  );
}
