# Deploying Project HIBARU for a teacher pilot (free)

**Frontend: Netlify. Backend: Render.com.** Both free, both connect straight
to the GitHub repo (`gubanon/hibaru-reading-program`), no CLI required for
either.

Free-tier terms/limits change over time — double-check current pricing on
each provider's site before committing, especially if the pilot runs long or
grows beyond a handful of teachers.

## Frontend on Netlify — done

Already live at **https://hibaru-reading-program.netlify.app**, deployed via
the Netlify CLI and linked to the GitHub repo (`netlify.toml` at the repo
root configures the `client/` build). Pushes to `master` auto-deploy.

Still needed: once the backend is live (below), set `VITE_API_URL` as a
Netlify environment variable and redeploy — the site currently has no
backend to talk to, so login won't work until that's done.

## Database: Turso (required for real persistence)

The backend uses `@libsql/client`, which can talk to either a local SQLite
file (fine for local dev) or a remote **Turso** database (a free, hosted,
SQLite-compatible database that survives redeploys). **Render's free-tier
disk does not reliably survive redeploys**, so for any deployment with real
teacher/student data, Turso is required — without it, an update to the app
can wipe your data.

1. Go to **https://turso.tech** → sign up (GitHub login works, no card
   required for the free tier: 500 DBs / 9 GB storage, far more than this
   app needs).
2. There is no CLI needed — everything below is doable from the web
   dashboard (the official `turso` CLI has no native Windows build, so the
   dashboard is the easiest path from Windows too).
3. In the dashboard, **Create Database** → give it a name like
   `hibaru-reading` → pick the region closest to your Render service (or
   the default) → create.
4. On the database's page, find:
   - **Database URL** — starts with `libsql://...` — this is
     `TURSO_DATABASE_URL`.
   - **Create Token** (sometimes under a "Tokens" tab) → generate a
     full-access token → this is `TURSO_AUTH_TOKEN`.
5. Treat `TURSO_AUTH_TOKEN` like a password — don't paste it into chat,
   commit it, or share it outside Render's dashboard. Only paste it directly
   into the Render env var field in the next section.

## Email: Brevo (optional, but needed for invite/notification emails)

Classroom-invite "Join" links and new-assignment notifications are sent via
**Brevo's HTTP API**. Without this set up, the app still works fully —
invites and notifications are just skipped (an invite still creates a
working `/join/:token` link, it just isn't emailed automatically; share it
manually if needed).

**Why not Gmail SMTP?** Render's free tier blocks ALL outbound SMTP ports
(25/465/587) to prevent spam abuse — SMTP connections just time out, no
configuration can fix it. Brevo's API rides over HTTPS (port 443), which
is never blocked. (Gmail SMTP via `EMAIL_USER`/`EMAIL_APP_PASSWORD` still
works for local dev, where SMTP isn't blocked.)

1. Sign up at **https://www.brevo.com** (free tier: 300 emails/day — plenty
   for a school pilot; no card required).
2. Verify a sender address: **Settings → Senders & Domains → Senders → Add
   a sender** → use an email you control (a Gmail address is fine) → click
   the confirmation link Brevo emails you. This becomes the app's "From"
   address.
3. Create an API key: **Settings → SMTP & API → API Keys → Generate a new
   API key** → copy it.
4. Treat the API key like a password — don't paste it into chat, only into
   Render's environment variable field (or your local `.env`).
5. In Render (service → **Environment**), set:
   - `BREVO_API_KEY` — the key from step 3
   - `EMAIL_FROM` — the exact sender address you verified in step 2

## Backend on Render.com

This repo has a `render.yaml` Blueprint at the root — Render reads it
automatically and pre-fills almost everything.

1. Go to render.com → sign up/log in (GitHub login is easiest — no card
   required for the free tier).
2. **New** → **Blueprint** → connect the `gubanon/hibaru-reading-program`
   GitHub repo. Render detects `render.yaml` and shows a preview of the
   `hibaru-reading-api` web service it's about to create.
3. It will prompt for the env vars marked `sync: false` in `render.yaml` —
   fill these in (these are stored only in Render's dashboard, never in the
   repo):
   - `ADMIN_EMAIL` — e.g. `jinodocena11@gmail.com`
   - `ADMIN_PASSWORD` — choose a new strong password (don't reuse an old one)
   - `MASTER_ADMIN_USERNAME` — e.g. `biskotso`
   - `MASTER_ADMIN_PASSWORD` — choose a new strong password
   - `TURSO_DATABASE_URL` — from the Turso dashboard, step 4 above
   - `TURSO_AUTH_TOKEN` — from the Turso dashboard, step 4 above
   - `BREVO_API_KEY` — from the Email section above (optional — leave blank
     to skip email sending)
   - `EMAIL_FROM` — the verified Brevo sender address (optional, same as
     above)
4. Click **Apply**/**Create**. Render builds (`npm install`) and deploys.
   `JWT_SECRET` is auto-generated by Render (`generateValue: true` in the
   blueprint) — you never need to see or set it.
5. Note the resulting URL, something like
   `https://hibaru-reading-api.onrender.com`. Confirm it's alive:
   ```bash
   curl https://hibaru-reading-api.onrender.com/api/health
   # should print {"ok":true} — first request after idle may take ~30-50s (see caveats)
   ```
6. Check the Render service's **Logs** tab for a line like
   `[hibaru] Database ready (Turso: libsql://...)` — if it instead says
   `local file: ...`, the Turso env vars weren't picked up and data will
   NOT survive the next redeploy. Double check steps 3 and 5.

**If you're adding Turso to an already-deployed Render service** (rather
than a fresh Blueprint setup): open the service → **Environment** →
**Add Environment Variable** → add `TURSO_DATABASE_URL` and
`TURSO_AUTH_TOKEN` → **Save Changes** triggers an automatic redeploy. Any
data currently only in the old local `data.db` file will NOT be
automatically copied to Turso — it starts as a fresh, empty database (the
existing admin/master-admin accounts reseed from the `ADMIN_*`/
`MASTER_ADMIN_*` env vars, but teacher/student/classroom data made before
this migration will need to be re-entered).

## Close the loop: point the frontend at the backend

Now that the Render URL exists, go to the Netlify site's dashboard
(**Site configuration → Environment variables**) and add:

- `VITE_API_URL` = `https://hibaru-reading-api.onrender.com` (no trailing slash)

Then trigger a redeploy (**Deploys → Trigger deploy**) so the frontend build
picks up the new value — `VITE_API_URL` is baked in at build time, not read
at runtime, so this step is required after every change to it.

`render.yaml` already sets `CORS_ORIGIN` to the Netlify URL, so the backend
should already accept requests from it. If you ever change the Netlify URL,
update `CORS_ORIGIN` in Render's dashboard too.

## Test it

Open https://hibaru-reading-program.netlify.app. Log in with the admin
account you set in step 3 above. Approve a teacher signup, create a
classroom, invite a student, run through a reading task — same golden path
as local testing.

## Notes for a multi-teacher pilot

- **Cold starts:** Render's free web services sleep after ~15 minutes of no
  traffic. The first request after that takes ~30-50s to wake up — expect
  teachers to notice a slow first load if the app's been idle. There's no
  free way around this; it's the tradeoff of the free tier.
- **Data persistence — solved via Turso:** with `TURSO_DATABASE_URL` and
  `TURSO_AUTH_TOKEN` set (see the Turso section above), all data lives in
  Turso's hosted database, not on Render's local disk — it survives
  redeploys, instance recycling, and cold-start sleeps. If those two env
  vars are ever missing (e.g. removed by mistake), the server silently falls
  back to a local SQLite file, which does NOT survive a redeploy — always
  check the startup log line described in step 6 above after any deploy.
- **Camera/mic:** Render serves HTTPS by default, which is required for
  `getUserMedia`/`SpeechRecognition` to work in the browser.

## Fly.io (parked, not currently used)

`server/Dockerfile` and `server/fly.toml` are still in the repo from an
earlier attempt — Fly.io required identity verification that didn't
resolve, so the pilot moved to Render instead. These files aren't used by
the Render or Netlify deploys above; they're harmless to leave in place if
Fly.io is worth revisiting later, or delete them if you'd rather not carry
the clutter.
