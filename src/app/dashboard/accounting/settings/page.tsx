import { redirect } from "next/navigation";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { getSalaryParameters } from "@/modules/accounting/repository";
import { createDepartmentQuickAction, createPositionAction, deleteDepartmentQuickAction, deletePositionAction } from "@/modules/settings/definition-actions";
import { queryRepository } from "@/modules/shared/query-repository";
import { DefinitionChips } from "./definition-chips";
import { SalaryParametersForm } from "./parameters-form";
import ui from "../../management.module.css";
import styles from "../accounting.module.css";

export default async function AccountingSettingsPage() {
  const { authorization } = await requireSessionUser();
  if (!can(authorization, PERMISSIONS.ACCOUNTING_SALARY_VIEW)) redirect("/dashboard/accounting");
  const companyId = authorization.companyId;
  const canManageDefinitions = !!companyId && can(authorization, PERMISSIONS.SETTINGS_MANAGE);

  const [parameters, departments, positions] = await Promise.all([
    getSalaryParameters(companyId),
    companyId ? queryRepository.department.findMany({ where: { companyId, isActive: true }, include: { _count: { select: { employees: true } } }, orderBy: { name: "asc" } }) : [],
    companyId ? queryRepository.position.findMany({ where: { companyId, isActive: true }, include: { _count: { select: { employees: true } } }, orderBy: { name: "asc" } }) : [],
  ]);

  return (
    <div className={ui.managementPage}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Muhasebe · Sabit Tanımlar</p>
          <h1 className={ui.pageTitle}>Sabit Tanımlar</h1>
          <p className={ui.pageDescription}>Maaş hesaplama ve bütçe raporunda kullanılan bordro sabitleri ile departman ve pozisyon tanımları. Değerler değiştirildiğinde hesaplama ekranları bu tanımları kullanır.</p>
        </div>
        <span className={ui.countBadge}>{parameters.year}</span>
      </header>

      <SalaryParametersForm initial={parameters} canManage={can(authorization, PERMISSIONS.ACCOUNTING_PARAMETERS_MANAGE)} />

      <div className={styles.paramGrid}>
        <DefinitionChips
          title="Departman tanımları"
          items={departments.map((item) => ({ id: item.id, name: item.name, inUse: item._count.employees > 0 }))}
          placeholder="Yeni departman"
          createAction={createDepartmentQuickAction}
          deleteAction={deleteDepartmentQuickAction}
          canManage={canManageDefinitions}
          manageHref="/dashboard/settings/departments"
        />
        <DefinitionChips
          title="Pozisyon tanımları"
          items={positions.map((item) => ({ id: item.id, name: item.name, inUse: item._count.employees > 0 }))}
          placeholder="Yeni pozisyon"
          createAction={createPositionAction}
          deleteAction={deletePositionAction}
          canManage={canManageDefinitions}
          manageHref="/dashboard/settings/positions"
        />
      </div>
    </div>
  );
}
