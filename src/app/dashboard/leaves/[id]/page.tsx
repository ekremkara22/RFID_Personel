import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { LeaveApprovalStatus, LeaveDurationType, LeaveType } from "@/generated/prisma/client";
import { deleteLeaveRequestAction, updateLeaveRequestAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { queryRepository } from "@/modules/shared/query-repository";
import { parseRouteId } from "@/lib/ids";
import { requireSessionUser } from "@/lib/session";
import { can, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import styles from "../../page.module.css";
import ui from "../../management.module.css";

const leaveTypeLabels = {
  ANNUAL: "Yillik izin",
  EXCUSE: "Mazeret izni",
  UNPAID: "Ucretsiz izin",
  MEDICAL: "Saglik raporu",
  ADMINISTRATIVE: "Idari izin",
  HOURLY: "Saatlik izin",
  HALF_DAY: "Yarim gun izin",
} as const;
const durationLabels = { FULL_DAY: "Tam gun", HALF_DAY: "Yarim gun", HOURLY: "Saatlik" } as const;
const statusLabels = { PENDING: "Bekliyor", APPROVED: "Onaylandi", REJECTED: "Reddedildi" } as const;

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function LeaveDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user, authorization } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");
  const id = parseRouteId((await props.params).id);
  const [leave, employees] = await Promise.all([
    queryRepository.leaveRequest.findFirst({ where: { id, companyId: user.companyId, employee: employeeScopeWhere(authorization) }, include: { employee: true } }),
    queryRepository.employee.findMany({ where: { ...employeeScopeWhere(authorization), isActive: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
  ]);
  if (!leave) notFound();

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Izin Detay</p>
          <h1 className={styles.title}>{leave.employee.firstName} {leave.employee.lastName}</h1>
          <p className={styles.subtitle}>Izin talebinin turunu, tarihlerini, saatlerini ve onay durumunu duzenleyin.</p>
        </div>
        <BackLink href="/dashboard/leaves" />
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateLeaveRequestAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/leaves" />
          <input type="hidden" name="leaveId" value={leave.id} />
          {can(authorization, PERMISSIONS.LEAVE_APPROVE) ? <label className={styles.field}>
            <span>Personel</span>
            <select name="employeeId" required defaultValue={leave.employeeId}>
              {employees.some((employee) => employee.id === leave.employeeId) ? null : (
                <option value={leave.employeeId}>{leave.employee.firstName} {leave.employee.lastName} - {leave.employee.department}</option>
              )}
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} - {employee.department}</option>
              ))}
            </select>
          </label> : (
            <input type="hidden" name="approvalStatus" value={leave.approvalStatus}/>
          )}
          <label className={styles.field}>
            <span>Izin Turu</span>
            <select name="type" defaultValue={leave.type}>
              {Object.values(LeaveType).map((type) => <option key={type} value={type}>{leaveTypeLabels[type]}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Kapsam</span>
            <select name="durationType" defaultValue={leave.durationType}>
              {Object.values(LeaveDurationType).map((type) => <option key={type} value={type}>{durationLabels[type]}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Onay Durumu</span>
            <select name="approvalStatus" defaultValue={leave.approvalStatus}>
              {Object.values(LeaveApprovalStatus).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </label>
          <label className={styles.field}><span>Baslangic Tarihi</span><input name="startDate" type="date" defaultValue={formatDateInput(leave.startDate)} required /></label>
          <label className={styles.field}><span>Bitis Tarihi</span><input name="endDate" type="date" defaultValue={formatDateInput(leave.endDate)} required /></label>
          <label className={styles.field}><span>Baslangic Saati</span><input name="startTime" type="time" defaultValue={leave.startTime ?? ""} /></label>
          <label className={styles.field}><span>Bitis Saati</span><input name="endTime" type="time" defaultValue={leave.endTime ?? ""} /></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>Aciklama</span><textarea name="description" defaultValue={leave.description ?? ""} /></label>
          <div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Izin Talebini Guncelle" pendingLabel="Guncelleniyor..." className={styles.primaryButton} /></div>
        </form>
      </section>
      {can(authorization, PERMISSIONS.LEAVE_DELETE) ? <section className={ui.dangerZone}><div><h3>İzin kaydını sil</h3><p>Bu işlem izin kaydını kaldırır; devam etmeden önce tarihleri kontrol edin.</p></div><form action={deleteLeaveRequestAction}><input type="hidden" name="returnTo" value="/dashboard/leaves" /><input type="hidden" name="leaveId" value={leave.id} /><SubmitButton idleLabel="İzin Kaydını Sil" pendingLabel="Siliniyor..." className={ui.dangerAction} /></form></section> : null}
    </div>
  );
}
