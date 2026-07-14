const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const { nanoid } = require("nanoid");

// On Fly.io this points at the mounted persistent volume (see fly.toml);
// locally it defaults to a file next to this project.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('admin','teacher','student')),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('pending','active','suspended')),
  surname TEXT NOT NULL DEFAULT '',
  given_name TEXT NOT NULL DEFAULT '',
  mi TEXT NOT NULL DEFAULT '',
  sex TEXT NOT NULL DEFAULT 'M',
  position TEXT NOT NULL DEFAULT '',
  grade_section TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT 'Taft National High School (303529)',
  division TEXT NOT NULL DEFAULT 'Eastern Samar',
  region TEXT NOT NULL DEFAULT 'Region VIII – Eastern Visayas',
  terms_accepted_at INTEGER,
  is_master_admin INTEGER NOT NULL DEFAULT 0,
  password_owned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS classrooms (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS classroom_students (
  classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (classroom_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  passage TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL DEFAULT 'Non-Fiction',
  attempts TEXT NOT NULL DEFAULT '3',
  time_limit TEXT NOT NULL DEFAULT '10 minutes',
  sensitivity TEXT NOT NULL DEFAULT 'Default',
  deadline_iso TEXT NOT NULL DEFAULT '',
  video_path TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS vocab_words (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  word TEXT NOT NULL,
  def TEXT NOT NULL DEFAULT '',
  def_fil TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  text TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not-started' CHECK(status IN ('not-started','in-progress','turned-in')),
  started_at INTEGER,
  submitted_at INTEGER,
  seconds INTEGER NOT NULL DEFAULT 0,
  transcript TEXT NOT NULL DEFAULT '',
  marked TEXT NOT NULL DEFAULT '[]',
  miscues TEXT NOT NULL DEFAULT '{}',
  answers TEXT NOT NULL DEFAULT '{}',
  correct_count INTEGER NOT NULL DEFAULT 0,
  practiced TEXT NOT NULL DEFAULT '{}',
  UNIQUE(assignment_id, student_id)
);
`);

// CREATE TABLE IF NOT EXISTS is a no-op on a table that already exists — it
// does not add new columns. This project has a live database on Render with
// real teacher/student/admin data, so new columns need an explicit
// migration rather than just editing the CREATE TABLE above.
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureColumn("users", "is_master_admin", "is_master_admin INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "password_owned", "password_owned INTEGER NOT NULL DEFAULT 0");

// Admin credentials are read from env vars only (server/.env, gitignored,
// never committed) — there is deliberately no real password baked into
// source here. The env var only matters for bootstrapping: once someone
// changes their password through the app (POST /api/auth/change-password),
// that account is marked password_owned and the env var is ignored for it
// from then on — so ADMIN_PASSWORD/MASTER_ADMIN_PASSWORD can and should be
// removed from server/.env (and your host's env var settings) once you've
// logged in and set a real password. If a password env var is unset AND the
// account doesn't exist yet, a random one-time password is generated and
// printed to the console so local dev still boots.
const crypto = require("crypto");
function randomPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

function seedAdmin({ email, password, explicit, isMaster, surname, given, position }) {
  const emailNorm = email.trim().toLowerCase();
  const existing = db.prepare("SELECT id, password_owned, is_master_admin FROM users WHERE email = ?").get(emailNorm);
  // A higher bcrypt cost factor for admin accounts specifically — these are
  // logged into far less often than teacher/student accounts, so the extra
  // hashing time is a worthwhile tradeoff against offline cracking of a
  // leaked hash.
  if (existing) {
    // Sync from the env var only if it's actually set AND the account
    // hasn't taken ownership of its own password via the app — this keeps
    // a stuck/forgotten env-seeded account recoverable, without silently
    // clobbering a password someone deliberately changed through the UI.
    if (explicit && !existing.password_owned) {
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(password, 12), existing.id);
    }
    // Backfill the master flag for an account that predates the
    // is_master_admin column (added via the ensureColumn migration above,
    // which can only default new columns to 0 — it can't know MASTER_ADMIN_USERNAME
    // should be 1). Only ever promotes, never demotes, and only for the
    // configured master identity — removal happens exclusively through the
    // admin-management endpoints, never here.
    if (isMaster && !existing.is_master_admin) {
      db.prepare("UPDATE users SET is_master_admin = 1 WHERE id = ?").run(existing.id);
    }
    return;
  }
  db.prepare(
    `INSERT INTO users (id, role, email, password_hash, status, surname, given_name, position, is_master_admin, terms_accepted_at, created_at)
     VALUES (?, 'admin', ?, ?, 'active', ?, ?, ?, ?, ?, ?)`
  ).run(nanoid(), emailNorm, bcrypt.hashSync(password, 12), surname, given, position, isMaster ? 1 : 0, Date.now(), Date.now());
  if (!explicit) {
    console.warn(`[hibaru] No password env var set for ${emailNorm} — generated a one-time password: ${password}`);
    console.warn("[hibaru] Log in with it once, then use Change Password in the app — the env var and this generated password won't be needed again.");
  }
}

function seed() {
  const adminPasswordEnv = process.env.ADMIN_PASSWORD;
  seedAdmin({
    email: process.env.ADMIN_EMAIL || "jinodocena11@gmail.com",
    password: adminPasswordEnv || randomPassword(), explicit: !!adminPasswordEnv, isMaster: false,
    surname: "Docena", given: "Jino", position: "School Head"
  });
  const masterPasswordEnv = process.env.MASTER_ADMIN_PASSWORD;
  seedAdmin({
    email: process.env.MASTER_ADMIN_USERNAME || "biskotso",
    password: masterPasswordEnv || randomPassword(), explicit: !!masterPasswordEnv, isMaster: true,
    surname: "", given: "Master Admin", position: "Master Administrator"
  });
}
seed();

module.exports = db;
