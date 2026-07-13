const express = require("express");
const multer = require("multer");
const { nanoid } = require("nanoid");
const db = require("../db");
const { requireAuth, requireRole } = require("../auth");
const { wordCount, metricsFor } = require("../scoring");
const { buildAssignmentDoc, buildConsolidatedDoc } = require("../docx");
const { extractTextFromBuffer, parseQuestionsFromText } = require("../extract");

const router = express.Router();
router.use(requireAuth, requireRole("teacher"));
const ALLOWED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const nameOk = /\.(docx|pdf)$/i.test(file.originalname || "");
    if (!nameOk || !ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
      return cb(new Error("Only .docx and .pdf files are accepted."));
    }
    cb(null, true);
  }
});

function studentName(s) {
  return `${(s.surname || "").toUpperCase()}, ${s.given_name} ${s.mi}`.trim();
}

function deriveVocab(passage) {
  const words = passage.trim().split(/\s+/).filter(Boolean);
  const seen = new Set();
  const picked = [];
  for (const w of words) {
    const clean = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (clean.length > 6 && !seen.has(clean)) {
      seen.add(clean);
      picked.push(clean);
      if (picked.length >= 5) break;
    }
  }
  return picked.map(w => ({ word: w, def: "as used in the passage", defFil: "ayon sa gamit sa binasa" }));
}

function loadAssignment(id) {
  const a = db.prepare("SELECT * FROM assignments WHERE id = ?").get(id);
  if (!a) return null;
  const questions = db.prepare("SELECT * FROM questions WHERE assignment_id = ? ORDER BY seq").all(id)
    .map(q => ({ id: q.id, text: q.text, options: JSON.parse(q.options), correct: q.correct_index }));
  const vocab = db.prepare("SELECT * FROM vocab_words WHERE assignment_id = ? ORDER BY seq").all(id)
    .map(v => ({ word: v.word, def: v.def, defFil: v.def_fil }));
  return {
    id: a.id, classId: a.classroom_id, title: a.title, instructions: a.instructions, passage: a.passage,
    genre: a.genre, attempts: a.attempts, timeLimit: a.time_limit, sensitivity: a.sensitivity,
    deadlineISO: a.deadline_iso, createdAt: a.created_at, updatedAt: a.updated_at,
    wordCount: wordCount(a.passage), questions, vocab
  };
}

function ownsClassroom(teacherId, classroomId) {
  return !!db.prepare("SELECT id FROM classrooms WHERE id = ? AND teacher_id = ?").get(classroomId, teacherId);
}
function ownsAssignment(teacherId, assignmentId) {
  return !!db.prepare("SELECT id FROM assignments WHERE id = ? AND teacher_id = ?").get(assignmentId, teacherId);
}

// ===== Classrooms =====
router.get("/classrooms", (req, res) => {
  const classes = db.prepare("SELECT * FROM classrooms WHERE teacher_id = ? ORDER BY created_at").all(req.user.id);
  const out = classes.map(c => {
    const students = db.prepare(`
      SELECT u.* FROM classroom_students cs JOIN users u ON u.id = cs.student_id
      WHERE cs.classroom_id = ? ORDER BY u.surname
    `).all(c.id);
    const assignmentCount = db.prepare("SELECT COUNT(*) n FROM assignments WHERE classroom_id = ?").get(c.id).n;
    return {
      id: c.id, name: c.name, assignmentCount,
      students: students.map(s => ({
        id: s.id, surname: s.surname, given: s.given_name, mi: s.mi, sex: s.sex, grade: s.grade_section, email: s.email
      }))
    };
  });
  res.json({ classrooms: out });
});

router.post("/classrooms", (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Classroom name is required." });
  const id = nanoid();
  db.prepare("INSERT INTO classrooms (id, teacher_id, name, created_at) VALUES (?, ?, ?, ?)").run(id, req.user.id, name, Date.now());
  res.json({ id, name });
});

router.post("/classrooms/:id/students", (req, res) => {
  const classId = req.params.id;
  if (!ownsClassroom(req.user.id, classId)) return res.status(404).json({ error: "Classroom not found." });
  const { surname, given, mi, sex, grade, email } = req.body || {};
  if (!surname?.trim() || !given?.trim()) return res.status(400).json({ error: "Please enter at least Surname and Given Name." });

  const cls = db.prepare("SELECT name FROM classrooms WHERE id = ?").get(classId);
  const emailNorm = (email || "").trim().toLowerCase() || `${given}.${surname}.${nanoid(5)}@pending.local`.toLowerCase().replace(/\s+/g, "");
  let student = db.prepare("SELECT * FROM users WHERE email = ?").get(emailNorm);
  if (!student) {
    const id = nanoid();
    db.prepare(`
      INSERT INTO users (id, role, email, password_hash, status, surname, given_name, mi, sex, grade_section, created_at)
      VALUES (?, 'student', ?, 'UNCLAIMED', 'active', ?, ?, ?, ?, ?, ?)
    `).run(id, emailNorm, surname.trim(), given.trim(), (mi || "").trim(), sex || "M", grade?.trim() || cls.name, Date.now());
    student = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  }
  db.prepare("INSERT OR IGNORE INTO classroom_students (classroom_id, student_id) VALUES (?, ?)").run(classId, student.id);
  res.json({ ok: true });
});

router.get("/classrooms/:id/docx", async (req, res) => {
  const classId = req.params.id;
  if (!ownsClassroom(req.user.id, classId)) return res.status(404).json({ error: "Classroom not found." });
  const cls = db.prepare("SELECT * FROM classrooms WHERE id = ?").get(classId);
  const asgRow = db.prepare("SELECT * FROM assignments WHERE classroom_id = ? ORDER BY created_at DESC LIMIT 1").get(classId);
  if (!asgRow) return res.status(400).json({ error: "This classroom has no assignments yet." });
  const asg = loadAssignment(asgRow.id);
  const students = db.prepare(`
    SELECT u.* FROM classroom_students cs JOIN users u ON u.id = cs.student_id WHERE cs.classroom_id = ? ORDER BY u.surname
  `).all(classId);

  function withMetrics(s) {
    const sub = db.prepare("SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?").get(asg.id, s.id);
    if (!sub || sub.status !== "turned-in") return { name: studentName(s), status: sub ? sub.status : "not-started", metrics: null };
    const miscues = JSON.parse(sub.miscues);
    const m = metricsFor({ words: asg.wordCount, miscues, seconds: sub.seconds, correct: sub.correct_count, items: asg.questions.length });
    return { name: studentName(s), status: sub.status, metrics: m, seconds: sub.seconds };
  }
  const males = students.filter(s => s.sex === "M").map(withMetrics);
  const females = students.filter(s => s.sex !== "M").map(withMetrics);

  const buf = await buildConsolidatedDoc(cls.name, asg, males, females);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="Consolidated Report - ${cls.name}.docx"`);
  res.send(Buffer.from(buf));
});

// ===== Assignments =====
router.post("/assignments", (req, res) => {
  const { title, instructions, passage, classId, genre, attempts, timeLimit, sensitivity, deadline, questions } = req.body || {};
  if (!title?.trim() || !passage?.trim()) return res.status(400).json({ error: "Please add a title and passage." });
  if (!ownsClassroom(req.user.id, classId)) return res.status(400).json({ error: "Invalid target classroom." });

  const id = nanoid();
  const now = Date.now();
  db.prepare(`
    INSERT INTO assignments (id, classroom_id, teacher_id, title, instructions, passage, genre, attempts, time_limit, sensitivity, deadline_iso, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, classId, req.user.id, title.trim(), instructions || "Read the passage aloud clearly.", passage, genre || "Non-Fiction", attempts || "3", timeLimit || "10 minutes", sensitivity || "Default", deadline || "", now);

  (questions || []).forEach((q, i) => {
    db.prepare("INSERT INTO questions (id, assignment_id, seq, text, options, correct_index) VALUES (?, ?, ?, ?, ?, ?)")
      .run(nanoid(), id, i, q, JSON.stringify(["Answer A", "Answer B", "Answer C", "Answer D"]), 0);
  });
  deriveVocab(passage).forEach((v, i) => {
    db.prepare("INSERT INTO vocab_words (id, assignment_id, seq, word, def, def_fil) VALUES (?, ?, ?, ?, ?, ?)")
      .run(nanoid(), id, i, v.word, v.def, v.defFil);
  });

  // seed a not-started submission row for every student currently in the class
  const students = db.prepare("SELECT student_id FROM classroom_students WHERE classroom_id = ?").all(classId);
  students.forEach(s => {
    db.prepare("INSERT OR IGNORE INTO submissions (id, assignment_id, student_id, status) VALUES (?, ?, ?, 'not-started')").run(nanoid(), id, s.student_id);
  });

  res.json({ id });
});

router.get("/assignments", (req, res) => {
  const rows = db.prepare("SELECT * FROM assignments WHERE teacher_id = ? ORDER BY created_at DESC").all(req.user.id);
  const groups = [];
  rows.forEach(a => {
    const d = new Date(a.created_at);
    const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
    let g = groups.find(x => x.name === key);
    if (!g) { g = { name: key, items: [] }; groups.push(g); }
    const cls = db.prepare("SELECT name FROM classrooms WHERE id = ?").get(a.classroom_id);
    const subs = db.prepare("SELECT status, submitted_at FROM submissions WHERE assignment_id = ?").all(a.id);
    const qCount = db.prepare("SELECT COUNT(*) n FROM questions WHERE assignment_id = ?").get(a.id).n;
    const done = subs.filter(s => s.status === "turned-in");
    let doneText;
    if (subs.length === 0) doneText = "No submissions yet";
    else if (done.length === 0) doneText = `Not yet accomplished · 0 of ${subs.length}`;
    else {
      const last = Math.max(...done.map(s => s.submitted_at || 0));
      doneText = `Accomplished by ${done.length} of ${subs.length}` + (done.length === subs.length ? " (complete)" : "") +
        (last ? " · last on " + new Date(last).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
    }
    g.items.push({
      id: a.id, title: a.title,
      dateText: "Created " + new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + (a.updated_at ? " · Edited " + new Date(a.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""),
      meta: (cls ? cls.name + " · " : "") + a.genre + " · " + wordCount(a.passage) + " words · " + qCount + " questions · Due " + a.deadline_iso,
      doneText,
      complete: done.length > 0 && done.length === subs.length,
      partial: done.length > 0 && done.length < subs.length
    });
  });
  res.json({ groups });
});

router.get("/assignments/:id", (req, res) => {
  if (!ownsAssignment(req.user.id, req.params.id)) return res.status(404).json({ error: "Assignment not found." });
  const a = loadAssignment(req.params.id);
  const cls = db.prepare("SELECT name FROM classrooms WHERE id = ?").get(a.classId);
  res.json({ assignment: { ...a, className: cls?.name || "" } });
});

router.put("/assignments/:id", (req, res) => {
  const id = req.params.id;
  if (!ownsAssignment(req.user.id, id)) return res.status(404).json({ error: "Assignment not found." });
  const { title, instructions, passage, genre, attempts, timeLimit, sensitivity, deadlineISO, questions } = req.body || {};
  if (!title?.trim() || !passage?.trim()) return res.status(400).json({ error: "Title and passage are required." });
  db.prepare(`
    UPDATE assignments SET title=?, instructions=?, passage=?, genre=?, attempts=?, time_limit=?, sensitivity=?, deadline_iso=?, updated_at=?
    WHERE id = ?
  `).run(title.trim(), instructions || "", passage, genre, attempts, timeLimit, sensitivity, deadlineISO || "", Date.now(), id);

  db.prepare("DELETE FROM questions WHERE assignment_id = ?").run(id);
  (questions || []).forEach((q, i) => {
    db.prepare("INSERT INTO questions (id, assignment_id, seq, text, options, correct_index) VALUES (?, ?, ?, ?, ?, ?)")
      .run(nanoid(), id, i, q, JSON.stringify(["Answer A", "Answer B", "Answer C", "Answer D"]), 0);
  });
  db.prepare("DELETE FROM vocab_words WHERE assignment_id = ?").run(id);
  deriveVocab(passage).forEach((v, i) => {
    db.prepare("INSERT INTO vocab_words (id, assignment_id, seq, word, def, def_fil) VALUES (?, ?, ?, ?, ?, ?)")
      .run(nanoid(), id, i, v.word, v.def, v.defFil);
  });
  res.json({ ok: true });
});

router.get("/assignments/:id/docx", async (req, res) => {
  if (!ownsAssignment(req.user.id, req.params.id)) return res.status(404).json({ error: "Assignment not found." });
  const a = loadAssignment(req.params.id);
  const cls = db.prepare("SELECT name FROM classrooms WHERE id = ?").get(a.classId);
  const buf = await buildAssignmentDoc({ ...a, deadline: a.deadlineISO }, cls?.name);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="Assignment - ${a.title}.docx"`);
  res.send(Buffer.from(buf));
});

function handleUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Could not upload that file." });
    next();
  });
}

router.post("/parse-questions", handleUpload, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  try {
    const text = await extractTextFromBuffer(req.file.buffer, req.file.originalname);
    const questions = parseQuestionsFromText(text);
    if (!questions.length) return res.status(422).json({ error: "No questions found in the file. Each question should be on its own line and end with a question mark (?)." });
    res.json({ questions });
  } catch (e) {
    res.status(422).json({ error: "Could not read that file. Please upload a .docx or .pdf." });
  }
});

// ===== Progress Monitor / Miscue Report / Analytics =====
router.get("/assignments/:id/progress", (req, res) => {
  if (!ownsAssignment(req.user.id, req.params.id)) return res.status(404).json({ error: "Assignment not found." });
  const a = loadAssignment(req.params.id);
  const subs = db.prepare(`
    SELECT s.*, u.surname, u.given_name, u.mi, u.grade_section FROM submissions s
    JOIN users u ON u.id = s.student_id WHERE s.assignment_id = ? ORDER BY u.surname
  `).all(a.id);
  const rows = subs.map(s => {
    const miscues = JSON.parse(s.miscues || "{}");
    const m = s.status === "turned-in" ? metricsFor({ words: a.wordCount, miscues, seconds: s.seconds, correct: s.correct_count, items: a.questions.length }) : null;
    return {
      submissionId: s.id, name: `${s.given_name} ${s.surname}`.trim(), grade: s.grade_section,
      status: s.status, wpm: m?.wpm ?? null, wordScore: m?.score ?? null, comp: m?.acc ?? null,
      profile: m?.profile ?? null, hasReport: !!m
    };
  });
  const turnedIn = rows.filter(r => r.status === "turned-in");
  res.json({
    title: a.title, deadline: a.deadlineISO, className: db.prepare("SELECT name FROM classrooms WHERE id=?").get(a.classId)?.name,
    completionPct: rows.length ? Math.round(turnedIn.length / rows.length * 100) : 0,
    rows
  });
});

function fullReport(submissionId, teacherId) {
  const sub = db.prepare(`
    SELECT s.*, u.surname, u.given_name, u.mi, u.grade_section, u.email FROM submissions s
    JOIN users u ON u.id = s.student_id WHERE s.id = ?
  `).get(submissionId);
  if (!sub) return null;
  const a = loadAssignment(sub.assignment_id);
  if (!ownsAssignment(teacherId, a.id)) return null;
  const miscues = JSON.parse(sub.miscues || "{}");
  const marked = JSON.parse(sub.marked || "[]");
  const m = metricsFor({ words: a.wordCount, miscues, seconds: sub.seconds, correct: sub.correct_count, items: a.questions.length });
  const answers = JSON.parse(sub.answers || "{}");
  return {
    name: `${sub.given_name} ${sub.surname} ${sub.mi}`.trim(), firstName: sub.given_name,
    grade: sub.grade_section, assignment: a.title, words: a.wordCount,
    seconds: sub.seconds, miscues, metrics: m, answers,
    questions: a.questions.map((q, i) => ({ n: i + 1, text: q.text, options: q.options, chosen: answers[i] ?? null, correct: q.correct })),
    marked
  };
}

router.get("/submissions/:id/report", (req, res) => {
  const report = fullReport(req.params.id, req.user.id);
  if (!report) return res.status(404).json({ error: "Report not found." });
  res.json({ report });
});

router.get("/assignments/:id/analytics", (req, res) => {
  if (!ownsAssignment(req.user.id, req.params.id)) return res.status(404).json({ error: "Assignment not found." });
  const a = loadAssignment(req.params.id);
  const subs = db.prepare("SELECT * FROM submissions WHERE assignment_id = ?").all(a.id);
  const turnedIn = subs.filter(s => s.status === "turned-in");
  const metrics = turnedIn.map(s => metricsFor({ words: a.wordCount, miscues: JSON.parse(s.miscues || "{}"), seconds: s.seconds, correct: s.correct_count, items: a.questions.length }));
  const avg = arr => arr.length ? Math.round(arr.reduce((x, y) => x + y, 0) / arr.length) : 0;
  const levelCounts = { Independent: 0, Instructional: 0, Frustration: 0 };
  metrics.forEach(m => levelCounts[m.profile]++);
  res.json({
    stats: [
      { label: "COMPLETION RATE", value: (subs.length ? Math.round(turnedIn.length / subs.length * 100) : 0) + "%", sub: `${turnedIn.length} of ${subs.length} turned in` },
      { label: "AVERAGE READING RATE", value: avg(metrics.map(m => m.wpm)) + " wpm", sub: "across turned-in tasks" },
      { label: "AVERAGE COMPREHENSION", value: avg(metrics.map(m => m.acc)) + "%", sub: "correct answers" }
    ],
    levels: levelCounts
  });
});

router.get("/assignments/:id/reports-all", (req, res) => {
  if (!ownsAssignment(req.user.id, req.params.id)) return res.status(404).json({ error: "Assignment not found." });
  const a = loadAssignment(req.params.id);
  const subs = db.prepare("SELECT id FROM submissions WHERE assignment_id = ? AND status = 'turned-in'").all(a.id);
  const records = subs.map(s => fullReport(s.id, req.user.id));
  res.json({ records });
});

router.get("/assignments/:id/reports-all.docx", async (req, res) => {
  if (!ownsAssignment(req.user.id, req.params.id)) return res.status(404).json({ error: "Assignment not found." });
  const a = loadAssignment(req.params.id);
  const subIds = db.prepare("SELECT id, student_id FROM submissions WHERE assignment_id = ? AND status = 'turned-in'").all(a.id);
  const { MISCUE_TYPES } = require("../docx");
  const records = subIds.map(({ id }) => {
    const r = fullReport(id, req.user.id);
    const wrongIdx = {};
    r.questions.forEach((q, i) => { if (q.chosen !== q.correct) wrongIdx[i] = true; });
    return {
      name: r.name, grade: r.grade, school: "Taft National High School (303529)", division: "Eastern Samar", region: "Region VIII – Eastern Visayas",
      selection: r.assignment, minutes: Math.floor(r.seconds / 60) + ":" + String(r.seconds % 60).padStart(2, "0"), seconds: r.seconds,
      wpm: r.metrics.wpm, correct: r.metrics.correct, items: r.metrics.items, acc: r.metrics.acc, compLevel: r.metrics.compLevel,
      level: r.metrics.level, tm: r.metrics.tm, words: r.metrics.words, score: r.metrics.score, profile: r.metrics.profile,
      miscueRows: MISCUE_TYPES.map((t, i) => ({ n: i + 1, label: t.label, fil: t.fil, count: r.miscues[t.key] || 0 })),
      responses: r.questions.map(q => ({ n: q.n, letter: q.chosen != null ? ["A", "B", "C", "D"][q.chosen] : "—", mark: q.chosen === q.correct ? "✓" : "✗" }))
    };
  });
  const { buildForm3BulkDoc } = require("../docx");
  const buf = await buildForm3BulkDoc(records);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="Phil-IRI Form 3 - ${a.title}.docx"`);
  res.send(Buffer.from(buf));
});

module.exports = router;
