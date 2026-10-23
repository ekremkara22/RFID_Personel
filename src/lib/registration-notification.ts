import { escapeHtml, requiredEnvironmentValue, sendSystemMail } from "@/lib/mailer";

export type RegistrationNotificationUser = {
  id: number;
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  trialEndsAt: Date | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  dateStyle: "long",
  timeStyle: "medium",
});

export function buildRegistrationNotification(user: RegistrationNotificationUser) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const registeredAt = dateTimeFormatter.format(user.createdAt);
  const trialEndsAt = user.trialEndsAt ? dateTimeFormatter.format(user.trialEndsAt) : "Tanımlanmadı";
  const phone = user.phone || "Belirtilmedi";
  const subject = `Yeni Flodeska kaydı: ${fullName}`;
  const rows = [
    ["Kullanıcı numarası", String(user.id)],
    ["Ad soyad", fullName],
    ["Firma", user.companyName || "Belirtilmedi"],
    ["E-posta", user.email],
    ["Telefon", phone],
    ["Hesap türü", "Firma yöneticisi"],
    ["Kayıt zamanı", `${registeredAt} (Türkiye saati)`],
    ["Deneme bitişi", `${trialEndsAt} (Türkiye saati)`],
  ] as const;

  return {
    subject,
    text: ["Flodeska sistemine yeni bir kullanıcı kaydoldu.", "", ...rows.map(([label, value]) => `${label}: ${value}`)].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#182230;line-height:1.55">
        <h1 style="font-size:20px;margin:0 0 16px">Yeni kullanıcı kaydı</h1>
        <p style="margin:0 0 16px">Flodeska sistemine yeni bir kullanıcı kaydoldu.</p>
        <table style="border-collapse:collapse;width:100%;max-width:640px">
          <tbody>
            ${rows.map(([label, value]) => `<tr><th style="padding:9px 12px;text-align:left;border:1px solid #d0d5dd;background:#f9fafb">${escapeHtml(label)}</th><td style="padding:9px 12px;border:1px solid #d0d5dd">${escapeHtml(value)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    `.trim(),
  };
}

export async function sendRegistrationNotification(user: RegistrationNotificationUser) {
  const recipient = requiredEnvironmentValue("REGISTRATION_NOTIFICATION_TO");
  await sendSystemMail({ to: recipient, ...buildRegistrationNotification(user) });
}
