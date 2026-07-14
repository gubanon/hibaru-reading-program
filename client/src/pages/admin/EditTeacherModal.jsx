import { useState } from "react";
import { api } from "../../api";
import { NAVY } from "../../theme";
import { Field, TextInput, PrimaryButton } from "../../components/ui";

export default function EditTeacherModal({ teacher, onClose, onSaved }) {
  const [given, setGiven] = useState(teacher.given || "");
  const [surname, setSurname] = useState(teacher.surname || "");
  const [email, setEmail] = useState(teacher.email || "");
  const [position, setPosition] = useState(teacher.position || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      await api.put(`/admin/teachers/${teacher.id}`, { given, surname, email, position });
      onSaved();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(34,51,94,.5)", display: "grid", placeItems: "center", zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--card-bg)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 380 }}>
        <h3 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 700 }}>Edit teacher account</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="GIVEN NAME"><TextInput value={given} onChange={e => setGiven(e.target.value)} /></Field>
          <Field label="SURNAME"><TextInput value={surname} onChange={e => setSurname(e.target.value)} /></Field>
        </div>
        <Field label="EMAIL"><TextInput value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="POSITION"><TextInput value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Teacher II · English" /></Field>
        {error && <div style={{ marginBottom: 14, fontSize: 13, color: "#B3261E", fontWeight: 600 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, border: "1px solid var(--input-border)", cursor: "pointer", padding: "12px", borderRadius: 10, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600 }}>Cancel</button>
          <PrimaryButton disabled={busy} onClick={submit} style={{ flex: 1, padding: 12 }}>Save</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
