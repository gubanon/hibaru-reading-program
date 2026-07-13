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

// Admin credentials are read from env vars only (server/.env, gitignored,
// never committed) — there is deliberately no real password baked into
// source here. If a password env var is unset, a random one-time password
// is generated and printed to the console so local dev still boots, but it
// is never the same twice and never lands in source control.
const crypto = require("crypto");
function randomPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

function seedAdmin({ email, password, generated, surname, given, position }) {
  const emailNorm = email.trim().toLowerCase();
  const existing = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(emailNorm);
  if (existing) return;
  // A higher bcrypt cost factor for admin accounts specifically — these are
  // logged into far less often than teacher/student accounts, so the extra
  // hashing time is a worthwhile tradeoff against offline cracking of a
  // leaked hash.
  db.prepare(
    `INSERT INTO users (id, role, email, password_hash, status, surname, given_name, position, terms_accepted_at, created_at)
     VALUES (?, 'admin', ?, ?, 'active', ?, ?, ?, ?, ?)`
  ).run(nanoid(), emailNorm, bcrypt.hashSync(password, 12), surname, given, position, Date.now(), Date.now());
  if (generated) {
    console.warn(`[hibaru] No password env var set for ${emailNorm} — generated a one-time password: ${password}`);
    console.warn("[hibaru] Set it permanently via server/.env instead (see .env.example) so it doesn't change on every fresh DB.");
  }
}

function seed() {
  const adminPassword = process.env.ADMIN_PASSWORD || randomPassword();
  seedAdmin({
    email: process.env.ADMIN_EMAIL || "jinodocena11@gmail.com",
    password: adminPassword, generated: !process.env.ADMIN_PASSWORD,
    surname: "Docena", given: "Jino", position: "School Head"
  });
  const masterPassword = process.env.MASTER_ADMIN_PASSWORD || randomPassword();
  seedAdmin({
    email: process.env.MASTER_ADMIN_USERNAME || "biskotso",
    password: masterPassword, generated: !process.env.MASTER_ADMIN_PASSWORD,
    surname: "", given: "Master Admin", position: "Master Administrator"
  });
}
seed();

module.exports = db;
