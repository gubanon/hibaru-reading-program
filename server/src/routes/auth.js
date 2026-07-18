const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { nanoid } = require("nanoid");
const db = require("../db");
const { signToken, requireAuth, JWT_SECRET } = require("../auth");
const loginAttempts = require("../loginAttempts");

const router = express.Router();

// Auth endpoints are the brute-force / credential-stuffing surface — cap
// attempts per IP. Generous enough for a mistyped password, tight enough to
// blunt automated guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." }
});
// Only the unauthenticated, guessable-credential endpoints — NOT /me, which
// the frontend calls on every page load to restore a session.

function publicUser(u) {
  return {
    id: u.id, role: u.role, email: u.email, status: u.status,
    surname: u.surname, given: u.given_name, mi: u.mi, sex: u.sex,
    position: u.position, grade: u.grade_section,
    school: u.school, division: u.division, region: u.region,
    isMaster: !!u.is_master_admin
  };
}

// Teacher self-signup — goes in as 'pending', admin must approve.
router.post("/signup", authLimiter, async (req, res) => {
  const { name, email, password, agreeToTerms } = req.body || {};
  if (!name || !name.trim() || !email || !email.trim() || !password || password.length < 8) {
    return res.status(400).json({ error: "Please provide your name, email, and a password of at least 8 characters." });
  }
  if (!agreeToTerms) {
    return res.status(400).json({ error: "Please accept the Terms & Conditions and Privacy Policy to create an account." });
  }
  const emailNorm = email.trim().toLowerCase();
  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").get(emailNorm);
  if (existing) return res.status(409).json({ error: "An account with that email already exists." });

  const parts = name.trim().split(/\s+/);
  const given = parts[0] || name.trim();
  const surname = parts.length > 1 ? parts[parts.length - 1] : "";
  const id = nanoid();
  await db.prepare(`
    INSERT INTO users (id, role, email, password_hash, status, surname, given_name, position, terms_accepted_at, created_at)
    VALUES (?, 'teacher', ?, ?, 'pending', ?, ?, 'Teacher', ?, ?)
  `).run(id, emailNorm, bcrypt.hashSync(password, 10), surname, given, Date.now(), Date.now());

  res.json({ ok: true, message: "Your teacher account is pending admin approval." });
});

function lockMessage(retryAfterMs) {
  const mins = Math.max(1, Math.ceil(retryAfterMs / 60000));
  return `Too many failed attempts. Please wait ${mins} minute${mins === 1 ? "" : "s"} and try again.`;
}

router.post("/login", authLimiter, async (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
  const emailNorm = email.trim().toLowerCase();

  // 3 wrong username/email-or-password attempts locks this specific account
  // for 10 minutes, independent of the IP-based rate limiter above — this
  // protects one account from being guessed even from many different IPs.
  const lock = loginAttempts.getStatus(emailNorm);
  if (lock.locked) {
    return res.status(429).json({ error: lockMessage(lock.retryAfterMs), code: "LOCKED", retryAfterMs: lock.retryAfterMs });
  }

  const user = await db.prepare("SELECT * FROM users WHERE email = ?").get(emailNorm);
  if (!user) {
    const entry = loginAttempts.recordFailure(emailNorm);
    if (entry.lockedUntil) return res.status(429).json({ error: lockMessage(loginAttempts.LOCKOUT_MS), code: "LOCKED", retryAfterMs: loginAttempts.LOCKOUT_MS });
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  if (user.password_hash === "UNCLAIMED") {
    // Account exists but has no password to check against yet — not a
    // "wrong password" attempt, so it doesn't count toward the lockout.
    return res.status(409).json({ error: "This account was invited but hasn't set a password yet.", code: "UNCLAIMED" });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    const entry = loginAttempts.recordFailure(emailNorm);
    if (entry.lockedUntil) return res.status(429).json({ error: lockMessage(loginAttempts.LOCKOUT_MS), code: "LOCKED", retryAfterMs: loginAttempts.LOCKOUT_MS });
    const remaining = loginAttempts.MAX_ATTEMPTS - entry.count;
    return res.status(401).json({ error: `Incorrect email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} left before a 10-minute lockout.` });
  }
  // The password was correct — reset the counter now, even if a status/role
  // check below still blocks the login. Those aren't credential guesses.
  loginAttempts.recordSuccess(emailNorm);
  if (user.role === "teacher" && user.status === "pending") {
    return res.status(403).json({ error: "Your teacher account is still pending admin approval." });
  }
  if (user.status === "suspended") {
    return res.status(403).json({ error: "This account has been suspended. Contact the admin." });
  }
  if (role && role !== user.role && user.role !== "admin") {
    return res.status(403).json({ error: `This account is registered as ${user.role}, not ${role}.` });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

// Student accounts are created via teacher invite (no password yet) — first
// login sets the password for that invited email.
router.post("/student-claim", authLimiter, async (req, res) => {
  const { email, password, agreeToTerms } = req.body || {};
  if (!email || !password || password.length < 6) return res.status(400).json({ error: "Email and a password of at least 6 characters are required." });
  if (!agreeToTerms) return res.status(400).json({ error: "Please accept the Terms & Conditions and Privacy Policy to continue." });
  const emailNorm = email.trim().toLowerCase();
  const user = await db.prepare("SELECT * FROM users WHERE email = ? AND role = 'student'").get(emailNorm);
  if (!user) return res.status(404).json({ error: "No student invite found for that email." });
  if (user.password_hash !== "UNCLAIMED") return res.status(409).json({ error: "This account already has a password — please sign in." });
  await db.prepare("UPDATE users SET password_hash = ?, terms_accepted_at = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), Date.now(), user.id);
  const updated = await db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  res.json({ token: signToken(updated), user: publicUser(updated) });
});

// Classroom invite links (see POST /teacher/classrooms/:id/invites) — public
// lookup + accept. A brand-new student sets their password here (same as
// student-claim); an existing student must already be logged in as that
// exact account, so a forwarded/leaked link can't be used to hijack it.
router.get("/invite/:token", async (req, res) => {
  const inv = await db.prepare(`
    SELECT ci.status, ci.email, c.name as classroom_name, u.password_hash
    FROM classroom_invites ci
    JOIN classrooms c ON c.id = ci.classroom_id
    JOIN users u ON u.id = ci.student_id
    WHERE ci.token = ?
  `).get(req.params.token);
  if (!inv) return res.status(404).json({ error: "This invite link is invalid." });
  if (inv.status === "revoked") return res.status(410).json({ error: "This invite has been revoked by the teacher." });
  res.json({
    classroomName: inv.classroom_name,
    email: inv.email,
    alreadyJoined: inv.status === "joined",
    needsPassword: inv.password_hash === "UNCLAIMED"
  });
});

router.post("/invite/:token/accept", authLimiter, async (req, res) => {
  const inv = await db.prepare("SELECT * FROM classroom_invites WHERE token = ?").get(req.params.token);
  if (!inv) return res.status(404).json({ error: "This invite link is invalid." });
  if (inv.status === "revoked") return res.status(410).json({ error: "This invite has been revoked by the teacher." });

  const student = await db.prepare("SELECT * FROM users WHERE id = ?").get(inv.student_id);
  if (!student) return res.status(404).json({ error: "Account not found." });

  let authedUser = student;
  if (student.password_hash === "UNCLAIMED") {
    const { password, agreeToTerms } = req.body || {};
    if (!password || password.length < 6) return res.status(400).json({ error: "Please choose a password of at least 6 characters." });
    if (!agreeToTerms) return res.status(400).json({ error: "Please accept the Terms & Conditions and Privacy Policy to continue." });
    await db.prepare("UPDATE users SET password_hash = ?, terms_accepted_at = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), Date.now(), student.id);
    authedUser = await db.prepare("SELECT * FROM users WHERE id = ?").get(student.id);
  } else {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    let payload;
    try { payload = token && jwt.verify(token, JWT_SECRET); } catch { payload = null; }
    if (!payload || payload.id !== student.id) {
      return res.status(401).json({ error: "Please log in as this student to accept the invite.", code: "LOGIN_REQUIRED" });
    }
  }

  if (inv.status !== "joined") {
    await db.prepare("INSERT OR IGNORE INTO classroom_students (classroom_id, student_id) VALUES (?, ?)").run(inv.classroom_id, inv.student_id);
    await db.prepare("UPDATE classroom_invites SET status='joined', joined_at=? WHERE id=?").run(Date.now(), inv.id);
  }

  res.json({ token: signToken(authedUser), user: publicUser(authedUser) });
});

// ===== Classroom-wide join link (one per classroom) =====
// Unlike the per-student email invites above, every classroom has exactly
// one shareable /class/<token> link. A brand-new student supplies their
// email + password right here; an existing student must be logged in.
router.get("/class-invite/:token", async (req, res) => {
  const cls = await db.prepare("SELECT id, name FROM classrooms WHERE join_token = ?").get(req.params.token);
  if (!cls) return res.status(404).json({ error: "This class link is invalid." });
  res.json({ classroomName: cls.name });
});

router.post("/class-invite/:token/join", authLimiter, async (req, res) => {
  const cls = await db.prepare("SELECT id, name FROM classrooms WHERE join_token = ?").get(req.params.token);
  if (!cls) return res.status(404).json({ error: "This class link is invalid." });

  // Logged-in student joining directly.
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
  let payload = null;
  try { payload = bearer && jwt.verify(bearer, JWT_SECRET); } catch { payload = null; }
  if (payload) {
    const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(payload.id);
    if (!user || user.role !== "student") return res.status(403).json({ error: "Only student accounts can join a classroom." });
    await db.prepare("INSERT OR IGNORE INTO classroom_students (classroom_id, student_id) VALUES (?, ?)").run(cls.id, user.id);
    return res.json({ token: signToken(user), user: publicUser(user) });
  }

  // New (or not-logged-in) student — needs email + password.
  const { email, password, agreeToTerms } = req.body || {};
  const emailNorm = (email || "").trim().toLowerCase();
  if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) return res.status(400).json({ error: "Please enter a valid email address." });
  if (!password || password.length < 6) return res.status(400).json({ error: "Please choose a password of at least 6 characters." });
  if (!agreeToTerms) return res.status(400).json({ error: "Please accept the Terms & Conditions and Privacy Policy to continue." });

  let user = await db.prepare("SELECT * FROM users WHERE email = ?").get(emailNorm);
  if (user && user.role !== "student") return res.status(409).json({ error: "That email belongs to a non-student account." });
  if (user && user.password_hash !== "UNCLAIMED") {
    return res.status(401).json({ error: "An account with that email already exists — please log in first, then open this link again.", code: "LOGIN_REQUIRED" });
  }
  if (!user) {
    const id = nanoid();
    await db.prepare(`
      INSERT INTO users (id, role, email, password_hash, status, terms_accepted_at, created_at)
      VALUES (?, 'student', ?, ?, 'active', ?, ?)
    `).run(id, emailNorm, bcrypt.hashSync(password, 10), Date.now(), Date.now());
    user = await db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  } else {
    // Invited-but-unclaimed account claiming itself through the class link.
    await db.prepare("UPDATE users SET password_hash = ?, terms_accepted_at = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), Date.now(), user.id);
    user = await db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  }
  await db.prepare("INSERT OR IGNORE INTO classroom_students (classroom_id, student_id) VALUES (?, ?)").run(cls.id, user.id);
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post("/forgot", authLimiter, (req, res) => {
  // No email service wired up — this simply doesn't reveal whether the
  // account exists, matching the prototype's messaging.
  res.json({ ok: true, message: "If an account exists for that email, a password reset link is on its way." });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found." });
  res.json({ user: publicUser(user) });
});

// Real password rotation, for every role. This is what makes the
// ADMIN_PASSWORD/MASTER_ADMIN_PASSWORD env vars a one-time bootstrap value
// rather than a permanent secret that has to keep living in server/.env —
// once you change your password here, the account is marked password_owned
// and the seed step on db.js will never overwrite it from the env var again.
router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Please provide your current password and a new password of at least 6 characters." });
  }
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user || user.password_hash === "UNCLAIMED" || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  const cost = user.role === "admin" ? 12 : 10;
  await db.prepare("UPDATE users SET password_hash = ?, password_owned = 1 WHERE id = ?").run(bcrypt.hashSync(newPassword, cost), user.id);
  res.json({ ok: true });
});

router.put("/me", requireAuth, async (req, res) => {
  // Teachers' identity details (name/email) are managed by an admin instead
  // (see PUT /admin/teachers/:id) — keeps who's-allowed-to-be-a-teacher
  // under admin oversight rather than self-service.
  if (req.user.role === "teacher") {
    return res.status(403).json({ error: "Contact your admin to update your account details." });
  }
  const { surname, given, mi, sex, grade, email } = req.body || {};
  await db.prepare(`
    UPDATE users SET surname = ?, given_name = ?, mi = ?, sex = ?, grade_section = ?, email = ?
    WHERE id = ?
  `).run(surname || "", given || "", mi || "", sex || "M", grade || "", (email || "").trim().toLowerCase(), req.user.id);
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json({ user: publicUser(user) });
});

module.exports = { router, publicUser };
