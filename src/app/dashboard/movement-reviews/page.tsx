import Link from "next/link";
import { AlertTriangle, CheckCircle2, Filter, PlusCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { AttendanceType } from "@/generated/prisma/client";
import { deleteAttendanceLogAction, resolveAttendanceReviewAction, updateAttendanceLogAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { buildAttendanceReviewCases } from "@/lib/attendance-review";
import { getAccessibleCompanyIds } from "@/lib/access";
import { getAppDayRange, getAppDayKey } from "@/lib/app-time";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";

const labels: Record<AttendanceType, string> = { ENTRY: "Giriş", EXIT: "Çıkış", BREAK_START: "Mola çıkış", BREAK_END: "Mola giriş", MEAL_START: "Yemek çıkış", MEAL_END: "Yemek giriş" };

function formatInputDate(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date).replace(" ", "T");
}

function formatDate(date?: Date | null) {
  return date ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(date) : "—";
}

export default async function MovementReviewsPage(props: { searchParams: Promise<{ from?: string; to?: string; companyId?: string; branch?: string; department?: string; status?: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN") redirect("/dashboard");
  const accessibleCompanyIds = await getAccessibleCompanyIds(user);
  if (!accessibleCompanyIds?.length) redirect("/dashboard");
  const params = await props.searchParams;
  const todayKey = getAppDayKey(new Date());
  const defaultFrom = new Date(getAppDayRange(todayKey).start.getTime() - 13 * 86400000);
  const fromKey = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from! : getAppDayKey(defaultFrom);
  const toKey = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to! : todayKey;
  const from = getAppDayRange(fromKey).start;
  const to = getAppDayRange(toKey).end;
  const requestedCompanyId = Number(params.companyId);
  const companyIds = Number.isSafeInteger(requestedCompanyId) && accessibleCompanyIds.includes(requestedCompanyId) ? [requestedCompanyId] : accessibleCompanyIds;
  const branch = params.branch?.trim() ?? "";
  const department = params.department?.trim() ?? "";
  const status = ["open", "resolved", "all"].includes(params.status ?? "") ? params.status! : "open";

  const [companies, branches, departments, logs, resolutions] = await Promise.all([
    prisma.company.findMany({ where: { id: { in: accessibleCompanyIds } }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { companyId: { in: companyIds }, isActive: true }, include: { company: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { companyId: { in: companyIds }, isActive: true }, orderBy: { name: "asc" } }),
    prisma.attendanceLog.findMany({
      where: { scannedAt: { gte: from, lt: to }, employee: { companyId: { in: companyIds }, ...(branch ? { branch } : {}), ...(department ? { department } : {}) } },
      include: { employee: true },
      orderBy: [{ scannedAt: "asc" }, { id: "asc" }],
      take: 5000,
    }),
    prisma.attendanceReviewResolution.findMany({
      where: { workDate: { gte: from, lt: to }, employee: { companyId: { in: companyIds }, ...(branch ? { branch } : {}), ...(department ? { department } : {}) } },
      include: { resolvedBy: true },
    }),
  ]);
  const companyById = new Map(companies.map((company) => [company.id, company.name]));
  const resolutionByFingerprint = new Map(resolutions.map((item) => [item.fingerprint, item]));
  const cases = buildAttendanceReviewCases(logs).filter((item) => {
    const resolved = resolutionByFingerprint.has(item.fingerprint);
    return status === "all" || (status === "resolved" ? resolved : !resolved);
  });
  const query = new URLSearchParams({ from: fromKey, to: toKey, ...(params.companyId ? { companyId: params.companyId } : {}), ...(branch ? { branch } : {}), ...(department ? { department } : {}), status }).toString();
  const returnTo = `/dashboard/movement-reviews?${query}`;

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}><div><p className={styles.eyebrow}>Hareket Kontrolü</p><h1 className={styles.title}>İncelenecek Hareketler</h1><p className={styles.subtitle}>Eksik çıkış, eşleşmeyen mola ve cihazdan gecikmeli ulaşan kayıtları tek yerden düzeltin veya inceleme notuyla kapatın.</p></div></section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form className={styles.filterGrid}>
          <label className={styles.field}><span>Başlangıç</span><input type="date" name="from" defaultValue={fromKey} /></label>
          <label className={styles.field}><span>Bitiş</span><input type="date" name="to" defaultValue={toKey} max={todayKey} /></label>
          <label className={styles.field}><span>Firma</span><select name="companyId" defaultValue={params.companyId ?? ""}><option value="">Tüm firmalar</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className={styles.field}><span>Şube</span><select name="branch" defaultValue={branch}><option value="">Tüm şubeler</option>{branches.map((item) => <option key={item.id} value={item.name}>{item.company.name} / {item.name}</option>)}</select></label>
          <label className={styles.field}><span>Departman</span><select name="department" defaultValue={department}><option value="">Tüm departmanlar</option>{departments.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <label className={styles.field}><span>Durum</span><select name="status" defaultValue={status}><option value="open">Açık</option><option value="resolved">İncelendi</option><option value="all">Tümü</option></select></label>
          <button className={styles.primaryButton} type="submit"><Filter size={16} /> Göster</button>
        </form>
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}><div><p className={styles.sectionEyebrow}>Kontrol listesi</p><h2 className={styles.sectionTitle}>Kişi / Gün Bazlı Sorunlar</h2></div><div className={styles.countPill}>{cases.length} kayıt</div></div>
        {cases.length === 0 ? <p className={styles.emptyCell}>Seçilen filtrelerde kontrol gerektiren hareket bulunamadı.</p> : <div className={styles.reviewCaseList}>{cases.map((item) => {
          const resolution = resolutionByFingerprint.get(item.fingerprint);
          return <article key={item.fingerprint} className={styles.reviewCaseCard}>
            <div className={styles.reviewCaseHeader}><div><strong>{item.employee.firstName} {item.employee.lastName}</strong><p>{companyById.get(item.employee.companyId)} · {item.employee.branch ?? "Şubesiz"} · {item.employee.department} · {item.dayKey}</p></div><div className={styles.reviewBadges}>{item.issueLabels.map((label) => <span key={label} className={styles.reportBadgeDanger}><AlertTriangle size={13} /> {label}</span>)}{resolution ? <span className={styles.reportBadgeSuccess}><CheckCircle2 size={13} /> İncelendi</span> : null}</div></div>
            <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Saat</th><th>Hareket</th><th>Sunucuya Ulaşma</th><th>Düzeltme</th><th>Sil</th></tr></thead><tbody>{item.logs.map((log) => <tr key={log.id} className={item.unmatchedLogIds.includes(log.id) || item.delayedLogIds.includes(log.id) ? styles.reviewProblemRow : undefined}><td>{formatDate(log.scannedAt)}</td><td>{labels[log.type]}</td><td>{formatDate(log.receivedAt)}{item.delayedLogIds.includes(log.id) ? <p className={styles.tableSubText}>Gecikmeli</p> : null}</td><td><form action={updateAttendanceLogAction} className={styles.inlineEditForm}><input type="hidden" name="logId" value={log.id} /><input type="hidden" name="returnTo" value={returnTo} /><select name="type" defaultValue={log.type}>{Object.values(AttendanceType).map((type) => <option key={type} value={type}>{labels[type]}</option>)}</select><input type="datetime-local" name="scannedAt" defaultValue={formatInputDate(log.scannedAt)} /><input name="correctionReason" required placeholder="Düzeltme açıklaması" /><SubmitButton idleLabel="Kaydet" pendingLabel="..." className={styles.smallButton} /></form></td><td><form action={deleteAttendanceLogAction} className={styles.auditDeleteForm}><input type="hidden" name="logId" value={log.id} /><input type="hidden" name="returnTo" value={returnTo} /><input name="correctionReason" required placeholder="Silme nedeni" /><SubmitButton idleLabel="Sil" pendingLabel="..." className={styles.dangerMiniButton} /></form></td></tr>)}</tbody></table></div>
            <div className={styles.reviewCaseFooter}><Link href={`/dashboard/movements/new?employeeId=${item.employee.id}&returnTo=${encodeURIComponent(returnTo)}`} className={styles.inlineAction}><PlusCircle size={16} /> Eksik hareket ekle</Link>{resolution ? <p className={styles.helperText}><strong>{resolution.resolvedBy.name ?? resolution.resolvedBy.email}:</strong> {resolution.resolutionNote} · {formatDate(resolution.resolvedAt)}</p> : <form action={resolveAttendanceReviewAction} className={styles.reviewResolveForm}><input type="hidden" name="employeeId" value={item.employee.id} /><input type="hidden" name="dayKey" value={item.dayKey} /><input type="hidden" name="fingerprint" value={item.fingerprint} /><input type="hidden" name="returnTo" value={returnTo} /><input name="resolutionNote" required placeholder="İnceleme sonucu / açıklama" /><SubmitButton idleLabel="İncelendi olarak kapat" pendingLabel="Kaydediliyor..." className={styles.smallButton} /></form>}</div>
          </article>;
        })}</div>}
      </section>
    </div>
  );
}
