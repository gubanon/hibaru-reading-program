import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api, setToken } from "../api";
import { GOLD } from "../theme";
import { Field, PasswordInput, PrimaryButton } from "../components/ui";

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--page-bg)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400, background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 18, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <img src="/assets/hibaru-logo-sm.png" alt="Project HIBARU" style={{ height: 32 }} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>Project <span style={{ color: GOLD }}>HIBARU</span></div>
        </div>
        {children}
      </div>
    </div>
  );
}

// Landing page for the emailed password-reset link (/reset/:token).
export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setUser, setViewAs } = useAuth();
  const [state, setState] = useState({ loading: true, error: "", email: "" });
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    api.get(`/auth/reset/${token}`)
      .then(d => setState({ loading: false, error: "", email: d.email }))
      .catch(e => setState({ loading: false, error: e.message, email: "" }));
  }, [token]);

  async function submit() {
    setFormError("");
    if (pass.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    if (pass !== confirmPass) { setFormError("Passwords don't match."); return; }
    setBusy(true);
    try {
      const { token: jwt, user } = await api.post(`/auth/reset/${token}`, { password: pass });
      setToken(jwt);
      setUser(user);
      if (setViewAs) setViewAs(user.role === "student" ? "student" : "teacher");
      navigate(user.role === "admin" ? "/admin" : user.role === "student" ? "/student" : "/teacher");
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }

  if (state.loading) return <Shell><div style={{ color: "var(--text-muted)" }}>Checking reset link…</div></Shell>;

  if (state.error) {
    return (
      <Shell>
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Reset link not valid</h2>
        <div style={{ color: "var(--text-muted)", fontSize: 13.5, marginBottom: 16 }}>{state.error}</div>
        <PrimaryButton onClick={() => navigate("/")} style={{ width: "100%" }}>Go to sign in →</PrimaryButton>
      </Shell>
    );
  }

  return (
    <Shell>
      <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Set a new password</h2>
      <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 20 }}>for <strong>{state.email}</strong></div>
      <Field label="NEW PASSWORD"><PasswordInput value={pass} onChange={e => setPass(e.target.value)} placeholder="At least 6 characters" /></Field>
      <Field label="CONFIRM PASSWORD"><PasswordInput value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Retype password" /></Field>
      {formError && <div style={{ marginBottom: 14, fontSize: 13, color: "#B3261E", fontWeight: 600 }}>{formError}</div>}
      <PrimaryButton disabled={busy} onClick={submit} style={{ width: "100%" }}>Save new password &amp; sign in →</PrimaryButton>
    </Shell>
  );
}
