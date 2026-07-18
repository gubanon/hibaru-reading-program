import { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import { NAVY, GREEN, FAINT , ACCENT } from "../../theme";

const CHIP_COLORS = [NAVY, GREEN, "#B8860B"];
const inputSm = { fontFamily: "inherit", fontSize: 12, padding: "7px 9px", border: "1px solid var(--input-border)", borderRadius: 7, outline: "none", background: "var(--card-bg)", color: "var(--text)" };

function StudentRow({ s, onRemove }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 8px", background: "var(--subtle-bg)", borderRadius: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--card-border)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>
        {(s.given[0] || s.email[0] || "?").toUpperCase()}
      </div>
      <div style={{ minWidth: 0 }}>
        <span style={{ fontWeight: 500 }}>{s.surname || s.given ? `${s.surname.toUpperCase()}, ${s.given} ${s.mi}`.trim() : s.email}</span>
        {s.lastSubmittedAt && (
          <div style={{ fontSize: 10.5, color: GREEN, fontWeight: 600 }}>
            ✓ {s.submittedCount} submitted · last {new Date(s.lastSubmittedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </div>
        )}
      </div>
      <span style={{ color: "var(--text-faint-2)", fontSize: 11.5, marginLeft: "auto" }}>{s.grade}</span>
      <button onClick={() => onRemove(s)} title="Remove from classroom" style={{ border: "none", cursor: "pointer", background: "none", fontFamily: "inherit", fontSize: 13, color: "#B3261E", fontWeight: 700, padding: "0 2px" }}>✕</button>
    </div>
  );
}

function InviteRow({ inv, onResend, onRevoke }) {
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inv.joinUrl);
    } catch {
      // Clipboard API can be unavailable (older browsers / non-HTTPS) —
      // fall back to the classic prompt so the link is still obtainable.
      window.prompt("Copy this join link:", inv.joinUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "6px 8px", background: "var(--chip-bg)", borderRadius: 8 }}>
      <span style={{ color: "var(--text-faint)" }}>✉</span>
      <span style={{ color: "var(--text-muted)" }}>{inv.email}</span>
      <span style={{ fontSize: 10.5, color: "var(--text-faint-2)" }}>pending</span>
      <button onClick={copyLink} style={{ marginLeft: "auto", border: "none", cursor: "pointer", background: "none", fontFamily: "inherit", fontSize: 11, fontWeight: 600, color: ACCENT, padding: "2px 4px" }}>{copied ? "Copied ✓" : "Copy link"}</button>
      <button onClick={() => onResend(inv)} style={{ border: "none", cursor: "pointer", background: "none", fontFamily: "inherit", fontSize: 11, fontWeight: 600, color: ACCENT, padding: "2px 4px" }}>Resend</button>
      <button onClick={() => onRevoke(inv)} title="Revoke invite" style={{ border: "none", cursor: "pointer", background: "none", fontFamily: "inherit", fontSize: 13, color: "#B3261E", fontWeight: 700, padding: "0 2px" }}>✕</button>
    </div>
  );
}

function ClassCard({ c, idx, onChanged }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(c.name);
  const [linkCopied, setLinkCopied] = useState(false);

  async function copyClassLink() {
    try {
      await navigator.clipboard.writeText(c.classJoinUrl);
    } catch {
      window.prompt("Copy this class join link:", c.classJoinUrl);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  }
  const males = c.students.filter(s => s.sex === "M").sort((a, b) => a.surname.localeCompare(b.surname));
  const females = c.students.filter(s => s.sex !== "M").sort((a, b) => a.surname.localeCompare(b.surname));

  async function invite() {
    setErr(""); setMsg("");
    if (!email.trim()) { setErr("Please enter a student email."); return; }
    setBusy(true);
    try {
      const res = await api.post(`/teacher/classrooms/${c.id}/invites`, { email: email.trim() });
      setEmail("");
      setMsg(res.emailSent ? "Invite sent." : "Invite created (email not sent — ask your admin to configure email).");
      onChanged();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function resendInvite(inv) {
    setErr(""); setMsg("");
    try {
      const res = await api.post(`/teacher/classrooms/${c.id}/invites/${inv.id}/resend`, {});
      setMsg(res.emailSent ? `Invite resent to ${inv.email}.` : "Resent (email not sent — ask your admin to configure email).");
    } catch (e) { setErr(e.message); }
  }

  async function revokeInvite(inv) {
    if (!confirm(`Revoke the invite to ${inv.email}?`)) return;
    try { await api.del(`/teacher/classrooms/${c.id}/invites/${inv.id}`); onChanged(); } catch (e) { setErr(e.message); }
  }

  async function removeStudent(s) {
    if (!confirm(`Remove ${s.given || s.email} from ${c.name}? Their account isn't deleted, just their membership in this classroom.`)) return;
    try { await api.del(`/teacher/classrooms/${c.id}/students/${s.id}`); onChanged(); } catch (e) { setErr(e.message); }
  }

  async function saveName() {
    if (!nameDraft.trim()) { setRenaming(false); setNameDraft(c.name); return; }
    try { await api.put(`/teacher/classrooms/${c.id}`, { name: nameDraft.trim() }); setRenaming(false); onChanged(); } catch (e) { setErr(e.message); }
  }

  async function deleteClassroom() {
    if (!confirm(`Permanently delete ${c.name}? This removes its roster and all its assignments. This can't be undone.`)) return;
    try { await api.del(`/teacher/classrooms/${c.id}`); onChanged(); } catch (e) { setErr(e.message); }
  }

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: CHIP_COLORS[idx % 3], color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
          {c.name.replace(/Grade /, "G").slice(0, 2)}
        </div>
        {renaming ? (
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && saveName()}
              style={{ ...inputSm, flex: 1, fontSize: 14, fontWeight: 700 }} />
            <button onClick={saveName} style={{ border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: 7, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700 }}>Save</button>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>{c.name}</div>
            <button onClick={() => { setNameDraft(c.name); setRenaming(true); }} title="Rename classroom" style={{ border: "none", cursor: "pointer", background: "none", fontSize: 12.5, color: "var(--text-faint)" }}>✎</button>
            <button onClick={deleteClassroom} title="Delete classroom" style={{ marginLeft: "auto", border: "none", cursor: "pointer", background: "none", fontSize: 12.5, color: "#B3261E" }}>🗑 Delete</button>
          </>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "14px 0 10px", fontSize: 12.5, color: FAINT, flexWrap: "wrap" }}>
        <span>{c.students.length} students</span>
        <span>{c.assignmentCount} assignments</span>
        {!renaming && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 7 }}>
            {c.classJoinUrl && (
              <button onClick={copyClassLink}
                style={{ border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700 }}>
                {linkCopied ? "Copied ✓" : "🔗 Copy class link"}
              </button>
            )}
            <button onClick={() => api.download(`/teacher/classrooms/${c.id}/docx`, `Consolidated Report - ${c.name}.docx`).catch(e => setErr(e.message))}
              style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "6px 12px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: ACCENT }}>
              ⬇ DOCX Consolidated Report
            </button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: ".06em", marginTop: 2 }}>MALE</div>
        {males.map(s => <StudentRow key={s.id} s={s} onRemove={removeStudent} />)}
        <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: ".06em", marginTop: 6 }}>FEMALE</div>
        {females.map(s => <StudentRow key={s.id} s={s} onRemove={removeStudent} />)}
        {c.invites.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, letterSpacing: ".06em", marginTop: 6 }}>PENDING INVITES</div>
            {c.invites.map(inv => <InviteRow key={inv.id} inv={inv} onResend={resendInvite} onRevoke={revokeInvite} />)}
          </>
        )}
      </div>
      <div style={{ marginTop: 14, padding: 12, background: "var(--subtle-bg)", borderRadius: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, letterSpacing: ".05em", marginBottom: 8 }}>INVITE A STUDENT BY EMAIL</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input style={{ ...inputSm, flex: 1 }} value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && invite()} placeholder="student@example.com" />
          <button disabled={busy} onClick={invite} style={{ border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 8, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>Invite</button>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--text-faint-2)", marginTop: 6 }}>They'll get an email with a "Join" link — they set up their own profile once they click it. Or share the classroom's single "🔗 class link" (above) with everyone at once — anyone with it can join this class.</div>
        {err && <div style={{ color: "#B3261E", fontSize: 11.5, marginTop: 6 }}>{err}</div>}
        {msg && !err && <div style={{ color: GREEN, fontSize: 11.5, marginTop: 6 }}>{msg}</div>}
      </div>
    </div>
  );
}

export default function ClassroomsTab() {
  const [classrooms, setClassrooms] = useState([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => api.get("/teacher/classrooms").then(d => { setClassrooms(d.classrooms); setLoading(false); }), []);
  useEffect(() => { load(); }, [load]);

  async function createClass() {
    if (!newName.trim()) return;
    await api.post("/teacher/classrooms", { name: newName.trim() });
    setNewName("");
    setCreating(false);
    load();
  }

  if (loading) return null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Classrooms</h2>
        <span style={{ fontSize: 12.5, color: FAINT }}>Mga Silid-Aralan</span>
        <div style={{ flex: 1 }} />
        {creating ? (
          <div style={{ display: "flex", gap: 7 }}>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && createClass()}
              placeholder="e.g. Grade 8 – Bonifacio"
              style={{ fontFamily: "inherit", fontSize: 13, padding: "9px 12px", border: "1px solid var(--input-border)", borderRadius: 8, outline: "none", background: "var(--card-bg)", color: "var(--text)", width: 230 }} />
            <button onClick={createClass} style={{ border: "none", cursor: "pointer", padding: "9px 16px", borderRadius: 8, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>Create</button>
            <button onClick={() => { setCreating(false); setNewName(""); }} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "9px 14px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} style={{ border: "none", cursor: "pointer", padding: "10px 18px", borderRadius: 9, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700 }}>+ Create Classroom</button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(400px,1fr))", gap: 16 }}>
        {classrooms.map((c, i) => <ClassCard key={c.id} c={c} idx={i} onChanged={load} />)}
        {!classrooms.length && (
          <div style={{ border: "2px dashed #DDDACE", borderRadius: 14, padding: 20, fontSize: 13, color: "var(--text-faint)" }}>
            No classrooms yet — use "+ Create Classroom" in the top right to make your first one.
          </div>
        )}
      </div>
    </>
  );
}
