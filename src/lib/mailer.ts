import nodemailer from "nodemailer";

export type SystemMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export function requiredEnvironmentValue(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Eksik e-posta yapılandırması: ${key}`);
  return value;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * "report": in-app reports and internal notifications (SMTP_USER / MAIL_FROM_ADDRESS).
 * "account": customer-facing mail such as verification, password reset and announcements
 * (ACCOUNT_SMTP_USER / ACCOUNT_SMTP_PASSWORD / ACCOUNT_MAIL_FROM_ADDRESS, same SMTP host).
 */
export type MailSender = "report" | "account";

function senderCredentials(sender: MailSender) {
  // Until the account mailbox is configured, customer mail falls back to the report account.
  const prefix = sender === "account" && process.env.ACCOUNT_SMTP_USER?.trim() ? "ACCOUNT_" : "";
  return {
    user: requiredEnvironmentValue(`${prefix}SMTP_USER`),
    pass: requiredEnvironmentValue(`${prefix}SMTP_PASSWORD`),
    from: requiredEnvironmentValue(`${prefix}MAIL_FROM_ADDRESS`),
  };
}

/** Sends an automated system e-mail with the SMTP account configured for the given sender. */
export async function sendSystemMail(mail: SystemMail, sender: MailSender = "report") {
  const port = Number(requiredEnvironmentValue("SMTP_PORT"));
  if (!Number.isInteger(port) || port <= 0) throw new Error("Geçersiz e-posta yapılandırması: SMTP_PORT");
  const credentials = senderCredentials(sender);

  const transporter = nodemailer.createTransport({
    host: requiredEnvironmentValue("SMTP_HOST"),
    port,
    secure: process.env.SMTP_SECURE?.trim().toLowerCase() === "true",
    auth: { user: credentials.user, pass: credentials.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  await transporter.sendMail({
    from: { name: process.env.MAIL_FROM_NAME?.trim() || "Flodeska", address: credentials.from },
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}