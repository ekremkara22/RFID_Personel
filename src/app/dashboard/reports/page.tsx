import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, FileBarChart, FileLock2, History, Timer, Users } from "lucide-react";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";
import ui from "../management.module.css";

export default async function ReportsPage() {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Analiz ve dışa aktarma</p>
          <h1 className={ui.pageTitle}>PDKS Rapor Merkezi</h1>
          <p className={ui.pageDescription}>Personel, departman, gecikme, mola, audit ve aylık puantaj raporlarına tek yerden ulaşın.</p>
        </div>
      </header>

      <section className={ui.navigationGrid}>
        <Link href="/dashboard/reports/personnel" className={ui.navigationCard}>
          <span className={ui.navigationCardIcon}><Users size={19} /></span>
            <div>
              <h2>Personel PDKS Raporu</h2>
              <p>Personelin işe giriş-çıkış, izin ve kontrol gerektiren durumları.</p>
            </div>
        </Link>

        <Link href="/dashboard/reports/departments" className={ui.navigationCard}>
          <span className={ui.navigationCardIcon}><FileBarChart size={19} /></span>
            <div>
              <h2>Departman Puantaj Raporu</h2>
              <p>Departman bazlı giriş, izin, hareket yok ve geç kalma oranları.</p>
            </div>
        </Link>

        <Link href="/dashboard/reports/late-arrivals" className={ui.navigationCard}>
          <span className={ui.navigationCardIcon}><Timer size={19} /></span>
            <div>
              <h2>Geç Kalma Raporu</h2>
              <p>Tarih, firma ve şubeye göre geç kalma adedi ve toplam dakika.</p>
            </div>
        </Link>

        <Link href="/dashboard/reports/daily-attendance" className={ui.navigationCard}>
          <span className={ui.navigationCardIcon}><Clock3 size={19} /></span>
            <div>
              <h2>Günlük Mola ve Mesai Raporu</h2>
              <p>Giriş, toplam mola, çıkış, geç kalma ve erken çıkış tek satırda.</p>
            </div>
        </Link>

        <Link href="/dashboard/reports/audit" className={ui.navigationCard}>
          <span className={ui.navigationCardIcon}><History size={19} /></span>
            <div>
              <h2>Audit Raporu</h2>
              <p>Manuel hareket ekleme, düzenleme ve silme işlemlerinin değişiklik geçmişi.</p>
            </div>
        </Link>

        <Link href="/dashboard/reports/payroll" className={ui.navigationCard}>
          <span className={ui.navigationCardIcon}><FileLock2 size={19} /></span>
            <div>
              <h2>Aylık Puantaj Onayı</h2>
              <p>Dönem seçimi, ayrıntılı hareket çıktısı, onay ve değişmez dönem kilidi.</p>
            </div>
        </Link>
      </section>
    </div>
  );
}
