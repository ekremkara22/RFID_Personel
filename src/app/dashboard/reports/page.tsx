import Link from "next/link";
import { redirect } from "next/navigation";
import { FileBarChart, Users } from "lucide-react";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";

export default async function ReportsPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Raporlar</p>
          <h1 className={styles.title}>PDKS Rapor Merkezi</h1>
          <p className={styles.subtitle}>
            Her rapor ayrı sayfada açılır; üst yönetime hızlıca kişi veya departman bazlı çıktı alabilirsin.
          </p>
        </div>
      </section>

      <section className={styles.cardGridWide}>
        <Link href="/dashboard/reports/personnel" className={`glass-panel ${styles.companyCardLink}`}>
          <div className={styles.companyCardHeader}>
            <Users size={22} />
            <div>
              <p className={styles.infoCardTitle}>Personel PDKS Raporu</p>
              <p className={styles.infoCardMeta}>Personelin işe gidip gelme, izin ve dikkat durumları.</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/reports/departments" className={`glass-panel ${styles.companyCardLink}`}>
          <div className={styles.companyCardHeader}>
            <FileBarChart size={22} />
            <div>
              <p className={styles.infoCardTitle}>Departman Puantaj Raporu</p>
              <p className={styles.infoCardMeta}>Departman bazlı giriş, izin, hareket yok ve geç kalma oranları.</p>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
