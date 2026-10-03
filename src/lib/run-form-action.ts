import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { actionErrorMessage, type ActionResult } from "./action-error";

export async function runFormAction(operation: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await operation();
    return { ok: true, message: "Değişiklikler kaydedildi." };
  } catch (error) {
    unstable_rethrow(error);
    const message = actionErrorMessage(error);
    if (message) return { ok: false, message };
    const reference = randomUUID();
    console.error(`[form-action:${reference}]`, error);
    return { ok: false, message: `İşlem sunucu hatası nedeniyle tamamlanamadı. Tekrar denemeden önce kayıt durumunu kontrol edin. Hata kodu: ${reference}` };
  }
}
