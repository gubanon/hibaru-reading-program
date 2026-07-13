# Deploying Project HIBARU for a teacher pilot (free)

Two hosts, both free: **Fly.io** for the backend (Express + SQLite — Fly's
free allowance includes a small persistent volume, so the SQLite file
survives restarts/redeploys) and **Vercel** for the frontend (static React
build, generous permanent free tier, zero config for Vite).

Both require creating an account and logging in interactively (OAuth/browser),
which only you can do. Everything else below is copy-pasteable commands.

Free-tier terms/limits change over time — double-check current pricing on
each provider's site before committing, especially if the pilot runs long or
grows beyond a handful of teachers.

## 0. Push this repo to GitHub

Vercel deploys straight from a GitHub repo. You have GitHub Desktop
installed, which is the easiest path:

1. Open GitHub Desktop → **Add** → **Add Existing Repository** → pick this
   `HEBARU TNHS APP` folder (it's already a git repo — one commit needed
   first, see below).
2. Or from a terminal in this folder:
   ```bash
   git add -A
   git commit -m "Initial commit"
   ```
   Then in GitHub Desktop: **Publish repository** (make it private — it
   contains a school program's source, no need for it to be public).

## 1. Backend on Fly.io

```bash
# Install the CLI (pick your platform):
#   Windows (PowerShell): iwr https://fly.io/install.ps1 -useb | iex
#   Mac/Linux:            curl -L https://fly.io/install.sh | sh

fly auth login          # opens a browser — sign up if you don't have an account

cd server
fly launch --no-deploy  # detects the Dockerfile + fly.toml; it will ask:
                         #  - app name: accept "hibaru-reading-api" or pick another
                         #    (must be globally unique across all Fly users)
                         #  - region: pick one close to the Philippines (sin/hkg/nrt)
                         #  - "Would you like to set up a Postgres/Redis": No to both
                         #  - it should detect the [[mounts]] in fly.toml and offer
                         #    to create the volume — say yes; if it doesn't ask,
                         #    create it manually:
fly volumes create hibaru_data --region sin --size 1

# Generate a real JWT secret and set the production secrets (never committed —
# these live only in Fly's secret store):
fly secrets set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
fly secrets set ADMIN_PASSWORD="choose-a-new-strong-password"
fly secrets set MASTER_ADMIN_PASSWORD="choose-a-new-strong-password"
# CORS_ORIGIN comes after step 2 below, once you know the Vercel URL —
# for now, deploy without it (defaults to localhost, which is fine to fix later):

fly deploy
```

When it finishes, note the URL it prints — something like
`https://hibaru-reading-api.fly.dev`. Confirm it's alive:

```bash
curl https://hibaru-reading-api.fly.dev/api/health
# should print {"ok":true}
```

## 2. Frontend on Vercel

1. Go to vercel.com → sign up/log in (GitHub login is easiest) → **Add New
   Project** → import the GitHub repo you published in step 0.
2. Vercel will ask for a **Root Directory** — set it to `client` (this repo
   has both `client/` and `server/`; only `client` is the frontend).
3. Framework preset should auto-detect as **Vite**. Leave build command
   (`npm run build`) and output directory (`dist`) as default.
4. Before deploying, add an environment variable:
   - `VITE_API_URL` = the Fly.io URL from step 1, e.g.
     `https://hibaru-reading-api.fly.dev` (no trailing slash)
5. Click **Deploy**. Note the resulting URL, e.g.
   `https://hibaru-tnhs.vercel.app`.

## 3. Close the loop: lock CORS to your real frontend URL

Now that you know the Vercel URL, go back and restrict the backend to it:

```bash
cd server
fly secrets set CORS_ORIGIN="https://hibaru-tnhs.vercel.app"
```

Setting a secret triggers an automatic redeploy.

## 4. Test it

Open the Vercel URL. Log in with the admin account you set in step 1
(`jinodocena11@gmail.com` / whatever you set `ADMIN_PASSWORD` to, or your
`biskotso` master admin with `MASTER_ADMIN_PASSWORD`). Approve a teacher
signup, create a classroom, invite a student, run through a reading task —
same golden path as local testing.

## Notes for a multi-teacher pilot

- **Data persistence:** the SQLite file lives on the Fly volume, so it
  survives `fly deploy` and machine restarts. It does *not* survive
  `fly volumes destroy` — don't run that once real data is in it.
- **Backups:** for anything beyond a short trial, periodically pull a copy:
  `fly ssh sftp get /data/data.db ./backup-$(date +%F).db`
- **Camera/mic:** Fly serves HTTPS by default (`force_https = true`), which
  is required for `getUserMedia`/`SpeechRecognition` to work in the browser
  — this would silently fail over plain HTTP.
- **Scaling down for a small pilot:** `fly.toml` is set to `min_machines_running = 1`
  so the backend doesn't cold-start between visits — reasonable for a live
  pilot with teachers actively using it, but means it's not "scale to zero"
  free. If cost becomes a concern, this is the first thing to revisit.
