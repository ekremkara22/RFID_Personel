import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePlus, Filter, Search } from "lucide-react";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import ui from "../../management.module.css";

export default async function DepartmentsPage(props: {
  searchParams?: Promise<{ q?: string; categoryId?: string }>;
}) {
  const { user, authorization } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !authorization.companyId) redirect("/dashboard");

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const categories = await queryRepository.departmentCategory.findMany({ where: { companyId: authorization.companyId }, orderBy: { name: "asc" } });
  const requestedCategoryId = Number(searchParams.categoryId);
  const categoryId = categories.some((item) => item.id === requestedCategoryId) ? requestedCategoryId : null;
  const departments = await queryRepository.department.findMany({
    where: {
      companyId: authorization.companyId,
      ...(query ? { name: { contains: query } } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: true, _count: { select: { employees: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Sabit tanımlar</p>
          <h1 className={ui.pageTitle}>Departmanlar</h1>
          <p className={ui.pageDescription}>Departmanları kategorileriyle birlikte yönetin; personel kategorisi bağlı olduğu departmandan gelir.</p>
        </div>
        <div className={ui.headerActions}>
          <Link href="/dashboard/settings/department-categories" className={ui.secondaryAction}>Kategoriler</Link>
          <Link href="/dashboard/settings/departments/new" className={ui.primaryAction}><CirclePlus size={16} />Departman Ekle</Link>
        </div>
      </header>

      <section className={ui.surface} aria-label="Departman filtreleri">
        <form className={ui.filterBar}>
          <label className={ui.field}><span className={ui.fieldLabel}>Departman ara</span><span className={ui.controlWrap}><Search className={ui.controlIcon} size={16} /><input className={`${ui.control} ${ui.controlWithIcon}`} name="q" defaultValue={query} placeholder="Departman adı" /></span></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Kategori</span><select className={ui.control} name="categoryId" defaultValue={categoryId ?? ""}><option value="">Tüm kategoriler</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button type="submit" className={ui.filterButton}><Filter size={15} />Filtrele</button>
        </form>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Departman listesi</h2><p>Personel sayısı aktif ve pasif kayıtları birlikte gösterir.</p></div><span className={ui.countBadge}>{departments.length} kayıt</span></div>
        <div className={ui.tableViewport}>
          <table className={ui.dataTable}>
            <thead><tr><th>Departman</th><th>Kategori</th><th>Personel</th><th>Durum</th><th>İşlem</th></tr></thead>
            <tbody>
              {departments.length === 0 ? (
                <tr><td colSpan={5} className={ui.emptyCell}>Filtrelere uygun departman bulunamadı.</td></tr>
              ) : departments.map((department) => (
                <tr key={department.id}>
                  <td><span className={ui.primaryText}>{department.name}</span></td>
                  <td>{department.category ? department.category.name : <span className={ui.secondaryText}>Kategori yok</span>}</td>
                  <td>{department._count.employees}</td>
                  <td><span className={department.isActive ? ui.statusBadge : ui.statusNeutral}>{department.isActive ? "Aktif" : "Pasif"}</span></td>
                  <td><Link href={`/dashboard/settings/departments/${department.id}`} className={`${ui.rowAction} ${ui.compactAction}`}>Düzenle</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
