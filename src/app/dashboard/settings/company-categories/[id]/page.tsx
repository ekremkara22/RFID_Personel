import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { deleteCompanyCategoryAction, updateCompanyCategoryAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { parseRouteId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";

export default async function CompanyCategoryDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN") redirect("/dashboard");

  const id = parseRouteId((await props.params).id);
  const category = await prisma.companyCategory.findUnique({ where: { id } });
  if (!category) notFound();
  const companyCount = await prisma.company.count({ where: { category: category.name } });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div><p className={styles.eyebrow}>Firma Kategorisi</p><h1 className={styles.title}>{category.name}</h1><p className={styles.subtitle}>{companyCount} firma bu kategoriyi kullanıyor.</p></div>
        <BackLink href="/dashboard/settings/company-categories" />
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateCompanyCategoryAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/settings/company-categories" />
          <input type="hidden" name="categoryId" value={category.id} />
          <label className={styles.field}><span>Kategori Adı</span><input name="name" defaultValue={category.name} required /></label>
          <label className={styles.checkField}><input name="isActive" type="checkbox" defaultChecked={category.isActive} /><span>Aktif</span></label>
          <div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Güncelle" pendingLabel="Güncelleniyor..." className={styles.primaryButton} /></div>
        </form>
        <form action={deleteCompanyCategoryAction} className={styles.dangerForm}>
          <input type="hidden" name="categoryId" value={category.id} />
          <SubmitButton idleLabel="Kategoriyi Sil" pendingLabel="Siliniyor..." className={styles.dangerButton} />
        </form>
      </section>
    </div>
  );
}
