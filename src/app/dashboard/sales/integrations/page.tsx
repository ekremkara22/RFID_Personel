import { headers } from "next/headers";
import { KeyRound, PlugZap, Share2, Webhook } from "lucide-react";

import { ActionForm } from "@/app/dashboard/action-form";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { saveShopierTokenAction, setupShopierWebhooksAction, testShopierConnectionAction } from "@/modules/commerce/actions";
import { webhookEventLabel } from "@/modules/commerce/labels";
import { getShopierIntegrationOverview, SHOPIER_WEBHOOK_PATH } from "@/modules/commerce/repository";
import { Badge, formatDateTime, requireSalesAdmin, SalesPageHeader } from "../sales-shared";
import ui from "../../management.module.css";

/** Application origin for the webhook URL: APP_URL when set, otherwise the current request host. */
async function defaultAppUrl(configured: string | null) {
  if (configured) return configured;
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host");
  return host ? `https://${host.split(",")[0].trim()}` : "";
}

export default async function SalesIntegrationsPage() {
  await requireSalesAdmin();
  const overview = await getShopierIntegrationOverview();
  const appUrl = await defaultAppUrl(overview.appUrl);
  const webhooksReady = overview.webhooks.every((item) => item.configured);

  return (
    <div className={ui.managementPage}>
      <SalesPageHeader title="Entegrasyonlar" description="Shopier mağaza bağlantısını, sipariş bildirimlerini ve ileride sosyal medya hesaplarını buradan yönetin." />

      {!overview.encryptionReady ? (
        <div className={ui.notice} role="alert">
          Sunucuda <strong>INTEGRATION_ENCRYPTION_KEY</strong> tanımlı değil veya geçersiz. Anahtarlar şifrelenmeden kaydedilemeyeceği için sistem yöneticisinin bu ortam değişkenini tanımlaması gerekiyor.
        </div>
      ) : null}

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div>
            <h2><KeyRound size={16} /> Shopier API anahtarı</h2>
            <p>Shopier panelinde oluşturduğunuz Personal Access Token. Anahtar şifreli saklanır ve bir daha gösterilmez.</p>
          </div>
          {overview.apiToken.configured ? <Badge tone="success">Tanımlı</Badge> : <Badge tone="warning">Tanımlı değil</Badge>}
        </div>
        <div className={ui.stack}>
        <dl className={ui.detailList}>
          <div className={ui.detailRow}><dt>Kayıtlı anahtar</dt><dd>{overview.apiToken.configured ? <span className={ui.monoText}>{overview.apiToken.last4 ? `•••• ${overview.apiToken.last4}` : "••••"}</span> : "Henüz anahtar girilmedi"}</dd></div>
          <div className={ui.detailRow}><dt>Son güncelleme</dt><dd>{formatDateTime(overview.apiToken.updatedAt)}</dd></div>
        </dl>
        <ActionForm action={saveShopierTokenAction} className={ui.formShell}>
          <div className={ui.formGrid}>
            <label className={`${ui.formField} ${ui.formFullWidth}`}>
              <span>{overview.apiToken.configured ? "Yeni API anahtarı" : "API anahtarı"}</span>
              <input name="token" type="password" autoComplete="off" spellCheck={false} required minLength={20} maxLength={4000} placeholder="Shopier → Hesabım → API erişimi bölümündeki anahtar" />
            </label>
          </div>
          <div className={ui.formActions}>
            <SubmitButton idleLabel={overview.apiToken.configured ? "Anahtarı değiştir" : "Anahtarı kaydet"} pendingLabel="Doğrulanıyor..." className={ui.primaryAction} />
          </div>
        </ActionForm>
        {overview.apiToken.configured ? (
          <ActionForm action={testShopierConnectionAction} className={ui.formActions}>
            <SubmitButton idleLabel="Bağlantıyı test et" pendingLabel="Test ediliyor..." className={ui.secondaryAction} icon={<PlugZap size={15} />} />
          </ActionForm>
        ) : null}
        </div>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div>
            <h2><Webhook size={16} /> Sipariş bildirimleri (webhook)</h2>
            <p>Shopier yeni sipariş ve iade olaylarını anında bildirir; ödenen dijital siparişler lisansa dönüşür.</p>
          </div>
          {webhooksReady ? <Badge tone="success">Kurulu</Badge> : <Badge tone="warning">Kurulum gerekli</Badge>}
        </div>
        <div className={ui.stack}>
        <dl className={ui.detailList}>
          {overview.webhooks.map((item) => (
            <div key={item.event} className={ui.detailRow}>
              <dt>{webhookEventLabel(item.event)}</dt>
              <dd>{item.configured ? <Badge tone="success">Abone · {formatDateTime(item.updatedAt)}</Badge> : <Badge tone="neutral">Abonelik yok</Badge>}</dd>
            </div>
          ))}
        </dl>
        <ActionForm action={setupShopierWebhooksAction} className={ui.formShell}>
          <div className={ui.formGrid}>
            <label className={`${ui.formField} ${ui.formFullWidth}`}>
              <span>Uygulama adresi</span>
              <input name="appUrl" type="url" inputMode="url" required defaultValue={appUrl} placeholder="https://flodeska.com" />
              <small className={ui.helpText}>Bildirimler <span className={ui.monoText}>{SHOPIER_WEBHOOK_PATH}</span> adresine gönderilir. Bu ortamın daha önce kurduğu abonelikler silinip yeniden oluşturulur.</small>
            </label>
            <label className={`${ui.checkField} ${ui.formFullWidth}`}>
              <input name="replaceOthers" type="checkbox" />
              Diğer adreslerdeki aynı olay aboneliklerini de kaldır (ör. test ortamı; o ortam artık bildirim almaz)
            </label>
          </div>
          <div className={ui.formActions}>
            <SubmitButton idleLabel={webhooksReady ? "Webhook'ları yeniden kur" : "Webhook'ları kur"} pendingLabel="Kuruluyor..." className={ui.secondaryAction} disabled={!overview.apiToken.configured} />
          </div>
        </ActionForm>
        {!overview.apiToken.configured ? <p className={ui.helpText}>Webhook kurmak için önce API anahtarını kaydedin.</p> : null}
        </div>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div>
            <h2><Share2 size={16} /> Sosyal medya hesapları</h2>
            <p>Instagram ve TikTok işletme hesaplarının bağlanması ve planlı paylaşım.</p>
          </div>
          <Badge tone="neutral">Yakında</Badge>
        </div>
        <p className={ui.emptyState}>Bu bölüm sonraki fazda açılacak. Hesap bilgileri de Shopier anahtarı gibi şifreli saklanacak.</p>
      </section>
    </div>
  );
}
