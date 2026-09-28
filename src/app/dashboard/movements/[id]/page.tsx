import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deleteAttendanceLogAction, updateAttendanceLogAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { AttendanceType } from "@/generated/prisma/client";
import { can, employeeScopeWhere } from "@/lib/authorization";
import { parseRouteId } from "@/lib/ids";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../../page.module.css";
import ui from "../../management.module.css";

const labels: Record<AttendanceType, string> = { ENTRY: "Giriş", EXIT: "Çıkış", BREAK_START: "Mola çıkış", BREAK_END: "Mola giriş", MEAL_START: "Yemek çıkış", MEAL_END: "Yemek giriş" };

function formatInputDate(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date).replace(" ", "T");
}

function formatDate(date?: Date | null) {
  return date ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(date) : "—";
}

export default async function MovementDetailPage(props: { params: Promise<{ id: string }> }) {
  const { user, authorization } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN") redirect("/dashboard");
  const id = parseRouteId((await props.params).id);
  const log = await prisma.attendanceLog.findFirst({ where: { id, employee: employeeScopeWhere(authorization) }, include: { employee: { include: { company: true } }, device: true } });
  if (!log) notFound();

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}><p className={ui.kicker}>Hareket inceleme</p><h1 className={ui.pageTitle}>{log.employee.firstName} {log.employee.lastName}</h1><p className={ui.pageDescription}>{labels[log.type]} · {formatDate(log.scannedAt)}</p></div>
        <div className={ui.headerActions}><Link href="/dashboard/movements" className={ui.secondaryAction}><ArrowLeft size={16} />Hareket listesi</Link></div>
      </header>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Kayıt özeti</h2><p>RFID ve cihazdan gelen ham hareket bilgileri</p></div></div>
        <div className={ui.formGridThree}>
          <div className={ui.contextCard}>Firma: {log.employee.company.name}</div>
          <div className={ui.contextCard}>Şube: {log.employee.branch ?? "Şubesiz"}</div>
          <div className={ui.contextCard}>Departman: {log.employee.department}</div>
          <div className={ui.contextCard}>RFID: {log.rfidCardId ?? log.employee.rfidCardId ?? "—"}</div>
          <div className={ui.contextCard}>Cihaz: {log.device?.name ?? "—"}</div>
          <div className={ui.contextCard}>Sunucuya ulaşma: {formatDate(log.receivedAt)}</div>
        </div>
      </section>

      {can(authorization, PERMISSIONS.MOVEMENT_UPDATE) ? <form action={updateAttendanceLogAction} className={ui.formShell}>
        <input type="hidden" name="logId" value={log.id} /><input type="hidden" name="returnTo" value={`/dashboard/movements/${log.id}`} />
        <section className={ui.formSection}>
          <div className={ui.formSectionHeader}><h2>Hareketi düzelt</h2><p>Değişiklik audit kaydına eski ve yeni değerleriyle yazılır.</p></div>
          <div className={ui.formGrid}>
            <label className={ui.formField}><span>Hareket tipi</span><select name="type" defaultValue={log.type}>{Object.values(AttendanceType).map((type) => <option key={type} value={type}>{labels[type]}</option>)}</select></label>
            <label className={ui.formField}><span>Hareket zamanı</span><input type="datetime-local" name="scannedAt" defaultValue={formatInputDate(log.scannedAt)} required /></label>
            <label className={`${ui.formField} ${ui.formFullWidth}`}><span>Düzeltme açıklaması</span><textarea name="correctionReason" required placeholder="Neden düzeltildiğini açıkça yazın" /></label>
          </div>
        </section>
        <div className={ui.formActions}><SubmitButton idleLabel="Değişiklikleri Kaydet" pendingLabel="Kaydediliyor..." className={ui.primaryAction} /></div>
      </form> : null}

      {can(authorization, PERMISSIONS.MOVEMENT_DELETE) ? <section className={ui.dangerZone}><div><h3>Hareketi sil</h3><p>Silme işlemi audit geçmişinde korunur ve geri alınamaz.</p></div><form action={deleteAttendanceLogAction} className={ui.reviewForm}><input type="hidden" name="logId" value={log.id} /><input type="hidden" name="returnTo" value="/dashboard/movements" /><input name="correctionReason" required placeholder="Silme nedenini yazın" /><SubmitButton idleLabel="Hareketi Sil" pendingLabel="Siliniyor..." className={ui.dangerAction} /></form></section> : null}
    </div>
  );
}
