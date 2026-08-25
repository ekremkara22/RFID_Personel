import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarScopeType, SpecialDayType } from "@/generated/prisma/client";
import { updateCalendarSpecialDayAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";
import { formatDateInput, scopeLabels, specialDayTypeLabels } from "../../calendar-labels";

export default async function SpecialDayDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");

  const { id } = await props.params;
  const [record, branches, departments, employees] = await Promise.all([
    prisma.calendarSpecialDay.findFirst({ where: { id, companyId: user.companyId } }),
    prisma.branch.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { companyId: user.companyId }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
  ]);

  if (!record) notFound();
  const returnPath = record.specialDayType === SpecialDayType.OFFICIAL_HOLIDAY
    ? "/dashboard/calendar/official-holidays"
    : "/dashboard/calendar/special-days";

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Takvim Kaydi</p>
          <h1 className={styles.title}>{record.name}</h1>
          <p className={styles.subtitle}>{specialDayTypeLabels[record.specialDayType]}</p>
        </div>
        <Link href={returnPath} className={styles.inlineAction}>Listeye Don</Link>
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateCalendarSpecialDayAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value={returnPath} />
          <input type="hidden" name="specialDayId" value={record.id} />
          <label className={styles.field}><span>Kayit Adi</span><input name="name" defaultValue={record.name} required /></label>
          <label className={styles.field}><span>Gun Turu</span><select name="specialDayType" defaultValue={record.specialDayType}>{Object.values(SpecialDayType).map((type) => <option key={type} value={type}>{specialDayTypeLabels[type]}</option>)}</select></label>
          <label className={styles.field}><span>Baslangic</span><input name="dateFrom" type="date" defaultValue={formatDateInput(record.dateFrom)} required /></label>
          <label className={styles.field}><span>Bitis</span><input name="dateTo" type="date" defaultValue={formatDateInput(record.dateTo)} required /></label>
          <label className={styles.field}><span>Kapsam</span><select name="scopeType" defaultValue={record.scopeType}>{Object.values(CalendarScopeType).map((scope) => <option key={scope} value={scope}>{scopeLabels[scope]}</option>)}</select></label>
          <label className={styles.field}><span>Sube</span><select name="branchId" defaultValue={record.branchId ?? ""}><option value="">Secilmedi</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label className={styles.field}><span>Departman</span><select name="departmentId" defaultValue={record.departmentId ?? ""}><option value="">Secilmedi</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
          <label className={styles.field}><span>Personel</span><select name="employeeId" defaultValue={record.employeeId ?? ""}><option value="">Secilmedi</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
          <label className={styles.field}><span>Baslangic Saati</span><input name="startTime" type="time" defaultValue={record.startTime ?? ""} /></label>
          <label className={styles.field}><span>Bitis Saati</span><input name="endTime" type="time" defaultValue={record.endTime ?? ""} /></label>
          <label className={styles.field}><span>Mola Dakika</span><input name="breakMinutes" type="number" defaultValue={record.breakMinutes} /></label>
          <label className={styles.checkField}><input name="isHalfDay" type="checkbox" defaultChecked={record.isHalfDay} /><span>Yarim gun</span></label>
          <label className={styles.checkField}><input name="repeatsYearly" type="checkbox" defaultChecked={record.repeatsYearly} /><span>Her yil tekrarlar</span></label>
          <label className={styles.checkField}><input name="isActive" type="checkbox" defaultChecked={record.isActive} /><span>Aktif</span></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>Aciklama</span><textarea name="description" defaultValue={record.description ?? ""} /></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>Degisiklik Nedeni</span><input name="changeReason" placeholder="Degisiklik nedeni" /></label>
          <div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Guncelle" pendingLabel="Guncelleniyor..." className={styles.primaryButton} /></div>
        </form>
      </section>
    </div>
  );
}
