import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { createDepartmentAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";

export default async function NewDepartmentPage() {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div>
          <p className={styles.eyebrow}>Departman</p>
          <h1 className={styles.title}>Departman Ekle</h1>
        </div>
        <BackLink href="/dashboard/settings/departments" />
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createDepartmentAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/settings/departments" />
          <label className={styles.field}>
            <span>Departman Adi</span>
            <input name="name" required placeholder="Uretim, Depo, Muhasebe..." />
          </label>
          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Departman Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>
    </div>
  );
}
