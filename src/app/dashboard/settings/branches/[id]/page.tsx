import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateBranchAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../../page.module.css";

export default async function BranchDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");
  const { id } = await props.params;
  const branch = await prisma.branch.findFirst({ where: { id, companyId: user.companyId } });
  if (!branch) notFound();
  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div><p className={styles.eyebrow}>Sube Detay</p><h1 className={styles.title}>{branch.name}</h1></div>
        <Link href="/dashboard/settings/branches" className={styles.inlineAction}>Listeye Don</Link>
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateBranchAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/settings/branches" />
          <input type="hidden" name="branchId" value={branch.id} />
          <label className={styles.field}><span>Sube Adi</span><input name="name" defaultValue={branch.name} required /></label>
          <label className={styles.field}><span>Lokasyon</span><input name="location" defaultValue={branch.location ?? ""} /></label>
          <label className={styles.checkField}><input name="isActive" type="checkbox" defaultChecked={branch.isActive} /><span>Aktif</span></label>
          <div className={styles.fullWidthActionRow}>
            <SubmitButton idleLabel="Guncelle" pendingLabel="Guncelleniyor..." className={styles.primaryButton} />
          </div>
        </form>
      </section>
    </div>
  );
}
