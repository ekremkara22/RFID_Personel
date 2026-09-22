import { redirect } from "next/navigation";
import { Filter, History } from "lucide-react";
import { AttendanceAuditOperation, AttendanceType } from "@/generated/prisma/client";
import { ExportButton } from "@/app/dashboard/export-button";
import { getAccessibleCompanyIds } from "@/lib/access";
import { APP_TIME_ZONE, dateOnlyFromKey, getAppDayRange, getDateOnlyKey } from "@/lib/app-time";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

type SearchParams = {
  q?: string;
  companyId?: string;
  branch?: string;
  department?: string;
  operation?: string;
  from?: string;
  to?: string;
};

const attendanceLabels: Record<AttendanceType, string> = {
  ENTRY: "Giriş",
  EXIT: "Çıkış",
  BREAK_START: "Mola Çıkış",
  BREAK_END: "Mola Giriş",
  MEAL_START: "Yemek Çıkış",
  MEAL_END: "Yemek Giriş",
};

const operationLabels: Record<AttendanceAuditOperation, string> = {
  INSERT: "Ekleme",
  UPDATE: "Düzenleme",
  DELETE: "Silme",
};

function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = dateOnlyFromKey(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

function userName(user: { firstName: string | null; lastName: string | null; name: string | null; email: string }) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || user.email;
}

export default async function AuditReportPage(props: { searchParams?: Promise<SearchParams> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN") redirect("/dashboard");

  const accessibleCompanyIds = await getAccessibleCompanyIds(user);
  if (!accessibleCompanyIds || accessibleCompanyIds.length === 0) redirect("/dashboard");

  const params = (await props.searchParams) ?? {};
  const requestedCompanyId = Number(params.companyId);
  const selectedCompanyId = Number.isSafeInteger(requestedCompanyId) && accessibleCompanyIds.includes(requestedCompanyId)
    ? requestedCompanyId
    : null;
  const companyIds = selectedCompanyId ? [selectedCompanyId] : accessibleCompanyIds;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const branch = typeof params.branch === "string" ? params.branch.trim() : "";
  const department = typeof params.department === "string" ? params.department.trim() : "";
  const operation = Object.values(AttendanceAuditOperation).includes(params.operation as AttendanceAuditOperation)
    ? params.operation as AttendanceAuditOperation
    : null;
  const today = getAppDayRange(new Date()).dateOnly;
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  const fromDate = parseDate(params.from) ?? defaultFrom;
  const requestedTo = parseDate(params.to) ?? today;
  const toDate = requestedTo > today ? today : requestedTo;
  const toExclusive = new Date(toDate);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

  const employeeWhere = {
    companyId: { in: companyIds },
    ...(branch ? { branch } : {}),
    ...(department ? { department } : {}),
    ...(query ? { OR: [{ firstName: { contains: query } }, { lastName: { contains: query } }] } : {}),
  };

  const [companies, branches, departments, audits] = await Promise.all([
    prisma.company.findMany({ where: { id: { in: accessibleCompanyIds } }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { companyId: { in: companyIds }, isActive: true }, include: { company: true }, orderBy: [{ companyId: "asc" }, { name: "asc" }] }),
    prisma.department.findMany({ where: { companyId: { in: companyIds }, isActive: true }, orderBy: [{ companyId: "asc" }, { name: "asc" }] }),
    prisma.attendanceMovementAudit.findMany({
      where: {
        createdAt: { gte: getAppDayRange(getDateOnlyKey(fromDate)).start, lt: getAppDayRange(getDateOnlyKey(toExclusive)).start },
        ...(operation ? { operation } : {}),
        employee: employeeWhere,
      },
      include: { employee: { include: { company: true } }, changedBy: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);

  const exportRows = audits.map((audit) => ({
    operation: operationLabels[audit.operation],
    employee: `${audit.employee.firstName} ${audit.employee.lastName}`.trim(),
    company: audit.employee.company.name,
    branch: audit.employee.branch ?? "-",
    department: audit.employee.department,
    movementDateTime: formatDateTime(audit.movementDateTime),
    oldValue: audit.oldType ? `${attendanceLabels[audit.oldType]} / ${audit.oldScannedAt ? formatDateTime(audit.oldScannedAt) : "-"}` : "-",
    newValue: audit.newType ? `${attendanceLabels[audit.newType]} / ${audit.newScannedAt ? formatDateTime(audit.newScannedAt) : "-"}` : "-",
    changedBy: userName(audit.changedBy),
    changedAt: formatDateTime(audit.createdAt),
    reason: audit.correctionReason,
  }));

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Raporlar / Audit</p>
          <h1 className={styles.title}>Hareket Audit Raporu</h1>
          <p className={styles.subtitle}>Manuel ekleme, düzenleme ve silme işlemlerini kullanıcı, tarih ve değişen değerleriyle inceleyin.</p>
        </div>
        <div className={styles.heroMeta}>
          <ExportButton
            rows={exportRows}
            columns={[
              { key: "operation", label: "İşlem" }, { key: "employee", label: "Personel" },
              { key: "company", label: "Firma" }, { key: "branch", label: "Şube" },
              { key: "department", label: "Departman" }, { key: "movementDateTime", label: "Hareket Zamanı" },
              { key: "oldValue", label: "Eski Değer" }, { key: "newValue", label: "Yeni Değer" },
              { key: "changedBy", label: "İşlemi Yapan" }, { key: "changedAt", label: "İşlem Zamanı" },
              { key: "reason", label: "Açıklama" },
            ]}
            filename="hareket-audit-raporu"
            className={styles.primaryLinkButton}
          />
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form className={styles.filterGrid}>
          <label className={styles.field}><span>Personel</span><input name="q" defaultValue={query} placeholder="Ad veya soyad" /></label>
          <label className={styles.field}><span>Firma</span><select name="companyId" defaultValue={selectedCompanyId ?? ""}><option value="">Tüm Firmalar</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className={styles.field}><span>Şube</span><select name="branch" defaultValue={branch}><option value="">Tüm Şubeler</option>{branches.map((item) => <option key={item.id} value={item.name}>{item.company.name} / {item.name}</option>)}</select></label>
          <label className={styles.field}><span>Departman</span><select name="department" defaultValue={department}><option value="">Tüm Departmanlar</option>{departments.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label className={styles.field}><span>İşlem Türü</span><select name="operation" defaultValue={operation ?? ""}><option value="">Tüm İşlemler</option>{Object.values(AttendanceAuditOperation).map((item) => <option key={item} value={item}>{operationLabels[item]}</option>)}</select></label>
          <label className={styles.field}><span>Başlangıç</span><input name="from" type="date" defaultValue={getDateOnlyKey(fromDate)} max={getDateOnlyKey(today)} /></label>
          <label className={styles.field}><span>Bitiş</span><input name="to" type="date" defaultValue={getDateOnlyKey(toDate)} max={getDateOnlyKey(today)} /></label>
          <button type="submit" className={styles.primaryButton}><Filter size={16} /><span>Filtrele</span></button>
        </form>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}><div><p className={styles.sectionEyebrow}>Değişiklik geçmişi</p><h2 className={styles.sectionTitle}>Audit Kayıtları</h2></div><div className={styles.countPill}>{audits.length} kayıt</div></div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>İşlem</th><th>Personel / Firma</th><th>Hareket Zamanı</th><th>Eski Değer</th><th>Yeni Değer</th><th>İşlemi Yapan</th><th>İşlem Zamanı</th><th>Açıklama</th></tr></thead>
            <tbody>
              {audits.length === 0 ? <tr><td colSpan={8} className={styles.emptyCell}>Seçilen filtrelerde audit kaydı bulunamadı.</td></tr> : audits.map((audit) => (
                <tr key={audit.id}>
                  <td><strong>{operationLabels[audit.operation]}</strong></td>
                  <td><strong>{audit.employee.firstName} {audit.employee.lastName}</strong><p className={styles.tableSubText}>{audit.employee.company.name} · {audit.employee.branch ?? "Şubesiz"} · {audit.employee.department}</p></td>
                  <td>{formatDateTime(audit.movementDateTime)}</td>
                  <td>{audit.oldType ? attendanceLabels[audit.oldType] : "-"}<p className={styles.tableSubText}>{audit.oldScannedAt ? formatDateTime(audit.oldScannedAt) : "-"}</p></td>
                  <td>{audit.newType ? attendanceLabels[audit.newType] : "-"}<p className={styles.tableSubText}>{audit.newScannedAt ? formatDateTime(audit.newScannedAt) : "-"}</p></td>
                  <td>{userName(audit.changedBy)}</td>
                  <td>{formatDateTime(audit.createdAt)}</td>
                  <td>{audit.correctionReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.helperText}><History size={15} /> En fazla 1.000 kayıt gösterilir. Tam listeyi almak için tarih aralığını daraltabilirsiniz.</p>
      </section>
    </div>
  );
}
