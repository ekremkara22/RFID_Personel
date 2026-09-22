import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { createAttendanceLogAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { AttendanceType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { getAccessibleCompanyIds } from "@/lib/access";
import styles from "../../page.module.css";

const attendanceLabels = {
  ENTRY: "Giris",
  EXIT: "Cikis",
  BREAK_START: "Mola Çıkış",
  BREAK_END: "Mola Giriş",
  MEAL_START: "Yemek Çıkış",
  MEAL_END: "Yemek Giriş",
} as const;

function formatInputDate(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

export default async function NewMovementPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN") {
    redirect("/dashboard");
  }

  const companyIds = await getAccessibleCompanyIds(user);
  if (!companyIds || companyIds.length === 0) redirect("/dashboard");
  const [employees, devices] = await Promise.all([
    prisma.employee.findMany({
      where: {
        companyId: { in: companyIds },
        isActive: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.device.findMany({
      where: {
        companyId: { in: companyIds },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Test Kaydi</p>
          <h1 className={styles.title}>Hareket Ekle</h1>
          <p className={styles.subtitle}>
            Canli RFID okuyucu devreye alinana kadar personel hareketlerini manuel ekleyerek dashboard
            ve raporlari test edebilirsin.
          </p>
        </div>
        <BackLink href="/dashboard/movements" />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        {employees.length === 0 ? (
          <div className={styles.emptyPanel}>
            <h2 className={styles.sectionTitle}>Aktif personel bulunamadi</h2>
            <p className={styles.emptyState}>Hareket kaydi eklemek icin once aktif personel tanimla.</p>
          </div>
        ) : (
          <form action={createAttendanceLogAction} className={styles.formGrid}>
            <input type="hidden" name="returnTo" value="/dashboard/movements" />

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
              <span>Hareket Tipi</span>
              <select name="type" required defaultValue={AttendanceType.ENTRY}>
                {Object.values(AttendanceType).map((item) => (
                  <option key={item} value={item}>
                    {attendanceLabels[item]}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Hareket Tarihi</span>
              <input name="scannedAt" type="datetime-local" required defaultValue={formatInputDate(new Date())} />
            </label>

            <label className={styles.field}>
              <span>Cihaz</span>
              <select name="deviceId" defaultValue="">
                <option value="">Cihaz secilmedi</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} {device.branchLocation ? `- ${device.branchLocation}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span>RFID Kart Numarasi</span>
              <input name="rfidCardId" placeholder="Bos birakilirsa personelin kart numarasi kullanilir" />
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span>Düzeltme Açıklaması</span>
              <textarea name="correctionReason" required placeholder="Bu manuel hareketin eklenme nedenini yazın" />
            </label>

            <div className={styles.fullWidthActionRow}>
              <SubmitButton
                idleLabel="Hareketi Kaydet"
                pendingLabel="Kaydediliyor..."
                className={styles.primaryButton}
              />
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
