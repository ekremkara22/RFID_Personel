import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { formatDateInput, scopeLabels } from "../calendar-labels";

export default async function CalendarAssignmentsPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN" && (user.role !== "COMPANY_ADMIN" || !user.companyId)) {
    redirect("/dashboard");
  }

  const currentCompanyId = user.companyId ?? "";
  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim().toLocaleLowerCase("tr-TR") : "";
  const assignments = await prisma.calendarAssignment.findMany({
    where: user.role === "COMPANY_ADMIN" ? { companyId: currentCompanyId } : {},
    include: { company: true, calendarTemplate: true, branch: true, department: true, employee: true },
    orderBy: [{ isActive: "desc" }, { validFrom: "desc" }],
    take: 300,
  });
  const filteredAssignments = query
    ? assignments.filter((assignment) => {
        const scopeName = assignment.branch?.name
          ?? assignment.department?.name
          ?? (assignment.employee ? `${assignment.employee.firstName} ${assignment.employee.lastName}` : "Sirket geneli");
        return [
          assignment.calendarTemplate.name,
          assignment.calendarTemplate.code,
          assignment.company.name,
          assignment.description,
          scopeLabels[assignment.scopeType],
          scopeName,
        ].some((value) => value?.toLocaleLowerCase("tr-TR").includes(query));
      })
    : assignments;

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Calisma Takvimi</p>
          <h1 className={styles.title}>Takvim Atamalari</h1>
          <p className={styles.subtitle}>Sablonlari sirket, sube, departman veya personel kapsaminda listeleyin.</p>
        </div>
        <Link href="/dashboard/calendar/assignments/new" className={styles.primaryLinkButton}>Atama Ekle</Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Sablon, kapsam veya aciklama ara" />
            <button type="submit">Ara</button>
          </form>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sablon</th>
                <th>Firma</th>
                <th>Kapsam</th>
                <th>Tarih</th>
                <th>Oncelik</th>
                <th>Durum</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr><td colSpan={7} className={styles.emptyCell}>Takvim atamasi bulunamadi.</td></tr>
              ) : filteredAssignments.map((assignment) => {
                const scopeName = assignment.branch?.name
                  ?? assignment.department?.name
                  ?? (assignment.employee ? `${assignment.employee.firstName} ${assignment.employee.lastName}` : "Sirket geneli");

                return (
                  <tr key={assignment.id}>
                    <td>{assignment.calendarTemplate.name}<p className={styles.tableSubText}>{assignment.calendarTemplate.code}</p></td>
                    <td>{assignment.company.name}</td>
                    <td>{scopeLabels[assignment.scopeType]}<p className={styles.tableSubText}>{scopeName}</p></td>
                    <td>{formatDateInput(assignment.validFrom)} / {formatDateInput(assignment.validTo) || "-"}</td>
                    <td>{assignment.priority}</td>
                    <td>{assignment.isActive ? "Aktif" : "Pasif"} {assignment.conflictApproved ? "- Cakisma onayli" : ""}</td>
                    <td><Link href={`/dashboard/calendar/assignments/${assignment.id}`} className={styles.inlineAction}>Incele</Link></td>
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
