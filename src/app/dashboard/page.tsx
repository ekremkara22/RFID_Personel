import {
  Building2,
  CalendarDays,
  CalendarRange,
  Coffee,
  DoorClosed,
  DoorOpen,
  AlertTriangle,
  MonitorSmartphone,
  ShieldCheck,
  Soup,
  Users,
} from "lucide-react";
import { ExportButton } from "@/app/dashboard/export-button";
import { LeaveApprovalStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "./page.module.css";

const attendanceLabels = {
  ENTRY: "Giriş",
  EXIT: "Çıkış",
  BREAK_START: "Mola Giriş",
  BREAK_END: "Mola Çıkış",
  MEAL_START: "Yemek Giriş",
  MEAL_END: "Yemek Çıkış",
} as const;

function getRoleLabel(role: string) {
  return role === "SUPERADMIN" ? "Super Admin" : "Firma Admin";
}

function getUserFullName(user: {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
}) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || user.email;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export default async function DashboardPage() {
  const { user } = await requireSessionUser();
  const isSuperadmin = user.role === "SUPERADMIN";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = getWeekStart(new Date());
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const attendanceWhere = isSuperadmin
    ? undefined
    : {
        employee: {
          companyId: user.companyId ?? undefined,
        },
      };

  const employeeWhere = isSuperadmin
    ? undefined
    : {
        companyId: user.companyId ?? undefined,
      };

  const deviceWhere = isSuperadmin
    ? undefined
    : {
        companyId: user.companyId ?? undefined,
      };

  const companyWhere = isSuperadmin ? undefined : { id: user.companyId ?? undefined };

  const [
    companyCount,
    companyAdminCount,
    employeeCount,
    deviceCount,
    highlightedCompanies,
    scopedEmployees,
    recentLogs,
    companyDevices,
    todayEntryCount,
    todayExitCount,
    todayBreakStartCount,
    todayBreakEndCount,
    todayMealStartCount,
    todayMealEndCount,
    todayMovementCount,
    weekMovementCount,
    monthMovementCount,
    monthlyLogsForReport,
    todayLogsForDashboard,
    todayApprovedLeaves,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.user.count({ where: { role: "COMPANY_ADMIN" } }),
    prisma.employee.count({ where: employeeWhere }),
    prisma.device.count({ where: deviceWhere }),
    prisma.company.findMany({
      where: companyWhere,
      include: {
        users: {
          where: { role: "COMPANY_ADMIN" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            employees: true,
            devices: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: isSuperadmin ? 6 : 1,
    }),
    prisma.employee.findMany({
      where: employeeWhere,
      include: {
        company: true,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 8,
    }),
    prisma.attendanceLog.findMany({
      where: attendanceWhere,
      include: {
        employee: {
          include: {
            company: true,
          },
        },
        device: true,
      },
      orderBy: { scannedAt: "desc" },
      take: 10,
    }),
    prisma.device.findMany({
      where: deviceWhere,
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: today },
        type: "ENTRY",
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: today },
        type: "EXIT",
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: today },
        type: "BREAK_START",
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: today },
        type: "BREAK_END",
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: today },
        type: "MEAL_START",
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: today },
        type: "MEAL_END",
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: today },
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: weekStart },
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: monthStart },
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.findMany({
      where: {
        scannedAt: { gte: monthStart },
        ...attendanceWhere,
      },
      include: {
        employee: true,
      },
      orderBy: { scannedAt: "desc" },
      take: 1000,
    }),
    prisma.attendanceLog.findMany({
      where: {
        scannedAt: { gte: today },
        ...attendanceWhere,
      },
      include: {
        employee: true,
        device: true,
      },
      orderBy: { scannedAt: "desc" },
      take: 500,
    }),
    prisma.leaveRequest.findMany({
      where: {
        companyId: user.companyId ?? undefined,
        approvalStatus: LeaveApprovalStatus.APPROVED,
        startDate: { lte: new Date() },
        endDate: { gte: today },
      },
      include: { employee: true },
    }),
  ]);

  const summaryCards = isSuperadmin
    ? [
        { label: "Toplam Firma", value: companyCount, icon: Building2 },
        { label: "Firma Yöneticisi", value: companyAdminCount, icon: ShieldCheck },
        { label: "Toplam Personel", value: employeeCount, icon: Users },
        { label: "Toplam Cihaz", value: deviceCount, icon: MonitorSmartphone },
      ]
    : [
        { label: "Firma", value: user.company?.name ?? "-", icon: Building2 },
        { label: "Kayıtlı Personel", value: employeeCount, icon: Users },
        { label: "RFID Cihazı", value: deviceCount, icon: MonitorSmartphone },
        { label: "Bugün Giriş", value: todayEntryCount, icon: DoorOpen },
      ];

  const reportCards = [
    { label: "Giriş", value: todayEntryCount, icon: DoorOpen },
    { label: "Çıkış", value: todayExitCount, icon: DoorClosed },
    { label: "Mola Giriş", value: todayBreakStartCount, icon: Coffee },
    { label: "Mola Çıkış", value: todayBreakEndCount, icon: Coffee },
    { label: "Yemek Giriş", value: todayMealStartCount, icon: Soup },
    { label: "Yemek Çıkış", value: todayMealEndCount, icon: Soup },
  ];

  const periodCards = [
    { label: "Bugün PDKS", value: todayMovementCount, icon: CalendarDays },
    { label: "Haftalık PDKS", value: weekMovementCount, icon: CalendarRange },
    { label: "Aylık PDKS", value: monthMovementCount, icon: CalendarRange },
  ];

  const departmentReport = Array.from(
    monthlyLogsForReport.reduce((report, log) => {
      const department = log.employee.department || "Departmansiz";
      const current = report.get(department) ?? {
        department,
        entry: 0,
        exit: 0,
        breakCount: 0,
        meal: 0,
        total: 0,
      };

      current.total += 1;

      if (log.type === "ENTRY") current.entry += 1;
      if (log.type === "EXIT") current.exit += 1;
      if (log.type === "BREAK_START" || log.type === "BREAK_END") current.breakCount += 1;
      if (log.type === "MEAL_START" || log.type === "MEAL_END") current.meal += 1;

      report.set(department, current);
      return report;
    }, new Map<string, { department: string; entry: number; exit: number; breakCount: number; meal: number; total: number }>()),
  ).map(([, value]) => value);
  const currentlyInside = Math.max(todayEntryCount - todayExitCount, 0);
  const leaveEmployeeIds = new Set(todayApprovedLeaves.map((leave) => leave.employeeId));
  const absentCount = Math.max(employeeCount - todayEntryCount - leaveEmployeeIds.size, 0);
  const hourlyData = Array.from({ length: 13 }, (_, index) => {
    const hour = index + 7;
    const entry = todayLogsForDashboard.filter(
      (log) => log.type === "ENTRY" && log.scannedAt.getHours() === hour,
    ).length;
    const exit = todayLogsForDashboard.filter(
      (log) => log.type === "EXIT" && log.scannedAt.getHours() === hour,
    ).length;

    return {
      label: `${String(hour).padStart(2, "0")}:00`,
      entry,
      exit,
      max: Math.max(entry, exit, 1),
    };
  });
  const statusTotal = Math.max(employeeCount, 1);
  const statusCards = [
    { label: "Zamaninda", value: todayEntryCount, color: "green" },
    { label: "Gec", value: 0, color: "orange" },
    { label: "Izinli", value: leaveEmployeeIds.size, color: "blue" },
    { label: "Devamsiz", value: absentCount, color: "red" },
  ];
  const dashboardExportRows = todayLogsForDashboard.map((log) => ({
    employee: `${log.employee.firstName} ${log.employee.lastName}`.trim(),
    department: log.employee.department,
    type: attendanceLabels[log.type],
    scannedAt: formatDate(log.scannedAt),
    rfidCardId: log.rfidCardId ?? log.employee.rfidCardId ?? "-",
    device: log.device?.name ?? "-",
  }));
  const attentionEmployees = scopedEmployees
    .filter((employee) => {
      const hasEntry = todayLogsForDashboard.some(
        (log) => log.employeeId === employee.id && log.type === "ENTRY",
      );
      return employee.isActive && !hasEntry && !leaveEmployeeIds.has(employee.id);
    })
    .slice(0, 8);

  return (
    <div className={styles.page}>
      {!isSuperadmin ? (
        <section className={styles.operationTopbar}>
          <div>
            <h1 className={styles.dashboardTitle}>Giris-Cikis Dashboard</h1>
            <p className={styles.dashboardDate}>
              {new Intl.DateTimeFormat("tr-TR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </p>
          </div>
          <div className={styles.quickActions}>
            <span className={styles.quickButton}>
              <CalendarDays size={18} />
              Bugun
            </span>
            <span className={styles.quickButton}>Departman: Tumu</span>
            <ExportButton
              rows={dashboardExportRows}
              columns={[
                { key: "employee", label: "Personel" },
                { key: "department", label: "Departman" },
                { key: "type", label: "Hareket" },
                { key: "scannedAt", label: "Tarih" },
                { key: "rfidCardId", label: "RFID Kart" },
                { key: "device", label: "Cihaz" },
              ]}
              filename="bugun-personel-hareketleri"
              className={styles.quickButton}
              label="Rapor Indir"
            />
          </div>
        </section>
      ) : null}

      {isSuperadmin ? (
        <section className={`glass-panel ${styles.heroCard}`}>
          <div>
            <p className={styles.eyebrow}>Admin veri merkezi</p>
            <h1 className={styles.title}>{getUserFullName(user)}</h1>
            <p className={styles.subtitle}>
              Tüm firmalar, yöneticiler, cihazlar ve personel hareketleri için yoğun veri izleme ve raporlama ekranı.
            </p>
          </div>

          <div className={styles.heroMeta}>
            <div className={styles.rolePill}>{getRoleLabel(user.role)}</div>
            <div className={styles.helperText}>Canlı kayıt, tablo ve rapor öncelikli panel düzeni.</div>
          </div>
        </section>
      ) : null}

      <section className={styles.metricsGrid}>
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className={`glass-panel ${styles.metricCard}`}>
              <div className={styles.metricIcon}>
                <Icon size={18} />
              </div>
              <p className={styles.metricLabel}>{card.label}</p>
              <p className={styles.metricValue}>{card.value}</p>
            </article>
          );
        })}
      </section>

      {!isSuperadmin ? (
        <section className={styles.metricsGrid}>
          {periodCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className={`glass-panel ${styles.metricCard}`}>
                <div className={styles.metricIcon}>
                  <Icon size={18} />
                </div>
                <p className={styles.metricLabel}>{card.label}</p>
                <p className={styles.metricValue}>{card.value}</p>
              </article>
            );
          })}
          <article className={`glass-panel ${styles.metricCard}`}>
            <div className={styles.metricIcon}>
              <Users size={18} />
            </div>
            <p className={styles.metricLabel}>Aktif Personel</p>
            <p className={styles.metricValue}>{employeeCount}</p>
          </article>
        </section>
      ) : null}

      {!isSuperadmin ? (
        <section className={styles.dashboardVisualGrid}>
          <article className={`glass-panel ${styles.chartPanel}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Gunluk yogunluk</p>
                <h2 className={styles.sectionTitle}>Giris-Cikis Akisi</h2>
              </div>
            </div>
            <div className={styles.hourlyChart}>
              {hourlyData.map((item) => (
                <div key={item.label} className={styles.hourColumn}>
                  <div className={styles.hourBars}>
                    <span
                      className={styles.entryBar}
                      style={{ height: `${Math.max((item.entry / item.max) * 100, item.entry ? 12 : 2)}%` }}
                    />
                    <span
                      className={styles.exitBar}
                      style={{ height: `${Math.max((item.exit / item.max) * 100, item.exit ? 12 : 2)}%` }}
                    />
                  </div>
                  <span className={styles.hourLabel}>{item.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className={`glass-panel ${styles.statusPanel}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Bugunku durum</p>
                <h2 className={styles.sectionTitle}>Personel Ozeti</h2>
              </div>
            </div>
            <div className={styles.donutSummary}>
              <div className={styles.donutCircle}>
                <strong>{employeeCount}</strong>
                <span>Toplam</span>
              </div>
              <div className={styles.statusList}>
                <p>
                  <span className={`${styles.statusDot} ${styles.statusDotblue}`} />
                  Su An Iceride
                  <strong>{currentlyInside}</strong>
                  <small>personel</small>
                </p>
                {statusCards.map((item) => (
                  <p key={item.label}>
                    <span className={`${styles.statusDot} ${styles[`statusDot${item.color}`]}`} />
                    {item.label}
                    <strong>%{Math.round((item.value / statusTotal) * 100)}</strong>
                    <small>({item.value})</small>
                  </p>
                ))}
              </div>
            </div>
          </article>
        </section>
      ) : null}

      <section className={styles.mainGrid}>
        <div className={styles.primaryColumn}>
          {isSuperadmin ? (
            <section className={`glass-panel ${styles.sectionCard}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Firma genel görünüm</p>
                  <h2 className={styles.sectionTitle}>Müşteri Firmalar</h2>
                </div>
              </div>

              <div className={styles.cardGrid}>
                {highlightedCompanies.map((company) => (
                  <article key={company.id} className={styles.infoCard}>
                    <div className={styles.infoCardTop}>
                      <div>
                        <p className={styles.infoCardTitle}>{company.name}</p>
                        <p className={styles.infoCardMeta}>
                          {company.users[0]
                            ? getUserFullName(company.users[0])
                            : "Firma admini tanımlanmadı"}
                        </p>
                      </div>
                      <div className={styles.countPill}>{company._count.employees} personel</div>
                    </div>

                    <p className={styles.infoCardBody}>
                      {company.address ?? "Adres bilgisi henüz girilmedi."}
                    </p>

                    <div className={styles.infoCardFooter}>
                      <span>İletişim: {company.contactEmail ?? company.contactPhone ?? "-"}</span>
                      <span>{company._count.devices} cihaz</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className={`glass-panel ${styles.sectionCard}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Dikkat</p>
                  <h2 className={styles.sectionTitle}>Dikkat Gerektiren Personel</h2>
                </div>
                <AlertTriangle size={18} />
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Personel</th>
                      <th>Departman</th>
                      <th>Sube</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attentionEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyCell}>
                          Bugun dikkat gerektiren kayit yok.
                        </td>
                      </tr>
                    ) : (
                      attentionEmployees.map((employee) => (
                        <tr key={employee.id}>
                          <td>
                            {employee.firstName} {employee.lastName}
                          </td>
                          <td>{employee.department}</td>
                          <td>{employee.branch ?? "-"}</td>
                          <td>Giris hareketi yok</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>
                  {isSuperadmin ? "Yeni kayıtlar" : "Personel takibi"}
                </p>
                <h2 className={styles.sectionTitle}>
                  {isSuperadmin ? "Son Eklenen Personeller" : "Kayıtlı Personeller"}
                </h2>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Personel</th>
                    <th>Firma</th>
                    <th>Departman</th>
                    <th>RFID Kart</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.emptyCell}>
                        Henüz kayıtlı personel yok.
                      </td>
                    </tr>
                  ) : (
                    scopedEmployees.map((employee) => (
                      <tr key={employee.id}>
                        <td>
                          {employee.firstName} {employee.lastName}
                        </td>
                        <td>{employee.company.name}</td>
                        <td>{employee.department}</td>
                        <td>
                          {employee.rfidCardId ?? "Kart atanmadi"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {!isSuperadmin ? (
            <section className={`glass-panel ${styles.sectionCard}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Aylik PDKS</p>
                  <h2 className={styles.sectionTitle}>Departman Bazli Puantaj Ozeti</h2>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Departman</th>
                      <th>Giris</th>
                      <th>Cikis</th>
                      <th>Mola/Yemek</th>
                      <th>Gec Kalma</th>
                      <th>Toplam Hareket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentReport.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyCell}>
                          Bu ay icin hareket kaydi bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      departmentReport.map((department) => (
                        <tr key={department.department}>
                          <td>{department.department}</td>
                          <td>{department.entry}</td>
                          <td>{department.exit}</td>
                          <td>{department.breakCount + department.meal}</td>
                          <td>
                            <span className={styles.tableSubText}>Vardiya kurali bekliyor</span>
                          </td>
                          <td>{department.total}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>

        <aside className={styles.sideColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>PDKS özet</p>
                <h2 className={styles.sectionTitle}>Bugünkü Hareket Tipleri</h2>
              </div>
            </div>

            <div className={styles.reportGrid}>
              {reportCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.label} className={styles.reportCard}>
                    <div className={styles.reportIcon}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className={styles.reportLabel}>{card.label}</p>
                      <p className={styles.reportValue}>{card.value}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>RFID cihazlar</p>
                <h2 className={styles.sectionTitle}>Cihaz Durumu</h2>
              </div>
            </div>

            <div className={styles.logList}>
              {companyDevices.length === 0 ? (
                <p className={styles.emptyState}>Henüz kayıtlı cihaz yok.</p>
              ) : (
                companyDevices.map((device) => (
                  <article key={device.id} className={styles.logItem}>
                    <div>
                      <p className={styles.logTitle}>{device.name}</p>
                      <p className={styles.logMeta}>Secret Key: {device.secretKey}</p>
                    </div>
                    <div className={styles.logMetaRight}>
                      <p>{device.lastSeenAt ? "Online" : "Bekleniyor"}</p>
                      <p>{device.lastSeenAt ? formatDate(device.lastSeenAt) : "Henuz yok"}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Rapor</p>
                <h2 className={styles.sectionTitle}>Son Hareketler</h2>
              </div>
            </div>

            <div className={styles.logList}>
              {recentLogs.length === 0 ? (
                <p className={styles.emptyState}>
                  Henüz kayıtlı hareket yok. RFID kartla giriş ve çıkış hareketleri burada görünecek.
                </p>
              ) : (
                recentLogs.map((log) => (
                  <article key={log.id} className={styles.logItem}>
                    <div>
                      <p className={styles.logTitle}>
                        {log.employee.firstName} {log.employee.lastName}
                      </p>
                      <p className={styles.logMeta}>
                        {attendanceLabels[log.type]} - {log.employee.company.name}
                      </p>
                      <p className={styles.mutedRow}>RFID Kart: {log.rfidCardId ?? "Kart bilgisi yok"}</p>
                    </div>
                    <div className={styles.logMetaRight}>
                      <p>{formatDate(log.scannedAt)}</p>
                      <p>{log.device?.name ?? "Cihaz gerekmiyor"}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
