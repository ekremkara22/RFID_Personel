"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";

function positiveId(value: FormDataEntryValue | null) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function deployFirmwareAction(formData: FormData) {
  const { user } = await requireSessionUser();
  if (user.role !== "SUPERADMIN") throw new Error("Bu islem icin yetkiniz yok.");

  const releaseId = positiveId(formData.get("releaseId"));
  const targetType = String(formData.get("targetType") ?? "");
  if (!releaseId) throw new Error("Firmware surumu secilmelidir.");

  const release = await prisma.firmwareRelease.findFirst({ where: { id: releaseId, isActive: true } });
  if (!release) throw new Error("Firmware surumu bulunamadi.");

  let deviceIds: number[] = [];
  if (targetType === "devices") {
    deviceIds = formData
      .getAll("deviceIds")
      .map((value) => positiveId(value))
      .filter((value): value is number => value !== null);
  } else if (targetType === "company") {
    const companyId = positiveId(formData.get("companyId"));
    if (!companyId) throw new Error("Firma secilmelidir.");
    const devices = await prisma.device.findMany({ where: { companyId }, select: { id: true } });
    deviceIds = devices.map((device) => device.id);
  } else if (targetType === "branch") {
    const branchId = positiveId(formData.get("branchId"));
    if (!branchId) throw new Error("Sube secilmelidir.");
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new Error("Sube bulunamadi.");
    const devices = await prisma.device.findMany({
      where: { companyId: branch.companyId, branchLocation: branch.name },
      select: { id: true },
    });
    deviceIds = devices.map((device) => device.id);
  } else {
    throw new Error("Guncelleme hedefi secilmelidir.");
  }

  deviceIds = Array.from(new Set(deviceIds));
  if (deviceIds.length === 0) throw new Error("Secilen hedefte guncellenecek cihaz bulunamadi.");

  await prisma.$transaction(async (tx) => {
    await tx.firmwareDeployment.updateMany({
      where: { deviceId: { in: deviceIds }, status: { in: ["PENDING", "DOWNLOADING"] } },
      data: { status: "CANCELLED", lastError: "Yeni bir firmware dagitimi olusturuldu." },
    });
    await tx.firmwareDeployment.createMany({
      data: deviceIds.map((deviceId) => ({ releaseId, deviceId, createdById: user.id })),
    });
  });

  revalidatePath("/dashboard/firmware-updates");
  redirect(`/dashboard/firmware-updates?success=${encodeURIComponent(`${deviceIds.length} cihaz icin guncelleme baslatildi.`)}`);
}

export async function cancelFirmwareDeploymentAction(formData: FormData) {
  const { user } = await requireSessionUser();
  if (user.role !== "SUPERADMIN") throw new Error("Bu islem icin yetkiniz yok.");

  const deploymentId = positiveId(formData.get("deploymentId"));
  if (!deploymentId) throw new Error("Guncelleme kaydi bulunamadi.");

  await prisma.firmwareDeployment.updateMany({
    where: { id: deploymentId, status: { in: ["PENDING", "DOWNLOADING"] } },
    data: { status: "CANCELLED", lastError: "Yonetici tarafindan iptal edildi." },
  });

  revalidatePath("/dashboard/firmware-updates");
}
