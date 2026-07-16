const nodemailer = require("nodemailer");
const dns = require("dns").promises;

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const SMTP_HOST = "smtp.gmail.com";

let transporterPromise = null;
let warned = false;
function getTransporter() {
  if (transporterPromise) return transporterPromise;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;
  if (!user || !pass) {
    if (!warned) {
      console.warn("[hibaru] EMAIL_USER/EMAIL_APP_PASSWORD not set — invite/notification emails will be skipped (logged only). See .env.example.");
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
  const t = await getTransporter();
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
