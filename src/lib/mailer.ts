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

/** Sends an automated system e-mail with the SMTP account configured in the environment. */
export async function sendSystemMail(mail: SystemMail) {
  const port = Number(requiredEnvironmentValue("SMTP_PORT"));
  if (!Number.isInteger(port) || port <= 0) throw new Error("Geçersiz e-posta yapılandırması: SMTP_PORT");

  const transporter = nodemailer.createTransport({
    host: requiredEnvironmentValue("SMTP_HOST"),
    port,
    secure: process.env.SMTP_SECURE?.trim().toLowerCase() === "true",
    auth: { user: requiredEnvironmentValue("SMTP_USER"), pass: requiredEnvironmentValue("SMTP_PASSWORD") },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  await transporter.sendMail({
    from: { name: process.env.MAIL_FROM_NAME?.trim() || "Flodeska", address: requiredEnvironmentValue("MAIL_FROM_ADDRESS") },
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}
