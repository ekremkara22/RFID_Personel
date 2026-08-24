import { NextResponse } from "next/server";
import { isAfter } from "date-fns";
import { isWithinGeofence } from "@/lib/geo";
import { requireEmployeeFromRequest } from "@/lib/mobile-session";
import { prisma } from "@/lib/prisma";
import { buildNextQrWindow } from "@/lib/device-qr";

const qrProtectedTypes = new Set(["ENTRY", "EXIT"]);
const allowedTypes = new Set([
  "ENTRY",
  "EXIT",
  "BREAK_START",
  "BREAK_END",
  "MEAL_START",
  "MEAL_END",
]);

export async function POST(request: Request) {
  try {
    const employee = await requireEmployeeFromRequest(request);

    if (!employee) {
      return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
    }

    const body = await request.json();
    const type = typeof body?.type === "string" ? body.type : "";
    const qrToken = typeof body?.qrToken === "string" ? body.qrToken.trim() : "";
    const latitude = typeof body?.latitude === "number" ? body.latitude : null;
    const longitude = typeof body?.longitude === "number" ? body.longitude : null;

    if (!allowedTypes.has(type)) {
      return NextResponse.json({ error: "Gecersiz hareket tipi." }, { status: 400 });
    }

    if (!qrProtectedTypes.has(type)) {
      const log = await prisma.attendanceLog.create({
        data: {
          employeeId: employee.id,
          type,
        },
      });

      return NextResponse.json({ success: true, logId: log.id });
    }

    if (!qrToken || latitude === null || longitude === null) {
      return NextResponse.json(
        { error: "Giris ve cikis icin QR ve konum bilgisi zorunludur." },
        { status: 400 },
      );
    }

    const device = await prisma.device.findFirst({
      where: {
        activeQrToken: qrToken,
        companyId: employee.companyId,
      },
    });

    if (!device || !device.qrExpiresAt || isAfter(new Date(), device.qrExpiresAt)) {
      return NextResponse.json(
        { error: "QR kod gecersiz veya suresi dolmus." },
        { status: 400 },
      );
    }

    const geofence = isWithinGeofence({
      targetLatitude: employee.allowedLatitude,
      targetLongitude: employee.allowedLongitude,
      allowedRadiusM: employee.allowedRadiusM,
      currentLatitude: latitude,
      currentLongitude: longitude,
    });

    if (!geofence.valid) {
      await prisma.attendanceLog.create({
        data: {
          employeeId: employee.id,
          deviceId: device.id,
          type,
          qrTokenUsed: qrToken,
          locationLatitude: latitude,
          locationLongitude: longitude,
          locationValid: false,
          qrMatched: true,
        },
      });

      return NextResponse.json(
        {
          error: "Konum dogrulamasi basarisiz.",
          distanceMeters: geofence.distance ? Math.round(geofence.distance) : null,
        },
        { status: 400 },
      );
    }

    const nextWindow = buildNextQrWindow();

    const result = await prisma.$transaction(async (tx) => {
      const rotated = await tx.device.updateMany({
        where: {
          id: device.id,
          activeQrToken: qrToken,
          qrExpiresAt: {
            gt: new Date(),
          },
        },
        data: nextWindow,
      });

      if (rotated.count !== 1) {
        throw new Error("QR_TOKEN_ALREADY_CONSUMED");
      }

      const log = await tx.attendanceLog.create({
        data: {
          employeeId: employee.id,
          deviceId: device.id,
          type,
          qrTokenUsed: qrToken,
          locationLatitude: latitude,
          locationLongitude: longitude,
          locationValid: true,
          qrMatched: true,
        },
      });

      return {
        log,
        rotatedDevice: {
          ...device,
          ...nextWindow,
        },
      };
    });

    return NextResponse.json({
      success: true,
      logId: result.log.id,
      qrRefreshed: true,
      nextQrToken: result.rotatedDevice.activeQrToken,
      nextQrExpiresAt: result.rotatedDevice.qrExpiresAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "QR_TOKEN_ALREADY_CONSUMED") {
      return NextResponse.json(
        { error: "QR kod zaten kullanildi veya yenilendi. Lutfen tekrar okutun." },
        { status: 409 },
      );
    }

    console.error("Mobile attendance error", error);

    return NextResponse.json(
      { error: "Hareket kaydi sirasinda beklenmeyen bir hata olustu." },
      { status: 500 },
    );
  }
}
