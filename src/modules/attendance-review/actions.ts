"use server";

import { revalidatePath } from "next/cache";
import { assertPermission, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { getString, getId, redirectToReturnPath } from "@/modules/shared/action-helpers";

export async function resolveAttendanceReviewAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.MOVEMENT_UPDATE);
  const employeeId = getId(formData, "employeeId");
  const dayKey = getString(formData, "dayKey");
  const fingerprint = getString(formData, "fingerprint");
  const resolutionNote = getString(formData, "resolutionNote");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || !/^[a-f0-9]{64}$/.test(fingerprint) || !resolutionNote) {
    throw new Error("Inceleme sonucu bilgileri eksik.");
  }
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...employeeScopeWhere(authorization) },
    select: { id: true },
  });
  if (!employee) throw new Error("Personel bulunamadi veya yetkiniz yok.");
  const workDate = new Date(`${dayKey}T00:00:00+03:00`);
  await prisma.attendanceReviewResolution.upsert({
    where: { employeeId_workDate_fingerprint: { employeeId, workDate, fingerprint } },
    create: { employeeId, workDate, fingerprint, resolutionNote, resolvedById: user.id },
    update: { resolutionNote, resolvedById: user.id, resolvedAt: new Date() },
  });
  revalidatePath("/dashboard/movement-reviews");
  redirectToReturnPath(formData, "/dashboard/movement-reviews");
}
