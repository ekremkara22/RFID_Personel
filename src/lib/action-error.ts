/** Only explicitly public validation messages may leave the server. */
export class ActionError extends Error {}

export type ActionResult = { ok: boolean; message: string };

export function actionErrorMessage(error: unknown): string | null {
  if (error instanceof ActionError) return error.message;
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  switch (code) {
    case "P2002": return "Bu kullanıcı adı, e-posta veya kayıt zaten kullanılıyor. Lütfen farklı bir değer girin.";
    case "P2003": return "Bu kayıt başka kayıtlarla ilişkili olduğu için işlem tamamlanamadı. Önce bağlı kayıtları kontrol edin.";
    case "P2025": return "İşlem yapılacak kayıt bulunamadı veya başka bir kullanıcı tarafından değiştirildi. Sayfayı yenileyin.";
    case "P2021": case "P2022": return "Sunucunun veritabanı yapısı uygulamayla uyumlu değil. Sistem yöneticisinin veritabanı güncellemesini tamamlaması gerekiyor.";
    case "P2028": return "Veritabanı işlemi zamanında tamamlanamadığı için değişiklikler geri alındı. Lütfen tekrar deneyin.";
    case "P1001": case "P1002": case "P2024": return "Veritabanına şu anda ulaşılamıyor. Lütfen kısa bir süre sonra tekrar deneyin.";
    default: return null;
  }
}
