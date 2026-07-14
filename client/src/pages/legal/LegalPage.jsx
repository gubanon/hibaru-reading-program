import { Link } from "react-router-dom";
import { NAVY , ACCENT } from "../../theme";

export function LegalShell({ title, updated, children }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 28px 80px" }}>
        <Link to="/" style={{ fontSize: 12.5, fontWeight: 600, color: ACCENT }}>← Back to sign in</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 6px" }}>
          <img src="/assets/hibaru-logo-sm.png" alt="" style={{ height: 40 }} />
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{title}</h1>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginBottom: 22 }}>Last updated: {updated} · Project HIBARU, Taft National High School (303529)</div>

        <div style={{ background: "oklch(0.95 0.05 90)", color: "oklch(0.42 0.1 75)", borderRadius: 12, padding: "14px 16px", fontSize: 13, lineHeight: 1.6, marginBottom: 26, fontWeight: 600 }}>
          ⚠️ Draft template. This document was generated as a starting point and has not been reviewed by legal counsel
          or the school's Data Protection Officer. Because this program collects data from minors, it must be reviewed
          and formally adopted (school letterhead, DPO sign-off, DepEd Data Privacy compliance check) before real
          student or teacher data is processed under it.
        </div>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "30px 34px", fontSize: 14, lineHeight: 1.8, color: "var(--text)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 15.5, fontWeight: 700, margin: "0 0 8px" }}>{title}</h2>
      <div style={{ color: "var(--text-muted)" }}>{children}</div>
    </div>
  );
}
