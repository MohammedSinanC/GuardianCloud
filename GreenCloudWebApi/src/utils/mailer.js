import nodemailer from "nodemailer";

/**
 * Email utility. SMTP credentials come from environment variables —
 * never hard-coded. When SMTP is not configured the mailer logs the
 * attempt and reports success:false so callers can surface a clear error.
 *
 * Required env (optional in dev):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

function buildTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587", 10),
    secure: parseInt(SMTP_PORT || "587", 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Send an email, optionally with a PDF attachment.
 * @returns {Promise<{sent: boolean, error?: string}>}
 */
export async function sendMail({ to, subject, html, text, attachments = [] }) {
  const transport = buildTransport();
  if (!transport) {
    console.warn(`[mailer] SMTP not configured — email to ${to} skipped ("${subject}")`);
    return { sent: false, error: "SMTP is not configured on the server" };
  }
  try {
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, " "),
      attachments,
    });
    console.log(`[mailer] sent to ${to}: ${info.messageId}`);
    return { sent: true };
  } catch (err) {
    console.error(`[mailer] failed to send to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}
