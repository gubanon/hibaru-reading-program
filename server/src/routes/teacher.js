const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const { nanoid } = require("nanoid");
const db = require("../db");
const { requireAuth, requireRole } = require("../auth");
const { wordCount, metricsFor } = require("../scoring");
const { buildAssignmentDoc, buildConsolidatedDoc } = require("../docx");
const { extractTextFromBuffer, parseQuestionsFromText } = require("../extract");
const { sendEmail, escapeHtml, CLIENT_URL } = require("../email");

function inviteToken() {
  return crypto.randomBytes(24).toString("base64url");
}

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

async function loadAssignment(id) {
  const a = await db.prepare("SELECT * FROM assignments WHERE id = ?").get(id);
  if (!a) return null;
  const questionRows = await db.prepare("SELECT * FROM questions WHERE assignment_id = ? ORDER BY seq").all(id);
  const questions = questionRows.map(q => ({ id: q.id, text: q.text, options: JSON.parse(q.options), correct: q.correct_index }));
  const vocabRows = await db.prepare("SELECT * FROM vocab_words WHERE assignment_id = ? ORDER BY seq").all(id);
  const vocab = vocabRows.map(v => ({ word: v.word, def: v.def, defFil: v.def_fil }));
  return {
    id: a.id, classId: a.classroom_id, title: a.title, instructions: a.instructions, passage: a.passage,
    genre: a.genre, attempts: a.attempts, timeLimit: a.time_limit, sensitivity: a.sensitivity,
    deadlineISO: a.deadline_iso, createdAt: a.created_at, updatedAt: a.updated_at,
    wordCount: wordCount(a.passage), questions, vocab
  };
}

// `questions` from the client is [{ text, options: [4 strings], correct: 0-3 }].
// Reject anything malformed rather than silently falling back to filler
// answers — a comprehension question with fake choices is worse than none.
function validateQuestions(questions) {
  if (!Array.isArray(questions)) return "Questions must be a list.";
  for (const q of questions) {
    if (!q || typeof q.text !== "string" || !q.text.trim()) return "Every question needs text.";
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => typeof o !== "string" || !o.trim())) {
      return `"${q.text.trim()}" needs all 4 answer choices filled in.`;
    }
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) return `"${q.text.trim()}" needs a correct answer selected.`;
  }
  return null;
}

async function insertQuestions(assignmentId, questions) {
  let i = 0;
  for (const q of (questions || [])) {
    await db.prepare("INSERT INTO questions (id, assignment_id, seq, text, options, correct_index) VALUES (?, ?, ?, ?, ?, ?)")
      .run(nanoid(), assignmentId, i, q.text.trim(), JSON.stringify(q.options.map(o => o.trim())), q.correct);
    i++;
  }
}

async function insertVocab(assignmentId, passage) {
  const words = deriveVocab(passage);
  let i = 0;
  for (const v of words) {
    await db.prepare("INSERT INTO vocab_words (id, assignment_id, seq, word, def, def_fil) VALUES (?, ?, ?, ?, ?, ?)")
      .run(nanoid(), assignmentId, i, v.word, v.def, v.defFil);
    i++;
  }
}

async function ownsClassroom(teacherId, classroomId) {
  return !!(await db.prepare("SELECT id FROM classrooms WHERE id = ? AND teacher_id = ?").get(classroomId, teacherId));
}
async function ownsAssignment(teacherId, assignmentId) {
  return !!(await db.prepare("SELECT id FROM assignments WHERE id = ? AND teacher_id = ?").get(assignmentId, teacherId));
}

// ===== Classrooms =====
router.get("/classrooms", async (req, res) => {
  const classes = await db.prepare("SELECT * FROM classrooms WHERE teacher_id = ? ORDER BY created_at").all(req.user.id);
  const out = [];
  for (const c of classes) {
    const students = await db.prepare(`
      SELECT u.* FROM classroom_students cs JOIN users u ON u.id = cs.student_id
      WHERE cs.classroom_id = ? ORDER BY LOWER(u.surname), LOWER(u.given_name), LOWER(u.mi)
    `).all(c.id);
    const invites = await db.prepare("SELECT * FROM classroom_invites WHERE classroom_id = ? AND status = 'pending' ORDER BY created_at DESC").all(c.id);
    const assignmentCount = (await db.prepare("SELECT COUNT(*) n FROM assignments WHERE classroom_id = ?").get(c.id)).n;
    // Latest turned-in submission per student, scoped to THIS classroom's
    // assignments — powers the "✓ submitted (when)" note on the roster.
    const lastSubs = await db.prepare(`
      SELECT s.student_id, MAX(s.submitted_at) as last_at, COUNT(*) as done_count
      FROM submissions s JOIN assignments a ON a.id = s.assignment_id
      WHERE a.classroom_id = ? AND s.status = 'turned-in'
      GROUP BY s.student_id
    `).all(c.id);
    const lastByStudent = new Map(lastSubs.map(r => [r.student_id, r]));
    out.push({
      id: c.id, name: c.name, assignmentCount,
      // The classroom's single shareable join link — anyone with it can
      // join THIS classroom (new students create their account on the way in).
      classJoinUrl: c.join_token ? `${CLIENT_URL}/class/${c.join_token}` : null,
      students: students.map(s => {
        const last = lastByStudent.get(s.id);
        return {
          id: s.id, surname: s.surname, given: s.given_name, mi: s.mi, sex: s.sex, grade: s.grade_section, email: s.email,
          lastSubmittedAt: last ? Number(last.last_at) : null, submittedCount: last ? Number(last.done_count) : 0
        };
      }),
      // joinUrl lets the teacher hand the link out directly (Messenger/SMS)
      // when the invite email is slow or lands in spam — same token the
      // email carries, and only ever shown to the classroom's own teacher.
      invites: invites.map(i => ({ id: i.id, email: i.email, createdAt: i.created_at, joinUrl: `${CLIENT_URL}/join/${i.token}` }))
    });
  }
  res.json({ classrooms: out });
});

router.post("/classrooms", async (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Classroom name is required." });
  const id = nanoid();
  await db.prepare("INSERT INTO classrooms (id, teacher_id, name, join_token, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, req.user.id, name, inviteToken(), Date.now());
  res.json({ id, name });
});

router.put("/classrooms/:id", async (req, res) => {
  const classId = req.params.id;
  if (!(await ownsClassroom(req.user.id, classId))) return res.status(404).json({ error: "Classroom not found." });
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Classroom name is required." });
  await db.prepare("UPDATE classrooms SET name = ? WHERE id = ?").run(name, classId);
  res.json({ ok: true, name });
});

router.delete("/classrooms/:id", async (req, res) => {
  const classId = req.params.id;
  if (!(await ownsClassroom(req.user.id, classId))) return res.status(404).json({ error: "Classroom not found." });
  // ON DELETE CASCADE cleans up classroom_students, classroom_invites, and
  // assignments (which in turn cascades their own questions/vocab/submissions).
  await db.prepare("DELETE FROM classrooms WHERE id = ?").run(classId);
  res.json({ ok: true });
});

router.delete("/classrooms/:id/students/:studentId", async (req, res) => {
  const classId = req.params.id;
  if (!(await ownsClassroom(req.user.id, classId))) return res.status(404).json({ error: "Classroom not found." });
  await db.prepare("DELETE FROM classroom_students WHERE classroom_id = ? AND student_id = ?").run(classId, req.params.studentId);
  res.json({ ok: true });
});

async function sendInviteEmail(invite, classroomName) {
  const link = `${CLIENT_URL}/join/${invite.token}`;
  return sendEmail({
    to: invite.email,
    subject: `You're invited to join ${classroomName} on Project HIBARU`,
    html: `
      <p>Your teacher has invited you to join <strong>${escapeHtml(classroomName)}</strong> on Project HIBARU, Taft National High School's remedial reading program.</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#22335E;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Join classroom</a></p>
      <p>Or copy this link into your browser:<br>${link}</p>
      <p style="color:#888;font-size:12px;">If you weren't expecting this invite, you can safely ignore this email.</p>
    `
  });
}

// Teachers invite by email only — the student clicks the emailed "Join"
// link and is responsible for their own profile from then on (see
// GET/POST /auth/invite/:token in auth.js for the accept flow). The
// classroom roster only gains the student once they actually click through,
// not at invite time.
router.post("/classrooms/:id/invites", async (req, res) => {
  const classId = req.params.id;
  if (!(await ownsClassroom(req.user.id, classId))) return res.status(404).json({ error: "Classroom not found." });
  const emailNorm = (req.body?.email || "").trim().toLowerCase();
  if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) return res.status(400).json({ error: "Please enter a valid email address." });

  const cls = await db.prepare("SELECT name FROM classrooms WHERE id = ?").get(classId);

  let student = await db.prepare("SELECT * FROM users WHERE email = ?").get(emailNorm);
  if (student && student.role !== "student") return res.status(409).json({ error: "That email already belongs to a non-student account." });
  if (!student) {
    const id = nanoid();
    await db.prepare(`
      INSERT INTO users (id, role, email, password_hash, status, created_at)
      VALUES (?, 'student', ?, 'UNCLAIMED', 'active', ?)
    `).run(id, emailNorm, Date.now());
    student = await db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  }

  const already = await db.prepare("SELECT 1 FROM classroom_students WHERE classroom_id = ? AND student_id = ?").get(classId, student.id);
  if (already) return res.status(409).json({ error: "This student is already in the classroom." });

  let invite = await db.prepare("SELECT * FROM classroom_invites WHERE classroom_id = ? AND email = ? AND status = 'pending'").get(classId, emailNorm);
  if (!invite) {
    const id = nanoid();
    await db.prepare(`
      INSERT INTO classroom_invites (id, classroom_id, teacher_id, student_id, email, token, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, classId, req.user.id, student.id, emailNorm, inviteToken(), Date.now());
    invite = await db.prepare("SELECT * FROM classroom_invites WHERE id = ?").get(id);
  }

  const { sent } = await sendInviteEmail(invite, cls.name);
  res.json({ ok: true, emailSent: sent });
});

router.post("/classrooms/:id/invites/:inviteId/resend", async (req, res) => {
  const classId = req.params.id;
  if (!(await ownsClassroom(req.user.id, classId))) return res.status(404).json({ error: "Classroom not found." });
  const invite = await db.prepare("SELECT * FROM classroom_invites WHERE id = ? AND classroom_id = ? AND status = 'pending'").get(req.params.inviteId, classId);
  if (!invite) return res.status(404).json({ error: "Invite not found." });
  const cls = await db.prepare("SELECT name FROM classrooms WHERE id = ?").get(classId);
  const { sent } = await sendInviteEmail(invite, cls.name);
  res.json({ ok: true, emailSent: sent });
});

router.delete("/classrooms/:id/invites/:inviteId", async (req, res) => {
  const classId = req.params.id;
  if (!(await ownsClassroom(req.user.id, classId))) return res.status(404).json({ error: "Classroom not found." });
  await db.prepare("DELETE FROM classroom_invites WHERE id = ? AND classroom_id = ?").run(req.params.inviteId, classId);
  res.json({ ok: true });
});

router.get("/classrooms/:id/docx", async (req, res) => {
  const classId = req.params.id;
  if (!(await ownsClassroom(req.user.id, classId))) return res.status(404).json({ error: "Classroom not found." });
  const cls = await db.prepare("SELECT * FROM classrooms WHERE id = ?").get(classId);
  const asgRow = await db.prepare("SELECT * FROM assignments WHERE classroom_id = ? ORDER BY created_at DESC LIMIT 1").get(classId);
  if (!asgRow) return res.status(400).json({ error: "This classroom has no assignments yet." });
  const asg = await loadAssignment(asgRow.id);
  const students = await db.prepare(`
    SELECT u.* FROM classroom_students cs JOIN users u ON u.id = cs.student_id WHERE cs.classroom_id = ? ORDER BY u.surname
  `).all(classId);

  async function withMetrics(s) {
    const sub = await db.prepare("SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?").get(asg.id, s.id);
    if (!sub || sub.status !== "turned-in") return { name: studentName(s), status: sub ? sub.status : "not-started", metrics: null };
    const miscues = JSON.parse(sub.miscues);
    const m = metricsFor({ words: asg.wordCount, miscues, seconds: sub.seconds, correct: sub.correct_count, items: asg.questions.length });
    return { name: studentName(s), status: sub.status, metrics: m, seconds: sub.seconds };
  }
  const males = [];
  for (const s of students.filter(s => s.sex === "M")) males.push(await withMetrics(s));
  const females = [];
  for (const s of students.filter(s => s.sex !== "M")) females.push(await withMetrics(s));

  const buf = await buildConsolidatedDoc(cls.name, asg, males, females);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="Consolidated Report - ${cls.name}.docx"`);
  res.send(Buffer.from(buf));
});

// ===== Assignments =====

async function notifyClassroomOfAssignment(classId, title, deadlineISO) {
  const cls = await db.prepare("SELECT name FROM classrooms WHERE id = ?").get(classId);
  const students = await db.prepare(`
    SELECT u.email FROM classroom_students cs JOIN users u ON u.id = cs.student_id
    WHERE cs.classroom_id = ? AND u.email NOT LIKE '%@pending.local'
  `).all(classId);
  const recipients = students.map(s => s.email).filter(Boolean);
  if (!recipients.length) return;
  await sendEmail({
    bcc: recipients,
    subject: `New reading assignment: ${title}`,
    html: `
      <p>A new reading assignment, <strong>${escapeHtml(title)}</strong>, has been posted to <strong>${escapeHtml(cls.name)}</strong> on Project HIBARU.</p>
      ${deadlineISO ? `<p>Due: ${escapeHtml(deadlineISO)}</p>` : ""}
      <p><a href="${CLIENT_URL}">Open Project HIBARU</a> to get started.</p>
    `
  });
}

// A single assignment can target several classrooms at once — under the
// hood this creates one independent assignment row per classroom (same
// content, separate ids) rather than a many-to-many join, so every other
// route (progress, analytics, docx export, student /tasks) keeps working
// against a single classroom_id per assignment with no changes.
router.post("/assignments", async (req, res) => {
  const { title, instructions, passage, classIds, genre, attempts, timeLimit, sensitivity, deadline, questions } = req.body || {};
  if (!title?.trim() || !passage?.trim()) return res.status(400).json({ error: "Please add a title and passage." });
  if (!Array.isArray(classIds) || !classIds.length) return res.status(400).json({ error: "Please select at least one classroom." });
  for (const cid of classIds) {
    if (!(await ownsClassroom(req.user.id, cid))) return res.status(400).json({ error: "Invalid target classroom." });
  }
  const qError = validateQuestions(questions);
  if (qError) return res.status(400).json({ error: qError });

  const now = Date.now();
  const ids = [];
  for (const classId of classIds) {
    const id = nanoid();
    await db.prepare(`
      INSERT INTO assignments (id, classroom_id, teacher_id, title, instructions, passage, genre, attempts, time_limit, sensitivity, deadline_iso, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, classId, req.user.id, title.trim(), instructions || "Read the passage aloud clearly.", passage, genre || "Non-Fiction", attempts || "3", timeLimit || "10 minutes", sensitivity || "Default", deadline || "", now);

    await insertQuestions(id, questions);
    await insertVocab(id, passage);

    // seed a not-started submission row for every student currently in the class
    const students = await db.prepare("SELECT student_id FROM classroom_students WHERE classroom_id = ?").all(classId);
    for (const s of students) {
      await db.prepare("INSERT OR IGNORE INTO submissions (id, assignment_id, student_id, status) VALUES (?, ?, ?, 'not-started')").run(nanoid(), id, s.student_id);
    }

    ids.push(id);
    notifyClassroomOfAssignment(classId, title.trim(), deadline || "").catch(err => console.error("[hibaru] assignment notification email failed:", err.message));
  }

  res.json({ ids });
});

router.get("/assignments", async (req, res) => {
  const rows = await db.prepare("SELECT * FROM assignments WHERE teacher_id = ? ORDER BY created_at DESC").all(req.user.id);
  const groups = [];
  for (const a of rows) {
    const d = new Date(a.created_at);
    const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
    let g = groups.find(x => x.name === key);
    if (!g) { g = { name: key, items: [] }; groups.push(g); }
    const cls = await db.prepare("SELECT name FROM classrooms WHERE id = ?").get(a.classroom_id);
    const subs = await db.prepare("SELECT status, submitted_at FROM submissions WHERE assignment_id = ?").all(a.id);
    const qCount = (await db.prepare("SELECT COUNT(*) n FROM questions WHERE assignment_id = ?").get(a.id)).n;
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
      id: a.id, title: a.title, className: cls?.name || "",
      dateText: "Created " + new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + (a.updated_at ? " · Edited " + new Date(a.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""),
      meta: (cls ? cls.name + " · " : "") + a.genre + " · " + wordCount(a.passage) + " words · " + qCount + " questions · Due " + a.deadline_iso,
      doneText,
      complete: done.length > 0 && done.length === subs.length,
      partial: done.length > 0 && done.length < subs.length
    });
  }
  res.json({ groups });
});

router.get("/assignments/:id", async (req, res) => {
  if (!(await ownsAssignment(req.user.id, req.params.id))) return res.status(404).json({ error: "Assignment not found." });
  const a = await loadAssignment(req.params.id);
  const cls = await db.prepare("SELECT name FROM classrooms WHERE id = ?").get(a.classId);
  res.json({ assignment: { ...a, className: cls?.name || "" } });
});

router.put("/assignments/:id", async (req, res) => {
  const id = req.params.id;
  if (!(await ownsAssignment(req.user.id, id))) return res.status(404).json({ error: "Assignment not found." });
  const { title, instructions, passage, genre, attempts, timeLimit, sensitivity, deadlineISO, questions } = req.body || {};
  if (!title?.trim() || !passage?.trim()) return res.status(400).json({ error: "Title and passage are required." });
  const qError = validateQuestions(questions);
  if (qError) return res.status(400).json({ error: qError });
  await db.prepare(`
    UPDATE assignments SET title=?, instructions=?, passage=?, genre=?, attempts=?, time_limit=?, sensitivity=?, deadline_iso=?, updated_at=?
    WHERE id = ?
  `).run(title.trim(), instructions || "", passage, genre, attempts, timeLimit, sensitivity, deadlineISO || "", Date.now(), id);

  await db.prepare("DELETE FROM questions WHERE assignment_id = ?").run(id);
  await insertQuestions(id, questions);
  await db.prepare("DELETE FROM vocab_words WHERE assignment_id = ?").run(id);
  await insertVocab(id, passage);
  res.json({ ok: true });
});

router.delete("/assignments/:id", async (req, res) => {
  const id = req.params.id;
  if (!(await ownsAssignment(req.user.id, id))) return res.status(404).json({ error: "Assignment not found." });
  // ON DELETE CASCADE removes this assignment's questions, vocab words, and
  // all student submissions along with it.
  await db.prepare("DELETE FROM assignments WHERE id = ?").run(id);
  res.json({ ok: true });
});

router.get("/assignments/:id/docx", async (req, res) => {
  if (!(await ownsAssignment(req.user.id, req.params.id))) return res.status(404).json({ error: "Assignment not found." });
  const a = await loadAssignment(req.params.id);
  const cls = await db.prepare("SELECT name FROM classrooms WHERE id = ?").get(a.classId);
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

router.post("/extract-text", handleUpload, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  try {
    const text = await extractTextFromBuffer(req.file.buffer, req.file.originalname);
    if (!text || !text.trim()) return res.status(422).json({ error: "No readable text found in that file." });
    res.json({ text });
  } catch (e) {
    res.status(422).json({ error: "Could not read that file. Please upload a .docx or .pdf." });
  }
});

router.post("/parse-questions", handleUpload, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  try {
    const text = await extractTextFromBuffer(req.file.buffer, req.file.originalname);
    // Each item is { text, options: [4 strings, blank if not found], correct: 0-3 or -1 }.
    const questions = parseQuestionsFromText(text);
    if (!questions.length) return res.status(422).json({ error: "No questions found in the file. Each question should be on its own line and end with a question mark (?)." });
    res.json({ questions });
  } catch (e) {
    res.status(422).json({ error: "Could not read that file. Please upload a .docx or .pdf." });
  }
});

// ===== Progress Monitor / Miscue Report / Analytics =====
router.get("/assignments/:id/progress", async (req, res) => {
  if (!(await ownsAssignment(req.user.id, req.params.id))) return res.status(404).json({ error: "Assignment not found." });
  const a = await loadAssignment(req.params.id);
  const subs = await db.prepare(`
    SELECT s.*, u.surname, u.given_name, u.mi, u.grade_section, u.email FROM submissions s
    JOIN users u ON u.id = s.student_id WHERE s.assignment_id = ? ORDER BY u.surname
  `).all(a.id);
  // The monitor lists only students who have actually engaged with the
  // task (in progress or turned in) — students who haven't started are
  // excluded entirely, surfaced only as a count.
  const engaged = subs.filter(s => s.status !== "not-started");
  const rows = engaged.map(s => {
    const miscues = JSON.parse(s.miscues || "{}");
    const m = s.status === "turned-in" ? metricsFor({ words: a.wordCount, miscues, seconds: s.seconds, correct: s.correct_count, items: a.questions.length }) : null;
    return {
      // Students who joined via the class link may not have filled out
      // their profile yet — fall back to the email they joined with.
      submissionId: s.id, name: `${s.given_name} ${s.surname}`.trim() || s.email, grade: s.grade_section,
      status: s.status, submittedAt: s.submitted_at || null,
      wpm: m?.wpm ?? null, wordScore: m?.score ?? null, comp: m?.acc ?? null,
      compLevel: m?.compLevel ?? null, wordLevel: m?.level ?? null,
      profile: m?.profile ?? null, hasReport: !!m
    };
  });
  const turnedIn = rows.filter(r => r.status === "turned-in");
  const cls = await db.prepare("SELECT name FROM classrooms WHERE id=?").get(a.classId);
  // Denominator comes from the LIVE roster, not just existing submission
  // rows — a student who joined the classroom after this assignment was
  // created counts as not-started even before their row is seeded.
  const rosterCount = (await db.prepare("SELECT COUNT(*) n FROM classroom_students WHERE classroom_id = ?").get(a.classId)).n;
  const denom = Math.max(Number(rosterCount), engaged.length);
  res.json({
    title: a.title, deadline: a.deadlineISO, className: cls?.name,
    completionPct: denom ? Math.round(turnedIn.length / denom * 100) : 0,
    notStartedCount: Math.max(0, denom - engaged.length),
    rows
  });
});

// Full-transparency spreadsheet export: one row per turned-in student with
// every metric, every miscue-type count, and the individual miscues
// themselves (word + type, in passage order). Opens directly in Excel.
router.get("/assignments/:id/results.csv", async (req, res) => {
  if (!(await ownsAssignment(req.user.id, req.params.id))) return res.status(404).json({ error: "Assignment not found." });
  const a = await loadAssignment(req.params.id);
  const { MISCUE_TYPES } = require("../docx");
  const subs = await db.prepare(`
    SELECT s.*, u.surname, u.given_name, u.mi, u.grade_section, u.email FROM submissions s
    JOIN users u ON u.id = s.student_id WHERE s.assignment_id = ? AND s.status = 'turned-in' ORDER BY u.surname
  `).all(a.id);

  const esc = v => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    "Student", "Grade & Section", "Submitted At",
    "Reading Time (s)", "Total Time incl. Questions (s)", "Reading Rate (wpm)",
    "Comprehension Score", "Comprehension %", "Comprehension Level",
    "Words in Passage", "Total Miscues",
    ...MISCUE_TYPES.map(t => t.label),
    "Word Reading Score (%)", "Word Reading Level", "Reading Profile",
    "Individual Miscues (word: type)",
    ...a.questions.map((q, i) => `Q${i + 1} Answer`),
    ...a.questions.map((q, i) => `Q${i + 1} Correct?`)
  ];
  const lines = [header.map(esc).join(",")];
  for (const s of subs) {
    const miscues = JSON.parse(s.miscues || "{}");
    const marked = JSON.parse(s.marked || "[]");
    const answers = JSON.parse(s.answers || "{}");
    const m = metricsFor({ words: a.wordCount, miscues, seconds: s.seconds, correct: s.correct_count, items: a.questions.length });
    const typeLabel = key => (MISCUE_TYPES.find(t => t.key === key) || {}).label || key;
    const individual = marked.filter(w => w.type).map(w => `${w.word}: ${typeLabel(w.type)}`).join("; ");
    const letters = ["A", "B", "C", "D"];
    const displayName = `${(s.surname || "").toUpperCase()}, ${s.given_name} ${s.mi}`.replace(/^,\s*/, "").trim() || s.email;
    lines.push([
      displayName, s.grade_section,
      s.submitted_at ? new Date(Number(s.submitted_at)).toLocaleString("en-US") : "",
      s.seconds, s.total_seconds || "", m.wpm,
      `${m.correct} / ${m.items}`, m.acc, m.compLevel,
      m.words, m.tm,
      ...MISCUE_TYPES.map(t => miscues[t.key] || 0),
      m.score, m.level, m.profile,
      individual,
      ...a.questions.map((q, i) => answers[i] != null ? `${letters[answers[i]]}. ${q.options[answers[i]] ?? ""}` : "—"),
      ...a.questions.map((q, i) => Number(answers[i]) === q.correct ? "Correct" : "Wrong")
    ].map(esc).join(","));
  }
  // BOM so Excel opens it as UTF-8 (student names can carry ñ etc).
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="Results - ${a.title}.csv"`);
  res.send("﻿" + lines.join("\r\n"));
});

async function fullReport(submissionId, teacherId) {
  const sub = await db.prepare(`
    SELECT s.*, u.surname, u.given_name, u.mi, u.grade_section, u.email FROM submissions s
    JOIN users u ON u.id = s.student_id WHERE s.id = ?
  `).get(submissionId);
  if (!sub) return null;
  const a = await loadAssignment(sub.assignment_id);
  if (!(await ownsAssignment(teacherId, a.id))) return null;
  const miscues = JSON.parse(sub.miscues || "{}");
  const marked = JSON.parse(sub.marked || "[]");
  const m = metricsFor({ words: a.wordCount, miscues, seconds: sub.seconds, correct: sub.correct_count, items: a.questions.length });
  const answers = JSON.parse(sub.answers || "{}");
  return {
    name: `${sub.given_name} ${sub.surname} ${sub.mi}`.trim() || sub.email, firstName: sub.given_name || sub.email,
    grade: sub.grade_section, assignment: a.title, words: a.wordCount,
    seconds: sub.seconds, miscues, metrics: m, answers,
    questions: a.questions.map((q, i) => ({ n: i + 1, text: q.text, options: q.options, chosen: answers[i] ?? null, correct: q.correct })),
    marked
  };
}

router.get("/submissions/:id/report", async (req, res) => {
  const report = await fullReport(req.params.id, req.user.id);
  if (!report) return res.status(404).json({ error: "Report not found." });
  res.json({ report });
});

router.get("/assignments/:id/analytics", async (req, res) => {
  if (!(await ownsAssignment(req.user.id, req.params.id))) return res.status(404).json({ error: "Assignment not found." });
  const a = await loadAssignment(req.params.id);
  const subs = await db.prepare("SELECT * FROM submissions WHERE assignment_id = ?").all(a.id);
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

router.get("/assignments/:id/reports-all", async (req, res) => {
  if (!(await ownsAssignment(req.user.id, req.params.id))) return res.status(404).json({ error: "Assignment not found." });
  const a = await loadAssignment(req.params.id);
  const subs = await db.prepare("SELECT id FROM submissions WHERE assignment_id = ? AND status = 'turned-in'").all(a.id);
  const records = [];
  for (const s of subs) records.push(await fullReport(s.id, req.user.id));
  res.json({ records });
});

router.get("/assignments/:id/reports-all.docx", async (req, res) => {
  if (!(await ownsAssignment(req.user.id, req.params.id))) return res.status(404).json({ error: "Assignment not found." });
  const a = await loadAssignment(req.params.id);
  const subIds = await db.prepare("SELECT id, student_id FROM submissions WHERE assignment_id = ? AND status = 'turned-in'").all(a.id);
  const { MISCUE_TYPES, buildForm3BulkDoc } = require("../docx");
  const records = [];
  for (const { id } of subIds) {
    const r = await fullReport(id, req.user.id);
    records.push({
      name: r.name, grade: r.grade, school: "Taft National High School (303529)", division: "Eastern Samar", region: "Region VIII – Eastern Visayas",
      selection: r.assignment, minutes: Math.floor(r.seconds / 60) + ":" + String(r.seconds % 60).padStart(2, "0"), seconds: r.seconds,
      wpm: r.metrics.wpm, correct: r.metrics.correct, items: r.metrics.items, acc: r.metrics.acc, compLevel: r.metrics.compLevel,
      level: r.metrics.level, tm: r.metrics.tm, words: r.metrics.words, score: r.metrics.score, profile: r.metrics.profile,
      miscueRows: MISCUE_TYPES.map((t, i) => ({ n: i + 1, label: t.label, fil: t.fil, count: r.miscues[t.key] || 0 })),
      responses: r.questions.map(q => ({ n: q.n, letter: q.chosen != null ? ["A", "B", "C", "D"][q.chosen] : "—", mark: q.chosen === q.correct ? "✓" : "✗" }))
    });
  }
  const buf = await buildForm3BulkDoc(records);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="Phil-IRI Form 3 - ${a.title}.docx"`);
  res.send(Buffer.from(buf));
});

module.exports = router;
