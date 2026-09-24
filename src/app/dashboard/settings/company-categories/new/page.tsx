import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { createCompanyCategoryAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";

export default async function NewCompanyCategoryPage() {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN") redirect("/dashboard");

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div><p className={styles.eyebrow}>Firma Kategorisi</p><h1 className={styles.title}>Yeni Kategori</h1></div>
        <BackLink href="/dashboard/settings/company-categories" />
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createCompanyCategoryAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/settings/company-categories" />
          <label className={styles.field}><span>Kategori Adı</span><input name="name" required placeholder="Üretim, Lojistik, Hizmet..." /></label>
          <div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Kategori Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} /></div>
        </form>
      </section>
    </div>
  );
}
