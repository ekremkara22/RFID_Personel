import Link from "next/link";
import { redirect } from "next/navigation";
import { createCompanyRoleAction } from "@/app/dashboard/access-actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { roleEditorModules } from "@/lib/role-editor-options";
import { requireSessionUser } from "@/lib/session";
import { RoleEditor } from "../role-editor";
import styles from "../../../page.module.css";
import ui from "../../../management.module.css";

export default async function NewRolePage() {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) redirect("/dashboard/access/roles");
  const modules = roleEditorModules(authorization.modules, authorization.permissions);
  return <div className={`${styles.page} ${ui.managementPage}`}><header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>Rol tanımı</p><h1 className={ui.pageTitle}>Yeni Rol</h1><p className={ui.pageDescription}>Önce modülü, ardından o modüldeki ekran ve işlem yetkilerini seçin.</p></div><Link href="/dashboard/access/roles" className={ui.secondaryAction}>Listeye dön</Link></header><section className={ui.surface}><form action={createCompanyRoleAction} className={styles.formGrid}><label className={styles.field}><span>Rol adı</span><input name="name" required/></label><label className={styles.field}><span>Açıklama</span><input name="description"/></label><div className={styles.fullWidth}><RoleEditor modules={modules} selectedModules={modules[0] ? [modules[0].key] : []} selectedPermissions={[]}/></div><div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Rolü Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton}/></div></form></section></div>;
}
