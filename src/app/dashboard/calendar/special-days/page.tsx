import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarScopeType, SpecialDayType } from "@/generated/prisma/client";
import { createCalendarSpecialDayAction, updateCalendarSpecialDayAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { formatDate, formatDateInput, scopeLabels, specialDayTypeLabels } from "../calendar-labels";

const specialTypes = Object.values(SpecialDayType).filter((type) => type !== SpecialDayType.OFFICIAL_HOLIDAY);

export default async function CalendarSpecialDaysPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const [records, branches, departments, employees] = await Promise.all([
    prisma.calendarSpecialDay.findMany({
      where: {
        companyId: user.companyId,
        specialDayType: { not: SpecialDayType.OFFICIAL_HOLIDAY },
        ...(query ? { name: { contains: query } } : {}),
      },
      include: { branch: true, department: true, employee: true },
      orderBy: { dateFrom: "desc" },
      take: 200,
    }),
    prisma.branch.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { companyId: user.companyId }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
  ]);

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Calisma Takvimi</p>
          <h1 className={styles.title}>Sirket Ozel Gunleri</h1>
          <p className={styles.subtitle}>
            Sirket, sube, departman veya personel kapsaminda tatil, yarim calisma ya da ek calisma gunu tanimlayin.
          </p>
        </div>
        <Link href="#new-record" className={styles.primaryLinkButton}>Ozel Gun Ekle</Link>
      </section>

      <section id="new-record" className={`glass-panel ${styles.sectionCard}`}>
        <form action={createCalendarSpecialDayAction} className={styles.formGrid}>
          <label className={styles.field}>
            <span>Kayit Adi</span>
            <input name="name" placeholder="Uretim cumartesi mesaisi" required />
          </label>
          <label className={styles.field}>
            <span>Gun Turu</span>
            <select name="specialDayType" defaultValue={SpecialDayType.EXTRA_WORK}>
              {specialTypes.map((type) => <option key={type} value={type}>{specialDayTypeLabels[type]}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Baslangic</span>
            <input name="dateFrom" type="date" required />
          </label>
          <label className={styles.field}>
            <span>Bitis</span>
            <input name="dateTo" type="date" required />
          </label>
          <label className={styles.field}>
            <span>Kapsam</span>
            <select name="scopeType" defaultValue={CalendarScopeType.COMPANY}>
              {Object.values(CalendarScopeType).map((scope) => <option key={scope} value={scope}>{scopeLabels[scope]}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Sube</span>
            <select name="branchId" defaultValue="">
              <option value="">Secilmedi</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Departman</span>
            <select name="departmentId" defaultValue="">
              <option value="">Secilmedi</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Personel</span>
            <select name="employeeId" defaultValue="">
              <option value="">Secilmedi</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Calisma Baslangic</span>
            <input name="startTime" type="time" />
          </label>
          <label className={styles.field}>
            <span>Calisma Bitis</span>
            <input name="endTime" type="time" />
          </label>
          <label className={styles.field}>
            <span>Mola Dakika</span>
            <input name="breakMinutes" type="number" defaultValue={0} />
          </label>
          <label className={styles.checkboxField}>
            <input name="isHalfDay" type="checkbox" />
            <span>Yarim gun</span>
          </label>
          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Aciklama</span>
            <textarea name="description" />
          </label>
          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Ozel Gun Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={query} placeholder="Ozel gun ara" />
            <button type="submit">Ara</button>
          </form>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kayit</th>
                <th>Tarih</th>
                <th>Kapsam</th>
                <th>Saat</th>
                <th>Durum</th>
                <th>Incele</th>
                <th>Guncelle</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={7} className={styles.emptyCell}>Henuz ozel gun kaydi yok.</td></tr>
              ) : records.map((record) => {
                  const scopeName = record.branch?.name
                    ?? record.department?.name
                    ?? (record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : "-");

                  return (
                    <tr key={record.id}>
                      <td>{record.name}<p className={styles.tableSubText}>{specialDayTypeLabels[record.specialDayType]}</p></td>
                      <td>{formatDate(record.dateFrom)} - {formatDate(record.dateTo)}</td>
                      <td><Link href={`/dashboard/calendar/special-days/${record.id}`} className={styles.inlineAction}>Incele</Link></td>
                      <td>
                        {scopeLabels[record.scopeType]}
                        <p className={styles.tableSubText}>{scopeName}</p>
                      </td>
                      <td>{record.startTime ?? "-"} / {record.endTime ?? "-"}</td>
                      <td>{record.isActive ? "Aktif" : "Pasif"}</td>
                      <td>
                        <form action={updateCalendarSpecialDayAction} className={styles.inlineEditForm}>
                          <input type="hidden" name="specialDayId" value={record.id} />
                          <input name="name" defaultValue={record.name} required />
                          <select name="specialDayType" defaultValue={record.specialDayType}>
                            {specialTypes.map((type) => <option key={type} value={type}>{specialDayTypeLabels[type]}</option>)}
                          </select>
                          <select name="scopeType" defaultValue={record.scopeType}>
                            {Object.values(CalendarScopeType).map((scope) => <option key={scope} value={scope}>{scopeLabels[scope]}</option>)}
                          </select>
                          <select name="branchId" defaultValue={record.branchId ?? ""}>
                            <option value="">Sube yok</option>
                            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                          </select>
                          <select name="departmentId" defaultValue={record.departmentId ?? ""}>
                            <option value="">Departman yok</option>
                            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                          </select>
                          <select name="employeeId" defaultValue={record.employeeId ?? ""}>
                            <option value="">Personel yok</option>
                            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
                          </select>
                          <input name="dateFrom" type="date" defaultValue={formatDateInput(record.dateFrom)} required />
                          <input name="dateTo" type="date" defaultValue={formatDateInput(record.dateTo)} required />
                          <input name="startTime" type="time" defaultValue={record.startTime ?? ""} />
                          <input name="endTime" type="time" defaultValue={record.endTime ?? ""} />
                          <input name="breakMinutes" type="number" defaultValue={record.breakMinutes} />
                          <label><input name="isHalfDay" type="checkbox" defaultChecked={record.isHalfDay} /> Yarim</label>
                          <label><input name="isActive" type="checkbox" defaultChecked={record.isActive} /> Aktif</label>
                          <input name="changeReason" placeholder="Degisiklik nedeni" />
                          <SubmitButton idleLabel="Kaydet" pendingLabel="..." className={styles.smallButton} />
                        </form>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
