import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LeaveApprovalStatus } from "@/generated/prisma/client";
import { updateLeaveRequestAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";

const statusLabels = { PENDING: "Bekliyor", APPROVED: "Onaylandi", REJECTED: "Reddedildi" } as const;
function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(date);
}

export default async function LeaveDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");
  const { id } = await props.params;
  const leave = await prisma.leaveRequest.findFirst({ where: { id, companyId: user.companyId }, include: { employee: true } });
  if (!leave) notFound();
  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div><p className={styles.eyebrow}>Izin Detay</p><h1 className={styles.title}>{leave.employee.firstName} {leave.employee.lastName}</h1><p className={styles.subtitle}>{formatDate(leave.startDate)} - {formatDate(leave.endDate)}</p></div>
        <Link href="/dashboard/leaves" className={styles.inlineAction}>Listeye Don</Link>
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <form action={updateLeaveRequestAction} className={styles.formGrid}>
          <input type="hidden" name="returnTo" value="/dashboard/leaves" />
          <input type="hidden" name="leaveId" value={leave.id} />
          <label className={styles.field}><span>Onay Durumu</span><select name="approvalStatus" defaultValue={leave.approvalStatus}>{Object.values(LeaveApprovalStatus).map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>Aciklama</span><textarea name="description" defaultValue={leave.description ?? ""} /></label>
          <div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Guncelle" pendingLabel="Guncelleniyor..." className={styles.primaryButton} /></div>
        </form>
      </section>
    </div>
  );
}
