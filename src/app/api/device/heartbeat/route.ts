import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secretKey = typeof body?.secretKey === "string" ? body.secretKey.trim() : "";
    const macAddress = typeof body?.macAddress === "string" ? body.macAddress.trim().toUpperCase() : "";
    const ipAddress = typeof body?.ipAddress === "string" ? body.ipAddress.trim() : "";
    const clockOffsetMinutes =
      typeof body?.clockOffsetMinutes === "number" && Number.isFinite(body.clockOffsetMinutes)
        ? Math.round(body.clockOffsetMinutes)
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
        ...(clockOffsetMinutes !== undefined ? { clockOffsetMinutes } : {}),
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
