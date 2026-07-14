const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { nanoid } = require("nanoid");
const db = require("../db");
const { signToken, requireAuth } = require("../auth");
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
router.post("/signup", authLimiter, (req, res) => {
  const { name, email, password, agreeToTerms } = req.body || {};
  if (!name || !name.trim() || !email || !email.trim() || !password || password.length < 8) {
    return res.status(400).json({ error: "Please provide your name, DepEd email, and a password of at least 8 characters." });
  }
  if (!agreeToTerms) {
    return res.status(400).json({ error: "Please accept the Terms & Conditions and Privacy Policy to create an account." });
  }
  const emailNorm = email.trim().toLowerCase();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(emailNorm);
  if (existing) return res.status(409).json({ error: "An account with that email already exists." });

  const parts = name.trim().split(/\s+/);
  const given = parts[0] || name.trim();
  const surname = parts.length > 1 ? parts[parts.length - 1] : "";
  const id = nanoid();
  db.prepare(`
    INSERT INTO users (id, role, email, password_hash, status, surname, given_name, position, terms_accepted_at, created_at)
    VALUES (?, 'teacher', ?, ?, 'pending', ?, ?, 'Teacher', ?, ?)
  `).run(id, emailNorm, bcrypt.hashSync(password, 10), surname, given, Date.now(), Date.now());

  res.json({ ok: true, message: "Your teacher account is pending admin approval." });
});

function lockMessage(retryAfterMs) {
  const mins = Math.max(1, Math.ceil(retryAfterMs / 60000));
  return `Too many failed attempts. Please wait ${mins} minute${mins === 1 ? "" : "s"} and try again.`;
}

router.post("/login", authLimiter, (req, res) => {
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

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(emailNorm);
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
router.post("/student-claim", authLimiter, (req, res) => {
  const { email, password, agreeToTerms } = req.body || {};
  if (!email || !password || password.length < 6) return res.status(400).json({ error: "Email and a password of at least 6 characters are required." });
  if (!agreeToTerms) return res.status(400).json({ error: "Please accept the Terms & Conditions and Privacy Policy to continue." });
  const emailNorm = email.trim().toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'student'").get(emailNorm);
  if (!user) return res.status(404).json({ error: "No student invite found for that email." });
  if (user.password_hash !== "UNCLAIMED") return res.status(409).json({ error: "This account already has a password — please sign in." });
  db.prepare("UPDATE users SET password_hash = ?, terms_accepted_at = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), Date.now(), user.id);
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  res.json({ token: signToken(updated), user: publicUser(updated) });
});

router.post("/forgot", authLimiter, (req, res) => {
  // No email service wired up — this simply doesn't reveal whether the
  // account exists, matching the prototype's messaging.
  res.json({ ok: true, message: "If an account exists for that email, a password reset link is on its way." });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found." });
  res.json({ user: publicUser(user) });
});

// Real password rotation, for every role. This is what makes the
// ADMIN_PASSWORD/MASTER_ADMIN_PASSWORD env vars a one-time bootstrap value
// rather than a permanent secret that has to keep living in server/.env —
// once you change your password here, the account is marked password_owned
// and the seed step on db.js will never overwrite it from the env var again.
router.post("/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Please provide your current password and a new password of at least 6 characters." });
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user || user.password_hash === "UNCLAIMED" || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  const cost = user.role === "admin" ? 12 : 10;
  db.prepare("UPDATE users SET password_hash = ?, password_owned = 1 WHERE id = ?").run(bcrypt.hashSync(newPassword, cost), user.id);
  res.json({ ok: true });
});

router.put("/me", requireAuth, (req, res) => {
  const { surname, given, mi, sex, grade, email } = req.body || {};
  db.prepare(`
    UPDATE users SET surname = ?, given_name = ?, mi = ?, sex = ?, grade_section = ?, email = ?
    WHERE id = ?
  `).run(surname || "", given || "", mi || "", sex || "M", grade || "", (email || "").trim().toLowerCase(), req.user.id);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json({ user: publicUser(user) });
});

module.exports = { router, publicUser };
