const express = require("express");
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const db = require("../db");
const { requireAuth, requireRole } = require("../auth");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

// A second tier above regular admin — only the master admin can create or
// remove other admins, or delete a teacher/student account outright.
// Regular admins keep the existing teacher-approval/suspend powers below.
function requireMasterAdmin(req, res, next) {
  const u = db.prepare("SELECT is_master_admin FROM users WHERE id = ?").get(req.user.id);
  if (!u || !u.is_master_admin) return res.status(403).json({ error: "Only the master admin can do this." });
  next();
}

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
    id: t.id, name: `${t.given_name} ${t.surname}`.trim(), given: t.given_name, surname: t.surname,
    email: t.email, position: t.position, status: t.status
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

// Any admin (not just master) can edit a teacher's account details — this
// is the replacement for teacher self-service editing, which is
// deliberately disabled (see PUT /auth/me) so identity details go through
// admin oversight instead.
router.put("/teachers/:id", (req, res) => {
  const { given, surname, email, position } = req.body || {};
  const target = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'teacher'").get(req.params.id);
  if (!target) return res.status(404).json({ error: "Teacher not found." });
  if (!given?.trim() || !email?.trim()) return res.status(400).json({ error: "Please provide at least a given name and email." });
  const emailNorm = email.trim().toLowerCase();
  const clash = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(emailNorm, target.id);
  if (clash) return res.status(409).json({ error: "Another account already uses that email." });

  db.prepare("UPDATE users SET given_name = ?, surname = ?, email = ?, position = ? WHERE id = ?")
    .run(given.trim(), (surname || "").trim(), emailNorm, position || "Teacher", target.id);
  res.json({ ok: true });
});

// Grouped by classroom (alphabetically), then split male/female, each
// alphabetical by surname — mirrors how the Teacher's Classrooms tab
// already presents its roster.
router.get("/learners", (req, res) => {
  const rows = db.prepare(`
    SELECT u.*, c.name as class_name FROM users u
    LEFT JOIN classroom_students cs ON cs.student_id = u.id
    LEFT JOIN classrooms c ON c.id = cs.classroom_id
    WHERE u.role = 'student'
  `).all();
  const toRow = s => ({
    id: s.id,
    name: `${s.surname.toUpperCase()}, ${s.given_name} ${s.mi}`.trim(),
    sex: s.sex === "M" ? "Male" : "Female",
    className: s.class_name || "Unassigned",
    email: s.email
  });
  const byClass = new Map();
  rows.forEach(s => {
    const key = s.class_name || "Unassigned";
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key).push(s);
  });
  const bySurname = (a, b) => a.surname.localeCompare(b.surname);
  const groups = [...byClass.keys()].sort((a, b) => a.localeCompare(b)).map(className => {
    const students = byClass.get(className);
    return {
      className,
      male: students.filter(s => s.sex === "M").sort(bySurname).map(toRow),
      female: students.filter(s => s.sex !== "M").sort(bySurname).map(toRow)
    };
  });
  res.json({ groups });
});

// ===== Master-admin-only: manage admins =====
router.get("/admins", requireMasterAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM users WHERE role='admin' ORDER BY created_at").all();
  res.json({ admins: rows.map(a => ({
    id: a.id, name: `${a.given_name} ${a.surname}`.trim(), email: a.email, position: a.position,
    isMaster: !!a.is_master_admin, isSelf: a.id === req.user.id
  })) });
});

router.post("/admins", requireMasterAdmin, (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    return res.status(400).json({ error: "Please provide a name, email/username, and a password of at least 8 characters." });
  }
  const emailNorm = email.trim().toLowerCase();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(emailNorm);
  if (existing) return res.status(409).json({ error: "An account with that email already exists." });

  const parts = name.trim().split(/\s+/);
  const given = parts[0] || name.trim();
  const surname = parts.length > 1 ? parts[parts.length - 1] : "";
  db.prepare(`
    INSERT INTO users (id, role, email, password_hash, status, surname, given_name, position, is_master_admin, password_owned, terms_accepted_at, created_at)
    VALUES (?, 'admin', ?, ?, 'active', ?, ?, 'Admin', 0, 1, ?, ?)
  `).run(nanoid(), emailNorm, bcrypt.hashSync(password, 12), surname, given, Date.now(), Date.now());
  res.json({ ok: true });
});

router.delete("/admins/:id", requireMasterAdmin, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "You can't remove your own admin account." });
  const target = db.prepare("SELECT id, is_master_admin FROM users WHERE id = ? AND role='admin'").get(req.params.id);
  if (!target) return res.status(404).json({ error: "Admin not found." });
  db.prepare("DELETE FROM users WHERE id = ?").run(target.id);
  res.json({ ok: true });
});

// ===== Master-admin-only: delete a teacher or student account outright =====
router.delete("/users/:id", requireMasterAdmin, (req, res) => {
  const target = db.prepare("SELECT id, role FROM users WHERE id = ?").get(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found." });
  if (target.role === "admin") return res.status(400).json({ error: "Use the admin removal action for admin accounts." });
  // ON DELETE CASCADE (classrooms, assignments, classroom_students,
  // submissions all reference users.id) cleans up everything that account owned.
  db.prepare("DELETE FROM users WHERE id = ?").run(target.id);
  res.json({ ok: true });
});

module.exports = router;
