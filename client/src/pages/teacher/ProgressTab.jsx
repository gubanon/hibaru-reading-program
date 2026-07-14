import { useEffect, useState, useCallback, Fragment } from "react";
import { api } from "../../api";
import { FAINT, NAVY, GREEN, MISCUE_TYPES, levelColor, statusMeta , ACCENT } from "../../theme";
import { Bar } from "../../components/ui";

function flattenAssignments(groups) {
  const out = [];
  groups.forEach(g => g.items.forEach(a => out.push(a)));
  return out;
}

function ReportSheet({ submissionId, onBack }) {
  const [r, setR] = useState(null);
  const [showParent, setShowParent] = useState(false);
  useEffect(() => { api.get(`/teacher/submissions/${submissionId}/report`).then(d => setR(d.report)); }, [submissionId]);
  if (!r) return null;
  const m = r.metrics;
  const maxCount = Math.max(1, ...MISCUE_TYPES.map(t => r.miscues[t.key] || 0));
  const bars = MISCUE_TYPES.map(t => ({ ...t, count: r.miscues[t.key] || 0, pct: Math.round((r.miscues[t.key] || 0) / maxCount * 100) }));
  const legend = bars.filter(b => b.count > 0);
  const rProfileColor = levelColor(m.profile);
  const rParentAdvice = m.level === "Independent" ? "They can read this material confidently on their own — great work!" : m.level === "Instructional" ? "They read well with some support — practicing aloud at home for 10 minutes a day will help." : "They found this passage difficult — reading together at home every day will make a big difference.";

  return (
    <>
      <div data-noprint="1" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>← Back</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowParent(true)} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>👨‍👩‍👧 Parent summary</button>
        <button onClick={() => window.print()} style={{ border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 8, background: "var(--ink)", color: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>🖨 Print Phil-IRI Form 3</button>
      </div>
      <div data-print-area="1" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "2px solid #22335E", paddingBottom: 12, marginBottom: 14 }}>
          <img src="/assets/hibaru-logo-sm.png" alt="" style={{ height: 46 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".08em" }}>PHIL-IRI FOR JHS FORM 3 · LEARNER'S RECORD</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700 }}>{r.name}</h2>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <div><b>Grade &amp; Section:</b> {r.grade}</div>
            <div><b>Reading Selection:</b> {r.assignment} ({r.words} words)</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 22 }}>
          {[
            { label: "READING RATE", value: m.wpm + " wpm", sub: `${Math.floor(r.seconds / 60)}:${String(r.seconds % 60).padStart(2, "0")} total (${r.seconds}s)`, color: "var(--text)" },
            { label: "WORD READING SCORE", value: m.score + "%", sub: `${m.tm} miscues / ${m.words} words`, color: levelColor(m.level) },
            { label: "WORD READING LEVEL", value: m.level, sub: "97–100 Ind · 90–96 Ins · ≤89 Fru", color: levelColor(m.level) },
            { label: "COMPREHENSION", value: m.acc + "%", sub: `${m.correct} of ${m.items} · ${m.compLevel}`, color: levelColor(m.compLevel) },
            { label: "READING PROFILE", value: m.profile, sub: "per passage", color: rProfileColor }
          ].map((st, i) => (
            <div key={i} style={{ background: "var(--subtle-bg)", borderRadius: 11, padding: "14px 16px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".05em" }}>{st.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 3, color: st.color }}>{st.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>{st.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 22, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Part B · Miscue Analysis <span style={{ color: "var(--text-faint)", fontWeight: 500 }}>· {m.tm} total</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bars.map(b => (
                <div key={b.key} style={{ display: "grid", gridTemplateColumns: "150px 1fr 22px", gap: 8, alignItems: "center", fontSize: 12 }}>
                  <div style={{ color: "var(--text-muted)" }}>{b.label} <span style={{ color: "var(--text-faint-2)", fontStyle: "italic" }}>{b.fil}</span></div>
                  <div style={{ height: 14, background: "var(--chip-bg)", borderRadius: 999, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 999, background: b.color, width: `${b.pct}%` }} /></div>
                  <div style={{ fontWeight: 700, textAlign: "right" }}>{b.count}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, padding: 14, background: "var(--subtle-bg)", borderRadius: 11, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-muted)" }}>
              <b>Formulas applied:</b><br />
              Reading rate = words ÷ seconds × 60 = {m.words} ÷ {r.seconds} × 60 = {m.wpm} wpm<br />
              Word score = (words − miscues) ÷ words × 100 = ({m.words} − {m.tm}) ÷ {m.words} × 100 = {m.score}%<br />
              Accuracy = correct ÷ items × 100 = {m.correct} ÷ {m.items} × 100 = {m.acc}%
            </div>
            <div style={{ marginTop: 12, padding: 14, border: `2px solid ${rProfileColor}`, borderRadius: 11 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".06em" }}>PART C · READING PROFILE (per passage)</div>
              <div style={{ fontSize: 21, fontWeight: 700, color: rProfileColor, marginTop: 3 }}>{m.profile}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>Word Reading {m.level} × Comprehension {m.compLevel}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Marked-up passage <span style={{ color: "var(--text-faint)", fontWeight: 500 }}>· miscues shown in context</span></div>
            <div style={{ border: "1px solid var(--divider)", borderRadius: 11, padding: 18, fontSize: 15, lineHeight: 2.1 }}>
              {r.marked.map((w, i) => {
                const t = MISCUE_TYPES.find(x => x.key === w.type);
                return (
                  <span key={i}>
                    <span title={t ? t.label : ""} style={{ background: t ? t.color.replace(")", " / 0.18)") : "transparent", borderBottom: t ? `2.5px solid ${t.color}` : "none", borderRadius: 4, padding: t ? "1px 3px" : 0 }}>{w.word}</span>{" "}
                  </span>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
              {legend.map(l => (
                <span key={l.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-muted)" }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: l.color }} />{l.label}
                </span>
              ))}
              {!legend.length && <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>No miscues detected.</span>}
            </div>
          </div>
        </div>
      </div>

      {showParent && (
        <div data-noprint="1" onClick={() => setShowParent(false)} style={{ position: "fixed", inset: 0, background: "rgba(34,51,94,.5)", display: "grid", placeItems: "center", zIndex: 100, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--card-bg)", borderRadius: 16, padding: 28, maxWidth: 520, fontSize: 14, lineHeight: 1.7 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".08em", marginBottom: 6 }}>SUMMARY FOR PARENT / GUARDIAN · PARA SA MAGULANG</div>
            <h3 style={{ margin: "0 0 10px", fontSize: 19 }}>How {r.firstName} is doing</h3>
            <p style={{ margin: "0 0 10px" }}>{r.firstName} read the passage "{r.assignment}" aloud in {Math.floor(r.seconds / 60)} minutes, at a pace of <b>{m.wpm} words per minute</b>.</p>
            <p style={{ margin: "0 0 10px" }}>Out of {m.words} words, {r.firstName} read {m.words - m.tm} correctly — a word reading score of <b>{m.score}%</b>, which places them at the <b>{m.level}</b> level. {rParentAdvice}</p>
            <p style={{ margin: 0 }}>On the comprehension questions, {r.firstName} answered <b>{m.correct} of {m.items}</b> correctly ({m.acc}%). Overall reading profile: <b>{m.profile}</b>.</p>
            <button onClick={() => setShowParent(false)} style={{ marginTop: 16, border: "none", cursor: "pointer", padding: "10px 18px", borderRadius: 9, background: NAVY, color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

function PrintAllSheet({ assignmentId, onBack }) {
  const [records, setRecords] = useState([]);
  useEffect(() => { api.get(`/teacher/assignments/${assignmentId}/reports-all`).then(d => setRecords(d.records)); }, [assignmentId]);
  return (
    <>
      <div data-noprint="1" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>← Back</button>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Print-ready · one Phil-IRI Form 3 Learner's Record per page</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => api.download(`/teacher/assignments/${assignmentId}/reports-all.docx`, "Phil-IRI Form 3.docx")} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>⬇ DOCX</button>
        <button onClick={() => window.print()} style={{ border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 8, background: "var(--ink)", color: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>🖨 Print / Save as PDF</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {records.map((rec, i) => {
          const m = rec.metrics;
          return (
            <div key={i} data-record="1" data-print-area="1" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "44px 52px", fontFamily: "'Times New Roman',Georgia,serif", fontSize: 14, color: "#000", maxWidth: 760, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <img src="/assets/hibaru-logo-sm.png" alt="" style={{ height: 52 }} />
                <div style={{ flex: 1 }} />
                <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14 }}>Phil-IRI for JHS Form 3</div>
                <img src="/assets/taft-logo.png" alt="" style={{ height: 52 }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, margin: "14px 0 18px" }}>LEARNER'S RECORD</div>
              <div style={{ display: "grid", gridTemplateColumns: "150px 12px 1fr", gap: "6px 4px", margin: "0 0 26px 14px", fontWeight: 700 }}>
                <div>Student's Name</div><div>:</div><div style={{ borderBottom: "1.5px solid #000", fontWeight: 400, padding: "0 6px" }}>{rec.name}</div>
                <div>Grade &amp; Section</div><div>:</div><div style={{ borderBottom: "1.5px solid #000", fontWeight: 400, padding: "0 6px" }}>{rec.grade}</div>
                <div>School</div><div>:</div><div style={{ borderBottom: "1.5px solid #000", fontWeight: 400, padding: "0 6px" }}>Taft National High School (303529)</div>
                <div>Division</div><div>:</div><div style={{ borderBottom: "1.5px solid #000", fontWeight: 400, padding: "0 6px" }}>Eastern Samar</div>
                <div>Region</div><div>:</div><div style={{ borderBottom: "1.5px solid #000", fontWeight: 400, padding: "0 6px" }}>Region VIII – Eastern Visayas</div>
                <div>Reading Selection</div><div>:</div><div style={{ borderBottom: "1.5px solid #000", fontWeight: 400, padding: "0 6px" }}>{rec.assignment}</div>
              </div>
              <div style={{ borderTop: "2px solid #000", paddingTop: 10, marginBottom: 18 }}>
                <div style={{ marginBottom: 10 }}><span style={{ fontWeight: 700, textDecoration: "underline" }}>PART A:</span> <b>Comprehension Level:</b> <span style={{ borderBottom: "1.5px solid #000", padding: "0 14px", fontWeight: 700 }}>{m.compLevel}</span></div>
                <div style={{ lineHeight: 1.9 }}>
                  <b>Total time in Reading the Text:</b> <span style={{ borderBottom: "1px solid #000", padding: "0 8px" }}>{Math.floor(rec.seconds / 60)}</span> minutes (= <span style={{ borderBottom: "1px solid #000", padding: "0 8px" }}>{rec.seconds}</span> seconds)<br />
                  <b>Reading Rate:</b> <span style={{ borderBottom: "1px solid #000", padding: "0 8px" }}>{m.wpm}</span> words per minute<br />
                  <b>Responses to Questions:</b> Score <span style={{ borderBottom: "1px solid #000", padding: "0 10px" }}>{m.correct} / {m.items}</span> = <span style={{ borderBottom: "1px solid #000", padding: "0 8px" }}>{m.acc}</span> %
                </div>
              </div>
              <div style={{ borderTop: "2px solid #000", paddingTop: 10, marginBottom: 18 }}>
                <div style={{ marginBottom: 10 }}><span style={{ fontWeight: 700, textDecoration: "underline" }}>PART B:</span> <b>Word Reading Level:</b> <span style={{ borderBottom: "1.5px solid #000", padding: "0 14px", fontWeight: 700 }}>{m.level}</span></div>
                <div style={{ display: "grid", gridTemplateColumns: "34px 1fr 150px", border: "1.5px solid #000", borderBottom: "none", fontSize: 13.5 }}>
                  <div style={{ borderBottom: "1.5px solid #000", borderRight: "1.5px solid #000", padding: "4px 8px" }}></div>
                  <div style={{ borderBottom: "1.5px solid #000", borderRight: "1.5px solid #000", padding: "4px 8px", fontWeight: 700, textAlign: "center" }}>Types of Miscues</div>
                  <div style={{ borderBottom: "1.5px solid #000", padding: "4px 8px", fontWeight: 700, textAlign: "center" }}>Number of Miscues</div>
                  {MISCUE_TYPES.map((t, ti) => (
                    <Fragment key={t.key}>
                      <div style={{ borderBottom: "1px solid #000", borderRight: "1.5px solid #000", padding: "3px 8px", fontWeight: 700 }}>{ti + 1}</div>
                      <div style={{ borderBottom: "1px solid #000", borderRight: "1.5px solid #000", padding: "3px 8px" }}>{t.label} <i>{t.fil}</i></div>
                      <div style={{ borderBottom: "1px solid #000", padding: "3px 8px", textAlign: "center" }}>{rec.miscues[t.key] || 0}</div>
                    </Fragment>
                  ))}
                  <div style={{ gridColumn: "1 / 3", borderBottom: "1px solid #000", borderRight: "1.5px solid #000", padding: "3px 8px", fontWeight: 700, textAlign: "right" }}>Total Miscues</div>
                  <div style={{ borderBottom: "1px solid #000", padding: "3px 8px", textAlign: "center", fontWeight: 700 }}>{m.tm}</div>
                  <div style={{ gridColumn: "1 / 3", borderBottom: "1px solid #000", borderRight: "1.5px solid #000", padding: "3px 8px", fontWeight: 700, textAlign: "right" }}>Number of Words in the Passage</div>
                  <div style={{ borderBottom: "1px solid #000", padding: "3px 8px", textAlign: "center" }}>{m.words}</div>
                  <div style={{ gridColumn: "1 / 3", borderBottom: "1.5px solid #000", borderRight: "1.5px solid #000", padding: "3px 8px", fontWeight: 700, textAlign: "right" }}>Word Reading Score</div>
                  <div style={{ borderBottom: "1.5px solid #000", padding: "3px 8px", textAlign: "center", fontWeight: 700 }}>{m.score}%</div>
                </div>
              </div>
              <div style={{ borderTop: "2px solid #000", paddingTop: 10 }}>
                <span style={{ fontWeight: 700, textDecoration: "underline" }}>PART C:</span> <b>Reading Profile:</b> <span style={{ borderBottom: "1.5px solid #000", padding: "0 14px", fontWeight: 700 }}>{m.profile}</span>
              </div>
            </div>
          );
        })}
        {!records.length && <div style={{ color: FAINT, fontSize: 13 }}>No turned-in submissions yet for this assignment.</div>}
      </div>
    </>
  );
}

export default function ProgressTab() {
  const [assignments, setAssignments] = useState([]);
  const [assignmentId, setAssignmentId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [printAll, setPrintAll] = useState(false);

  useEffect(() => {
    api.get("/teacher/assignments").then(d => {
      const flat = flattenAssignments(d.groups);
      setAssignments(flat);
      if (flat.length) setAssignmentId(flat[0].id);
    });
  }, []);

  const loadProgress = useCallback(() => {
    if (!assignmentId) return;
    api.get(`/teacher/assignments/${assignmentId}/progress`).then(setProgress);
  }, [assignmentId]);
  useEffect(() => { loadProgress(); }, [loadProgress]);

  if (!assignments.length) return <div style={{ color: FAINT, fontSize: 13 }}>No assignments yet — create one from "New Assignment" to start monitoring progress.</div>;

  if (reportId) return <ReportSheet submissionId={reportId} onBack={() => setReportId(null)} />;
  if (printAll) return <PrintAllSheet assignmentId={assignmentId} onBack={() => setPrintAll(false)} />;
  if (!progress) return null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700 }}>Progress Monitor</h2>
            <span style={{ fontSize: 12.5, color: FAINT }}>Pagsubaybay sa Progreso</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{progress.title} · Due {progress.deadline} · {progress.completionPct}% turned in</div>
        </div>
        <div style={{ flex: 1 }} />
        <select data-noprint="1" value={assignmentId || ""} onChange={e => setAssignmentId(e.target.value)}
          style={{ fontFamily: "inherit", fontSize: 13, padding: "9px 12px", border: "1px solid var(--input-border)", borderRadius: 8, background: "var(--card-bg)" }}>
          {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        <button data-noprint="1" onClick={() => setPrintAll(true)} style={{ border: "none", cursor: "pointer", padding: "10px 18px", borderRadius: 9, background: "#F5B301", color: NAVY, fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>⬇ Download Result (all students)</button>
      </div>
      <div style={{ margin: "14px 0 20px", maxWidth: 420 }}><Bar pct={progress.completionPct} color={GREEN} /></div>
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr .8fr .9fr 1fr 1.1fr 100px", gap: 8, padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".04em", borderBottom: "1px solid var(--divider)" }}>
          <div>STUDENT</div><div>STATUS</div><div>WPM</div><div>WORD SCORE</div><div>COMPREHENSION</div><div>READING PROFILE</div><div></div>
        </div>
        {progress.rows.map(r => {
          const sm = statusMeta[r.status];
          return (
            <div key={r.submissionId} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr .8fr .9fr 1fr 1.1fr 100px", gap: 8, padding: "13px 18px", alignItems: "center", borderBottom: "1px solid var(--divider)", fontSize: 13.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: NAVY, color: "#fff", display: "grid", placeItems: "center", fontSize: 11.5, fontWeight: 700 }}>
                  {r.name.split(" ").map(p => p[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint-2)" }}>{r.grade}</div>
                </div>
              </div>
              <div><span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: sm.bg, color: sm.color }}>{sm.label}</span></div>
              <div>{r.wpm ?? "—"}</div>
              <div>{r.wordScore != null ? r.wordScore + "%" : "—"}</div>
              <div>{r.comp != null ? r.comp + "%" : "—"}</div>
              <div style={{ fontWeight: 600, color: r.profile ? levelColor(r.profile) : "var(--text-faint-2)" }}>{r.profile || "—"}</div>
              <div>{r.hasReport && <button onClick={() => setReportId(r.submissionId)} style={{ border: "1px solid var(--input-border)", cursor: "pointer", padding: "6px 12px", borderRadius: 8, background: "var(--card-bg)", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: ACCENT }}>Report →</button>}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
