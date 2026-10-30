import Link from "next/link";
import { AlarmClock, AlertTriangle, CalendarDays, Clock3, FileLock2, History, LayoutList, Timer, TimerReset, UserCheck, Users } from "lucide-react";
import { loadAttendanceDays, summarizeAttendanceDays } from "@/lib/attendance-days";
import styles from "../page.module.css";
import ui from "../management.module.css";
import rs from "./reports.module.css";
import { getReportContext, listDayKeys, type ReportSearchParams } from "./report-context";
import { attendanceRatio, dailyPresence, groupByDepartment, totals } from "./report-metrics";
import { BarList, DailyTrend, formatDuration, formatHours, formatPercent, Kpi, KpiGrid, Panel, ReportFilters, ReportHeader } from "./report-ui";

const rate = (ratio: { attended: number; planned: number }) => (ratio.planned ? ratio.attended / ratio.planned : 0);

const REPORT_LINKS = [
  { href: "/dashboard/reports/payroll", icon: <FileLock2 size={18} />, title: "Aylık Puantaj", text: "Personel × gün puantaj cetveli, onay, kilit ve Excel/PDF çıktısı." },
  { href: "/dashboard/reports/daily-attendance", icon: <Clock3 size={18} />, title: "Günlük Devam", text: "Seçilen gün kim geldi, kim gelmedi; giriş, çıkış, mola ve net süre." },
  { href: "/dashboard/reports/personnel", icon: <Users size={18} />, title: "Personel Puantaj Özeti", text: "Tarih aralığında kişi bazlı çalışma, fazla mesai, izin ve devamsızlık." },
  { href: "/dashboard/reports/departments", icon: <LayoutList size={18} />, title: "Departman Karşılaştırma", text: "Departmanların devam oranı, geç kalma ve fazla mesai karşılaştırması." },
  { href: "/dashboard/reports/late-arrivals", icon: <Timer size={18} />, title: "Geç Kalma ve Erken Çıkış", text: "Gün gün geç kalma ve erken çıkış olayları, en çok tekrarlayanlar." },
  { href: "/dashboard/reports/overtime", icon: <TimerReset size={18} />, title: "Fazla Mesai ve Eksik Süre", text: "Planlanan sürenin üstünde ve altında çalışma, tatil günü çalışması." },
  { href: "/dashboard/reports/audit", icon: <History size={18} />, title: "Audit Raporu", text: "Hareket ekleme, düzeltme ve silme işlemlerinin geçmişi." },
];

export default async function ReportsPage(props: { searchParams: Promise<ReportSearchParams> }) {
  const ctx = await getReportContext(await props.searchParams);
  const data = await loadAttendanceDays({ companyId: ctx.companyId, employeeWhere: ctx.employeeWhere, fromKey: ctx.fromKey, toKey: ctx.toKey });
  const summaries = summarizeAttendanceDays(data.employees, data.rows, data.companyName).filter((row) => row.plannedDays || row.attendedDays);
  const sum = totals(summaries);
  const ratio = attendanceRatio(data.rows);
  const presence = dailyPresence(listDayKeys(ctx.fromKey, ctx.toKey), data.rows);
  const departments = groupByDepartment(summaries, data.rows).sort((first, second) => rate(second.ratio) - rate(first.ratio));
  const topLate = [...summaries].filter((row) => row.lateMinutes > 0).sort((first, second) => second.lateMinutes - first.lateMinutes).slice(0, 8);
  const topOvertime = [...summaries].filter((row) => row.overtimeMinutes + row.holidayWorkMinutes > 0).sort((first, second) => (second.overtimeMinutes + second.holidayWorkMinutes) - (first.overtimeMinutes + first.holidayWorkMinutes)).slice(0, 8);

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <ReportHeader kicker="İK raporları" title="Rapor Merkezi" description="Seçilen dönemin devam, süre ve kontrol özetleri. Ayrıntı için aşağıdaki raporlara geçebilirsiniz." />
      <ReportFilters ctx={ctx} />

      <KpiGrid>
        <Kpi icon={<UserCheck size={18} />} label="Devam oranı" value={formatPercent(ratio.attended, ratio.planned)} hint={`${ratio.attended} / ${ratio.planned} planlı iş günü`} tone="success" />
        <Kpi icon={<Clock3 size={18} />} label="Net çalışma" value={`${formatHours(sum.workedMinutes)} sa`} hint={`Planlanan ${formatHours(sum.plannedMinutes)} sa`} tone="info" />
        <Kpi icon={<TimerReset size={18} />} label="Fazla mesai" value={`${formatHours(sum.overtimeMinutes + sum.holidayWorkMinutes)} sa`} hint={`Tatil çalışması ${formatHours(sum.holidayWorkMinutes)} sa`} tone="info" />
        <Kpi icon={<Timer size={18} />} label="Geç kalma" value={`${sum.lateDays} gün`} hint={formatDuration(sum.lateMinutes)} tone="warning" />
        <Kpi icon={<AlarmClock size={18} />} label="Devamsız" value={`${sum.absentDays} gün`} hint={`${sum.leaveDays} izinli gün`} tone={sum.absentDays ? "danger" : "neutral"} />
        <Kpi icon={<AlertTriangle size={18} />} label="Kontrol gereken" value={`${sum.errorDays} gün`} hint={<Link href="/dashboard/movement-reviews">Hareket incelemesine git</Link>} tone={sum.errorDays ? "danger" : "success"} />
      </KpiGrid>

      <div className={rs.panelGrid}>
        <Panel title="Günlük devam" description="Planlı personel ve işe gelen personel sayısı.">
          <DailyTrend points={presence.map((day) => ({ dayKey: day.dayKey, value: Math.max(day.planned, day.present), secondary: day.present }))} valueLabel="Planlı" secondaryLabel="Gelen" />
        </Panel>
        <Panel title="En çok geç kalanlar" description="Toplam geç kalma süresine göre.">
          <BarList tone="warning" emptyText="Bu dönemde geç kalma yok." items={topLate.map((row) => ({ label: row.employee, detail: `${row.department} · ${row.lateDays} gün`, value: row.lateMinutes, display: formatDuration(row.lateMinutes) }))} />
        </Panel>
      </div>

      <div className={rs.panelGridEven}>
        <Panel title="Departman devam oranı" description="Planlı iş günlerinde işe gelme oranı.">
          <BarList tone="success" emptyText="Departman verisi yok." items={departments.map((item) => ({ label: item.department, detail: `${item.totals.employees} personel`, value: item.ratio.planned ? item.ratio.attended / item.ratio.planned : 0, display: formatPercent(item.ratio.attended, item.ratio.planned) }))} />
        </Panel>
        <Panel title="En çok fazla mesai" description="Fazla mesai ve tatil çalışması toplamı.">
          <BarList tone="info" emptyText="Bu dönemde fazla mesai yok." items={topOvertime.map((row) => ({ label: row.employee, detail: row.department, value: row.overtimeMinutes + row.holidayWorkMinutes, display: `${formatHours(row.overtimeMinutes + row.holidayWorkMinutes)} sa` }))} />
        </Panel>
      </div>

      <Panel title="Raporlar" description="Her rapor aynı puantaj hesabını kullanır; sonuçlar aylık puantajla tutarlıdır." aside={<CalendarDays size={18} color="#98a2b3" />}>
        <nav className={rs.navGrid} aria-label="Rapor listesi">
          {REPORT_LINKS.map((item) => (
            <Link key={item.href} href={`${item.href}?${ctx.query}`} className={rs.navCard}>
              <span>{item.icon}</span>
              <div><h3>{item.title}</h3><p>{item.text}</p></div>
            </Link>
          ))}
        </nav>
      </Panel>
    </div>
  );
}
