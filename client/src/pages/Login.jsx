import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { api } from "../api";
import { NAVY, GOLD , ACCENT } from "../theme";
import { Field, TextInput, PasswordInput, PrimaryButton } from "../components/ui";

const welcomeMap = {
  teacher: "Manage classrooms, assignments, and Phil-IRI reports.",
  student: "Read, practice, and grow — one passage at a time."
};

export default function Login() {
  const { login, claimStudent } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [role, setRole] = useState("teacher");
  const [mode, setMode] = useState("signin"); // signin | signup | forgot | claim
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPass, setSuPass] = useState("");
  const [signupDone, setSignupDone] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpDone, setFpDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const termsCheckbox = (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 18, fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
      <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} style={{ marginTop: 2 }} />
      <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer" style={{ color: ACCENT, fontWeight: 600 }}>Terms &amp; Conditions</a> and <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: ACCENT, fontWeight: 600 }}>Privacy Policy</a>.</span>
    </label>
  );

  async function doLogin() {
    setError(""); setBusy(true);
    try {
      const user = await login(email, pass, role);
      // If they arrived here via a "log in to accept this invite" bounce
      // from the Join or ClassJoin pages, send them straight back to finish.
      const pendingInvite = sessionStorage.getItem("hibaru_pending_invite");
      if (pendingInvite && user.role === "student") {
        sessionStorage.removeItem("hibaru_pending_invite");
        navigate(`/join/${pendingInvite}`);
        return;
      }
      const pendingClass = sessionStorage.getItem("hibaru_pending_class");
      if (pendingClass && user.role === "student") {
        sessionStorage.removeItem("hibaru_pending_class");
        navigate(`/class/${pendingClass}`);
        return;
      }
      navigate(user.role === "admin" ? "/admin" : user.role === "student" ? "/student" : "/teacher");
    } catch (e) {
      if (e.code === "UNCLAIMED") { setMode("claim"); setError(""); }
      else setError(e.message);
    } finally { setBusy(false); }
  }

  async function doClaim() {
    setError(""); setBusy(true);
    if (pass.length < 6) { setError("Password must be at least 6 characters."); setBusy(false); return; }
    if (pass !== confirmPass) { setError("Passwords don't match."); setBusy(false); return; }
    if (!agreeTerms) { setError("Please accept the Terms & Conditions and Privacy Policy to continue."); setBusy(false); return; }
    try {
      const user = await claimStudent(email, pass, agreeTerms);
      navigate("/student");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function doSignup() {
    setError(""); setBusy(true);
    if (!agreeTerms) { setError("Please accept the Terms & Conditions and Privacy Policy to continue."); setBusy(false); return; }
    try {
      await api.post("/auth/signup", { name: suName, email: suEmail, password: suPass, agreeToTerms: agreeTerms });
      setSignupDone(true);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function doForgot() {
    setError(""); setBusy(true);
    try {
      await api.post("/auth/forgot", { email: fpEmail });
      setFpDone(true);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function cardStyle(r) {
    return { border: role === r ? NAVY : "var(--input-border)", bg: role === r ? "#E9EDF7" : "var(--card-bg)" };
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.1fr 1fr", background: NAVY, position: "relative" }}>
      <button
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        style={{ position: "absolute", top: 20, right: 20, zIndex: 10, display: "grid", placeItems: "center", width: 36, height: 36, border: "1px solid rgba(255,255,255,.25)", cursor: "pointer", borderRadius: 999, background: "transparent", fontSize: 16 }}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "64px 72px", color: "#fff", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 90% 70% at 20% 10%, rgba(245,179,1,.14), transparent 60%), radial-gradient(ellipse 70% 60% at 90% 90%, rgba(255,255,255,.06), transparent 55%)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--card-bg)", borderRadius: 16, padding: "10px 14px" }}>
              <img src="/assets/taft-logo.png" alt="Taft National High School" style={{ height: 56, display: "block" }} />
              <img src="/assets/hibaru-logo-sm.png" alt="Project HIBARU" style={{ height: 56, display: "block" }} />
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".14em", color: GOLD, marginBottom: 12 }}>REMEDIAL READING PROGRAM</div>
          <h1 style={{ margin: "0 0 16px", fontSize: 44, fontWeight: 700, lineHeight: 1.12 }}>Project <span style={{ color: GOLD }}>HIBARU</span></h1>
          <p style={{ margin: "0 0 28px", fontSize: 16, lineHeight: 1.75, color: "#C9D1E6", maxWidth: 440 }}>Helping every learner read with confidence — guided practice, monitored reading, and Phil-IRI assessment in one place.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5, color: "#AEB8D4" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />Vocabulary warm-up · monitored oral reading · comprehension checks</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />Automatic miscue analysis and Phil-IRI Form 3 reports</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />English at Filipino</div>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 28, left: 72, fontSize: 11.5, color: "#7C89AC" }}>Taft National High School (303529) · Taft, Eastern Samar · Department of Education</div>
      </div>

      <div style={{ background: "var(--page-bg)", borderRadius: "28px 0 0 28px", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {mode === "signin" && (
            <>
              <h2 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 700 }}>Welcome back</h2>
              <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 26 }}>{welcomeMap[role]}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
                <button onClick={() => setRole("teacher")} style={{ border: `2px solid ${cardStyle("teacher").border}`, cursor: "pointer", borderRadius: 14, padding: "16px 12px", background: cardStyle("teacher").bg, fontFamily: "inherit", textAlign: "center" }}>
                  <div style={{ fontSize: 26 }}>👩‍🏫</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: "var(--text)" }}>Teacher</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>Guro</div>
                </button>
                <button onClick={() => setRole("student")} style={{ border: `2px solid ${cardStyle("student").border}`, cursor: "pointer", borderRadius: 14, padding: "16px 12px", background: cardStyle("student").bg, fontFamily: "inherit", textAlign: "center" }}>
                  <div style={{ fontSize: 26 }}>🧑‍🎓</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: "var(--text)" }}>Student</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>Mag-aaral</div>
                </button>
              </div>

              <Field label={role === "teacher" ? "TEACHER EMAIL" : "STUDENT EMAIL"}>
                <TextInput value={email} onChange={e => setEmail(e.target.value)} placeholder={role === "teacher" ? "teacher@example.com" : "student@example.com"} />
              </Field>
              <Field label="PASSWORD">
                <PasswordInput value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
              </Field>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
                <button onClick={() => setMode("forgot")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: ACCENT }}>Forgot password?</button>
              </div>
              {error && <div style={{ marginBottom: 14, fontSize: 13, color: "#B3261E", fontWeight: 600 }}>{error}</div>}
              <PrimaryButton disabled={busy} onClick={doLogin} style={{ width: "100%" }}>
                {role === "teacher" ? "Sign in to Teacher Portal →" : "Sign in to Student Portal →"}
              </PrimaryButton>
              {role === "teacher" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 14px" }}>
                    <div style={{ flex: 1, height: 1, background: "var(--input-border)" }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint-2)", letterSpacing: ".06em" }}>NEW TEACHER?</div>
                    <div style={{ flex: 1, height: 1, background: "var(--input-border)" }} />
                  </div>
                  <button onClick={() => { setMode("signup"); setSignupDone(false); setError(""); setAgreeTerms(false); }} style={{ width: "100%", border: `1.5px solid ${ACCENT}`, cursor: "pointer", padding: 13, borderRadius: 12, background: "transparent", color: ACCENT, fontFamily: "inherit", fontSize: 14, fontWeight: 700 }}>Create a teacher account</button>
                </>
              )}
              <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--text-faint-2)" }}>Invited students: sign in with your email — you'll be asked to set a password the first time.</div>
              <div style={{ textAlign: "center", marginTop: 10, fontSize: 11.5, color: "var(--text-faint-2)" }}>
                <a href="/terms" target="_blank" rel="noreferrer" style={{ color: "var(--text-faint)" }}>Terms &amp; Conditions</a>
                {" · "}
                <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "var(--text-faint)" }}>Privacy Policy</a>
              </div>
            </>
          )}

          {mode === "claim" && (
            <>
              <h2 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 700 }}>Set your password</h2>
              <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 26 }}>Your teacher invited you to Project HIBARU. Set a password to finish creating your account.</div>
              <Field label="STUDENT EMAIL"><TextInput value={email} disabled style={{ background: "var(--chip-bg)" }} /></Field>
              <Field label="NEW PASSWORD"><PasswordInput value={pass} onChange={e => setPass(e.target.value)} placeholder="At least 6 characters" /></Field>
              <Field label="CONFIRM PASSWORD"><PasswordInput value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Retype password" /></Field>
              {termsCheckbox}
              {error && <div style={{ marginBottom: 14, fontSize: 13, color: "#B3261E", fontWeight: 600 }}>{error}</div>}
              <PrimaryButton disabled={busy} onClick={doClaim} style={{ width: "100%" }}>Set password &amp; sign in →</PrimaryButton>
              <button onClick={() => { setMode("signin"); setError(""); setAgreeTerms(false); }} style={{ width: "100%", marginTop: 14, border: "none", background: "none", cursor: "pointer", padding: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: ACCENT }}>← Back to sign in</button>
            </>
          )}

          {mode === "signup" && (
            <>
              {!signupDone ? (
                <>
                  <h2 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 700 }}>Create teacher account</h2>
                  <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 26 }}>Your account will be reviewed and approved by the school admin.</div>
                  <Field label="FULL NAME"><TextInput value={suName} onChange={e => setSuName(e.target.value)} placeholder="e.g. Juan A. Dela Cruz" /></Field>
                  <Field label="TEACHER EMAIL"><TextInput value={suEmail} onChange={e => setSuEmail(e.target.value)} placeholder="teacher@example.com" /></Field>
                  <Field label="PASSWORD"><PasswordInput value={suPass} onChange={e => setSuPass(e.target.value)} placeholder="At least 8 characters" /></Field>
                  {termsCheckbox}
                  {error && <div style={{ marginBottom: 14, fontSize: 13, color: "#B3261E", fontWeight: 600 }}>{error}</div>}
                  <PrimaryButton disabled={busy} onClick={doSignup} style={{ width: "100%" }}>Sign up →</PrimaryButton>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 44 }}>📨</div>
                  <h2 style={{ margin: "12px 0 8px", fontSize: 24, fontWeight: 700 }}>Request submitted</h2>
                  <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>Your teacher account is now <b>pending admin approval</b>. You'll receive an email at that address once it's activated.</div>
                </div>
              )}
              <button onClick={() => { setMode("signin"); setError(""); setAgreeTerms(false); }} style={{ width: "100%", marginTop: 14, border: "none", background: "none", cursor: "pointer", padding: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: ACCENT }}>← Back to sign in</button>
            </>
          )}

          {mode === "forgot" && (
            <>
              {!fpDone ? (
                <>
                  <h2 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 700 }}>Reset password</h2>
                  <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 26 }}>Enter your email and we'll send you a reset link.</div>
                  <Field label={role === "teacher" ? "TEACHER EMAIL" : "STUDENT EMAIL"}><TextInput value={fpEmail} onChange={e => setFpEmail(e.target.value)} placeholder="name@example.com" /></Field>
                  <PrimaryButton disabled={busy} onClick={doForgot} style={{ width: "100%" }}>Send reset link →</PrimaryButton>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 44 }}>✉️</div>
                  <h2 style={{ margin: "12px 0 8px", fontSize: 24, fontWeight: 700 }}>Check your inbox</h2>
                  <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>If an account exists for that email, a password reset link is on its way.</div>
                </div>
              )}
              <button onClick={() => { setMode("signin"); setError(""); }} style={{ width: "100%", marginTop: 14, border: "none", background: "none", cursor: "pointer", padding: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: ACCENT }}>← Back to sign in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
