import { NAVY, MUTED, INPUT_BORDER, BORDER, FAINT } from "../theme";

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, letterSpacing: ".05em", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 14,
  padding: "13px 14px", border: `1.5px solid ${INPUT_BORDER}`, borderRadius: 11, outline: "none", background: "#fff"
};

export function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
export function TextArea(props) {
  return <textarea {...props} style={{ ...inputStyle, minHeight: 80, resize: "vertical", lineHeight: 1.6, ...(props.style || {}) }} />;
}
export function Select({ children, ...props }) {
  return <select {...props} style={{ ...inputStyle, padding: "9px 10px", ...(props.style || {}) }}>{children}</select>;
}

export function Card({ children, style, ...rest }) {
  return <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, ...style }} {...rest}>{children}</div>;
}

export function StatCard({ label, value, sub, color }) {
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: FAINT, letterSpacing: ".05em" }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4, color: color || undefined }}>{value}</div>
      <div style={{ fontSize: 12, color: FAINT }}>{sub}</div>
    </Card>
  );
}

export function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${active ? NAVY : INPUT_BORDER}`, cursor: "pointer", padding: "9px 16px",
        borderRadius: 999, fontFamily: "inherit", fontSize: 13, fontWeight: 600,
        background: active ? NAVY : "#fff", color: active ? "#fff" : "#4A4940"
      }}
    >{children}</button>
  );
}

export function PrimaryButton({ children, style, ...rest }) {
  return (
    <button
      {...rest}
      style={{
        border: "none", cursor: rest.disabled ? "default" : "pointer", padding: "14px", borderRadius: 10,
        background: rest.disabled ? "#C9C7BC" : NAVY, color: "#fff", fontFamily: "inherit", fontSize: 14.5, fontWeight: 700,
        ...style
      }}
    >{children}</button>
  );
}

export function GhostButton({ children, style, ...rest }) {
  return (
    <button
      {...rest}
      style={{
        border: `1px solid ${INPUT_BORDER}`, cursor: "pointer", padding: "8px 14px", borderRadius: 8,
        background: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
        ...style
      }}
    >{children}</button>
  );
}

export function Toast({ children, tone = "success" }) {
  const styles = tone === "success"
    ? { bg: "oklch(0.93 0.05 155)", color: "oklch(0.4 0.1 155)" }
    : { bg: "oklch(0.95 0.05 25)", color: "oklch(0.4 0.14 25)" };
  return (
    <div style={{ padding: "11px 14px", borderRadius: 10, background: styles.bg, color: styles.color, fontSize: 13, fontWeight: 600 }}>
      {children}
    </div>
  );
}

export function Bar({ pct, color }) {
  return (
    <div style={{ height: 8, background: "#E9E7DF", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 999, background: color, width: `${pct}%` }} />
    </div>
  );
}
