const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../auth");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

router.get("/overview", (req, res) => {
  const teachersActive = db.prepare("SELECT COUNT(*) c FROM users WHERE role='teacher' AND status='active'").get().c;
  const pending = db.prepare("SELECT COUNT(*) c FROM users WHERE role='teacher' AND status='pending'").get().c;
  const learners = db.prepare("SELECT COUNT(*) c FROM users WHERE role='student'").get().c;
  const classrooms = db.prepare("SELECT COUNT(*) c FROM classrooms").get().c;
  const assignments = db.prepare("SELECT COUNT(*) c FROM assignments").get().c;
  const turnedIn = db.prepare("SELECT COUNT(*) c FROM submissions WHERE status='turned-in'").get().c;
  res.json({
    stats: [
      { label: "TEACHERS", value: String(teachersActive), sub: `${pending} pending approval` },
      { label: "LEARNERS", value: String(learners), sub: `across ${classrooms} classrooms` },
      { label: "CLASSROOMS", value: String(classrooms), sub: "active sections" },
      { label: "ASSIGNMENTS", value: String(assignments), sub: `${turnedIn} submissions turned in` }
    ],
    pendingCount: pending
  });
});

router.get("/teachers", (req, res) => {
  const rows = db.prepare("SELECT * FROM users WHERE role='teacher' ORDER BY created_at DESC").all();
  res.json({ teachers: rows.map(t => ({
    id: t.id, name: `${t.given_name} ${t.surname}`.trim(), email: t.email, position: t.position, status: t.status
  })) });
});

router.post("/teachers/:id/approve", (req, res) => {
  db.prepare("UPDATE users SET status='active' WHERE id=? AND role='teacher'").run(req.params.id);
  res.json({ ok: true });
});

router.post("/teachers/:id/reject", (req, res) => {
  db.prepare("DELETE FROM users WHERE id=? AND role='teacher'").run(req.params.id);
  res.json({ ok: true });
});

router.post("/teachers/:id/suspend", (req, res) => {
  db.prepare("UPDATE users SET status='pending' WHERE id=? AND role='teacher'").run(req.params.id);
  res.json({ ok: true });
});

router.get("/learners", (req, res) => {
  const rows = db.prepare(`
    SELECT u.*, c.name as class_name FROM users u
    LEFT JOIN classroom_students cs ON cs.student_id = u.id
    LEFT JOIN classrooms c ON c.id = cs.classroom_id
    WHERE u.role = 'student'
    ORDER BY u.surname
  `).all();
  res.json({ learners: rows.map(s => ({
    name: `${s.surname.toUpperCase()}, ${s.given_name} ${s.mi}`.trim(),
    sex: s.sex === "M" ? "Male" : "Female",
    className: s.class_name || "—",
    email: s.email
  })) });
});

module.exports = router;
