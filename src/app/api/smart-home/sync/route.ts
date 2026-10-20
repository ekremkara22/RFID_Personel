import { SmartHomeCommandStatus, SmartHomeNodeKind } from "@/generated/prisma/client";
import { hashSmartHomeApiKey, parseSmartHomeSyncPayload } from "@/lib/smart-home";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ ok: false, error: "Geçit anahtarı geçersiz." }, { status: 401 });
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!/^shg_[A-Za-z0-9_-]{43}$/.test(token)) return unauthorized();

  const gateway = await prisma.smartHomeGateway.findUnique({
    where: { apiKeyHash: hashSmartHomeApiKey(token) },
    select: { id: true },
  });
  if (!gateway) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Geçerli bir JSON gövdesi gönderilmelidir." }, { status: 400 });
  }

  let payload;
  try {
    payload = parseSmartHomeSyncPayload(body);
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "İstek gövdesi geçersiz." }, { status: 400 });
  }

  const now = new Date();
  const retryBefore = new Date(now.getTime() - 30_000);
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const commands = await prisma.$transaction(async (tx) => {
    await tx.smartHomeGateway.update({
      where: { id: gateway.id },
      data: {
        lastSeenAt: now,
        ipAddress: forwardedIp ?? payload.gateway.ipAddress,
        agentVersion: payload.gateway.agentVersion,
        systemVersion: payload.gateway.systemVersion,
      },
    });

    for (const node of payload.nodes) {
      await tx.smartHomeNode.upsert({
        where: { gatewayId_hardwareId: { gatewayId: gateway.id, hardwareId: node.hardwareId } },
        create: {
          gatewayId: gateway.id,
          hardwareId: node.hardwareId,
          name: node.name,
          room: node.room,
          kind: node.kind as SmartHomeNodeKind,
          capabilitiesJson: node.capabilitiesJson,
          stateJson: node.stateJson,
          telemetryJson: node.telemetryJson,
          firmwareVersion: node.firmwareVersion,
          rssi: node.rssi,
          meshLayer: node.meshLayer,
          lastSeenAt: now,
        },
        update: {
          name: node.name,
          room: node.room,
          kind: node.kind as SmartHomeNodeKind,
          capabilitiesJson: node.capabilitiesJson,
          stateJson: node.stateJson,
          telemetryJson: node.telemetryJson,
          firmwareVersion: node.firmwareVersion,
          rssi: node.rssi,
          meshLayer: node.meshLayer,
          isActive: true,
          lastSeenAt: now,
        },
      });
    }

    for (const acknowledgement of payload.acknowledgements) {
      await tx.smartHomeCommand.updateMany({
        where: { id: acknowledgement.id, gatewayId: gateway.id, status: { in: [SmartHomeCommandStatus.PENDING, SmartHomeCommandStatus.SENT] } },
        data: {
          status: acknowledgement.status,
          completedAt: now,
          error: acknowledgement.status === "FAILED" ? acknowledgement.error ?? "Cihaz komutu uygulayamadı." : null,
        },
      });
    }

    await tx.smartHomeCommand.updateMany({
      where: { gatewayId: gateway.id, status: { in: [SmartHomeCommandStatus.PENDING, SmartHomeCommandStatus.SENT] }, expiresAt: { lte: now } },
      data: { status: SmartHomeCommandStatus.CANCELLED, completedAt: now, error: "Komut zaman aşımına uğradı." },
    });

    const pending = await tx.smartHomeCommand.findMany({
      where: {
        gatewayId: gateway.id,
        expiresAt: { gt: now },
        attemptCount: { lt: 20 },
        OR: [
          { status: SmartHomeCommandStatus.PENDING },
          { status: SmartHomeCommandStatus.SENT, sentAt: { lte: retryBefore } },
        ],
      },
      select: { id: true, command: true, payloadJson: true, node: { select: { hardwareId: true } } },
      orderBy: { requestedAt: "asc" },
      take: 50,
    });

    if (pending.length > 0) {
      await tx.smartHomeCommand.updateMany({
        where: { id: { in: pending.map((item) => item.id) }, gatewayId: gateway.id },
        data: { status: SmartHomeCommandStatus.SENT, sentAt: now, attemptCount: { increment: 1 } },
      });
    }
    return pending;
  });

  return Response.json({
    ok: true,
    serverTime: now.toISOString(),
    nextPollSeconds: 5,
    commands: commands.map((command) => ({
      id: command.id,
      hardwareId: command.node?.hardwareId ?? null,
      command: command.command,
      payload: command.payloadJson ? JSON.parse(command.payloadJson) : {},
    })),
  });
}
