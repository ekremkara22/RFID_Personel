import { redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { createBranchAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";

export default async function NewBranchPage() {
  const { user } = await requireSessionUser();
  if (user.role !== "SUPERADMIN" && (user.role !== "COMPANY_ADMIN" || !user.companyId)) redirect("/dashboard");
  const currentCompanyId = user.companyId ?? "";

  const companies = await prisma.company.findMany({
    where: {
      ...(user.role === "COMPANY_ADMIN" ? { id: currentCompanyId } : {}),
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div><p className={styles.eyebrow}>Sube</p><h1 className={styles.title}>Sube Ekle</h1></div>
        <BackLink href="/dashboard/settings/branches" />
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={createBranchAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/settings/branches" />
          <label className={styles.field}>
            <span>Firma</span>
            <select name="companyId" required defaultValue={currentCompanyId}>
              <option value="" disabled>Firma sec</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </label>
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
