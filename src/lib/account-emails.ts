import { createHash, randomBytes } from "node:crypto";
import { escapeHtml } from "@/lib/mailer";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

/** Raw token goes only into the e-mail link; the database keeps its SHA-256 hash. */
export function generateEmailToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashEmailToken(token) };
}

export function hashEmailToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function accountLink(appUrl: string, path: string, token: string) {
  const url = new URL(path, appUrl.endsWith("/") ? appUrl : `${appUrl}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

function buildActionMail(options: { subject: string; greetingName: string; intro: string; action: string; link: string; note: string }) {
  const greeting = `Merhaba ${options.greetingName},`;
  return {
    subject: options.subject,
    text: [greeting, "", options.intro, "", `${options.action}: ${options.link}`, "", options.note, "", "Flodeska"].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#182230;line-height:1.55;max-width:560px">
        <p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
        <p style="margin:0 0 20px">${escapeHtml(options.intro)}</p>
        <p style="margin:0 0 20px"><a href="${escapeHtml(options.link)}" style="display:inline-block;padding:10px 18px;border-radius:6px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600">${escapeHtml(options.action)}</a></p>
        <p style="margin:0 0 12px;font-size:13px;color:#475467">Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br><span style="word-break:break-all">${escapeHtml(options.link)}</span></p>
        <p style="margin:0;font-size:13px;color:#475467">${escapeHtml(options.note)}</p>
      </div>
    `.trim(),
  };
}

export function buildVerificationEmail(name: string, link: string) {
  return buildActionMail({
    subject: "Flodeska e-posta adresinizi doğrulayın",
    greetingName: name,
    intro: "Flodeska hesabınızı etkinleştirmek için e-posta adresinizi doğrulayın.",
    action: "E-postamı doğrula",
    link,
    note: "Bağlantı 24 saat geçerlidir. Bu kaydı siz yapmadıysanız bu e-postayı yok sayabilirsiniz.",
  });
}

export function buildPasswordResetEmail(name: string, link: string) {
  return buildActionMail({
    subject: "Flodeska şifre sıfırlama",
    greetingName: name,
    intro: "Flodeska hesabınız için şifre sıfırlama talebi aldık.",
    action: "Yeni şifre belirle",
    link,
    note: "Bağlantı 1 saat geçerlidir ve yalnız bir kez kullanılabilir. Bu talebi siz yapmadıysanız şifreniz değişmez; bu e-postayı yok sayabilirsiniz.",
  });
}
