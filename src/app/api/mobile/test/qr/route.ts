import { isAfter } from "date-fns";
import { NextResponse } from "next/server";
import { buildNextQrWindow } from "@/lib/device-qr";
import { requireEmployeeFromRequest } from "@/lib/mobile-session";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "QR test endpoint'i sadece test ortaminda kullanilir." }, { status: 404 });
  }

  try {
    const employee = await requireEmployeeFromRequest(request);

    if (!employee) {
      return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
    }

    const body = await request.json();
    const submittedQrToken = typeof body?.qrToken === "string" ? body.qrToken.trim() : "";

    const device = submittedQrToken
      ? await prisma.device.findFirst({
          where: {
            activeQrToken: submittedQrToken,
            companyId: employee.companyId,
          },
        })
      : await prisma.device.findFirst({
          where: {
            companyId: employee.companyId,
            activeQrToken: {
              not: null,
            },
            qrExpiresAt: {
              gt: new Date(),
            },
          },
          orderBy: {
            qrUpdatedAt: "desc",
          },
        });

    if (!device || !device.activeQrToken || !device.qrExpiresAt || isAfter(new Date(), device.qrExpiresAt)) {
      return NextResponse.json({ error: "QR kod gecersiz veya suresi dolmus." }, { status: 400 });
    }

    const testedQrToken = submittedQrToken || device.activeQrToken;
    const nextWindow = buildNextQrWindow();

    const rotated = await prisma.device.updateMany({
      where: {
        id: device.id,
        activeQrToken: testedQrToken,
        qrExpiresAt: {
          gt: new Date(),
        },
      },
      data: nextWindow,
    });

    if (rotated.count !== 1) {
      return NextResponse.json(
        { error: "QR kod zaten yenilendi. ESP32 ekranindaki yeni QR ile tekrar dene." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      deviceName: device.name,
      testedQrToken,
      qrRefreshed: true,
      nextQrToken: nextWindow.activeQrToken,
      nextQrExpiresAt: nextWindow.qrExpiresAt,
    });
  } catch (error) {
    console.error("Mobile QR test error", error);

    return NextResponse.json(
      { error: "QR testi sirasinda beklenmeyen bir hata olustu." },
      { status: 500 },
    );
  }
}
