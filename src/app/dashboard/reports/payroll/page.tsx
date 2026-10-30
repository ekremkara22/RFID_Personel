import { AlarmClock, AlertTriangle, CalendarCheck2, Clock3, FileSpreadsheet, FileText, LockKeyhole, TimerReset, Users } from "lucide-react";
import { PayrollPeriodStatus } from "@/generated/prisma/client";
import { approvePayrollPeriodAction, lockPayrollPeriodAction, reopenPayrollPeriodAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { can } from "@/lib/authorization";
import { ATTENDANCE_TRACKING_MODE_LABELS, BREAK_DEDUCTION_MODE_LABELS } from "@/lib/attendance-labels";
import { PERMISSIONS } from "@/lib/permission-catalog";
import styles from "../../page.module.css";
import ui from "../../management.module.css";
import rs from "../reports.module.css";
import { getReportContext, type ReportSearchParams } from "../report-context";
import { DayCode, DayCodeLegend, ExportLink, formatDuration, Kpi, KpiGrid, Panel, ReportFilters, ReportHeader } from "../report-ui";
import { dayTitle, getPayrollView, isWeekend, PAYROLL_STATUS_LABELS, weekdayShort } from "./payroll-data";

function formatDate(value?: Date | null) {
  return value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(value) : "—";
}

export default async function PayrollPage(props: { searchParams: Promise<ReportSearchParams> }) {
  const params = await props.searchParams;
  const ctx = await getReportContext(params);
  const view = await getPayrollView(ctx, params.month);
  const { summaryRows, status } = view;
  const total = (pick: (row: (typeof summaryRows)[number]) => number) => summaryRows.reduce((sum, row) => sum + pick(row), 0);
  const filterQuery = new URLSearchParams({ month: view.monthKey, ...(ctx.branch ? { branch: ctx.branch } : {}), ...(ctx.department ? { department: ctx.department } : {}) }).toString();
  const returnTo = `/dashboard/reports/payroll?${filterQuery}`;
  const mayApprove = can(ctx.authorization, PERMISSIONS.PAYROLL_APPROVE) && (ctx.authorization.isPlatformAdmin || ctx.authorization.scopeMode === "COMPANY");
  const trackingMode = view.snapshot.trackingMode;
  const deductionMode = view.snapshot.breakDeductionMode;

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <ReportHeader
        kicker="Raporlar / Puantaj"
        title="Aylık Puantaj"
        description="RFID hareketlerinden üretilen aylık puantaj cetveli. Kontrol edip onaylayın; kilitlenen dönemin hareketleri değiştirilemez."
        actions={ctx.canExport ? <>
          <ExportLink href={`/dashboard/reports/payroll/export?${filterQuery}&format=xlsx`} icon={<FileSpreadsheet size={15} />} label="Excel" />
          <ExportLink href={`/dashboard/reports/payroll/export?${filterQuery}&format=pdf`} icon={<FileText size={15} />} label="PDF" />
        </> : null}
      />

      <ReportFilters ctx={ctx} dateMode="month" monthKey={view.monthKey} />

      <KpiGrid>
        <Kpi icon={<Users size={18} />} label="Personel" value={summaryRows.length} hint={`${total((row) => row.attendedDays)} çalışılan gün`} tone="info" />
        <Kpi icon={<Clock3 size={18} />} label="Net çalışma" value={formatDuration(total((row) => row.workedMinutes))} hint={`Planlanan ${formatDuration(total((row) => row.plannedMinutes))}`} tone="success" />
        <Kpi icon={<TimerReset size={18} />} label="Fazla mesai" value={formatDuration(total((row) => row.overtimeMinutes))} hint={`Tatil çalışması ${formatDuration(total((row) => row.holidayWorkMinutes))}`} tone="info" />
        <Kpi icon={<AlarmClock size={18} />} label="Eksik süre" value={formatDuration(total((row) => row.missingMinutes))} hint={`${total((row) => row.missingDays)} devamsız gün`} tone="warning" />
        <Kpi icon={<CalendarCheck2 size={18} />} label="Geç kalma" value={formatDuration(total((row) => row.lateMinutes))} hint={`${total((row) => row.lateDays)} gün`} tone="warning" />
        <Kpi icon={<AlertTriangle size={18} />} label="Kontrol gereken gün" value={total((row) => row.errorDays)} hint="Devamsızlık hariç hareket sorunları" tone={total((row) => row.errorDays) ? "danger" : "success"} />
      </KpiGrid>

      <section className={ui.surface} aria-label="Dönem durumu">
        <div className={rs.periodBar}>
          <div>
            <div className={ui.sectionHeading} style={{ marginBottom: 8 }}>
              <div><h2>{view.monthKey} dönemi <span className={rs.statusPill} data-status={status}>{PAYROLL_STATUS_LABELS[status]}</span></h2>
                <p>{view.isFrozen ? `Onay anındaki snapshot gösteriliyor (${formatDate(view.period?.snapshotCreatedAt)}).` : "Canlı hesaplama: hareketler değiştikçe güncellenir."}</p></div>
            </div>
            <p className={rs.periodMeta}>
              {trackingMode ? <span>Mola takibi: <strong>{ATTENDANCE_TRACKING_MODE_LABELS[trackingMode]}</strong></span> : null}
              {trackingMode === "BREAK_TRACKING" && deductionMode ? <span>Mola düşümü: <strong>{BREAK_DEDUCTION_MODE_LABELS[deductionMode]}</strong></span> : null}
              {view.period?.approvedAt ? <span>Onaylayan: <strong>{view.period.approvedBy?.name ?? view.period.approvedBy?.email ?? "—"}</strong> · {formatDate(view.period.approvedAt)}</span> : null}
              {view.period?.lockedAt ? <span>Kilitleyen: <strong>{view.period.lockedBy?.name ?? view.period.lockedBy?.email ?? "—"}</strong> · {formatDate(view.period.lockedAt)}</span> : null}
              {view.period?.approvalNote ? <span>Not: <strong>{view.period.approvalNote}</strong></span> : null}
            </p>
          </div>
          <div className={rs.periodActions}>
            {!mayApprove ? <p className={ui.tableHint}>Onay ve kilit için firma geneli puantaj yetkisi gerekir.</p>
              : status === PayrollPeriodStatus.OPEN ? <form action={approvePayrollPeriodAction}>
                <input type="hidden" name="companyId" value={ctx.companyId} /><input type="hidden" name="month" value={view.monthKey} /><input type="hidden" name="returnTo" value={returnTo} />
                <input name="approvalNote" required placeholder="Kontrol / onay açıklaması" aria-label="Onay açıklaması" />
                <SubmitButton idleLabel="Dönemi Onayla" pendingLabel="Snapshot oluşturuluyor..." className={ui.primaryAction} />
              </form>
              : status === PayrollPeriodStatus.APPROVED ? <>
                <form action={reopenPayrollPeriodAction}><input type="hidden" name="companyId" value={ctx.companyId} /><input type="hidden" name="month" value={view.monthKey} /><input type="hidden" name="returnTo" value={returnTo} /><SubmitButton idleLabel="Onayı Geri Al" pendingLabel="Açılıyor..." className={ui.secondaryAction} /></form>
                <form action={lockPayrollPeriodAction}><input type="hidden" name="companyId" value={ctx.companyId} /><input type="hidden" name="month" value={view.monthKey} /><input type="hidden" name="returnTo" value={returnTo} /><SubmitButton idleLabel="Dönemi Kilitle" pendingLabel="Kilitleniyor..." className={ui.dangerAction} /></form>
              </>
              : <p className={rs.modeNote}><LockKeyhole size={15} />Dönem kilitli; hareket ekleme, silme ve düzenleme engellenir.</p>}
          </div>
        </div>
      </section>

      <Panel title="Puantaj cetveli" description="Hücrenin üzerine gelerek giriş-çıkış ve süre ayrıntısını görebilirsiniz. Süreler saat ve dakika olarak gösterilir." aside={<span className={ui.countBadge}>{summaryRows.length} personel</span>}>
        {summaryRows.length === 0 ? <p className={rs.emptyText}>Bu dönemde ve filtrelerde personel bulunamadı.</p> : (
          <div className={rs.sheetViewport}>
            <table className={rs.sheet}>
              <thead>
                <tr>
                  <th className={rs.sheetPerson}>Personel</th>
                  {view.dayKeys.map((dayKey) => <th key={dayKey} className={isWeekend(dayKey) ? rs.weekend : undefined}>{Number(dayKey.slice(8))}<small>{weekdayShort(dayKey)}</small></th>)}
                  <th className={rs.sheetTotal}>Çalışılan<small>gün</small></th>
                  <th className={rs.sheetTotal}>Net<small>çalışma</small></th>
                  <th className={rs.sheetTotal}>Fazla<small>mesai</small></th>
                  <th className={rs.sheetTotal}>Tatil<small>çalışması</small></th>
                  <th className={rs.sheetTotal}>Eksik<small>süre</small></th>
                  <th className={rs.sheetTotal}>Geç<small>dk</small></th>
                  <th className={rs.sheetTotal}>İzin<small>gün</small></th>
                  <th className={rs.sheetTotal}>Devamsız<small>gün</small></th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => {
                  const days = view.daysByEmployee.get(row.employeeId);
                  return (
                    <tr key={row.employeeId}>
                      <th scope="row" className={rs.sheetPerson}><strong>{row.employee}</strong><span>{row.registrationNumber} · {row.department}</span></th>
                      {view.dayKeys.map((dayKey) => {
                        const day = days?.get(dayKey);
                        return <td key={dayKey} className={isWeekend(dayKey) ? rs.weekend : undefined}><DayCode code={day?.code ?? ""} title={dayTitle(day, dayKey)} /></td>;
                      })}
                      <td className={rs.sheetTotal}>{row.attendedDays}</td>
                      <td className={rs.sheetTotal}>{formatDuration(row.workedMinutes)}</td>
                      <td className={rs.sheetTotal}>{formatDuration(row.overtimeMinutes)}</td>
                      <td className={rs.sheetTotal}>{formatDuration(row.holidayWorkMinutes)}</td>
                      <td className={rs.sheetTotal}>{formatDuration(row.missingMinutes)}</td>
                      <td className={rs.sheetTotal}>{row.lateMinutes}</td>
                      <td className={rs.sheetTotal}>{row.leaveDays}</td>
                      <td className={rs.sheetTotal}>{row.missingDays}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 14 }}><DayCodeLegend /></div>
      </Panel>
    </div>
  );
}
