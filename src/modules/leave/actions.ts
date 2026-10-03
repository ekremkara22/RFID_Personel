"use server";

import { revalidatePath } from "next/cache";
import { LeaveApprovalStatus, LeaveDurationType, LeaveType } from "@/generated/prisma/client";
import { assertPermission, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { getString, getId, getOptionalDate, getReturnTo, redirectToReturnPath } from "@/modules/shared/action-helpers";

export async function createLeaveRequestAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.LEAVE_CREATE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const employeeId = getId(formData, "employeeId");
  const type = getString(formData, "type") as LeaveType;
  const durationType = getString(formData, "durationType") as LeaveDurationType;
  const approvalStatus = getString(formData, "approvalStatus") as LeaveApprovalStatus;
  const startDate = getOptionalDate(formData, "startDate");
  const endDate = getOptionalDate(formData, "endDate");
  const startTime = getString(formData, "startTime") || null;
  const endTime = getString(formData, "endTime") || null;
  const description = getString(formData, "description") || null;

  if (
    !employeeId ||
    !startDate ||
    !endDate ||
    !Object.values(LeaveType).includes(type) ||
    !Object.values(LeaveDurationType).includes(durationType) ||
    !Object.values(LeaveApprovalStatus).includes(approvalStatus)
  ) {
    throw new Error("Izin bilgileri gecersiz.");
  }
  if (approvalStatus !== LeaveApprovalStatus.PENDING) assertPermission(authorization, PERMISSIONS.LEAVE_APPROVE);
  if (approvalStatus !== LeaveApprovalStatus.PENDING && authorization.employeeId === employeeId) throw new Error("Kendi izin talebinizi onaylayamazsiniz.");

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...employeeScopeWhere(authorization) },
    select: { id: true },
  });

  if (!employee) {
    throw new Error("Personel bulunamadi.");
  }

  await prisma.leaveRequest.create({
    data: {
      employeeId,
      companyId: authorization.companyId,
      type,
      durationType,
      approvalStatus,
      startDate,
      endDate,
      startTime,
      endTime,
      description,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/reports");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateLeaveRequestAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.LEAVE_CREATE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const leaveId = getId(formData, "leaveId");
  const employeeId = getId(formData, "employeeId");
  const type = getString(formData, "type") as LeaveType;
  const durationType = getString(formData, "durationType") as LeaveDurationType;
  const approvalStatus = getString(formData, "approvalStatus") as LeaveApprovalStatus;
  const startDate = getOptionalDate(formData, "startDate");
  const endDate = getOptionalDate(formData, "endDate");
  const description = getString(formData, "description") || null;

  if (
    !leaveId ||
    !employeeId ||
    !startDate ||
    !endDate ||
    !Object.values(LeaveType).includes(type) ||
    !Object.values(LeaveDurationType).includes(durationType) ||
    !Object.values(LeaveApprovalStatus).includes(approvalStatus)
  ) {
    throw new Error("Izin bilgileri gecersiz.");
  }
  const existingLeave = await prisma.leaveRequest.findFirst({ where: { id: leaveId, companyId: authorization.companyId, employee: employeeScopeWhere(authorization) }, select: { approvalStatus: true, employeeId: true } });
  if (!existingLeave) throw new Error("Izin kaydi bulunamadi veya kapsam disinda.");
  if (existingLeave.approvalStatus !== approvalStatus) {
    assertPermission(authorization, PERMISSIONS.LEAVE_APPROVE);
    if (authorization.employeeId === existingLeave.employeeId) throw new Error("Kendi izin talebinizi onaylayamazsiniz.");
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...employeeScopeWhere(authorization) },
    select: { id: true },
  });

  if (!employee) {
    throw new Error("Personel bulunamadi.");
  }

  await prisma.leaveRequest.updateMany({
    where: { id: leaveId, companyId: authorization.companyId, employee: employeeScopeWhere(authorization) },
    data: {
      employeeId,
      type,
      durationType,
      approvalStatus,
      startDate,
      endDate,
      startTime: getString(formData, "startTime") || null,
      endTime: getString(formData, "endTime") || null,
      description,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/reports");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteLeaveRequestAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.LEAVE_DELETE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const leaveId = getId(formData, "leaveId");

  if (!leaveId) {
    throw new Error("Izin bilgisi eksik.");
  }

  await prisma.leaveRequest.deleteMany({
    where: { id: leaveId, companyId: authorization.companyId, employee: employeeScopeWhere(authorization) },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/reports");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}
