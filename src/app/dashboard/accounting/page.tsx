import Link from "next/link";
import { Calculator, ChartColumn, Settings2 } from "lucide-react";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { getModuleCatalog } from "@/modules/module-definitions/repository";
import { MODULES } from "@/modules/registry";
import ui from "../management.module.css";
import styles from "./accounting.module.css";

export default async function AccountingPage() {
  const [{ authorization }, moduleCatalog] = await Promise.all([requireSessionUser(), getModuleCatalog()]);
  const moduleDefinition = moduleCatalog.find((item) => item.key === MODULES.ACCOUNTING)!;
  const canViewSalary = can(authorization, PERMISSIONS.ACCOUNTING_SALARY_VIEW);

  return (
    <div className={ui.managementPage}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Muhasebe modülü</p>
          <h1 className={ui.pageTitle}>{moduleDefinition.name}</h1>
          <p className={ui.pageDescription}>{moduleDefinition.description}</p>
        </div>
      </header>

      {canViewSalary ? (
        <section className={styles.moduleGrid}>
          <Link href="/dashboard/accounting/salary-calculation" className={styles.moduleCard}>
            <div>
              <p className={styles.cardEyebrow}>Maaş ve bordro</p>
              <h2>Maaş Hesaplama</h2>
              <p>Brütten nete, netten brüte ve yıllık işveren maliyeti hesaplarını Excel çalışma mantığıyla yürütün.</p>
            </div>
            <span className={styles.cardIcon}><Calculator size={20} /></span>
          </Link>
          <Link href="/dashboard/accounting/budget" className={styles.moduleCard}>
            <div>
              <p className={styles.cardEyebrow}>Yönetim raporu</p>
              <h2>Bütçe Raporu</h2>
              <p>Personel maaşlarından yıllık işveren maliyetini, departman/kategori dağılımını ve zam senaryolarını görün; PDF olarak paylaşın.</p>
            </div>
            <span className={styles.cardIcon}><ChartColumn size={20} /></span>
          </Link>
          <Link href="/dashboard/accounting/salary-calculation/settings" className={styles.moduleCard}>
            <div>
              <p className={styles.cardEyebrow}>2026 parametreleri</p>
              <h2>Sabit Tanımlar</h2>
              <p>Vergi dilimlerini, SGK oranlarını, taban/tavan değerlerini ve aylık istisnaları inceleyin.</p>
            </div>
            <span className={styles.cardIcon}><Settings2 size={20} /></span>
          </Link>
        </section>
      ) : (
        <section className={`${ui.surface} ${styles.emptyState}`}>
          <h2>Bu alan için görüntüleme yetkiniz bulunmuyor</h2>
          <p>Firma yöneticinizden Maaş Hesaplama görüntüleme yetkisi isteyebilirsiniz.</p>
        </section>
      )}
    </div>
  );
}

