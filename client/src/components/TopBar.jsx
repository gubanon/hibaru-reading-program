import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NAVY, GOLD } from "../theme";
import ChangePasswordModal from "./ChangePasswordModal";

export default function TopBar({ roleLabel }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <div data-noprint="1" style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 28px", background: NAVY, position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 12, padding: "5px 10px" }}>
          <img src="/assets/taft-logo.png" alt="Taft National High School" style={{ height: 36, display: "block" }} />
          <img src="/assets/hibaru-logo-sm.png" alt="Project HIBARU" style={{ height: 36, display: "block" }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.1, color: "#fff" }}>Project <span style={{ color: GOLD }}>HIBARU</span></div>
          <div style={{ fontSize: 11, color: "#AEB8D4" }}>Remedial Reading Program · Taft National High School (303529) · Taft, Eastern Samar</div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      {roleLabel && (
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#AEB8D4", padding: "8px 14px" }}>{roleLabel}</div>
      )}
      <button
        onClick={() => setShowPasswordModal(true)}
        style={{ border: "1px solid rgba(255,255,255,.25)", cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: "transparent", color: "#AEB8D4", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}
      >🔒 Change Password</button>
      <button
        onClick={() => { logout(); navigate("/"); }}
        style={{ border: "1px solid rgba(255,255,255,.25)", cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: "transparent", color: "#AEB8D4", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}
      >Log out</button>
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}
