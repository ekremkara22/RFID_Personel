import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Calculator, CheckCircle2, ExternalLink, Factory, Mail, ShoppingCart, Users, type LucideIcon } from "lucide-react";
import { APP_TIME_ZONE } from "@/lib/app-time";
import { activeEntitlementKeys, isTrialActive, licenseState, trialDaysLeft } from "@/lib/module-license-policy";
import { requireSessionUser } from "@/lib/session";
import { MODULES } from "@/modules/registry";
import { getSessionLicense } from "@/modules/licensing/repository";
import { getModuleCatalog } from "@/modules/module-definitions/repository";
import pageStyles from "../page.module.css";
import ui from "../management.module.css";
import styles from "./store.module.css";

const moduleIcons: Record<string, LucideIcon> = {
  [MODULES.HR]: Users,
  [MODULES.PRODUCTION_PLANNING]: Factory,
  [MODULES.ACCOUNTING]: Calculator,
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: APP_TIME_ZONE }).format(date);
}

export default async function StorePage() {
  const { user, authorization } = await requireSessionUser();
  if (user.role === "SUPERADMIN") redirect("/dashboard/users");

  const [license, catalog] = await Promise.all([getSessionLicense(user.id, authorization.companyId), getModuleCatalog()]);
  if (!license) redirect("/login");

  // Evaluated once per request so every card agrees on the same moment.
  // eslint-disable-next-line react-hooks/purity
  const now = new Date(Date.now());
  const state = licenseState(license.holder, now);
  const trialActive = isTrialActive(license.holder, now);
  const daysLeft = trialDaysLeft(license.holder, now);
  const activeKeys = new Set(activeEntitlementKeys(license.holder, now));
  const entitlementByKey = new Map(license.holder.moduleEntitlements.map((item) => [item.moduleKey, item]));
  const hasCompany = !!authorization.companyId;
  const canCreateCompany = !hasCompany && user.role === "COMPANY_ADMIN" && (trialActive || activeKeys.size > 0);

  const stateBadge = state === "TRIAL"
    ? <span className={ui.statusWarning}><span className={ui.statusDot} />Deneme · {daysLeft} gün kaldı</span>
    : state === "LICENSED"
      ? <span className={ui.statusBadge}><span className={ui.statusDot} />Lisanslı</span>
      : state === "TRIAL_EXPIRED"
        ? <span className={ui.statusDanger}><span className={ui.statusDot} />Deneme süresi bitti</span>
        : <span className={ui.statusNeutral}><span className={ui.statusDot} />Lisans yok</span>;

  return (
    <div className={`${pageStyles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Hesabım</p>
          <h1 className={ui.pageTitle}>Modüller ve Lisanslar</h1>
          <p className={ui.pageDescription}>Modülleri inceleyin, deneme sürenizi takip edin ve ihtiyacınız olan modülü satın alın.</p>
        </div>
        <div className={ui.headerActions}>
          {stateBadge}
          {canCreateCompany ? <Link href="/dashboard/companies/new" className={ui.primaryAction}><Building2 size={16} />Firmanızı oluşturun</Link> : null}
        </div>
      </header>

      {state === "TRIAL" ? (
        <section className={ui.notice}>
          <h2>Ücretsiz deneme süreniz devam ediyor</h2>
          <p>
            Deneme süreniz <strong>{formatDate(license.holder.trialEndsAt!)}</strong> tarihinde sona erecek. Bu tarihe kadar tüm modüller açıktır.
            {" "}Süre bittiğinde satın alınmayan modüllere erişim kapanır; kayıtlarınız silinmez.
          </p>
          {canCreateCompany ? <p>Modülleri kullanmaya başlamak için önce firmanızı oluşturun.</p> : null}
        </section>
      ) : null}
      {state === "TRIAL_EXPIRED" ? (
        <section className={`${ui.notice} ${styles.noticeDanger}`}>
          <h2>Deneme süreniz sona erdi</h2>
          <p>Modüllere erişim kapatıldı. Kayıtlarınız korunuyor; bir modül lisansı satın aldığınızda kaldığınız yerden devam edebilirsiniz.</p>
        </section>
      ) : null}
      {state === "NO_LICENSE" ? (
        <section className={ui.notice}>
          <h2>Açık modül lisansı bulunmuyor</h2>
          <p>Aşağıdan bir modül satın alabilir veya lisans tanımlaması için bizimle iletişime geçebilirsiniz.</p>
        </section>
      ) : null}

      <section className={ui.surface} aria-labelledby="module-list-title">
        <div className={ui.sectionHeading}>
          <div>
            <h2 id="module-list-title">Modüller</h2>
            <p>Her modül ayrı lisanslanır. Satın alma işlemi Shopier güvenli ödeme sayfasında tamamlanır.</p>
          </div>
        </div>

        <div className={styles.moduleGrid}>
          {catalog.map((module) => {
            const Icon = moduleIcons[module.key] ?? ShoppingCart;
            const entitlement = entitlementByKey.get(module.key);
            const licensed = activeKeys.has(module.key);
            const status = licensed
              ? <span className={ui.statusBadge}>{entitlement?.expiresAt ? `Lisanslı · ${formatDate(entitlement.expiresAt)} tarihine kadar` : "Lisanslı"}</span>
              : trialActive
                ? <span className={ui.statusWarning}>Deneme ile açık</span>
                : <span className={ui.statusNeutral}>Kapalı</span>;
            return (
              <article key={module.key} className={styles.moduleCard}>
                <div className={styles.moduleHead}>
                  <span className={ui.navigationCardIcon}><Icon size={18} /></span>
                  <div className={styles.moduleTitle}>
                    <h3>{module.name}</h3>
                    {status}
                  </div>
                </div>
                <p className={styles.moduleDescription}>{module.description}</p>
                <ul className={styles.highlightList}>
                  {module.highlights.map((item) => <li key={item}><CheckCircle2 size={15} aria-hidden="true" />{item}</li>)}
                </ul>
                <div className={styles.moduleFooter}>
                  <span className={styles.price}>{module.priceLabel ?? "Fiyat için iletişime geçin"}</span>
                  {!license.isPrincipal ? (
                    <span className={styles.footerHint}>Satın alma işlemini firma sahibi yapar.</span>
                  ) : module.purchaseUrl ? (
                    <a href={module.purchaseUrl} target="_blank" rel="noopener noreferrer" className={ui.secondaryAction} aria-label={`${module.name} modülünü Shopier üzerinden satın al (yeni sekmede açılır)`}>
                      <ShoppingCart size={16} />{licensed ? "Süreyi uzat" : "Satın al"}<ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className={styles.footerHint}>Satış bağlantısı yakında eklenecek.</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {license.isPrincipal ? (
        <section className={ui.surface} aria-labelledby="purchase-steps-title">
          <div className={ui.sectionHeading}>
            <div>
              <h2 id="purchase-steps-title">Satın alma nasıl işler?</h2>
              <p>Ödemeniz onaylandıktan sonra lisansınız hesabınıza tanımlanır.</p>
            </div>
          </div>
          <ol className={styles.steps}>
            <li><strong>Modülü seçin</strong><span>&quot;Satın al&quot; butonu Shopier ödeme sayfasını yeni sekmede açar.</span></li>
            <li><strong>Hesap e-postanızı kullanın</strong><span>Siparişte <span className={styles.email}><Mail size={13} aria-hidden="true" />{license.holderEmail}</span> adresini girin; siparişiniz bu adresle hesabınıza eşleştirilir.</span></li>
            <li><strong>Lisansınız açılır</strong><span>Ödeme kontrol edildiğinde modül lisansınız tanımlanır ve bu sayfada &quot;Lisanslı&quot; olarak görünür.</span></li>
          </ol>
        </section>
      ) : null}
    </div>
  );
}
