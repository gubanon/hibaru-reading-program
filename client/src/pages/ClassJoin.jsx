import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api";
import { GOLD } from "../theme";
import { Field, TextInput, PasswordInput, PrimaryButton } from "../components/ui";

const PENDING_CLASS_KEY = "hibaru_pending_class";

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

// The classroom's single shared join link: /class/:token. A logged-in
// student joins with one click; a new student creates their account
// (email + password) right here and lands in the classroom.
export default function ClassJoin() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, joinClass } = useAuth();
  const [state, setState] = useState({ loading: true, error: "", className: "" });
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    api.get(`/auth/class-invite/${token}`)
      .then(d => setState({ loading: false, error: "", className: d.classroomName }))
      .catch(e => setState({ loading: false, error: e.message, className: "" }));
  }, [token]);

  async function joinAsLoggedIn() {
    setFormError(""); setBusy(true);
    try {
      await joinClass(token, {});
      navigate("/student");
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }

  async function joinAsNew() {
    setFormError("");
    if (pass.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    if (pass !== confirmPass) { setFormError("Passwords don't match."); return; }
    if (!agreeTerms) { setFormError("Please accept the Terms & Conditions and Privacy Policy to continue."); return; }
    setBusy(true);
    try {
      await joinClass(token, { email, password: pass, agreeToTerms: agreeTerms });
      navigate("/student");
    } catch (e) {
      if (e.code === "LOGIN_REQUIRED") {
        sessionStorage.setItem(PENDING_CLASS_KEY, token);
        navigate("/");
      } else setFormError(e.message);
    } finally { setBusy(false); }
  }

  if (state.loading) return <Shell><div style={{ color: "var(--text-muted)" }}>Loading class link…</div></Shell>;

  if (state.error) {
    return (
      <Shell>
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Class link not found</h2>
        <div style={{ color: "var(--text-muted)", fontSize: 13.5, marginBottom: 16 }}>{state.error}</div>
        <PrimaryButton onClick={() => navigate("/")} style={{ width: "100%" }}>Go to sign in →</PrimaryButton>
      </Shell>
    );
  }

  if (user && user.role === "student") {
    return (
      <Shell>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Join {state.className}</h2>
        <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 20 }}>You're signed in as <strong>{user.email}</strong>. Confirm to join this classroom.</div>
        {formError && <div style={{ marginBottom: 14, fontSize: 13, color: "#B3261E", fontWeight: 600 }}>{formError}</div>}
        <PrimaryButton disabled={busy} onClick={joinAsLoggedIn} style={{ width: "100%" }}>Join classroom →</PrimaryButton>
      </Shell>
    );
  }

  return (
    <Shell>
      <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Join {state.className}</h2>
      <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 20 }}>Create your student account to join. Already have one? <button onClick={() => { sessionStorage.setItem(PENDING_CLASS_KEY, token); navigate("/"); }} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "var(--accent)" }}>Log in first</button> and open this link again.</div>
      <Field label="EMAIL"><TextInput value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
      <Field label="PASSWORD"><PasswordInput value={pass} onChange={e => setPass(e.target.value)} placeholder="At least 6 characters" /></Field>
      <Field label="CONFIRM PASSWORD"><PasswordInput value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Retype password" /></Field>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 18, fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
        <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} style={{ marginTop: 2 }} />
        <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms &amp; Conditions</a> and <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
      </label>
      {formError && <div style={{ marginBottom: 14, fontSize: 13, color: "#B3261E", fontWeight: 600 }}>{formError}</div>}
      <PrimaryButton disabled={busy} onClick={joinAsNew} style={{ width: "100%" }}>Join classroom →</PrimaryButton>
    </Shell>
  );
}
