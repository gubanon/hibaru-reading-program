import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import { NAVY, GREEN, FAINT } from "../../theme";

const CHIP_COLORS = [NAVY, GREEN, "#B8860B"];
const inputSm = { fontFamily: "inherit", fontSize: 12, padding: "7px 9px", border: "1px solid #E0DED5", borderRadius: 7, outline: "none", background: "#fff" };

function StudentRow({ s }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 8px", background: "#FAF9F5", borderRadius: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#E7E5DD", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#6B6A63" }}>
        {(s.given[0] || "") + (s.surname[0] || "")}
      </div>
      <span style={{ fontWeight: 500 }}>{s.surname.toUpperCase()}, {s.given} {s.mi}</span>
      <span style={{ color: "#A9A89E", fontSize: 11.5, marginLeft: "auto" }}>{s.grade}</span>
    </div>
  );
}

function ClassCard({ c, idx, onChanged }) {
  const [inv, setInv] = useState({ surname: "", given: "", mi: "", sex: "M", grade: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const males = c.students.filter(s => s.sex === "M").sort((a, b) => a.surname.localeCompare(b.surname));
  const females = c.students.filter(s => s.sex !== "M").sort((a, b) => a.surname.localeCompare(b.surname));

  async function invite() {
    setErr("");
    if (!inv.surname.trim() || !inv.given.trim()) { setErr("Please enter at least Surname and Given Name."); return; }
    setBusy(true);
    try {
      await api.post(`/teacher/classrooms/${c.id}/students`, inv);
      setInv({ surname: "", given: "", mi: "", sex: "M", grade: "", email: "" });
      onChanged();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #E7E5DD", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: CHIP_COLORS[idx % 3], color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 }}>
          {c.name.replace(/Grade /, "G").slice(0, 2)}
        </div>
        <div style={{ fontWeight: 700, fontSize: 15.5 }}>{c.name}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "14px 0 10px", fontSize: 12.5, color: FAINT }}>
        <span>{c.students.length} students</span>
        <span>{c.assignmentCount} assignments</span>
        <button onClick={() => api.download(`/teacher/classrooms/${c.id}/docx`, `Consolidated Report - ${c.name}.docx`).catch(e => setErr(e.message))}
          style={{ marginLeft: "auto", border: "1px solid #E0DED5", cursor: "pointer", padding: "6px 12px", borderRadius: 8, background: "#fff", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: NAVY }}>
          ⬇ DOCX Consolidated Report
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, letterSpacing: ".06em", marginTop: 2 }}>MALE</div>
        {males.map(s => <StudentRow key={s.id} s={s} />)}
        <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, letterSpacing: ".06em", marginTop: 6 }}>FEMALE</div>
        {females.map(s => <StudentRow key={s.id} s={s} />)}
      </div>
      <div style={{ marginTop: 14, padding: 12, background: "#FAF9F5", borderRadius: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, letterSpacing: ".05em", marginBottom: 8 }}>ADD / INVITE STUDENT</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr .5fr", gap: 6 }}>
          <input style={inputSm} value={inv.surname} onChange={e => setInv({ ...inv, surname: e.target.value })} placeholder="SURNAME" />
          <input style={inputSm} value={inv.given} onChange={e => setInv({ ...inv, given: e.target.value })} placeholder="Given Name" />
          <input style={inputSm} value={inv.mi} onChange={e => setInv({ ...inv, mi: e.target.value })} placeholder="M.I." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: ".6fr 1fr 1.4fr", gap: 6, marginTop: 6 }}>
          <select style={inputSm} value={inv.sex} onChange={e => setInv({ ...inv, sex: e.target.value })}>
            <option value="M">Male</option><option value="F">Female</option>
          </select>
          <input style={inputSm} value={inv.grade} onChange={e => setInv({ ...inv, grade: e.target.value })} placeholder="Grade & Section" />
          <input style={inputSm} value={inv.email} onChange={e => setInv({ ...inv, email: e.target.value })} placeholder="student@deped.gov.ph" />
        </div>
        {err && <div style={{ color: "#B3261E", fontSize: 11.5, marginTop: 6 }}>{err}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1, fontSize: 10.5, color: "#A9A89E" }}>School, Division &amp; Region auto-fill: Taft NHS (303529) · Eastern Samar · Region VIII</div>
          <button disabled={busy} onClick={invite} style={{ border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 8, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>Invite</button>
        </div>
      </div>
    </div>
  );
}

export default function ClassroomsTab() {
  const [classrooms, setClassrooms] = useState([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => api.get("/teacher/classrooms").then(d => { setClassrooms(d.classrooms); setLoading(false); }), []);
  useEffect(() => { load(); }, [load]);

  async function createClass() {
    if (!newName.trim()) return;
    await api.post("/teacher/classrooms", { name: newName.trim() });
    setNewName("");
    load();
  }

  if (loading) return null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Classrooms</h2>
        <span style={{ fontSize: 12.5, color: FAINT }}>Mga Silid-Aralan</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(400px,1fr))", gap: 16 }}>
        {classrooms.map((c, i) => <ClassCard key={c.id} c={c} idx={i} onChanged={load} />)}
        <div style={{ border: "2px dashed #DDDACE", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#6B6A63" }}>Create a classroom</div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Grade 8 – Bonifacio"
            style={{ fontFamily: "inherit", fontSize: 13, padding: "10px 12px", border: "1px solid #E0DED5", borderRadius: 8, outline: "none" }} />
          <button onClick={createClass} style={{ border: "none", cursor: "pointer", padding: "10px 14px", borderRadius: 8, background: "#26251F", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>+ Create</button>
        </div>
      </div>
    </>
  );
}
