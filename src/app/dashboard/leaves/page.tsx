import Link from "next/link";
import { redirect } from "next/navigation";
import { LeaveApprovalStatus, LeaveDurationType, LeaveType } from "@/generated/prisma/client";
import { deleteLeaveRequestAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";

const leaveTypeLabels: Record<LeaveType, string> = {
  ANNUAL: "Yillik izin",
  EXCUSE: "Mazeret izni",
  UNPAID: "Ucretsiz izin",
  MEDICAL: "Saglik raporu",
  ADMINISTRATIVE: "Idari izin",
  HOURLY: "Saatlik izin",
  HALF_DAY: "Yarim gun izin",
};
const durationLabels: Record<LeaveDurationType, string> = {
  FULL_DAY: "Tam gun",
  HALF_DAY: "Yarim gun",
  HOURLY: "Saatlik",
};
const statusLabels: Record<LeaveApprovalStatus, string> = {
  PENDING: "Bekliyor",
  APPROVED: "Onaylandi",
  REJECTED: "Reddedildi",
};
function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(date);
}

export default async function LeavesPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");

  const searchParams = (await props.searchParams) ?? {};
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      companyId: user.companyId,
    },
    include: { employee: true },
    orderBy: { startDate: "desc" },
    take: 300,
  });
  const visibleLeaves = query
    ? leaves.filter((leave) => {
        const haystack = `${leave.employee.firstName} ${leave.employee.lastName} ${leave.description ?? ""}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
    : leaves;

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Izin ve Rapor Yonetimi</p>
          <h1 className={styles.title}>Personel Izinleri</h1>
          <p className={styles.subtitle}>Izinleri tablo olarak listele, ara, yeni kayit ekle ve detay sayfasinda incele.</p>
        </div>
        <Link href="/dashboard/leaves/new" className={styles.primaryLinkButton}>Izin Ekle</Link>
      </section>
      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.listToolbar}>
          <form className={styles.searchForm}>
            <input name="q" defaultValue={query} placeholder="Personel veya aciklama ara" />
            <button type="submit">Ara</button>
          </form>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Personel</th><th>Izin Turu</th><th>Tarih</th><th>Saat</th><th>Durum</th><th>Islem</th><th>Sil</th></tr>
            </thead>
            <tbody>
              {visibleLeaves.length === 0 ? (
                <tr><td colSpan={7} className={styles.emptyCell}>Kayit bulunamadi.</td></tr>
              ) : visibleLeaves.map((leave) => (
                <tr key={leave.id}>
                  <td>{leave.employee.firstName} {leave.employee.lastName}<p className={styles.tableSubText}>{leave.employee.department}</p></td>
                  <td>{leaveTypeLabels[leave.type]}</td>
                  <td>{formatDate(leave.startDate)} - {formatDate(leave.endDate)}<p className={styles.tableSubText}>{durationLabels[leave.durationType]}</p></td>
                  <td>{leave.startTime || leave.endTime ? `${leave.startTime ?? "-"} / ${leave.endTime ?? "-"}` : "-"}</td>
                  <td>{statusLabels[leave.approvalStatus]}</td>
                  <td><Link href={`/dashboard/leaves/${leave.id}`} className={styles.inlineAction}>Incele</Link></td>
                  <td>
                    <form action={deleteLeaveRequestAction}>
                      <input type="hidden" name="returnTo" value="/dashboard/leaves" />
                      <input type="hidden" name="leaveId" value={leave.id} />
                      <SubmitButton idleLabel="Sil" pendingLabel="..." className={styles.dangerMiniButton} />
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
