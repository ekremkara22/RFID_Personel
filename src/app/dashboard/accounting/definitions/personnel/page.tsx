import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePlus, Filter, Search } from "lucide-react";
import { can } from "@/lib/authorization";
import { MODULES } from "@/lib/module-catalog";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { SALARY_BASIS_LABELS, SALARY_INSURANCE_TYPE_LABELS } from "@/lib/personnel-profile";
import { requireSessionUser } from "@/lib/session";
import { listAccountingPersonnel } from "@/modules/accounting/repository";
import { hasPaidLicenseFor } from "@/modules/licensing/repository";
import { AccountingPersonnelImport } from "./personnel-import";
import ui from "../../../management.module.css";
import styles from "../../accounting.module.css";

const amount = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function AccountingPersonnelPage(props: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { authorization } = await requireSessionUser();
  if (!authorization.companyId || !can(authorization, PERMISSIONS.ACCOUNTING_SALARY_VIEW)) redirect("/dashboard/accounting");
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const status = searchParams.status === "passive" ? "passive" : searchParams.status === "all" ? undefined : "active";
  const personnel = await listAccountingPersonnel(authorization.companyId, { q: query || undefined, status });
  const canEdit = can(authorization, PERMISSIONS.ACCOUNTING_SALARY_CALCULATE);
  const importLocked = canEdit && !(await hasPaidLicenseFor(authorization, MODULES.ACCOUNTING));

  return (
    <div className={ui.managementPage}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Muhasebe · Sabit Tanımlar</p>
          <h1 className={ui.pageTitle}>Personel Tanımları</h1>
          <p className={ui.pageDescription}>Maaş hesaplama ve bütçe raporunda kullanılan muhasebe personeli. Bu liste İK modülündeki personel kayıtlarından bağımsızdır.</p>
        </div>
        {canEdit ? (
          <div className={ui.headerActions}>
            <AccountingPersonnelImport locked={importLocked} />
            <Link href="/dashboard/accounting/definitions/personnel/new" className={ui.primaryAction}><CirclePlus size={16} />Yeni Personel</Link>
          </div>
        ) : null}
      </header>

      <section className={ui.surface} aria-label="Personel filtreleri">
        <form className={ui.filterBar}>
          <label className={ui.field}><span className={ui.fieldLabel}>Personel ara</span><span className={ui.controlWrap}><Search className={ui.controlIcon} size={16} /><input className={`${ui.control} ${ui.controlWithIcon}`} name="q" defaultValue={query} placeholder="Ad, soyad veya sicil numarası" /></span></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Durum</span><select className={ui.control} name="status" defaultValue={searchParams.status ?? "active"}><option value="active">Aktif</option><option value="passive">Pasif</option><option value="all">Tümü</option></select></label>
          <button type="submit" className={ui.filterButton}><Filter size={15} />Filtrele</button>
        </form>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Personel listesi</h2><p>CSV sütunları: Ad Soyad; Departman; Pozisyon; Yaka; Çalışan Tipi; Maaş Tipi (Brüt / Net); Maaş.</p></div><span className={ui.countBadge}>{personnel.length} kayıt</span></div>
        <div className={ui.tableViewport}>
          <table className={ui.dataTable}>
            <thead><tr><th>Personel</th><th>Departman / Pozisyon</th><th>Yaka / Çalışan tipi</th><th className={styles.amountCell}>Aylık maaş</th><th>Durum</th><th>İşlem</th></tr></thead>
            <tbody>
              {personnel.length === 0 ? (
                <tr><td colSpan={6} className={ui.emptyCell}>Kayıt yok. &quot;Yeni Personel&quot; veya &quot;CSV&apos;den yükle&quot; ile ekleyebilirsiniz.</td></tr>
              ) : personnel.map((item) => (
                <tr key={item.id}>
                  <td><span className={ui.primaryText}>{item.firstName} {item.lastName}</span><span className={ui.secondaryText}>{item.registrationNumber ?? "Sicil yok"}</span></td>
                  <td><span className={ui.primaryText}>{item.department ?? "—"}</span><span className={ui.secondaryText}>{item.position ?? "—"}</span></td>
                  <td><span className={ui.primaryText}>{item.collarType ?? "—"}</span><span className={ui.secondaryText}>{SALARY_INSURANCE_TYPE_LABELS[item.insuranceType]}</span></td>
                  <td className={styles.amountCell}>{item.salaryAmount === null ? "—" : <><span className={ui.primaryText}>{amount.format(item.salaryAmount)} ₺</span><span className={ui.secondaryText}>{SALARY_BASIS_LABELS[item.salaryBasis]}</span></>}</td>
                  <td><span className={item.isActive ? ui.statusBadge : ui.statusNeutral}>{item.isActive ? "Aktif" : "Pasif"}</span></td>
                  <td><Link href={`/dashboard/accounting/definitions/personnel/${item.id}`} className={`${ui.rowAction} ${ui.compactAction}`}>{canEdit ? "Düzenle" : "İncele"}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
