import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { createManagerAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";

export default async function NewManagerPage() {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");
  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div><p className={styles.eyebrow}>Yonetici</p><h1 className={styles.title}>Yonetici Ekle</h1></div>
        <BackLink href="/dashboard/settings/managers" />
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createManagerAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/settings/managers" />
          <label className={styles.field}><span>Yonetici Ad Soyad</span><input name="name" required /></label>
          <label className={styles.field}><span>Mail Adresi</span><input name="email" type="email" /></label>
          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Yonetici Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>
    </div>
  );
}
