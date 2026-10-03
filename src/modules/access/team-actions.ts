"use server";

import { ActionError } from "@/lib/action-error";
import { runFormAction } from "@/lib/run-form-action";
import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { value, ids, validateScopeIds } from "@/modules/access/action-helpers";

export async function saveCompanyTeamAction(formData: FormData) {
  return runFormAction(() => saveCompanyTeamActionImpl(formData));
}

async function saveCompanyTeamActionImpl(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new ActionError("Aktif firma seçilmedi.");
  const teamId = Number(value(formData, "teamId")) || null; const name = value(formData, "name"); const employeeIds = ids(formData, "employeeIds"); const isActive = formData.get("isActive") === "on" || !teamId;
  if (!name) throw new ActionError("Ekip adı zorunludur.");
  await validateScopeIds(authorization.companyId, [], [], employeeIds, [], []);
  await prisma.$transaction(async (tx) => {
    const team = teamId ? await tx.companyTeam.update({ where: { id: teamId, companyId: authorization.companyId! }, data: { name, isActive } }) : await tx.companyTeam.create({ data: { companyId: authorization.companyId!, name, isActive: true } });
    await tx.companyTeamEmployee.deleteMany({ where: { teamId: team.id } });
    if (employeeIds.length) await tx.companyTeamEmployee.createMany({ data: employeeIds.map((employeeId) => ({ teamId: team.id, employeeId })) });
    await tx.companyAccessAudit.create({ data: { companyId: authorization.companyId!, actorUserId: user.id, action: teamId ? "TEAM_UPDATED" : "TEAM_CREATED", summary: `${name} ekibi ${employeeIds.length} personelle kaydedildi.` } });
  });
  revalidatePath("/dashboard/access/teams");
}
