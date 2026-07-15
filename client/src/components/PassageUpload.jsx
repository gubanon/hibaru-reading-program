import { useState } from "react";
import { api } from "../api";

// Extracts text from an uploaded .docx/.pdf and hands it to `onExtracted` —
// caller decides whether to replace or append to the passage field.
export default function PassageUpload({ onExtracted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setBusy(true);
    setError("");
    try {
      const { text } = await api.upload("/teacher/extract-text", file);
      if (!text || !text.trim()) { setError("No readable text found in that file."); return; }
      onExtracted(text.trim());
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <label style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        flex: 1, border: "1.5px dashed var(--input-border)", borderRadius: 8, padding: 10,
        fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600, textAlign: "center", cursor: "pointer",
        background: "repeating-linear-gradient(45deg,var(--subtle-bg),var(--subtle-bg) 8px,var(--card-bg) 8px,var(--card-bg) 16px)"
      }}>
        📄 {busy ? "Reading file…" : "Upload passage from DOCX / PDF"}
        <input type="file" accept=".docx,.pdf" onChange={handleFile} style={{ display: "none" }} />
      </label>
      {error && <div style={{ fontSize: 10.5, color: "#B3261E", marginTop: 4 }}>{error}</div>}
    </div>
  );
}
