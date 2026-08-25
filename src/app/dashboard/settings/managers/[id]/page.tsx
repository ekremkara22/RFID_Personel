import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/app/dashboard/back-link";
import { updateManagerAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";

export default async function ManagerDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");
  const { id } = await props.params;
  const manager = await prisma.manager.findFirst({ where: { id, companyId: user.companyId } });
  if (!manager) notFound();
  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard} ${styles.heroWithBack}`}>
        <div><p className={styles.eyebrow}>Yonetici Detay</p><h1 className={styles.title}>{manager.name}</h1></div>
        <BackLink href="/dashboard/settings/managers" />
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateManagerAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/settings/managers" />
          <input type="hidden" name="managerId" value={manager.id} />
          <label className={styles.field}><span>Yonetici Ad Soyad</span><input name="name" defaultValue={manager.name} required /></label>
          <label className={styles.field}><span>Mail Adresi</span><input name="email" type="email" defaultValue={manager.email ?? ""} /></label>
          <label className={styles.checkField}><input name="isActive" type="checkbox" defaultChecked={manager.isActive} /><span>Aktif</span></label>
          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Guncelle" pendingLabel="Guncelleniyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>
    </div>
  );
}
