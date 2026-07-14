import { useState } from "react";
import { api } from "../api";
import { NAVY } from "../theme";
import { Field, PasswordInput, PrimaryButton, Toast } from "./ui";

export default function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (next.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (next !== confirm) { setError("New passwords don't match."); return; }
    setBusy(true);
    try {
      await api.post("/auth/change-password", { currentPassword: current, newPassword: next });
      setDone(true);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(34,51,94,.5)", display: "grid", placeItems: "center", zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 380 }}>
        <h3 style={{ margin: "0 0 18px", fontSize: 19, fontWeight: 700 }}>Change password</h3>
        {done ? (
          <>
            <Toast>✓ Password updated. Use it next time you sign in.</Toast>
            <button onClick={onClose} style={{ width: "100%", marginTop: 16, border: "none", cursor: "pointer", padding: "10px 18px", borderRadius: 9, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>Close</button>
          </>
        ) : (
          <>
            <Field label="CURRENT PASSWORD"><PasswordInput value={current} onChange={e => setCurrent(e.target.value)} placeholder="••••••••" /></Field>
            <Field label="NEW PASSWORD"><PasswordInput value={next} onChange={e => setNext(e.target.value)} placeholder="At least 6 characters" /></Field>
            <Field label="CONFIRM NEW PASSWORD"><PasswordInput value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Retype new password" /></Field>
            {error && <div style={{ marginBottom: 14, fontSize: 13, color: "#B3261E", fontWeight: 600 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, border: "1px solid #E0DED5", cursor: "pointer", padding: "12px", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600 }}>Cancel</button>
              <PrimaryButton disabled={busy} onClick={submit} style={{ flex: 1, padding: 12 }}>Update</PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
