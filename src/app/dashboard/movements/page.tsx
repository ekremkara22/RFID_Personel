import { redirect } from "next/navigation";
import { Filter } from "lucide-react";
import { AttendanceType } from "@/generated/prisma/client";
import {
  deleteAttendanceLogAction,
  updateAttendanceLogAction,
} from "@/app/dashboard/actions";
import { ExportButton } from "@/app/dashboard/export-button";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";

const attendanceLabels = {
  ENTRY: "Giris",
  EXIT: "Cikis",
  BREAK_START: "Mola Giris",
  BREAK_END: "Mola Cikis",
  MEAL_START: "Yemek Giris",
  MEAL_END: "Yemek Cikis",
} as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatInputDate(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function getDateValue(value?: string) {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function MovementsPage(props: {
  searchParams: Promise<{
    q?: string;
    department?: string;
    type?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const department =
    typeof searchParams.department === "string" ? searchParams.department.trim() : "";
  const type =
    typeof searchParams.type === "string" &&
    Object.values(AttendanceType).includes(searchParams.type as AttendanceType)
      ? (searchParams.type as AttendanceType)
      : "";
  const fromDate = getDateValue(searchParams.from);
  const toDate = getDateValue(searchParams.to);

  const [departments, logs] = await Promise.all([
    prisma.department.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.attendanceLog.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(fromDate || toDate
          ? {
              scannedAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
        employee: {
          companyId: user.companyId,
          ...(department ? { department } : {}),
          ...(query
            ? {
                OR: [
                  { firstName: { contains: query } },
                  { lastName: { contains: query } },
                  { email: { contains: query } },
                  { rfidCardId: { contains: query } },
                ],
              }
            : {}),
        },
      },
      include: {
        employee: true,
        device: true,
      },
      orderBy: { scannedAt: "desc" },
      take: 500,
    }),
  ]);

  const exportRows = logs.map((log) => ({
    employee: `${log.employee.firstName} ${log.employee.lastName}`.trim(),
    department: log.employee.department,
    type: attendanceLabels[log.type],
    scannedAt: formatDate(log.scannedAt),
    rfidCardId: log.rfidCardId ?? log.employee.rfidCardId ?? "-",
    device: log.device?.name ?? "-",
  }));

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Personel Hareketleri</p>
          <h1 className={styles.title}>Giris-Cikis Hareketleri</h1>
          <p className={styles.subtitle}>
            RFID kart okutmalarini filtrele, hareket tipini veya zamanini duzenle ve listeyi Excel olarak indir.
          </p>
        </div>

        <ExportButton
          rows={exportRows}
          columns={[
            { key: "employee", label: "Personel" },
            { key: "department", label: "Departman" },
            { key: "type", label: "Hareket Tipi" },
            { key: "scannedAt", label: "Tarih" },
            { key: "rfidCardId", label: "RFID Kart" },
            { key: "device", label: "Cihaz" },
          ]}
          filename="personel-hareketleri"
          className={styles.primaryLinkButton}
        />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form className={styles.filterGrid}>
          <label className={styles.field}>
            <span>Personel / RFID</span>
            <input name="q" defaultValue={query} placeholder="Ad, soyad, e-posta veya kart ID" />
          </label>

          <label className={styles.field}>
            <span>Departman</span>
            <select name="department" defaultValue={department}>
              <option value="">Tum Departmanlar</option>
              {departments.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Hareket Tipi</span>
            <select name="type" defaultValue={type}>
              <option value="">Tum Hareketler</option>
              {Object.values(AttendanceType).map((item) => (
                <option key={item} value={item}>
                  {attendanceLabels[item]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Baslangic</span>
            <input name="from" type="datetime-local" defaultValue={searchParams.from ?? ""} />
          </label>

          <label className={styles.field}>
            <span>Bitis</span>
            <input name="to" type="datetime-local" defaultValue={searchParams.to ?? ""} />
          </label>

          <button type="submit" className={styles.primaryButton}>
            <Filter size={16} />
            <span>Filtrele</span>
          </button>
        </form>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Kayitlar</p>
            <h2 className={styles.sectionTitle}>Filtrelenen Hareketler</h2>
          </div>
          <div className={styles.countPill}>{logs.length} kayit</div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Personel</th>
                <th>Departman</th>
                <th>Hareket / Zaman</th>
                <th>RFID Kart</th>
                <th>Cihaz</th>
                <th>Sil</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    Filtreye uygun hareket bulunamadi.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>
                        {log.employee.firstName} {log.employee.lastName}
                      </strong>
                      <p className={styles.tableSubText}>{log.employee.email ?? "-"}</p>
                    </td>
                    <td>{log.employee.department}</td>
                    <td>
                      <form action={updateAttendanceLogAction} className={styles.inlineEditForm}>
                        <input type="hidden" name="logId" value={log.id} />
                        <select name="type" defaultValue={log.type}>
                          {Object.values(AttendanceType).map((item) => (
                            <option key={item} value={item}>
                              {attendanceLabels[item]}
                            </option>
                          ))}
                        </select>
                        <input
                          name="scannedAt"
                          type="datetime-local"
                          defaultValue={formatInputDate(log.scannedAt)}
                        />
                        <SubmitButton
                          idleLabel="Kaydet"
                          pendingLabel="..."
                          className={styles.smallButton}
                        />
                      </form>
                    </td>
                    <td className={styles.monoCell}>{log.rfidCardId ?? log.employee.rfidCardId ?? "-"}</td>
                    <td>{log.device?.name ?? "-"}</td>
                    <td>
                      <form action={deleteAttendanceLogAction}>
                        <input type="hidden" name="logId" value={log.id} />
                        <SubmitButton
                          idleLabel="Sil"
                          pendingLabel="..."
                          className={styles.dangerMiniButton}
                        />
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
