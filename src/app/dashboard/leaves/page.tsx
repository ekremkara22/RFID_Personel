import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, Search } from "lucide-react";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { LeaveApprovalStatus, LeaveDurationType, LeaveType } from "@/generated/prisma/client";
import { can, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";
import ui from "../management.module.css";

const leaveTypeLabels: Record<LeaveType, string> = { ANNUAL: "Yıllık izin", EXCUSE: "Mazeret izni", UNPAID: "Ücretsiz izin", MEDICAL: "Sağlık raporu", ADMINISTRATIVE: "İdari izin", HOURLY: "Saatlik izin", HALF_DAY: "Yarım gün izin" };
const durationLabels: Record<LeaveDurationType, string> = { FULL_DAY: "Tam gün", HALF_DAY: "Yarım gün", HOURLY: "Saatlik" };
const statusLabels: Record<LeaveApprovalStatus, string> = { PENDING: "Bekliyor", APPROVED: "Onaylandı", REJECTED: "Reddedildi" };
function formatDate(date: Date) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeZone: "Europe/Istanbul" }).format(date); }

const columns: DataTableColumn[] = [
  { id: "employee", label: "Personel", valueKey: "employee", secondaryKey: "department", kind: "stack" },
  { id: "type", label: "İzin türü", valueKey: "type", secondaryKey: "duration", kind: "stack" },
  { id: "date", label: "Tarih", valueKey: "dateRange", kind: "text" },
  { id: "time", label: "Saat", valueKey: "timeRange", kind: "text" },
  { id: "status", label: "Durum", valueKey: "status", toneKey: "statusTone", kind: "status" },
  { id: "description", label: "Açıklama", valueKey: "description", kind: "text" },
  { id: "action", label: "İşlem", valueKey: "actionLabel", hrefKey: "actionHref", kind: "link", exportable: false },
];

export default async function LeavesPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user, authorization } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");
  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const leaves = await prisma.leaveRequest.findMany({ where: { companyId: user.companyId, employee: employeeScopeWhere(authorization) }, include: { employee: true }, orderBy: { startDate: "desc" }, take: 300 });
  const visibleLeaves = query ? leaves.filter((leave) => `${leave.employee.firstName} ${leave.employee.lastName} ${leave.description ?? ""}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"))) : leaves;
  const rows = visibleLeaves.map((leave) => ({
    id: leave.id,
    employee: `${leave.employee.firstName} ${leave.employee.lastName}`.trim(),
    department: leave.employee.department,
    type: leaveTypeLabels[leave.type],
    duration: durationLabels[leave.durationType],
    dateRange: `${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}`,
    timeRange: leave.startTime || leave.endTime ? `${leave.startTime ?? "—"} / ${leave.endTime ?? "—"}` : "—",
    status: statusLabels[leave.approvalStatus],
    statusTone: leave.approvalStatus === "APPROVED" ? "success" : leave.approvalStatus === "REJECTED" ? "danger" : "warning",
    description: leave.description ?? "—",
    actionLabel: "İncele",
    actionHref: `/dashboard/leaves/${leave.id}`,
  }));

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>İzin ve rapor yönetimi</p><h1 className={ui.pageTitle}>Personel İzinleri</h1><p className={ui.pageDescription}>İzin ve rapor kayıtlarını arayın, durumlarını inceleyin ve dışa aktarın.</p></div>{can(authorization, PERMISSIONS.LEAVE_CREATE) ? <div className={ui.headerActions}><Link href="/dashboard/leaves/new" className={ui.primaryAction}><CalendarPlus size={16} />İzin Ekle</Link></div> : null}</header>
      <section className={ui.surface}><form className={ui.filterBarWide}><label className={ui.field}><span className={ui.fieldLabel}>Personel veya açıklama ara</span><span className={ui.controlWrap}><Search className={ui.controlIcon} size={16} /><input className={`${ui.control} ${ui.controlWithIcon}`} name="q" defaultValue={query} placeholder="Ad, soyad veya açıklama" /></span></label><button type="submit" className={ui.filterButton}>Ara</button></form></section>
      <section className={ui.surface}><div className={ui.sectionHeading}><div><h2>İzin kayıtları</h2><p>Başlangıç tarihine göre en yeni kayıtlar</p></div><span className={ui.countBadge}>{visibleLeaves.length} kayıt</span></div><ReorderableDataTable rows={rows} columns={columns} storageKey="rfid-personel-columns-leaves-v2" filename="personel-izinleri" emptyMessage="Arama kriterlerine uygun izin kaydı bulunamadı." canExport={can(authorization, PERMISSIONS.REPORT_EXPORT)} minWidth={920} /></section>
    </div>
  );
}
