const nodemailer = require("nodemailer");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

let transporter = null;
let warned = false;
function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;
  if (!user || !pass) {
    if (!warned) {
      console.warn("[hibaru] EMAIL_USER/EMAIL_APP_PASSWORD not set — invite/notification emails will be skipped (logged only). See .env.example.");
      warned = true;
    }
    return null;
  }
  transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return transporter;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Never throws — a failed/unconfigured email must not break the request that
// triggered it (invite creation, assignment posting, etc). Callers that care
// whether it actually sent can check the returned `sent` flag.
async function sendEmail({ to, bcc, subject, html }) {
  const t = getTransporter();
  if (!t) {
    console.warn(`[hibaru] (email skipped) "${subject}" -> ${to || (bcc || []).join(", ")}`);
    return { sent: false };
  }
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  try {
    await t.sendMail({ from: `Project HIBARU <${from}>`, to, bcc, subject, html });
    return { sent: true };
  } catch (err) {
    console.error("[hibaru] Failed to send email:", err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendEmail, escapeHtml, CLIENT_URL };
