const nodemailer = require("nodemailer");
const dns = require("dns").promises;

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const SMTP_HOST = "smtp.gmail.com";

function senderAddress() {
  return process.env.EMAIL_FROM || process.env.EMAIL_USER;
}

// --- Brevo (HTTP API) ---
// Render's free tier blocks ALL outbound SMTP ports (25/465/587) to prevent
// spam abuse — connections just time out, no config can fix that. Brevo's
// HTTP API rides over 443 instead, which is never blocked. When
// BREVO_API_KEY is set it takes precedence over the SMTP path below.
async function sendViaBrevo({ to, bcc, subject, html }) {
  const from = senderAddress();
  const payload = {
    sender: { name: "Project HIBARU", email: from },
    subject,
    htmlContent: html
  };
  if (to) payload.to = [{ email: to }];
  if (bcc && bcc.length) {
    // Brevo requires a `to` field even for bcc-only sends.
    if (!payload.to) payload.to = [{ email: from }];
    payload.bcc = bcc.map(email => ({ email }));
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo API ${res.status}: ${body.slice(0, 300)}`);
  }
}

let transporterPromise = null;
let warned = false;
function getTransporter() {
  if (transporterPromise) return transporterPromise;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;
  if (!user || !pass) {
    if (!warned) {
      console.warn("[hibaru] No email provider configured (BREVO_API_KEY or EMAIL_USER/EMAIL_APP_PASSWORD) — invite/notification emails will be skipped (logged only). See .env.example.");
      warned = true;
    }
    return null;
  }
  transporterPromise = (async () => {
    // Explicit host/port/STARTTLS rather than the `service: "gmail"`
    // shorthand (which defaults to port 465/implicit TLS) — several cloud
    // hosts, including Render, silently drop outbound connections on 465
    // while 587 works fine.
    //
    // Render's containers can resolve smtp.gmail.com's IPv6 (AAAA) address
    // but have no outbound IPv6 route, failing as ENETUNREACH — neither
    // nodemailer's `family: 4` option nor process-wide
    // dns.setDefaultResultOrder("ipv4first") stopped it from picking the
    // IPv6 address in practice, so resolve an IPv4 address ourselves and
    // connect to that literal IP. `tls.servername` keeps certificate
    // validation working against the real hostname despite connecting by IP.
    let host = SMTP_HOST;
    try {
      const addresses = await dns.resolve4(SMTP_HOST);
      if (addresses.length) host = addresses[0];
    } catch (err) {
      console.warn(`[hibaru] Could not resolve an IPv4 address for ${SMTP_HOST}, falling back to hostname:`, err.message);
    }
    return nodemailer.createTransport({
      host,
      port: 587,
      secure: false,
      requireTLS: true,
      tls: { servername: SMTP_HOST },
      auth: { user, pass }
    });
  })();
  return transporterPromise;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Never throws — a failed/unconfigured email must not break the request that
// triggered it (invite creation, assignment posting, etc). Callers that care
// whether it actually sent can check the returned `sent` flag.
async function sendEmail({ to, bcc, subject, html }) {
  try {
    if (process.env.BREVO_API_KEY) {
      await sendViaBrevo({ to, bcc, subject, html });
      return { sent: true };
    }
    const t = await getTransporter();
    if (!t) {
      console.warn(`[hibaru] (email skipped) "${subject}" -> ${to || (bcc || []).join(", ")}`);
      return { sent: false };
    }
    await t.sendMail({ from: `Project HIBARU <${senderAddress()}>`, to, bcc, subject, html });
    return { sent: true };
  } catch (err) {
    console.error("[hibaru] Failed to send email:", err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendEmail, escapeHtml, CLIENT_URL };
