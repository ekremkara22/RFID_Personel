"use server";

import { revalidatePath } from "next/cache";

import { SmartHomeCommandStatus } from "@/generated/prisma/client";
import { ActionError, actionErrorMessage } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { generateSmartHomeApiKey, hashSmartHomeApiKey } from "@/lib/smart-home";
import { assertSuperadminUser, getId, getString } from "@/modules/shared/action-helpers";

export type GatewayKeyResult = { ok: boolean; message: string; apiKey?: string };

async function gatewayKeyAction(operation: () => Promise<string>): Promise<GatewayKeyResult> {
  try {
    return { ok: true, message: "API anahtarı hazır. Güvenli bir yere kopyalayın; tekrar gösterilmeyecek.", apiKey: await operation() };
  } catch (error) {
    const message = actionErrorMessage(error);
    if (message) return { ok: false, message };
    console.error("[smart-home-gateway-key]", error);
    return { ok: false, message: "Geçit anahtarı oluşturulamadı. Lütfen tekrar deneyin." };
  }
}

export async function createSmartHomeGatewayAction(formData: FormData): Promise<GatewayKeyResult> {
  return gatewayKeyAction(async () => {
    const user = await assertSuperadminUser();
    const name = getString(formData, "name");
    if (name.length < 2 || name.length > 100) throw new ActionError("Geçit adı 2-100 karakter arasında olmalıdır.");
    const apiKey = generateSmartHomeApiKey();
    await prisma.smartHomeGateway.create({
      data: { ownerId: user.id, name, apiKeyHash: hashSmartHomeApiKey(apiKey), apiKeyLast4: apiKey.slice(-4) },
    });
    revalidatePath("/dashboard/smart-home");
    return apiKey;
  });
}

export async function rotateSmartHomeGatewayKeyAction(formData: FormData): Promise<GatewayKeyResult> {
  return gatewayKeyAction(async () => {
    const user = await assertSuperadminUser();
    const gatewayId = getId(formData, "gatewayId");
    const existing = await prisma.smartHomeGateway.findFirst({ where: { id: gatewayId, ownerId: user.id }, select: { id: true } });
    if (!existing) throw new ActionError("Geçit bulunamadı.");
    const apiKey = generateSmartHomeApiKey();
    await prisma.smartHomeGateway.update({
      where: { id: gatewayId },
      data: { apiKeyHash: hashSmartHomeApiKey(apiKey), apiKeyLast4: apiKey.slice(-4) },
    });
    revalidatePath("/dashboard/smart-home");
    return apiKey;
  });
}

export async function queueSmartHomePowerAction(formData: FormData) {
  try {
    const user = await assertSuperadminUser();
    const nodeId = getId(formData, "nodeId");
    const power = getString(formData, "power");
    if (power !== "on" && power !== "off") throw new ActionError("Güç komutu geçersiz.");
    const node = await prisma.smartHomeNode.findFirst({
      where: { id: nodeId, gateway: { ownerId: user.id } },
      select: { id: true, gatewayId: true },
    });
    if (!node) throw new ActionError("Akıllı ev cihazı bulunamadı.");
    const now = new Date();
    await prisma.$transaction([
      prisma.smartHomeCommand.updateMany({
        where: { nodeId, command: "SET_POWER", status: { in: [SmartHomeCommandStatus.PENDING, SmartHomeCommandStatus.SENT] } },
        data: { status: SmartHomeCommandStatus.CANCELLED, completedAt: now, error: "Daha yeni bir güç komutuyla değiştirildi." },
      }),
      prisma.smartHomeCommand.create({
        data: {
          gatewayId: node.gatewayId,
          nodeId,
          requestedById: user.id,
          command: "SET_POWER",
          payloadJson: JSON.stringify({ power: power === "on" }),
          expiresAt: new Date(now.getTime() + 2 * 60_000),
        },
      }),
    ]);
    revalidatePath("/dashboard/smart-home");
    return { ok: true, message: power === "on" ? "Açma komutu sıraya alındı." : "Kapatma komutu sıraya alındı." };
  } catch (error) {
    const message = actionErrorMessage(error);
    if (message) return { ok: false, message };
    console.error("[smart-home-power]", error);
    return { ok: false, message: "Cihaz komutu sıraya alınamadı." };
  }
}
