import { redirect } from "next/navigation";
import { Filter, History } from "lucide-react";
import { AttendanceAuditOperation } from "@/generated/prisma/client";
import { ATTENDANCE_TYPE_LABELS } from "@/lib/attendance-labels";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { assertPermission, can, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { APP_TIME_ZONE, dateOnlyFromKey, getAppDayRange, getDateOnlyKey } from "@/lib/app-time";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import ui from "../../management.module.css";
import rs from "../reports.module.css";

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
  const { authorization } = await requireSessionUser();
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

  const columns: DataTableColumn[] = [
    { id: "operation", label: "İşlem", valueKey: "operation", toneKey: "tone", kind: "status" },
    { id: "employee", label: "Personel", valueKey: "employee", secondaryKey: "organization", kind: "person" },
    { id: "movementDateTime", label: "Hareket zamanı", valueKey: "movementDateTime" },
    { id: "oldValue", label: "Eski değer", valueKey: "oldValue" },
    { id: "newValue", label: "Yeni değer", valueKey: "newValue" },
    { id: "changedBy", label: "İşlemi yapan", valueKey: "changedBy", secondaryKey: "changedAt", kind: "stack" },
    { id: "reason", label: "Açıklama", valueKey: "reason" },
  ];
  const tableRows = audits.map((audit, index) => ({
    ...exportRows[index],
    id: audit.id,
    organization: `${audit.employee.branch ?? "Şubesiz"} · ${audit.employee.department}`,
    tone: audit.operation === "DELETE" ? "danger" : audit.operation === "INSERT" ? "success" : "warning",
  }));

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Raporlar / Audit</p>
          <h1 className={ui.pageTitle}>Audit Raporu</h1>
          <p className={ui.pageDescription}>Manuel ve otomatik hareket değişikliklerini işlemi yapan, tarih, eski/yeni değer ve gerekçesiyle inceleyin.</p>
        </div>
      </header>

      <section className={ui.surface} aria-label="Audit filtreleri">
        <form className={rs.filterBar}>
          <label className={ui.field}><span className={ui.fieldLabel}>Personel</span><input className={ui.control} name="q" defaultValue={query} placeholder="Ad veya soyad" /></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Şube</span><select className={ui.control} name="branch" defaultValue={branch}><option value="">Tüm şubeler</option>{branches.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Departman</span><select className={ui.control} name="department" defaultValue={department}><option value="">Tüm departmanlar</option>{departments.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>İşlem türü</span><select className={ui.control} name="operation" defaultValue={operation ?? ""}><option value="">Tüm işlemler</option>{Object.values(AttendanceAuditOperation).map((item) => <option key={item} value={item}>{operationLabels[item]}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Başlangıç</span><input className={ui.control} name="from" type="date" defaultValue={getDateOnlyKey(fromDate)} max={getDateOnlyKey(today)} /></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Bitiş</span><input className={ui.control} name="to" type="date" defaultValue={getDateOnlyKey(toDate)} max={getDateOnlyKey(today)} /></label>
          <button type="submit" className={ui.filterButton}><Filter size={15} />Göster</button>
        </form>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Değişiklik geçmişi</h2><p>{companies[0]?.name ?? ""} · en fazla 1.000 kayıt gösterilir; tam liste için tarih aralığını daraltın.</p></div><span className={ui.countBadge}>{audits.length} kayıt</span></div>
        <ReorderableDataTable rows={tableRows} columns={columns} storageKey="reports.audit.columns" filename="hareket-audit-raporu" emptyMessage="Seçilen filtrelerde audit kaydı bulunamadı." canExport={can(authorization, PERMISSIONS.REPORT_EXPORT)} minWidth={1100} />
        <p className={ui.tableHint} style={{ marginTop: 10 }}><History size={14} /> Sistem kayıtları otomatik kesinleştirme ve demo okutmalardan gelir.</p>
      </section>
    </div>
  );
}
