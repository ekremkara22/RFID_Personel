import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAttendanceLogAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { AttendanceType } from "@/generated/prisma/client";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import { assertPermission, deviceScopeWhere, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import styles from "../../page.module.css";
import ui from "../../management.module.css";

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

export default async function NewMovementPage(props: {
  searchParams: Promise<{ employeeId?: string; returnTo?: string }>;
}) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.MOVEMENT_CREATE);
  if (!authorization.companyId) redirect("/dashboard");
  const searchParams = await props.searchParams;
  const requestedEmployeeId = Number(searchParams.employeeId);
  const returnTo = searchParams.returnTo?.startsWith("/dashboard/")
    ? searchParams.returnTo
    : "/dashboard/movements";
  const [employees, devices] = await Promise.all([
    queryRepository.employee.findMany({
      where: {
        ...employeeScopeWhere(authorization),
        isActive: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    queryRepository.device.findMany({
      where: {
        ...deviceScopeWhere(authorization),
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>Manuel hareket</p><h1 className={ui.pageTitle}>Hareket Ekle</h1><p className={ui.pageDescription}>Eksik veya test amaçlı hareketi açıklamasıyla birlikte oluşturun. İşlem audit geçmişine kaydedilir.</p></div><div className={ui.headerActions}><Link href={returnTo} className={ui.secondaryAction}><ArrowLeft size={16} />Geri dön</Link></div></header>

      <section className={ui.surface}>
        {employees.length === 0 ? (
          <div className={styles.emptyPanel}>
            <h2 className={styles.sectionTitle}>Aktif personel bulunamadi</h2>
            <p className={styles.emptyState}>Hareket kaydi eklemek icin once aktif personel tanimla.</p>
          </div>
        ) : (
          <form action={createAttendanceLogAction} className={ui.formGrid}>
            <input type="hidden" name="returnTo" value={returnTo} />

            <label className={ui.formField}>
              <span>Personel</span>
              <select name="employeeId" required defaultValue={employees.some((employee) => employee.id === requestedEmployeeId) ? requestedEmployeeId : ""}>
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

            <label className={ui.formField}>
              <span>Hareket Tipi</span>
              <select name="type" required defaultValue={AttendanceType.ENTRY}>
                {Object.values(AttendanceType).map((item) => (
                  <option key={item} value={item}>
                    {attendanceLabels[item]}
                  </option>
                ))}
              </select>
            </label>

            <label className={ui.formField}>
              <span>Hareket Tarihi</span>
              <input name="scannedAt" type="datetime-local" required defaultValue={formatInputDate(new Date())} />
            </label>

            <label className={ui.formField}>
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

            <label className={`${ui.formField} ${ui.formFullWidth}`}>
              <span>RFID Kart Numarasi</span>
              <input name="rfidCardId" placeholder="Bos birakilirsa personelin kart numarasi kullanilir" />
            </label>

            <label className={`${ui.formField} ${ui.formFullWidth}`}>
              <span>Düzeltme Açıklaması</span>
              <textarea name="correctionReason" required placeholder="Bu manuel hareketin eklenme nedenini yazın" />
            </label>

            <div className={`${ui.formActions} ${ui.formFullWidth}`}>
              <SubmitButton
                idleLabel="Hareketi Kaydet"
                pendingLabel="Kaydediliyor..."
                className={ui.primaryAction}
              />
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
