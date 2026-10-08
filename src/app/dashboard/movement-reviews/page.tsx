import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Filter, PlusCircle } from "lucide-react";
import { resolveAttendanceReviewAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { ATTENDANCE_TYPE_LABELS } from "@/lib/attendance-labels";
import { buildAttendanceReviewCases } from "@/lib/attendance-review";
import { employeeScopeWhere } from "@/lib/authorization";
import { getAppDayKey, getAppDayRange } from "@/lib/app-time";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";
import ui from "../management.module.css";

function formatDate(date?: Date | null) { return date ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(date) : "—"; }

export default async function MovementReviewsPage(props: { searchParams: Promise<{ from?: string; to?: string; companyId?: string; branch?: string; department?: string; status?: string }> }) {
  const { user, authorization } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !authorization.companyId) redirect("/dashboard");
  const params = await props.searchParams;
  const todayKey = getAppDayKey(new Date());
  const defaultFrom = new Date(getAppDayRange(todayKey).start.getTime() - 13 * 86400000);
  const fromKey = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from! : getAppDayKey(defaultFrom);
  const toKey = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to! : todayKey;
  const from = getAppDayRange(fromKey).start;
  const to = getAppDayRange(toKey).end;
  const branch = params.branch?.trim() ?? "";
  const department = params.department?.trim() ?? "";
  const status = ["open", "resolved", "all"].includes(params.status ?? "") ? params.status! : "open";

  const [companies, branches, departments, logs, resolutions] = await Promise.all([
    queryRepository.company.findMany({ where: { id: authorization.companyId }, orderBy: { name: "asc" } }),
    queryRepository.branch.findMany({ where: { companyId: authorization.companyId, isActive: true }, include: { company: true }, orderBy: { name: "asc" } }),
    queryRepository.department.findMany({ where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" } }),
    queryRepository.attendanceLog.findMany({ where: { scannedAt: { gte: from, lt: to }, employee: { ...employeeScopeWhere(authorization), ...(branch ? { branch } : {}), ...(department ? { department } : {}) } }, include: { employee: true }, orderBy: [{ scannedAt: "asc" }, { id: "asc" }], take: 5000 }),
    queryRepository.attendanceReviewResolution.findMany({ where: { workDate: { gte: from, lt: to }, employee: { ...employeeScopeWhere(authorization), ...(branch ? { branch } : {}), ...(department ? { department } : {}) } }, include: { resolvedBy: true } }),
  ]);
  const companyById = new Map(companies.map((company) => [company.id, company.name]));
  const resolutionByFingerprint = new Map(resolutions.map((item) => [item.fingerprint, item]));
  const cases = buildAttendanceReviewCases(logs).filter((item) => { const resolved = resolutionByFingerprint.has(item.fingerprint); return status === "all" || (status === "resolved" ? resolved : !resolved); });
  const query = new URLSearchParams({ from: fromKey, to: toKey, ...(params.companyId ? { companyId: params.companyId } : {}), ...(branch ? { branch } : {}), ...(department ? { department } : {}), status }).toString();
  const returnTo = `/dashboard/movement-reviews?${query}`;

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>Hareket kontrolü</p><h1 className={ui.pageTitle}>İncelenecek Hareketler</h1><p className={ui.pageDescription}>Eksik çıkış, eşleşmeyen mola ve gecikmeli cihaz kayıtlarını kişi ve gün bazında çözün.</p></div></header>

      <section className={ui.surface} aria-label="İnceleme filtreleri">
        <form className={ui.formGridThree}>
          <label className={ui.field}><span className={ui.fieldLabel}>Başlangıç</span><input className={ui.control} type="date" name="from" defaultValue={fromKey} /></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Bitiş</span><input className={ui.control} type="date" name="to" defaultValue={toKey} max={todayKey} /></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Firma</span><select className={ui.control} name="companyId" defaultValue={params.companyId ?? ""}><option value="">Tüm firmalar</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Şube</span><select className={ui.control} name="branch" defaultValue={branch}><option value="">Tüm şubeler</option>{branches.map((item) => <option key={item.id} value={item.name}>{item.company.name} / {item.name}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Departman</span><select className={ui.control} name="department" defaultValue={department}><option value="">Tüm departmanlar</option>{departments.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Kontrol durumu</span><select className={ui.control} name="status" defaultValue={status}><option value="open">Açık</option><option value="resolved">İncelendi</option><option value="all">Tümü</option></select></label>
          <button className={ui.filterButton} type="submit"><Filter size={15} />Göster</button>
        </form>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Kişi / gün bazlı sorunlar</h2><p>Hareket ayrıntısına girerek düzeltme veya silme yapabilirsiniz.</p></div><span className={ui.countBadge}>{cases.length} kayıt</span></div>
        {cases.length === 0 ? <p className={ui.emptyCell}>Seçilen filtrelerde kontrol gerektiren hareket bulunamadı.</p> : <div className={ui.reviewList}>{cases.map((item) => {
          const resolution = resolutionByFingerprint.get(item.fingerprint);
          return <article key={item.fingerprint} className={ui.reviewCard}>
            <div className={ui.reviewCardHeader}><div><h3>{item.employee.firstName} {item.employee.lastName}</h3><p>{companyById.get(item.employee.companyId)} · {item.employee.branch ?? "Şubesiz"} · {item.employee.department} · {item.dayKey}</p></div><div className={styles.reviewBadges}>{item.issueLabels.map((label) => <span key={label} className={styles.reportBadgeDanger}><AlertTriangle size={13} />{label}</span>)}{resolution ? <span className={styles.reportBadgeSuccess}><CheckCircle2 size={13} />İncelendi</span> : null}</div></div>
            <div className={ui.tableViewport}><table className={ui.dataTable} style={{ minWidth: 650 }}><thead><tr><th>Saat</th><th>Hareket</th><th>Sunucuya ulaşma</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>{item.logs.map((log) => { const problem = item.unmatchedLogIds.includes(log.id) || item.delayedLogIds.includes(log.id); return <tr key={log.id} className={problem ? styles.reviewProblemRow : undefined}><td>{formatDate(log.scannedAt)}</td><td>{ATTENDANCE_TYPE_LABELS[log.type]}</td><td>{formatDate(log.receivedAt)}</td><td>{problem ? <span className={ui.statusDanger}><span className={ui.statusDot} />Kontrol gerekli</span> : <span className={ui.statusBadge}><span className={ui.statusDot} />Normal</span>}</td><td><Link href={`/dashboard/movements/${log.id}`} className={`${ui.rowAction} ${ui.compactAction}`}>İncele</Link></td></tr>; })}</tbody></table></div>
            <div className={ui.reviewCardFooter}><Link href={`/dashboard/movements/new?employeeId=${item.employee.id}&returnTo=${encodeURIComponent(returnTo)}`} className={`${ui.secondaryAction} ${ui.compactAction}`}><PlusCircle size={14} />Eksik hareket ekle</Link>{resolution ? <p className={ui.tableHint}><strong>{resolution.resolvedBy.name ?? resolution.resolvedBy.email}:</strong> {resolution.resolutionNote} · {formatDate(resolution.resolvedAt)}</p> : <form action={resolveAttendanceReviewAction} className={ui.reviewForm}><input type="hidden" name="employeeId" value={item.employee.id} /><input type="hidden" name="dayKey" value={item.dayKey} /><input type="hidden" name="fingerprint" value={item.fingerprint} /><input type="hidden" name="returnTo" value={returnTo} /><input name="resolutionNote" required placeholder="İnceleme sonucu / açıklama" /><SubmitButton idleLabel="İncelendi Olarak Kapat" pendingLabel="Kaydediliyor..." className={`${ui.secondaryAction} ${ui.compactAction}`} /></form>}</div>
          </article>;
        })}</div>}
      </section>
    </div>
  );
}
