import { NextResponse } from "next/server";
import { buildNextQrWindow, deviceQrExpired, QR_TOKEN_TTL_SECONDS } from "@/lib/device-qr";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secretKey = typeof body?.secretKey === "string" ? body.secretKey.trim() : "";

    if (!secretKey) {
      return NextResponse.json({ error: "Secret key zorunludur." }, { status: 400 });
    }

    const device = await prisma.device.findFirst({
      where: { secretKey },
      include: { company: true },
    });

    if (!device || !device.company.isActive) {
      return NextResponse.json({ error: "Cihaz bulunamadi." }, { status: 404 });
    }

    const payload = deviceQrExpired(device)
      ? await prisma.device.update({
          where: { id: device.id },
          data: buildNextQrWindow(),
        })
      : await prisma.device.update({
          where: { id: device.id },
          data: {
            lastSeenAt: new Date(),
          },
        });

    return NextResponse.json({
      deviceId: payload.id,
      deviceName: payload.name,
      companyId: payload.companyId,
      qrToken: payload.activeQrToken,
      qrUpdatedAt: payload.qrUpdatedAt,
      qrExpiresAt: payload.qrExpiresAt,
      refreshIntervalSeconds: QR_TOKEN_TTL_SECONDS,
    });
  } catch (error) {
    console.error("Device QR sync error", error);

    return NextResponse.json(
      { error: "Cihaz senkronizasyonu sirasinda beklenmeyen bir hata olustu." },
      { status: 500 },
    );
  }
}
