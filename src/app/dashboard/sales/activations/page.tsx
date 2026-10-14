import Link from "next/link";
import { CheckCircle2, CircleSlash } from "lucide-react";

import { ActionForm } from "@/app/dashboard/action-form";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { activatePendingLicenseAction, ignorePendingLicenseAction } from "@/modules/commerce/actions";
import { durationLabel, licenseStatusLabel } from "@/modules/commerce/labels";
import { listLicenseQueue } from "@/modules/commerce/repository";
import { createModuleNameMap, getModuleCatalog } from "@/modules/module-definitions/repository";
import { Badge, formatDateTime, formatMoney, requireSalesAdmin, SalesPageHeader } from "../sales-shared";
import ui from "../../management.module.css";

function personName(user: { firstName: string | null; lastName: string | null; name: string | null; email: string }) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || user.email;
}

export default async function SalesActivationsPage() {
  await requireSalesAdmin();
  const [queue, catalog] = await Promise.all([listLicenseQueue(), getModuleCatalog()]);
  const moduleNames = createModuleNameMap(catalog);
  const pending = queue.filter((item) => item.status === "PENDING_MATCH");
  const refunded = queue.filter((item) => item.status === "REFUNDED");

  return (
    <div className={ui.managementPage}>
      <SalesPageHeader title="Lisans Kuyruğu" description="Alıcı e-postası bir hesapla eşleşmeyen ve iade edilen lisanslar için karar verin." />

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div><h2>Eşleşme bekleyenler</h2><p>Alıcı aynı e-postayla kayıt olduğunda lisans otomatik açılır. Farklı bir hesaba vermek için kullanıcının e-postasını girin.</p></div>
          <span className={ui.countBadge}>{pending.length} kayıt</span>
        </div>
        {pending.length === 0 ? <p className={ui.emptyState}>Eşleşme bekleyen lisans yok.</p> : (
          <div className={ui.reviewList}>
            {pending.map((item) => {
              const status = licenseStatusLabel(item.status);
              const moduleName = moduleNames.get(item.moduleKey) ?? "Tanımsız modül";
              return (
                <article key={item.id} className={ui.reviewCard}>
                  <div className={ui.reviewCardHeader}>
                    <div>
                      <h3>{moduleName} · {durationLabel(item.durationDays, item.quantity)}</h3>
                      <p>Sipariş {item.order.shopierOrderId} · {formatDateTime(item.order.orderedAt)} · {formatMoney(item.order.total, item.order.currency)}</p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <dl className={ui.detailList}>
                    <div className={ui.detailRow}><dt>Alıcı</dt><dd>{item.order.buyerName ?? "İsimsiz alıcı"} · {item.order.buyerEmail ?? "E-posta yok"}</dd></div>
                    {item.note ? <div className={ui.detailRow}><dt>Not</dt><dd>{item.note}</dd></div> : null}
                  </dl>
                  <div className={ui.reviewCardFooter}>
                    <ActionForm action={activatePendingLicenseAction} className={ui.reviewForm}>
                      <input type="hidden" name="licenseId" value={item.id} />
                      <label className={ui.srOnly} htmlFor={`activate-email-${item.id}`}>Lisansın verileceği kullanıcı e-postası</label>
                      <input id={`activate-email-${item.id}`} name="email" type="email" required maxLength={191} defaultValue={item.order.buyerEmail ?? ""} placeholder="kullanici@firma.com" />
                      <SubmitButton idleLabel="Aktive et" pendingLabel="Aktive ediliyor..." className={ui.rowAction} icon={<CheckCircle2 size={15} />} />
                    </ActionForm>
                    <ActionForm action={ignorePendingLicenseAction} className={ui.reviewForm}>
                      <input type="hidden" name="licenseId" value={item.id} />
                      <label className={ui.srOnly} htmlFor={`ignore-note-${item.id}`}>Yok sayma notu</label>
                      <input id={`ignore-note-${item.id}`} name="note" maxLength={500} placeholder="Not (isteğe bağlı)" />
                      <SubmitButton idleLabel="Yok say" pendingLabel="Kaydediliyor..." className={ui.rowAction} icon={<CircleSlash size={15} />} />
                    </ActionForm>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}>
          <div><h2>İade edilenler</h2><p>Tam iadesi tamamlanan siparişlerin lisansları otomatik kapatılmaz. Gerekirse kullanıcı detayından lisansı düzenleyin.</p></div>
          <span className={ui.countBadge}>{refunded.length} kayıt</span>
        </div>
        {refunded.length === 0 ? <p className={ui.emptyState}>İade edilen lisans yok.</p> : (
          <div className={ui.reviewList}>
            {refunded.map((item) => {
              const status = licenseStatusLabel(item.status);
              return (
                <article key={item.id} className={ui.reviewCard}>
                  <div className={ui.reviewCardHeader}>
                    <div>
                      <h3>{moduleNames.get(item.moduleKey) ?? "Tanımsız modül"} · {durationLabel(item.durationDays, item.quantity)}</h3>
                      <p>Sipariş {item.order.shopierOrderId} · {formatDateTime(item.order.orderedAt)} · {formatMoney(item.order.total, item.order.currency)}</p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <dl className={ui.detailList}>
                    <div className={ui.detailRow}><dt>Alıcı</dt><dd>{item.order.buyerName ?? "İsimsiz alıcı"} · {item.order.buyerEmail ?? "E-posta yok"}</dd></div>
                    <div className={ui.detailRow}><dt>Lisans sahibi</dt><dd>{item.user ? <Link className={ui.rowAction} href={`/dashboard/users/${item.user.id}`}>{personName(item.user)}</Link> : "Lisans açılmamıştı"}</dd></div>
                    {item.activatedAt ? <div className={ui.detailRow}><dt>Açılış tarihi</dt><dd>{formatDateTime(item.activatedAt)}</dd></div> : null}
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
