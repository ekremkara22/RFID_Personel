import { redirect } from "next/navigation";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
import { createPositionAction, deletePositionAction, updatePositionAction } from "@/modules/settings/definition-actions";
import { queryRepository } from "@/modules/shared/query-repository";
import { SimpleDefinitionPage } from "../simple-definition-page";

export default async function PositionsPage() {
  const { authorization } = await requireSessionUser();
  if (!authorization.companyId || !can(authorization, PERMISSIONS.SETTINGS_MANAGE)) redirect("/dashboard");

  const positions = await queryRepository.position.findMany({
    where: { companyId: authorization.companyId },
    include: { _count: { select: { employees: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <SimpleDefinitionPage
      title="Pozisyonlar"
      description="Personel kartlarında ve bütçe raporunda kullanılan görev/pozisyon tanımlarını yönetin."
      placeholder="Operatör, Muhasebe Uzmanı, Vardiya Amiri..."
      usageLabel="personel"
      items={positions.map((item) => ({ id: item.id, name: item.name, isActive: item.isActive, usage: item._count.employees }))}
      createAction={createPositionAction}
      updateAction={updatePositionAction}
      deleteAction={deletePositionAction}
    />
  );
}
