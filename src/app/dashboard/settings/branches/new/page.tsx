import Link from "next/link";
import { redirect } from "next/navigation";
import { createBranchAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";

export default async function NewBranchPage() {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");
  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div><p className={styles.eyebrow}>Sube</p><h1 className={styles.title}>Sube Ekle</h1></div>
        <Link href="/dashboard/settings/branches" className={styles.inlineAction}>Listeye Don</Link>
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createBranchAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/settings/branches" />
          <label className={styles.field}><span>Sube Adi</span><input name="name" required /></label>
          <label className={styles.field}><span>Lokasyon</span><input name="location" /></label>
          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Sube Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>
    </div>
  );
}
