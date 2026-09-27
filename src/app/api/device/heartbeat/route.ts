import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secretKey = typeof body?.secretKey === "string" ? body.secretKey.trim() : "";
    const macAddress = typeof body?.macAddress === "string" ? body.macAddress.trim().toUpperCase() : "";
    const ipAddress = typeof body?.ipAddress === "string" ? body.ipAddress.trim() : "";
    const firmwareVersion = typeof body?.firmwareVersion === "string"
      ? body.firmwareVersion.trim().slice(0, 64)
      : "";
    const clockOffsetMinutes =
      typeof body?.clockOffsetMinutes === "number" && Number.isFinite(body.clockOffsetMinutes)
        ? Math.round(body.clockOffsetMinutes)
        : undefined;
    const pendingQueueCount =
      typeof body?.pendingQueueCount === "number" && Number.isFinite(body.pendingQueueCount)
        ? Math.max(0, Math.min(100000, Math.round(body.pendingQueueCount)))
        : undefined;
    const oldestQueuedAtValue = typeof body?.oldestQueuedAt === "string" ? body.oldestQueuedAt.trim() : "";
    const parsedOldestQueuedAt = oldestQueuedAtValue ? new Date(oldestQueuedAtValue) : null;
    const oldestQueuedAt = parsedOldestQueuedAt && !Number.isNaN(parsedOldestQueuedAt.getTime())
      ? parsedOldestQueuedAt
      : null;
    const clockSynchronized = typeof body?.clockSynchronized === "boolean" ? body.clockSynchronized : undefined;
    const lastSendError = typeof body?.lastSendError === "string"
      ? body.lastSendError.trim().slice(0, 2000) || null
      : undefined;

    if (!secretKey) {
      return NextResponse.json({ error: "Secret key zorunludur." }, { status: 400 });
    }

    const device = await prisma.device.findFirst({ where: { secretKey } });

    if (!device) {
      return NextResponse.json({ error: "Cihaz bulunamadi." }, { status: 404 });
    }

    const updatedDevice = await prisma.device.update({
      where: { id: device.id },
      data: {
        lastSeenAt: new Date(),
        ...(macAddress ? { macAddress } : {}),
        ...(ipAddress ? { ipAddress } : {}),
        ...(firmwareVersion ? { firmwareVersion } : {}),
        ...(clockOffsetMinutes !== undefined ? { clockOffsetMinutes } : {}),
        ...(pendingQueueCount !== undefined ? { pendingQueueCount } : {}),
        ...(pendingQueueCount !== undefined ? { oldestQueuedAt: pendingQueueCount > 0 ? oldestQueuedAt : null } : {}),
        ...(clockSynchronized !== undefined ? { clockSynchronized } : {}),
        ...(lastSendError !== undefined ? { lastSendError } : {}),
        healthReportedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        companyId: true,
        branchLocation: true,
        lastSeenAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      device: updatedDevice,
    });
  } catch (error) {
    console.error("Device heartbeat error", error);

    return NextResponse.json(
      { error: "Cihaz durumu guncellenirken beklenmeyen bir hata olustu." },
      { status: 500 },
    );
  }
}
