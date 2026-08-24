import { redirect } from "next/navigation";
import {
  LeaveApprovalStatus,
  LeaveDurationType,
  LeaveType,
} from "@/generated/prisma/client";
import {
  createLeaveRequestAction,
  deleteLeaveRequestAction,
  updateLeaveRequestAction,
} from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";

const leaveTypeLabels = {
  ANNUAL: "Yillik izin",
  EXCUSE: "Mazeret izni",
  UNPAID: "Ucretsiz izin",
  MEDICAL: "Saglik raporu",
  ADMINISTRATIVE: "Idari izin",
  HOURLY: "Saatlik izin",
  HALF_DAY: "Yarim gun izin",
} as const;

const durationLabels = {
  FULL_DAY: "Tam gun",
  HALF_DAY: "Yarim gun",
  HOURLY: "Saatlik",
} as const;

const statusLabels = {
  PENDING: "Bekliyor",
  APPROVED: "Onaylandi",
  REJECTED: "Reddedildi",
} as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(date);
}

export default async function LeavesPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const [employees, leaves] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: user.companyId, isActive: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.leaveRequest.findMany({
      where: { companyId: user.companyId },
      include: { employee: true },
      orderBy: { startDate: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Izin ve Rapor Yonetimi</p>
          <h1 className={styles.title}>Personel Izinleri</h1>
          <p className={styles.subtitle}>
            Onayli izinler raporlarda devamsizliktan ayrilir; boylece izinli personel gelmedi olarak gorunmez.
          </p>
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Yeni Kayit</p>
            <h2 className={styles.sectionTitle}>Izin / Rapor Ekle</h2>
          </div>
        </div>

        <form action={createLeaveRequestAction} className={styles.formGrid}>
          <label className={styles.field}>
            <span>Personel</span>
            <select name="employeeId" required defaultValue="">
              <option value="" disabled>
                Personel sec
              </option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} - {employee.department}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Izin Turu</span>
            <select name="type" defaultValue={LeaveType.ANNUAL}>
              {Object.values(LeaveType).map((type) => (
                <option key={type} value={type}>
                  {leaveTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Kapsam</span>
            <select name="durationType" defaultValue={LeaveDurationType.FULL_DAY}>
              {Object.values(LeaveDurationType).map((type) => (
                <option key={type} value={type}>
                  {durationLabels[type]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Onay Durumu</span>
            <select name="approvalStatus" defaultValue={LeaveApprovalStatus.APPROVED}>
              {Object.values(LeaveApprovalStatus).map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Baslangic Tarihi</span>
            <input name="startDate" type="date" required />
          </label>

          <label className={styles.field}>
            <span>Bitis Tarihi</span>
            <input name="endDate" type="date" required />
          </label>

          <label className={styles.field}>
            <span>Baslangic Saati</span>
            <input name="startTime" type="time" />
          </label>

          <label className={styles.field}>
            <span>Bitis Saati</span>
            <input name="endTime" type="time" />
          </label>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Aciklama</span>
            <textarea name="description" placeholder="Izin notu veya rapor aciklamasi" />
          </label>

          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Izin Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Kayitlar</p>
            <h2 className={styles.sectionTitle}>Izin ve Rapor Listesi</h2>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Personel</th>
                <th>Izin Turu</th>
                <th>Tarih</th>
                <th>Saat</th>
                <th>Durum</th>
                <th>Aciklama</th>
                <th>Sil</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    Henuz izin kaydi yok.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id}>
                    <td>
                      {leave.employee.firstName} {leave.employee.lastName}
                      <p className={styles.tableSubText}>{leave.employee.department}</p>
                    </td>
                    <td>{leaveTypeLabels[leave.type]}</td>
                    <td>
                      {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      <p className={styles.tableSubText}>{durationLabels[leave.durationType]}</p>
                    </td>
                    <td>{leave.startTime || leave.endTime ? `${leave.startTime ?? "-"} / ${leave.endTime ?? "-"}` : "-"}</td>
                    <td>
                      <form action={updateLeaveRequestAction} className={styles.inlineEditForm}>
                        <input type="hidden" name="leaveId" value={leave.id} />
                        <select name="approvalStatus" defaultValue={leave.approvalStatus}>
                          {Object.values(LeaveApprovalStatus).map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                        <input name="description" defaultValue={leave.description ?? ""} />
                        <SubmitButton idleLabel="Kaydet" pendingLabel="..." className={styles.smallButton} />
                      </form>
                    </td>
                    <td>{leave.description ?? "-"}</td>
                    <td>
                      <form action={deleteLeaveRequestAction}>
                        <input type="hidden" name="leaveId" value={leave.id} />
                        <SubmitButton idleLabel="Sil" pendingLabel="..." className={styles.dangerMiniButton} />
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
