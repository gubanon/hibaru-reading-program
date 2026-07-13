import { useEffect, useState, useCallback } from "react";
import TopBar from "../../components/TopBar";
import { api } from "../../api";
import { Pill, StatCard } from "../../components/ui";
import { NAVY } from "../../theme";

const TABS = [
  { id: "overview", label: "📋 Overview" },
  { id: "teachers", label: "👩‍🏫 Teachers" },
  { id: "learners", label: "🧑‍🎓 Learners" }
];

export default function AdminConsole() {
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [learners, setLearners] = useState([]);

  const loadOverview = useCallback(() => api.get("/admin/overview").then(setOverview), []);
  const loadTeachers = useCallback(() => api.get("/admin/teachers").then(d => setTeachers(d.teachers)), []);
  const loadLearners = useCallback(() => api.get("/admin/learners").then(d => setLearners(d.learners)), []);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { if (tab === "teachers") loadTeachers(); }, [tab, loadTeachers]);
  useEffect(() => { if (tab === "learners") loadLearners(); }, [tab, loadLearners]);

  async function approve(id) { await api.post(`/admin/teachers/${id}/approve`); loadTeachers(); loadOverview(); }
  async function reject(id) { await api.post(`/admin/teachers/${id}/reject`); loadTeachers(); loadOverview(); }
  async function suspend(id) { await api.post(`/admin/teachers/${id}/suspend`); loadTeachers(); loadOverview(); }

  return (
    <div style={{ minHeight: "100vh", background: "#F6F5F1" }}>
      <TopBar roleLabel="🛡️ Admin" />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 28px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F5B301", color: NAVY, display: "grid", placeItems: "center", fontSize: 19 }}>🛡️</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Admin Console</h2>
            <div style={{ fontSize: 12, color: "#8A897F" }}>Full program oversight · Taft National High School (303529)</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
          {TABS.map(t => <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Pill>)}
        </div>

        {tab === "overview" && overview && (
          <>
            {overview.pendingCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderRadius: 12, background: "oklch(0.95 0.05 90)", color: "oklch(0.42 0.1 75)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                ⏳ {overview.pendingCount} teacher account(s) awaiting your approval — see the Teachers tab.
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {overview.stats.map((s, i) => <StatCard key={i} {...s} />)}
            </div>
          </>
        )}

        {tab === "teachers" && (
          <div style={{ background: "#fff", border: "1px solid #E7E5DD", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.6fr 1.2fr 180px", gap: 8, padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "#8A897F", letterSpacing: ".04em", borderBottom: "1px solid #EFEDE6" }}>
              <div>NAME</div><div>EMAIL</div><div>POSITION</div><div>STATUS</div><div></div>
            </div>
            {teachers.map(r => {
              const isPending = r.status === "pending" || r.status === "Pending approval";
              const active = r.status === "active" || r.status === "Active";
              return (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.6fr 1.2fr 180px", gap: 8, padding: "13px 18px", alignItems: "center", borderBottom: "1px solid #F4F2EC", fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: NAVY, color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>
                      {r.name.split(" ").map(p => p[0]).join("").slice(0, 2)}
                    </div>
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                  </div>
                  <div style={{ color: "#6B6A63" }}>{r.email}</div>
                  <div style={{ color: "#6B6A63" }}>{r.position}</div>
                  <div>
                    <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: active ? "oklch(0.93 0.05 155)" : "oklch(0.95 0.05 90)", color: active ? "oklch(0.4 0.1 155)" : "oklch(0.5 0.1 75)" }}>
                      {active ? "Active" : "Pending approval"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {isPending && (
                      <>
                        <button onClick={() => approve(r.id)} style={{ border: "none", cursor: "pointer", padding: "7px 13px", borderRadius: 8, background: "oklch(0.55 0.13 155)", color: "#fff", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700 }}>✓ Approve</button>
                        <button onClick={() => reject(r.id)} style={{ border: "1px solid #E0DED5", cursor: "pointer", padding: "7px 11px", borderRadius: 8, background: "#fff", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "#B3261E" }}>✕</button>
                      </>
                    )}
                    {active && (
                      <button onClick={() => suspend(r.id)} style={{ border: "1px solid #E0DED5", cursor: "pointer", padding: "7px 13px", borderRadius: 8, background: "#fff", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "#6B6A63" }}>Suspend</button>
                    )}
                  </div>
                </div>
              );
            })}
            {!teachers.length && <div style={{ padding: 24, color: "#8A897F", fontSize: 13 }}>No teacher accounts yet.</div>}
          </div>
        )}

        {tab === "learners" && (
          <div style={{ background: "#fff", border: "1px solid #E7E5DD", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2.2fr .8fr 1.4fr 2fr", gap: 8, padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "#8A897F", letterSpacing: ".04em", borderBottom: "1px solid #EFEDE6" }}>
              <div>LEARNER</div><div>SEX</div><div>CLASS / SECTION</div><div>EMAIL</div>
            </div>
            {learners.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2.2fr .8fr 1.4fr 2fr", gap: 8, padding: "12px 18px", alignItems: "center", borderBottom: "1px solid #F4F2EC", fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#E7E5DD", display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 700, color: "#6B6A63" }}>
                    {r.name.slice(0, 1)}
                  </div>
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                </div>
                <div style={{ color: "#6B6A63" }}>{r.sex}</div>
                <div style={{ color: "#6B6A63" }}>{r.className}</div>
                <div style={{ color: "#A9A89E", fontSize: 12 }}>{r.email}</div>
              </div>
            ))}
            {!learners.length && <div style={{ padding: 24, color: "#8A897F", fontSize: 13 }}>No learners yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
