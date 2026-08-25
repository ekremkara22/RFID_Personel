import Link from "next/link";
import { redirect } from "next/navigation";
import { LeaveApprovalStatus, LeaveDurationType, LeaveType } from "@/generated/prisma/client";
import { createLeaveRequestAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

const leaveTypeLabels = {
  ANNUAL: "Yillik izin", EXCUSE: "Mazeret izni", UNPAID: "Ucretsiz izin", MEDICAL: "Saglik raporu",
  ADMINISTRATIVE: "Idari izin", HOURLY: "Saatlik izin", HALF_DAY: "Yarim gun izin",
} as const;
const durationLabels = { FULL_DAY: "Tam gun", HALF_DAY: "Yarim gun", HOURLY: "Saatlik" } as const;
const statusLabels = { PENDING: "Bekliyor", APPROVED: "Onaylandi", REJECTED: "Reddedildi" } as const;

export default async function NewLeavePage() {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");
  const employees = await prisma.employee.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div><p className={styles.eyebrow}>Izin</p><h1 className={styles.title}>Izin / Rapor Ekle</h1></div>
        <Link href="/dashboard/leaves" className={styles.inlineAction}>Listeye Don</Link>
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createLeaveRequestAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/leaves" />
          <label className={styles.field}><span>Personel</span><select name="employeeId" required defaultValue=""><option value="" disabled>Personel sec</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} - {e.department}</option>)}</select></label>
          <label className={styles.field}><span>Izin Turu</span><select name="type" defaultValue={LeaveType.ANNUAL}>{Object.values(LeaveType).map((t) => <option key={t} value={t}>{leaveTypeLabels[t]}</option>)}</select></label>
          <label className={styles.field}><span>Kapsam</span><select name="durationType" defaultValue={LeaveDurationType.FULL_DAY}>{Object.values(LeaveDurationType).map((t) => <option key={t} value={t}>{durationLabels[t]}</option>)}</select></label>
          <label className={styles.field}><span>Onay Durumu</span><select name="approvalStatus" defaultValue={LeaveApprovalStatus.APPROVED}>{Object.values(LeaveApprovalStatus).map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label>
          <label className={styles.field}><span>Baslangic Tarihi</span><input name="startDate" type="date" required /></label>
          <label className={styles.field}><span>Bitis Tarihi</span><input name="endDate" type="date" required /></label>
          <label className={styles.field}><span>Baslangic Saati</span><input name="startTime" type="time" /></label>
          <label className={styles.field}><span>Bitis Saati</span><input name="endTime" type="time" /></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>Aciklama</span><textarea name="description" /></label>
          <div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Izin Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} /></div>
        </form>
      </section>
    </div>
  );
}
