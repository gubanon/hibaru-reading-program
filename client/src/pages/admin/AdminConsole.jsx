import { useEffect, useState, useCallback } from "react";
import TopBar from "../../components/TopBar";
import { api } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { Pill, StatCard, Field, TextInput, PasswordInput, PrimaryButton } from "../../components/ui";
import { NAVY , ACCENT } from "../../theme";
import EditTeacherModal from "./EditTeacherModal";

const BASE_TABS = [
  { id: "overview", label: "📋 Overview" },
  { id: "teachers", label: "👩‍🏫 Teachers" },
  { id: "learners", label: "🧑‍🎓 Learners" }
];

function DelegateAdminForm({ onCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      await api.post("/admin/admins", { name, email, password });
      setName(""); setEmail(""); setPassword("");
      onCreated();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div style={{ border: "2px dashed #DDDACE", borderRadius: 14, padding: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>Delegate a new admin</div>
      <Field label="FULL NAME"><TextInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Maria Santos" /></Field>
      <Field label="EMAIL OR USERNAME"><TextInput value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" /></Field>
      <Field label="PASSWORD"><PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></Field>
      {error && <div style={{ marginBottom: 12, fontSize: 12.5, color: "#B3261E", fontWeight: 600 }}>{error}</div>}
      <PrimaryButton disabled={busy} onClick={submit} style={{ width: "100%", padding: 12 }}>+ Create admin</PrimaryButton>
    </div>
  );
}

function LearnerRow({ r }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, padding: "8px 10px", background: "var(--subtle-bg)", borderRadius: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--card-border)", display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)" }}>
        {r.name.slice(0, 1)}
      </div>
      <span style={{ fontWeight: 500 }}>{r.name}</span>
      <span style={{ color: "var(--text-faint-2)", fontSize: 11.5, marginLeft: "auto" }}>{r.email}</span>
    </div>
  );
}

export default function AdminConsole() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [learnerGroups, setLearnerGroups] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [editingTeacher, setEditingTeacher] = useState(null);

  const tabs = user?.isMaster ? [...BASE_TABS, { id: "admins", label: "🛡️ Admins" }] : BASE_TABS;

  const loadOverview = useCallback(() => api.get("/admin/overview").then(setOverview), []);
  const loadTeachers = useCallback(() => api.get("/admin/teachers").then(d => setTeachers(d.teachers)), []);
  const loadLearners = useCallback(() => api.get("/admin/learners").then(d => setLearnerGroups(d.groups)), []);
  const loadAdmins = useCallback(() => api.get("/admin/admins").then(d => setAdmins(d.admins)), []);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { if (tab === "teachers") loadTeachers(); }, [tab, loadTeachers]);
  useEffect(() => { if (tab === "learners") loadLearners(); }, [tab, loadLearners]);
  useEffect(() => { if (tab === "admins" && user?.isMaster) loadAdmins(); }, [tab, user, loadAdmins]);

  async function approve(id) { await api.post(`/admin/teachers/${id}/approve`); loadTeachers(); loadOverview(); }
  async function reject(id) { await api.post(`/admin/teachers/${id}/reject`); loadTeachers(); loadOverview(); }
  async function suspend(id) { await api.post(`/admin/teachers/${id}/suspend`); loadTeachers(); loadOverview(); }
  async function deleteUser(id, name) {
    if (!window.confirm(`Delete ${name}? This permanently removes their account and everything tied to it (classrooms, assignments, submissions). This can't be undone.`)) return;
    await api.del(`/admin/users/${id}`);
    loadTeachers(); loadLearners(); loadOverview();
  }
  async function removeAdmin(id, name) {
    if (!window.confirm(`Remove admin access for ${name}? Their account will be deleted.`)) return;
    await api.del(`/admin/admins/${id}`);
    loadAdmins();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      <TopBar roleLabel={user?.isMaster ? "🛡️ Master Admin" : "🛡️ Admin"} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 28px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F5B301", color: NAVY, display: "grid", placeItems: "center", fontSize: 19 }}>🛡️</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Admin Console</h2>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Full program oversight · Taft National High School (303529)</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
          {tabs.map(t => <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Pill>)}
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
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: user?.isMaster ? "2fr 2fr 1.6fr 1.2fr 300px" : "2fr 2fr 1.6fr 1.2fr 160px", gap: 8, padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".04em", borderBottom: "1px solid var(--divider)" }}>
              <div>NAME</div><div>EMAIL</div><div>POSITION</div><div>STATUS</div><div></div>
            </div>
            {teachers.map(r => {
              const isPending = r.status === "pending" || r.status === "Pending approval";
              const active = r.status === "active" || r.status === "Active";
              return (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: user?.isMaster ? "2fr 2fr 1.6fr 1.2fr 300px" : "2fr 2fr 1.6fr 1.2fr 160px", gap: 8, padding: "13px 18px", alignItems: "center", borderBottom: "1px solid var(--divider)", fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: NAVY, color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>
                      {r.name.split(" ").map(p => p[0]).join("").slice(0, 2)}
                    </div>
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                  </div>
                  <div style={{ color: "var(--text-muted)" }}>{r.email}</div>
                  <div style={{ color: "var(--text-muted)" }}>{r.position}</div>
                  <div>
                    <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: active ? "oklch(0.93 0.05 155)" : "oklch(0.95 0.05 90)", color: active ? "oklch(0.4 0.1 155)" : "oklch(0.5 0.1 75)" }}>
                      {active ? "Active" : "Pending approval"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {isPending && (
                      <>
                        <button onClick={() => approve(r.id)} style={{ border: "none", cursor: "pointer", padding: "7px 13px", borderRadius: 8, background: "oklch(0.55 0.13 155)", color: "#fff", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700 }}>✓ Approve</button>
                        <button onClick={() => reject(r.id)} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "7px 11px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "#B3261E" }}>✕</button>
                      </>
                    )}
                    {active && (
                      <>
                        <button onClick={() => setEditingTeacher(r)} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "7px 13px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: ACCENT }}>Edit</button>
                        <button onClick={() => suspend(r.id)} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "7px 13px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)" }}>Suspend</button>
                      </>
                    )}
                    {user?.isMaster && (
                      <button onClick={() => deleteUser(r.id, r.name)} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "7px 11px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "#B3261E" }}>Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
            {!teachers.length && <div style={{ padding: 24, color: "var(--text-faint)", fontSize: 13 }}>No teacher accounts yet.</div>}
          </div>
        )}

        {tab === "learners" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {learnerGroups.map(g => (
              <div key={g.className} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{g.className}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{g.male.length + g.female.length} learner(s)</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: ".06em", marginTop: 2 }}>MALE</div>
                  {g.male.map(r => <LearnerRow key={r.id} r={r} />)}
                  {!g.male.length && <div style={{ fontSize: 12, color: "var(--text-faint-2)", padding: "2px 10px" }}>None</div>}
                  <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: ".06em", marginTop: 6 }}>FEMALE</div>
                  {g.female.map(r => <LearnerRow key={r.id} r={r} />)}
                  {!g.female.length && <div style={{ fontSize: 12, color: "var(--text-faint-2)", padding: "2px 10px" }}>None</div>}
                </div>
              </div>
            ))}
            {!learnerGroups.length && <div style={{ padding: 24, color: "var(--text-faint)", fontSize: 13, background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14 }}>No learners yet.</div>}
          </div>
        )}

        {tab === "admins" && user?.isMaster && (
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 2fr 1fr 90px", gap: 8, padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".04em", borderBottom: "1px solid var(--divider)" }}>
                <div>NAME</div><div>EMAIL</div><div>ROLE</div><div></div>
              </div>
              {admins.map(a => (
                <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1.8fr 2fr 1fr 90px", gap: 8, padding: "13px 18px", alignItems: "center", borderBottom: "1px solid var(--divider)", fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>{a.name || "—"} {a.isSelf && <span style={{ color: "var(--text-faint)", fontWeight: 500 }}>(you)</span>}</div>
                  <div style={{ color: "var(--text-muted)" }}>{a.email}</div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: a.isMaster ? "#F5B301" : "var(--chip-bg)", color: a.isMaster ? NAVY : "var(--text-muted)" }}>
                      {a.isMaster ? "Master" : "Admin"}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {!a.isMaster && !a.isSelf && (
                      <button onClick={() => removeAdmin(a.id, a.name || a.email)} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "6px 10px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "#B3261E" }}>Remove</button>
                    )}
                  </div>
                </div>
              ))}
              {!admins.length && <div style={{ padding: 24, color: "var(--text-faint)", fontSize: 13 }}>No admins yet.</div>}
            </div>
            <DelegateAdminForm onCreated={loadAdmins} />
          </div>
        )}
      </div>
      {editingTeacher && (
        <EditTeacherModal
          teacher={editingTeacher}
          onClose={() => setEditingTeacher(null)}
          onSaved={() => { setEditingTeacher(null); loadTeachers(); }}
        />
      )}
    </div>
  );
}
