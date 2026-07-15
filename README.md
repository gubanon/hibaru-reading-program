# Project HIBARU — Remedial Reading Program

Real implementation of the `Reading Program.dc.html` design handoff (see
`Education Reading Program App-handoff/`). React (Vite) frontend, Node/Express
+ SQLite backend, JWT auth, and browser-based speech-to-text for the reading
assessment.

## Run it

```bash
# terminal 1 — backend (http://localhost:4000)
cd server
npm install
npm run dev

# terminal 2 — frontend (http://localhost:5173)
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to the
backend, so both must be running.

Data lives in `server/data.db` (SQLite, created automatically) when running
locally. Delete it to reset to a blank install. In production, set
`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` to point at a hosted
[Turso](https://turso.tech) database instead — otherwise data does not
survive a redeploy. See DEPLOY.md.

## Deploying for a teacher pilot

See **[DEPLOY.md](DEPLOY.md)** — free hosting on Netlify (frontend) + Render
(backend) + Turso (database), step by step.

## Accounts

- **Admin accounts** are seeded automatically on first boot — two of them,
  both full admins (see `server/src/db.js` → `seed()`). Credentials default
  to fixed values baked into source so the app runs out of the box, but
  **both are fully overridable via `server/.env`** (copy `.env.example`) —
  do that before any real deployment so the real passwords are never in
  source control. See the Security section below.
  - Primary admin — identifier is a DepEd email (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
  - Master admin — identifier is a plain username, not an email (the login
    form's "DEPED EMAIL" field accepts either — nothing enforces email
    format) (`MASTER_ADMIN_USERNAME` / `MASTER_ADMIN_PASSWORD`).
- **Teachers** self-signup on the login screen, then need admin approval
  (Admin Console → Teachers tab).
- **Students** are invited by a teacher from a classroom card. They don't get
  a password up front — the first time they sign in with their invited email,
  they're routed to a "set your password" screen instead of a login error.

## What differs from the design prototype, and why

- **Real accounts + persistence**, not the prototype's single-demo-account,
  in-memory state — every classroom/assignment/submission survives a reload
  and is scoped to the logged-in teacher/student.
- **The role toggle in the top bar is gone.** The prototype let one demo
  account flip between Teacher/Student views; with real, separate logins that
  toggle doesn't map to anything real, so each account only sees its own
  console.
- **Reading assessment uses actual browser speech-to-text** (Web Speech API)
  instead of the prototype's hardcoded miscue numbers. See the caveat below —
  this is the one area where "pixel-perfect" gives way to "actually works."

## Miscue analysis — an honest approximation

`server/src/miscue.js` aligns the live transcript against the passage
(Wagner–Fischer edit distance) and classifies each mismatch into the
Phil-IRI miscue categories: omission, insertion, repetition, transposition,
substitution, and a best-effort "mispronunciation" (substitution where the
transcript word is spelled close to the expected word) and "reversal"
(transcript word is the letter-reverse of the expected word).

Browser ASR outputs standard-spelled words even when pronunciation is
garbled, so true phoneme-level mispronunciation/reversal detection isn't
possible from a transcript alone — treat those two categories as estimates,
not a clinical measurement. Omission/insertion/substitution/repetition are
reliable since they're direct word-level comparisons.

Speech recognition (`window.SpeechRecognition`) and camera preview
(`getUserMedia`) both require a supported browser (Chrome/Edge) and user
permission grants — Safari/Firefox have little to no `SpeechRecognition`
support, and the UI shows a fallback notice when it's unavailable.

## Security

- Passwords hashed with bcrypt; sessions are signed, expiring JWTs.
- `/api/auth/*` endpoints (login, signup, forgot, student-claim) are
  rate-limited (20 requests / 15 min / IP) against brute-force and
  credential-stuffing.
- **Per-account login lockout:** 3 wrong username/email-or-password attempts
  on the same account locks that account for 10 minutes, regardless of which
  IP the attempts come from (`server/src/loginAttempts.js`, wired into
  `POST /api/auth/login`). This is separate from and in addition to the
  IP-based rate limit above — one blocks an IP hammering many accounts, the
  other blocks one account being guessed from anywhere. A correct password
  resets the counter immediately, even if the login is then blocked for an
  unrelated reason (pending approval, suspended). Non-credential failures
  (unclaimed account, pending approval, suspension) don't count toward the
  lockout. Lockout state is in-memory and clears on server restart.
- `helmet` security headers on every response; `X-Powered-By` disabled.
- CORS is locked to `CORS_ORIGIN` (set this env var to your real frontend
  origin in production — it defaults to `http://localhost:5173` for local
  dev and prints a warning if unset).
- `JWT_SECRET` **must** be set via env var in production — the server
  refuses to start with the dev fallback secret when `NODE_ENV=production`.
- Question-sheet uploads are restricted to `.docx`/`.pdf` by extension and
  MIME type, with a 15 MB size cap.
- Role-based access control on every route (teachers only see their own
  classrooms; students only see their own submissions).
- Admin account passwords are hashed at a higher bcrypt cost factor (12 vs.
  10 for teacher/student accounts) — admins log in far less often, so the
  extra hashing time is a worthwhile tradeoff against offline cracking of a
  leaked hash.
- Admin accounts never appear in any teacher/student-facing list (Teachers
  and Learners tabs query `role='teacher'`/`role='student'` explicitly), so
  their existence isn't discoverable through the UI.

Before deploying for real: copy `server/.env.example` to `server/.env` and
set real values for `JWT_SECRET`, `CORS_ORIGIN`, `ADMIN_PASSWORD`, and
`MASTER_ADMIN_PASSWORD` (if these are left unset, the server generates a
random one-time password and logs it once — it does not fall back to a
fixed default). Also put the server behind HTTPS and set
`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` so data survives redeploys — see
DEPLOY.md.

## Terms & Conditions / Privacy Policy

`client/src/pages/legal/Terms.jsx` and `Privacy.jsx` (served at `/terms` and
`/privacy`) are **draft templates**, referencing the Philippines' Data
Privacy Act of 2012 (RA 10173) given this program handles minors' data.
They are not legal advice and have not been reviewed by counsel or the
school's Data Protection Officer — that review is required before this is
used with real students. Teacher signup and the student password-claim flow
both require checking an "I agree" box that links to these pages before the
account is created (`agreeToTerms`, enforced server-side too, with an
`terms_accepted_at` timestamp recorded per user).

## Project layout

```
server/   Express API, SQLite/Turso schema (server/src/db.js), DOCX
          generation, miscue analysis
client/   React SPA — pages/admin, pages/teacher, pages/student mirror the
          three consoles from the design
```
