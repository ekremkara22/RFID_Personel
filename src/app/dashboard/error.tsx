"use client";

import ui from "./management.module.css";

export default function DashboardError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <section className={`${ui.surface} ${ui.managementPage}`} role="alert">
    <h1 className={ui.pageTitle}>Sayfa yüklenemedi</h1>
    <p>Sunucu bu sayfayı hazırlarken bir sorun oluştu. Sayfayı yeniden yükleyin. Sorun devam ederse aşağıdaki hata kodunu sistem yöneticisine iletin.</p>
    <p className={ui.helpText}>Hata kodu: {error.digest ?? "Kullanılamıyor"}</p>
    <div className={ui.formActions}><a href="/dashboard" className={ui.secondaryAction}>Panele dön</a><button type="button" className={ui.primaryAction} onClick={() => unstable_retry()}>Yeniden dene</button></div>
  </section>;
}
