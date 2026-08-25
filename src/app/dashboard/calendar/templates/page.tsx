import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import { formatDateInput, formatPlannedDuration } from "../calendar-labels";

export default async function CalendarTemplatesPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const templates = await prisma.workCalendarTemplate.findMany({
    where: {
      companyId: user.companyId,
      ...(query ? { OR: [{ name: { contains: query } }, { code: { contains: query } }] } : {}),
    },
    include: { weekdays: { orderBy: { weekday: "asc" } }, _count: { select: { assignments: true } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Calisma Takvimi</p>
          <h1 className={styles.title}>Takvim Sablonlari</h1>
          <p className={styles.subtitle}>Sablonlari ara, tablo uzerinden listele ve detay ekraninda duzenle.</p>
        </div>
        <Link href="/dashboard/calendar/templates/new" className={styles.primaryLinkButton}>Sablon Ekle</Link>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={query} placeholder="Sablon adi veya kodu ara" />
            <button type="submit">Ara</button>
          </form>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Kod</th><th>Ad</th><th>Gecerlilik</th><th>Atama</th><th>Durum</th><th>Islem</th></tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>Kayit bulunamadi.</td></tr>
              ) : templates.map((template) => (
                <tr key={template.id}>
                  <td>{template.code}</td>
                  <td>
                    {template.name}
                    <p className={styles.tableSubText}>
                      {template.weekdays.filter((day) => day.plannedNetMinutes > 0).length} calisma gunu,
                      {" "}{formatPlannedDuration(template.weekdays.reduce((sum, day) => sum + day.plannedNetMinutes, 0))} haftalik net
                    </p>
                  </td>
                  <td>{formatDateInput(template.validFrom) || "-"} / {formatDateInput(template.validTo) || "-"}</td>
                  <td>{template._count.assignments}</td>
                  <td>{template.isDefault ? "Varsayilan" : template.isActive ? "Aktif" : "Pasif"}</td>
                  <td><Link className={styles.inlineAction} href={`/dashboard/calendar/templates/${template.id}`}>Incele</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
