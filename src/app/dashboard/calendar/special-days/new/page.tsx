import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarScopeType, SpecialDayType } from "@/generated/prisma/client";
import { createCalendarSpecialDayAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";
import { scopeLabels, specialDayTypeLabels } from "../../calendar-labels";

const specialTypes = Object.values(SpecialDayType).filter((type) => type !== SpecialDayType.OFFICIAL_HOLIDAY);

export default async function NewSpecialDayPage() {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");
  const [branches, departments, employees] = await Promise.all([
    prisma.branch.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { companyId: user.companyId }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div><p className={styles.eyebrow}>Ozel Gun</p><h1 className={styles.title}>Ozel Gun Ekle</h1></div>
        <Link href="/dashboard/calendar/special-days" className={styles.inlineAction}>Listeye Don</Link>
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createCalendarSpecialDayAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/calendar/special-days" />
          <label className={styles.field}><span>Kayit Adi</span><input name="name" required /></label>
          <label className={styles.field}><span>Gun Turu</span><select name="specialDayType" defaultValue={SpecialDayType.EXTRA_WORK}>{specialTypes.map((type) => <option key={type} value={type}>{specialDayTypeLabels[type]}</option>)}</select></label>
          <label className={styles.field}><span>Baslangic</span><input name="dateFrom" type="date" required /></label>
          <label className={styles.field}><span>Bitis</span><input name="dateTo" type="date" required /></label>
          <label className={styles.field}><span>Kapsam</span><select name="scopeType" defaultValue={CalendarScopeType.COMPANY}>{Object.values(CalendarScopeType).map((scope) => <option key={scope} value={scope}>{scopeLabels[scope]}</option>)}</select></label>
          <label className={styles.field}><span>Sube</span><select name="branchId" defaultValue=""><option value="">Secilmedi</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label className={styles.field}><span>Departman</span><select name="departmentId" defaultValue=""><option value="">Secilmedi</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
          <label className={styles.field}><span>Personel</span><select name="employeeId" defaultValue=""><option value="">Secilmedi</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}</select></label>
          <label className={styles.field}><span>Calisma Baslangic</span><input name="startTime" type="time" /></label>
          <label className={styles.field}><span>Calisma Bitis</span><input name="endTime" type="time" /></label>
          <label className={styles.field}><span>Mola Dakika</span><input name="breakMinutes" type="number" defaultValue={0} /></label>
          <label className={styles.checkField}><input name="isHalfDay" type="checkbox" /><span>Yarim gun</span></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>Aciklama</span><textarea name="description" /></label>
          <div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Ozel Gun Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} /></div>
        </form>
      </section>
    </div>
  );
}
