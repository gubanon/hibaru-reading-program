import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api";
import { NAVY, GOLD } from "../theme";
import { Field, TextInput, PasswordInput, PrimaryButton } from "../components/ui";

const PENDING_INVITE_KEY = "hibaru_pending_invite";

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

export default function Join() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, acceptInvite } = useAuth();
  const [state, setState] = useState({ loading: true, error: "", invite: null });
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get(`/auth/invite/${token}`)
      .then(invite => setState({ loading: false, error: "", invite }))
      .catch(e => setState({ loading: false, error: e.message, invite: null }));
  }, [token]);

  async function submitNewPassword() {
    setFormError("");
    if (pass.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    if (pass !== confirmPass) { setFormError("Passwords don't match."); return; }
    if (!agreeTerms) { setFormError("Please accept the Terms & Conditions and Privacy Policy to continue."); return; }
    setBusy(true);
    try {
      await acceptInvite(token, { password: pass, agreeToTerms: agreeTerms });
      navigate("/student");
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }

  async function confirmJoin() {
    setFormError(""); setBusy(true);
    try {
      await acceptInvite(token, {});
      setDone(true);
      setTimeout(() => navigate("/student"), 1200);
    } catch (e) {
      if (e.code === "LOGIN_REQUIRED") {
        sessionStorage.setItem(PENDING_INVITE_KEY, token);
        navigate("/");
      } else setFormError(e.message);
    } finally { setBusy(false); }
  }

  function goLogin() {
    sessionStorage.setItem(PENDING_INVITE_KEY, token);
    navigate("/");
  }

  if (state.loading) return <Shell><div style={{ color: "var(--text-muted)" }}>Loading invite…</div></Shell>;

  if (state.error) {
    return (
      <Shell>
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Invite not found</h2>
        <div style={{ color: "var(--text-muted)", fontSize: 13.5, marginBottom: 16 }}>{state.error}</div>
        <PrimaryButton onClick={() => navigate("/")} style={{ width: "100%" }}>Go to sign in →</PrimaryButton>
      </Shell>
    );
  }

  const { invite } = state;

  if (invite.alreadyJoined || done) {
    return (
      <Shell>
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>You're in! 🎉</h2>
        <div style={{ color: "var(--text-muted)", fontSize: 13.5, marginBottom: 16 }}>You've joined <strong>{invite.classroomName}</strong>.</div>
        <PrimaryButton onClick={() => navigate(user ? "/student" : "/")} style={{ width: "100%" }}>Continue →</PrimaryButton>
      </Shell>
    );
  }

  if (invite.needsPassword) {
    return (
      <Shell>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Join {invite.classroomName}</h2>
        <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 20 }}>Set a password to finish creating your account. You'll be responsible for filling out the rest of your profile once you're in.</div>
        <Field label="EMAIL"><TextInput value={invite.email} disabled style={{ background: "var(--chip-bg)" }} /></Field>
        <Field label="PASSWORD"><PasswordInput value={pass} onChange={e => setPass(e.target.value)} placeholder="At least 6 characters" /></Field>
        <Field label="CONFIRM PASSWORD"><PasswordInput value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Retype password" /></Field>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 18, fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} style={{ marginTop: 2 }} />
          <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms &amp; Conditions</a> and <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
        </label>
        {formError && <div style={{ marginBottom: 14, fontSize: 13, color: "#B3261E", fontWeight: 600 }}>{formError}</div>}
        <PrimaryButton disabled={busy} onClick={submitNewPassword} style={{ width: "100%" }}>Join classroom →</PrimaryButton>
      </Shell>
    );
  }

  // Account already exists and has a password — must be logged in as this
  // exact student to accept (stops a forwarded link hijacking someone else's account).
  const loggedInAsInvitee = user && user.email === invite.email;
  return (
    <Shell>
      <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Join {invite.classroomName}</h2>
      <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 20 }}>
        {loggedInAsInvitee
          ? <>You're signed in as <strong>{invite.email}</strong>. Confirm to join this classroom.</>
          : <>This invite is for <strong>{invite.email}</strong>. Please log in as that account to accept it.</>}
      </div>
      {formError && <div style={{ marginBottom: 14, fontSize: 13, color: "#B3261E", fontWeight: 600 }}>{formError}</div>}
      {loggedInAsInvitee
        ? <PrimaryButton disabled={busy} onClick={confirmJoin} style={{ width: "100%" }}>Join classroom →</PrimaryButton>
        : <PrimaryButton onClick={goLogin} style={{ width: "100%" }}>Log in →</PrimaryButton>}
    </Shell>
  );
}
