const path = require("path");
const bcrypt = require("bcryptjs");
const { createClient } = require("@libsql/client");
const { nanoid } = require("nanoid");

// Local dev (and any host without TURSO_DATABASE_URL set) uses a plain file,
// exactly like before. Production points TURSO_DATABASE_URL/TURSO_AUTH_TOKEN
// at a real Turso database instead — this is what makes data survive a
// redeploy: a hosting platform's local disk is not guaranteed to persist
// across deploys (that's what caused real data loss before this change),
// but a Turso database is a separate, persistent, network-attached service
// that a redeploy never touches.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data.db");
const usingTurso = !!process.env.TURSO_DATABASE_URL;
const client = createClient(
  usingTurso
    ? { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }
    : { url: `file:${DB_PATH}` }
);

// Thin wrapper keeping the same db.prepare(sql).get/all/run(...args) shape
// the rest of the codebase already uses (just async now) — call sites only
// need `await` added, not a full rewrite to client.execute({sql, args}).
function prepare(sql) {
  return {
    get: async (...args) => {
      const res = await client.execute({ sql, args });
      return res.rows[0];
    },
    all: async (...args) => {
      const res = await client.execute({ sql, args });
      return res.rows;
    },
    run: async (...args) => {
      const res = await client.execute({ sql, args });
      return { changes: Number(res.rowsAffected), lastInsertRowid: res.lastInsertRowid };
    }
  };
}

const db = { prepare };

async function ensureColumn(table, column, ddl) {
  const cols = await db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

const crypto = require("crypto");
function randomPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

async function seedAdmin({ email, password, explicit, isMaster, surname, given, position }) {
  const emailNorm = email.trim().toLowerCase();
  const existing = await db.prepare("SELECT id, password_owned, is_master_admin FROM users WHERE email = ?").get(emailNorm);
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
      await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(password, 12), existing.id);
    }
    // Backfill the master flag for an account that predates the
    // is_master_admin column — only ever promotes, never demotes, and only
    // for the configured master identity; removal happens exclusively
    // through the admin-management endpoints, never here.
    if (isMaster && !existing.is_master_admin) {
      await db.prepare("UPDATE users SET is_master_admin = 1 WHERE id = ?").run(existing.id);
    }
    return;
  }
  await db.prepare(
    `INSERT INTO users (id, role, email, password_hash, status, surname, given_name, position, is_master_admin, terms_accepted_at, created_at)
     VALUES (?, 'admin', ?, ?, 'active', ?, ?, ?, ?, ?, ?)`
  ).run(nanoid(), emailNorm, bcrypt.hashSync(password, 12), surname, given, position, isMaster ? 1 : 0, Date.now(), Date.now());
  if (!explicit) {
    console.warn(`[hibaru] No password env var set for ${emailNorm} — generated a one-time password: ${password}`);
    console.warn("[hibaru] Log in with it once, then use Change Password in the app — the env var and this generated password won't be needed again.");
  }
}

let initPromise = null;
function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await client.execute("PRAGMA foreign_keys = ON");
    if (!usingTurso) {
      // WAL is a local-file storage detail; meaningless against a remote
      // Turso connection.
      await client.execute("PRAGMA journal_mode = WAL");
    }

    await client.executeMultiple(`
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

      CREATE TABLE IF NOT EXISTS classroom_invites (
        id TEXT PRIMARY KEY,
        classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
        teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','joined','revoked')),
        created_at INTEGER NOT NULL,
        joined_at INTEGER
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

    // CREATE TABLE IF NOT EXISTS is a no-op on a table that already exists —
    // it does not add new columns. New columns need an explicit migration
    // rather than just editing the CREATE TABLE above.
    await ensureColumn("users", "is_master_admin", "is_master_admin INTEGER NOT NULL DEFAULT 0");
    await ensureColumn("users", "password_owned", "password_owned INTEGER NOT NULL DEFAULT 0");

    // Admin credentials are read from env vars only (server/.env, gitignored,
    // never committed) — there is deliberately no real password baked into
    // source here. The env var only matters for bootstrapping: once someone
    // changes their password through the app (POST /api/auth/change-password),
    // that account is marked password_owned and the env var is ignored for it
    // from then on.
    const adminPasswordEnv = process.env.ADMIN_PASSWORD;
    await seedAdmin({
      email: process.env.ADMIN_EMAIL || "jinodocena11@gmail.com",
      password: adminPasswordEnv || randomPassword(), explicit: !!adminPasswordEnv, isMaster: false,
      surname: "Docena", given: "Jino", position: "School Head"
    });
    const masterPasswordEnv = process.env.MASTER_ADMIN_PASSWORD;
    await seedAdmin({
      email: process.env.MASTER_ADMIN_USERNAME || "biskotso",
      password: masterPasswordEnv || randomPassword(), explicit: !!masterPasswordEnv, isMaster: true,
      surname: "", given: "Master Admin", position: "Master Administrator"
    });

    console.log(`[hibaru] Database ready (${usingTurso ? "Turso: " + process.env.TURSO_DATABASE_URL : "local file: " + DB_PATH})`);
  })();
  return initPromise;
}

db.init = init;
module.exports = db;
