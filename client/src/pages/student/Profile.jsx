import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { NAVY } from "../../theme";
import { Toast } from "../../components/ui";

const inputStyle = { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 13.5, padding: "10px 12px", border: "1px solid var(--input-border)", borderRadius: 9, outline: "none", background: "var(--card-bg)", color: "var(--text)" };
const label = { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: ".05em", marginBottom: 5 };

// Center-crop to a square and shrink to 256px JPEG (~30KB) before upload —
// the picture is stored inline in the database, so it has to stay small.
function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
    img.src = url;
  });
}

export default function Profile({ L, onBack }) {
  const { setUser } = useAuth();
  const [p, setP] = useState(null);
  const [toast, setToast] = useState(false);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => { api.get("/auth/me").then(d => setP(d.user)); }, []);

  if (!p) return null;
  function set(field, value) { setP({ ...p, [field]: value }); }

  async function pickPhoto(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError("");
    try {
      const dataUrl = await fileToAvatar(file);
      set("avatar", dataUrl);
    } catch (err) { setPhotoError(err.message); }
  }

  async function save() {
    const { user } = await api.put("/auth/me", p);
    setP(user);
    setUser(user);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <button onClick={onBack} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>←</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>👤 {L.myProfile}</h2>
      </div>
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 26, maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <label title="Change profile picture" style={{ cursor: "pointer", position: "relative", flexShrink: 0 }}>
            {p.avatar ? (
              <img src={p.avatar} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", display: "block", border: "2px solid var(--card-border)" }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: NAVY, color: "#fff", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 700 }}>
                {(p.given[0] || "") + (p.surname[0] || "")}
              </div>
            )}
            <span style={{ position: "absolute", right: -2, bottom: -2, width: 22, height: 22, borderRadius: "50%", background: "var(--card-bg)", border: "1px solid var(--card-border)", display: "grid", placeItems: "center", fontSize: 11 }}>📷</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickPhoto} style={{ display: "none" }} />
          </label>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{p.given} {p.surname}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>{p.grade} · Taft National High School (303529)</div>
            <div style={{ fontSize: 11, color: "var(--text-faint-2)", marginTop: 3 }}>
              {L.photoHint}
              {p.avatar && <> · <button onClick={() => set("avatar", "")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "#B3261E" }}>{L.removePhoto}</button></>}
            </div>
            {photoError && <div style={{ fontSize: 11.5, color: "#B3261E", marginTop: 3 }}>{photoError}</div>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr .5fr", gap: 10, marginBottom: 12 }}>
          <div><div style={label}>{L.surname}</div><input style={inputStyle} value={p.surname} onChange={e => set("surname", e.target.value)} /></div>
          <div><div style={label}>{L.givenName}</div><input style={inputStyle} value={p.given} onChange={e => set("given", e.target.value)} /></div>
          <div><div style={label}>{L.mi}</div><input style={inputStyle} value={p.mi} onChange={e => set("mi", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: ".7fr 1.3fr", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={label}>{L.sexLbl}</div>
            <select style={{ ...inputStyle, padding: 10 }} value={p.sex} onChange={e => set("sex", e.target.value)}>
              <option value="M">{L.male}</option><option value="F">{L.female}</option>
            </select>
          </div>
          <div><div style={label}>{L.gradeSection}</div><input style={inputStyle} value={p.grade} onChange={e => set("grade", e.target.value)} /></div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={label}>{L.emailLbl}</div>
          <input style={inputStyle} value={p.email} onChange={e => set("email", e.target.value)} />
        </div>
        <button onClick={save} style={{ border: "none", cursor: "pointer", padding: "13px 26px", borderRadius: 10, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700 }}>✓ {L.saveProfile}</button>
        {toast && <div style={{ marginTop: 12 }}><Toast>{L.profileSaved}</Toast></div>}
      </div>
    </>
  );
}
