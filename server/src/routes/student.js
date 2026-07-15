const express = require("express");
const { nanoid } = require("nanoid");
const db = require("../db");
const { requireAuth, requireRole } = require("../auth");
const { wordCount, metricsFor } = require("../scoring");
const miscue = require("../miscue");

const router = express.Router();
router.use(requireAuth, requireRole("student"));

async function assignmentFor(a) {
  const questions = await db.prepare("SELECT * FROM questions WHERE assignment_id = ? ORDER BY seq").all(a.id);
  const vocab = await db.prepare("SELECT * FROM vocab_words WHERE assignment_id = ? ORDER BY seq").all(a.id);
  return {
    id: a.id, title: a.title, instructions: a.instructions, passage: a.passage,
    genre: a.genre, attempts: a.attempts, timeLimit: a.time_limit, sensitivity: a.sensitivity,
    deadline: a.deadline_iso, wordCount: wordCount(a.passage),
    vocab: vocab.map(v => ({ word: v.word, def: v.def, defFil: v.def_fil })),
    // options only — never leak `correct` to the student client
    questions: questions.map(q => ({ id: q.id, text: q.text, options: JSON.parse(q.options) }))
  };
}

async function getOrCreateSubmission(assignmentId, studentId) {
  let sub = await db.prepare("SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?").get(assignmentId, studentId);
  if (!sub) {
    await db.prepare("INSERT INTO submissions (id, assignment_id, student_id, status) VALUES (?, ?, ?, 'not-started')").run(nanoid(), assignmentId, studentId);
    sub = await db.prepare("SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?").get(assignmentId, studentId);
  }
  return sub;
}

router.get("/tasks", async (req, res) => {
  const classRows = await db.prepare("SELECT classroom_id FROM classroom_students WHERE student_id = ?").all(req.user.id);
  const classIds = classRows.map(r => r.classroom_id);
  if (!classIds.length) return res.json({ tasks: [] });
  const placeholders = classIds.map(() => "?").join(",");
  const assignments = await db.prepare(`SELECT * FROM assignments WHERE classroom_id IN (${placeholders}) ORDER BY created_at DESC`).all(...classIds);
  const tasks = [];
  for (const a of assignments) {
    const sub = await getOrCreateSubmission(a.id, req.user.id);
    tasks.push({
      id: a.id, title: a.title, genre: a.genre, words: wordCount(a.passage),
      timeLimit: a.time_limit, deadline: a.deadline_iso, instructions: a.instructions,
      status: sub.status, attempts: a.attempts
    });
  }
  res.json({ tasks });
});

router.get("/assignments/:id", async (req, res) => {
  const a = await db.prepare("SELECT * FROM assignments WHERE id = ?").get(req.params.id);
  if (!a) return res.status(404).json({ error: "Assignment not found." });
  const inClass = await db.prepare("SELECT 1 FROM classroom_students WHERE classroom_id = ? AND student_id = ?").get(a.classroom_id, req.user.id);
  if (!inClass) return res.status(403).json({ error: "This assignment isn't in one of your classrooms." });
  const sub = await getOrCreateSubmission(a.id, req.user.id);
  res.json({ assignment: await assignmentFor(a), submission: { status: sub.status, practiced: JSON.parse(sub.practiced || "{}") } });
});

router.post("/assignments/:id/start", async (req, res) => {
  const a = await db.prepare("SELECT * FROM assignments WHERE id = ?").get(req.params.id);
  if (!a) return res.status(404).json({ error: "Assignment not found." });
  const sub = await getOrCreateSubmission(a.id, req.user.id);
  await db.prepare("UPDATE submissions SET status='in-progress', started_at=?, practiced='{}', seconds=0, transcript='', marked='[]', miscues='{}', answers='{}', correct_count=0 WHERE id=?")
    .run(Date.now(), sub.id);
  res.json({ ok: true });
});

router.post("/assignments/:id/practice", async (req, res) => {
  const sub = await getOrCreateSubmission(req.params.id, req.user.id);
  const { word } = req.body || {};
  const practiced = JSON.parse(sub.practiced || "{}");
  if (word) practiced[word] = true;
  await db.prepare("UPDATE submissions SET practiced=? WHERE id=?").run(JSON.stringify(practiced), sub.id);
  res.json({ practiced });
});

router.post("/assignments/:id/finish-reading", async (req, res) => {
  const a = await db.prepare("SELECT * FROM assignments WHERE id = ?").get(req.params.id);
  if (!a) return res.status(404).json({ error: "Assignment not found." });
  const sub = await getOrCreateSubmission(a.id, req.user.id);
  const seconds = Math.max(1, Math.round(Number(req.body?.seconds) || 0));
  const transcript = String(req.body?.transcript || "");
  const { miscues, marked } = miscue.analyze(a.passage, transcript);
  await db.prepare("UPDATE submissions SET seconds=?, transcript=?, marked=?, miscues=? WHERE id=?")
    .run(seconds, transcript, JSON.stringify(marked), JSON.stringify(miscues), sub.id);
  const m = metricsFor({ words: wordCount(a.passage), miscues, seconds, correct: 0, items: 1 });
  res.json({ ok: true, wpm: m.wpm, score: m.score, level: m.level, tm: m.tm });
});

router.post("/assignments/:id/quiz", async (req, res) => {
  const a = await db.prepare("SELECT * FROM assignments WHERE id = ?").get(req.params.id);
  if (!a) return res.status(404).json({ error: "Assignment not found." });
  const questions = await db.prepare("SELECT * FROM questions WHERE assignment_id = ? ORDER BY seq").all(a.id);
  const answers = req.body?.answers || {};
  if (Object.keys(answers).length < questions.length) return res.status(400).json({ error: "Please answer all questions." });
  const sub = await getOrCreateSubmission(a.id, req.user.id);

  let correct = 0;
  questions.forEach((q, i) => { if (Number(answers[i]) === q.correct_index) correct++; });

  await db.prepare("UPDATE submissions SET status='turned-in', submitted_at=?, answers=?, correct_count=? WHERE id=?")
    .run(Date.now(), JSON.stringify(answers), correct, sub.id);

  const fresh = await db.prepare("SELECT * FROM submissions WHERE id = ?").get(sub.id);
  const miscues = JSON.parse(fresh.miscues || "{}");
  const m = metricsFor({ words: wordCount(a.passage), miscues, seconds: fresh.seconds, correct, items: questions.length });
  res.json({ result: { ...m, seconds: fresh.seconds } });
});

router.get("/results", async (req, res) => {
  const rows = await db.prepare(`
    SELECT s.*, a.title, a.passage FROM submissions s JOIN assignments a ON a.id = s.assignment_id
    WHERE s.student_id = ? AND s.status = 'turned-in' ORDER BY s.submitted_at DESC
  `).all(req.user.id);
  const results = [];
  for (const s of rows) {
    const miscues = JSON.parse(s.miscues || "{}");
    const questions = (await db.prepare("SELECT COUNT(*) n FROM questions WHERE assignment_id = ?").get(s.assignment_id)).n;
    const m = metricsFor({ words: wordCount(s.passage), miscues, seconds: s.seconds, correct: s.correct_count, items: questions });
    results.push({ title: s.title, date: s.submitted_at, wpm: m.wpm, score: m.score, level: m.level, correct: s.correct_count, items: questions, acc: m.acc, profile: m.profile });
  }
  res.json({ results });
});

module.exports = router;
