import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { NAVY, GOLD } from "../theme";
import ChangePasswordModal from "./ChangePasswordModal";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{ display: "grid", placeItems: "center", width: 34, height: 34, border: "1px solid rgba(255,255,255,.25)", cursor: "pointer", borderRadius: 999, background: "transparent", fontSize: 15 }}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

function ProfileMenu({ roleLabel }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const displayName = user ? `${user.given} ${user.surname}`.trim() || user.email : "";
  const initial = (user?.given?.[0] || user?.email?.[0] || "?").toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,.25)", cursor: "pointer", padding: "5px 12px 5px 5px", borderRadius: 999, background: "transparent", fontFamily: "inherit" }}
      >
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: GOLD, color: NAVY, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>{initial}</div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#AEB8D4" }}>{roleLabel || displayName}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "var(--card-bg)", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,.28)", minWidth: 240, overflow: "hidden", zIndex: 100, border: "1px solid var(--card-border)" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--divider)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{displayName}</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2, wordBreak: "break-all" }}>{user?.email}</div>
          </div>
          <button
            onClick={() => { setOpen(false); setShowPasswordModal(true); }}
            style={{ display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer", padding: "11px 16px", background: "var(--card-bg)", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--text)" }}
          >🔒 Change Password</button>
          <button
            onClick={() => { logout(); navigate("/"); }}
            style={{ display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer", padding: "11px 16px", background: "var(--card-bg)", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#B3261E", borderTop: "1px solid var(--divider)" }}
          >Log out</button>
        </div>
      )}
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}

export default function TopBar({ roleLabel }) {
  return (
    <div data-noprint="1" style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 28px", background: NAVY, position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card-bg)", borderRadius: 12, padding: "5px 10px" }}>
          <img src="/assets/taft-logo.png" alt="Taft National High School" style={{ height: 36, display: "block" }} />
          <img src="/assets/hibaru-logo-sm.png" alt="Project HIBARU" style={{ height: 36, display: "block" }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.1, color: "#fff" }}>Project <span style={{ color: GOLD }}>HIBARU</span></div>
          <div style={{ fontSize: 11, color: "#AEB8D4" }}>Remedial Reading Program · Taft National High School (303529) · Taft, Eastern Samar</div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <ThemeToggle />
      <ProfileMenu roleLabel={roleLabel} />
    </div>
  );
}
