"use server";

import { ActionError } from "@/lib/action-error";
import { runFormAction } from "@/lib/run-form-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DevicePurpose } from "@/generated/prisma/client";
import { assertPermission, deviceScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { getString, getId, assertSuperadminUser } from "@/modules/shared/action-helpers";

export async function createCompanyDeviceAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = getId(formData, "companyId");
  const code = getString(formData, "code") || null;
  const name = getString(formData, "name");
  const macAddress = getString(formData, "macAddress");
  const ipAddress = getString(formData, "ipAddress") || null;
  const branchLocation = getString(formData, "branchLocation") || null;
  const purpose = getString(formData, "purpose") as DevicePurpose;
  const clockOffsetMinutesValue = getString(formData, "clockOffsetMinutes");
  const clockOffsetMinutes = clockOffsetMinutesValue ? Number(clockOffsetMinutesValue) : null;
  const allowedPurposes = new Set<string>(Object.values(DevicePurpose));

  if (!companyId || !name || !macAddress || !allowedPurposes.has(purpose)) {
    throw new Error("Cihaz bilgileri eksik.");
  }

  await prisma.device.create({
    data: {
      code,
      name,
      macAddress,
      ipAddress,
      branchLocation,
      purpose,
      clockOffsetMinutes: Number.isFinite(clockOffsetMinutes) ? clockOffsetMinutes : null,
      companyId,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/companies/${companyId}`);
  redirect(`/dashboard/companies/${companyId}?tab=devices`);
}

export async function updateCompanyDeviceAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = getId(formData, "companyId");
  const deviceId = getId(formData, "deviceId");
  const code = getString(formData, "code") || null;
  const name = getString(formData, "name");
  const macAddress = getString(formData, "macAddress");
  const ipAddress = getString(formData, "ipAddress") || null;
  const branchLocation = getString(formData, "branchLocation") || null;
  const purpose = getString(formData, "purpose") as DevicePurpose;
  const clockOffsetMinutesValue = getString(formData, "clockOffsetMinutes");
  const clockOffsetMinutes = clockOffsetMinutesValue ? Number(clockOffsetMinutesValue) : null;
  const allowedPurposes = new Set<string>(Object.values(DevicePurpose));

  if (!companyId || !deviceId || !name || !macAddress || !allowedPurposes.has(purpose)) {
    throw new Error("Cihaz bilgileri eksik.");
  }

  await prisma.device.updateMany({
    where: { id: deviceId, companyId },
    data: {
      code,
      name,
      macAddress,
      ipAddress,
      branchLocation,
      purpose,
      clockOffsetMinutes: Number.isFinite(clockOffsetMinutes) ? clockOffsetMinutes : null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function deleteCompanyDeviceAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = getId(formData, "companyId");
  const deviceId = getId(formData, "deviceId");

  if (!companyId || !deviceId) {
    throw new Error("Cihaz bilgisi eksik.");
  }

  await prisma.device.deleteMany({
    where: { id: deviceId, companyId },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function createUserDeviceAction(formData: FormData) {
  return runFormAction(() => createUserDeviceActionImpl(formData));
}

async function createUserDeviceActionImpl(formData: FormData) {
  await assertSuperadminUser();

  const userId = getId(formData, "userId");
  const code = getString(formData, "code") || null;
  const name = getString(formData, "name");
  const macAddress = getString(formData, "macAddress");
  const ipAddress = getString(formData, "ipAddress") || null;
  const branchLocation = getString(formData, "branchLocation") || null;
  const purpose = getString(formData, "purpose") as DevicePurpose;
  const clockOffsetMinutesValue = getString(formData, "clockOffsetMinutes");
  const clockOffsetMinutes = clockOffsetMinutesValue ? Number(clockOffsetMinutesValue) : null;
  const allowedPurposes = new Set<string>(Object.values(DevicePurpose));

  if (!userId || !name || !macAddress || !allowedPurposes.has(purpose)) {
    throw new ActionError("Cihaz bilgileri eksik.");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

  if (!targetUser) {
    throw new ActionError("Cihaz atanacak kullanici bulunamadi.");
  }

  const device = await prisma.device.create({
    data: {
      code,
      name,
      macAddress,
      ipAddress,
      branchLocation,
      purpose,
      clockOffsetMinutes: Number.isFinite(clockOffsetMinutes) ? clockOffsetMinutes : null,
    },
  });

  await prisma.userDeviceAccess.create({
    data: {
      userId,
      deviceId: device.id,
    },
  });

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
  redirect(`/dashboard/users/${userId}?tab=devices`);
}

export async function deleteUserDeviceAccessAction(formData: FormData) {
  return runFormAction(() => deleteUserDeviceAccessActionImpl(formData));
}

async function deleteUserDeviceAccessActionImpl(formData: FormData) {
  await assertSuperadminUser();

  const userId = getId(formData, "userId");
  const deviceId = getId(formData, "deviceId");

  if (!userId || !deviceId) {
    throw new ActionError("Cihaz bilgisi eksik.");
  }

  await prisma.userDeviceAccess.deleteMany({
    where: {
      userId,
      deviceId,
    },
  });

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
  redirect(`/dashboard/users/${userId}?tab=devices`);
}

export async function updateDeviceAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.DEVICE_MANAGE);

  const deviceId = getId(formData, "deviceId");
  const companyId = getId(formData, "companyId");
  const name = getString(formData, "name");
  const branchLocation = getString(formData, "branchLocation") || null;

  if (!deviceId || !companyId || !name) {
    throw new Error("Cihaz adi ve firma bilgisi zorunludur.");
  }

  if (authorization.companyId !== companyId) {
    throw new Error("Bu firma icin yetkiniz yok.");
  }
  const assignedDevice = await prisma.device.findFirst({
    where: { id: deviceId, ...deviceScopeWhere(authorization) },
    select: { id: true },
  });

  if (!assignedDevice) {
    throw new Error("Bu cihaz kullaniciya atanmamis.");
  }

  await prisma.device.updateMany({
    where: {
      id: deviceId,
    },
    data: { name, companyId, branchLocation },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/devices");
}
