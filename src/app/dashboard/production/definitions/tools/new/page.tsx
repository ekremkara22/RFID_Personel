import Link from "next/link";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { createToolAction } from "@/modules/production/actions";
import ui from "../../../../management.module.css";

export default async function NewToolPage() {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.WORK_CENTER_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>Kalıp ve Ekipman</p><h1 className={ui.pageTitle}>Yeni kalıp veya ekipman tanımla</h1><p className={ui.pageDescription}>Üretim planında kullanılacak kalıp, aparat veya ekipmanın temel bilgilerini girin.</p></div><div className={ui.headerActions}><Link className={ui.secondaryAction} href="/dashboard/production/definitions/tools">Listeye dön</Link></div></header>
    <section className={ui.surface}><form action={createToolAction} className={ui.formShell}><div className={ui.formGrid}><label className={ui.formField}><span>Kod</span><input name="code" required maxLength={64} placeholder="KLP-001"/></label><label className={ui.formField}><span>Ad</span><input name="name" required maxLength={160} placeholder="Kapak kalıbı"/></label><label className={ui.formField}><span>Tür</span><input name="toolType" maxLength={80} placeholder="Kalıp, aparat, fikstür..."/></label><label className={`${ui.formField} ${ui.formFullWidth}`}><span>Açıklama</span><textarea name="description" placeholder="İsteğe bağlı açıklama"/></label></div><div className={ui.formActions}><button className={ui.primaryAction}>Kaydı oluştur</button></div></form></section>
  </div>;
}
