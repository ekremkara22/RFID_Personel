import { redirect } from "next/navigation";
import { Filter, History } from "lucide-react";
import { AttendanceAuditOperation } from "@/generated/prisma/client";
import { ATTENDANCE_TYPE_LABELS } from "@/lib/attendance-labels";
import { ExportButton } from "@/app/dashboard/export-button";
import { assertPermission, can, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { APP_TIME_ZONE, dateOnlyFromKey, getAppDayRange, getDateOnlyKey } from "@/lib/app-time";
import { queryRepository } from "@/modules/shared/query-repository";
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

function userName(user: { firstName: string | null; lastName: string | null; name: string | null; email: string } | null) {
  if (!user) return "Sistem";
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || user.email;
}

export default async function AuditReportPage(props: { searchParams?: Promise<SearchParams> }) {
  const { user, authorization } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN") redirect("/dashboard");
  assertPermission(authorization, PERMISSIONS.AUDIT_VIEW);
  if (!authorization.companyId) redirect("/dashboard");

  const params = (await props.searchParams) ?? {};
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
    ...employeeScopeWhere(authorization),
    ...(branch ? { branch } : {}),
    ...(department ? { department } : {}),
    ...(query ? { OR: [{ firstName: { contains: query } }, { lastName: { contains: query } }] } : {}),
  };

  const [companies, branches, departments, audits] = await Promise.all([
    queryRepository.company.findMany({ where: { id: authorization.companyId }, orderBy: { name: "asc" } }),
    queryRepository.branch.findMany({ where: { companyId: authorization.companyId, isActive: true }, include: { company: true }, orderBy: { name: "asc" } }),
    queryRepository.department.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" } }),
    queryRepository.attendanceMovementAudit.findMany({
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
    oldValue: audit.oldType ? `${ATTENDANCE_TYPE_LABELS[audit.oldType]} / ${audit.oldScannedAt ? formatDateTime(audit.oldScannedAt) : "-"}` : "-",
    newValue: audit.newType ? `${ATTENDANCE_TYPE_LABELS[audit.newType]} / ${audit.newScannedAt ? formatDateTime(audit.newScannedAt) : "-"}` : "-",
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
          <p className={styles.subtitle}>Manuel ve otomatik hareket değişikliklerini aktör, tarih, eski/yeni değer ve gerekçesiyle inceleyin.</p>
        </div>
        <div className={styles.heroMeta}>
          {can(authorization, PERMISSIONS.REPORT_EXPORT) ? <ExportButton
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
          /> : null}
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form className={styles.filterGrid}>
          <label className={styles.field}><span>Personel</span><input name="q" defaultValue={query} placeholder="Ad veya soyad" /></label>
          <label className={styles.field}><span>Firma</span><input value={companies[0]?.name ?? ""} readOnly /></label>
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
                  <td>{audit.oldType ? ATTENDANCE_TYPE_LABELS[audit.oldType] : "-"}<p className={styles.tableSubText}>{audit.oldScannedAt ? formatDateTime(audit.oldScannedAt) : "-"}</p></td>
                  <td>{audit.newType ? ATTENDANCE_TYPE_LABELS[audit.newType] : "-"}<p className={styles.tableSubText}>{audit.newScannedAt ? formatDateTime(audit.newScannedAt) : "-"}</p></td>
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
