import { useEffect, useState } from "react";
import { api } from "../../api";
import { FAINT, GREEN, AMBER, RED } from "../../theme";
import { StatCard, Bar } from "../../components/ui";

function flattenAssignments(groups) {
  const out = [];
  groups.forEach(g => g.items.forEach(a => out.push(a)));
  return out;
}

export default function AnalyticsTab() {
  const [assignments, setAssignments] = useState([]);
  const [assignmentId, setAssignmentId] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/teacher/assignments").then(d => {
      const flat = flattenAssignments(d.groups);
      setAssignments(flat);
      if (flat.length) setAssignmentId(flat[0].id);
    });
  }, []);

  useEffect(() => {
    if (assignmentId) api.get(`/teacher/assignments/${assignmentId}/analytics`).then(setData);
  }, [assignmentId]);

  if (!assignments.length) return <div style={{ color: FAINT, fontSize: 13 }}>No assignments yet.</div>;
  if (!data) return null;

  const maxLvl = Math.max(1, data.levels.Independent, data.levels.Instructional, data.levels.Frustration);
  const levels = [
    { label: "Independent", count: data.levels.Independent, color: GREEN },
    { label: "Instructional", count: data.levels.Instructional, color: AMBER },
    { label: "Frustration", count: data.levels.Frustration, color: RED }
  ];

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Class Analytics</h2>
        <span style={{ fontSize: 12.5, color: FAINT }}>Buod ng Klase</span>
        <div style={{ flex: 1 }} />
        <select value={assignmentId || ""} onChange={e => setAssignmentId(e.target.value)}
          style={{ fontFamily: "inherit", fontSize: 13, padding: "9px 12px", border: "1px solid #E0DED5", borderRadius: 8, background: "#fff" }}>
          {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
        {data.stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>
      <div style={{ background: "#fff", border: "1px solid #E7E5DD", borderRadius: 14, padding: 22 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Reading Profiles — turned-in submissions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
          {levels.map(lv => (
            <div key={lv.label} style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px", gap: 10, alignItems: "center", fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{lv.label}</div>
              <div style={{ height: 22, background: "#F0EEE7", borderRadius: 7, overflow: "hidden" }}>
                <div style={{ height: "100%", background: lv.color, width: `${Math.round(lv.count / maxLvl * 100)}%` }} />
              </div>
              <div style={{ color: "#6B6A63" }}>{lv.count} student(s)</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: "#8A897F" }}>Word Reading: 97–100 Independent · 90–96 Instructional · ≤89 Frustration &nbsp;&nbsp;|&nbsp;&nbsp; Comprehension: 80–100 Independent · 59–79 Instructional · ≤58 Frustration</div>
      </div>
    </>
  );
}
