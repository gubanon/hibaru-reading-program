require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("./db"); // ensure DB + seed run before routes touch it

const { router: authRouter } = require("./routes/auth");
const adminRouter = require("./routes/admin");
const teacherRouter = require("./routes/teacher");
const studentRouter = require("./routes/student");

const app = express();
app.disable("x-powered-by");
app.use(helmet({
  // The API serves JSON + file downloads, not HTML pages of its own, so a
  // strict default CSP would only get in the way — the frontend origin sets
  // its own.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map(s => s.trim());
if (!process.env.CORS_ORIGIN) {
  console.warn("[hibaru] CORS_ORIGIN is not set — defaulting to http://localhost:5173. Set it to your real frontend origin in production.");
}
app.use(cors({ origin: allowedOrigins, credentials: false }));
app.use(express.json({ limit: "5mb" }));

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/teacher", teacherRouter);
app.use("/api/student", studentRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`HIBARU server listening on http://localhost:${PORT}`));
