import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCompanyRoleAction, updateCompanyRoleAction } from "@/app/dashboard/access-actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { roleEditorModules } from "@/lib/role-editor-options";
import { requireSessionUser } from "@/lib/session";
import { RoleEditor } from "../role-editor";
import styles from "../../../page.module.css";
import ui from "../../../management.module.css";

export default async function RoleDetailPage(props:{params:Promise<{id:string}>}) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.ACCESS_VIEW); if(!authorization.companyId) notFound();
  const role = await prisma.companyRole.findFirst({where:{id:Number((await props.params).id),companyId:authorization.companyId},include:{modules:true,permissions:true,_count:{select:{memberships:true}}}}); if(!role) notFound();
  const canManage=authorization.permissions.has(PERMISSIONS.ACCESS_MANAGE); const modules=roleEditorModules(authorization.modules,authorization.permissions);
  return <div className={`${styles.page} ${ui.managementPage}`}><header className={ui.pageHeader}><div className={ui.headerCopy}><p className={ui.kicker}>Rol inceleme</p><h1 className={ui.pageTitle}>{role.name}</h1><p className={ui.pageDescription}>{role._count.memberships} kullanıcı · {role.isSystem?"Hazır rol":"Özel rol"}</p></div><Link href="/dashboard/access/roles" className={ui.secondaryAction}>Listeye dön</Link></header><section className={ui.surface}><form action={updateCompanyRoleAction} className={styles.formGrid}><input type="hidden" name="roleId" value={role.id}/><label className={styles.field}><span>Rol adı</span><input name="name" defaultValue={role.name} readOnly={!canManage}/></label><label className={styles.field}><span>Açıklama</span><input name="description" defaultValue={role.description ?? ""} readOnly={!canManage}/></label><label className={styles.checkField}><input type="checkbox" name="isActive" defaultChecked={role.isActive} disabled={!canManage}/><span>Aktif rol</span></label><div className={styles.fullWidth}><RoleEditor modules={modules} selectedModules={role.modules.map((item)=>item.moduleKey)} selectedPermissions={role.permissions.map((item)=>item.permission)} readOnly={!canManage}/></div>{canManage?<div className={styles.fullWidthActionRow}><SubmitButton idleLabel="Değişiklikleri Kaydet" pendingLabel="Kaydediliyor..." className={styles.primaryButton}/></div>:null}</form>{canManage&&!role.isSystem&&role._count.memberships===0?<section className={ui.dangerZone}><div><h3>Rolü sil</h3><p>Bu rol hiçbir kullanıcıya bağlı değilse kalıcı olarak silinebilir.</p></div><form action={deleteCompanyRoleAction}><input type="hidden" name="roleId" value={role.id}/><SubmitButton idleLabel="Rolü Sil" pendingLabel="Siliniyor..." className={ui.dangerAction}/></form></section>:null}</section></div>;
}
