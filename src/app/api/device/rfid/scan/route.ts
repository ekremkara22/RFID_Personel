import { NextResponse } from "next/server";
import { AttendanceType, DevicePurpose } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const entryExitTypes = new Set<AttendanceType>([
  AttendanceType.ENTRY,
  AttendanceType.EXIT,
]);

function normalizeCardId(cardId: string) {
  return cardId.trim().toUpperCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secretKey = typeof body?.secretKey === "string" ? body.secretKey.trim() : "";
    const rfidCardId =
      typeof body?.rfidCardId === "string" ? normalizeCardId(body.rfidCardId) : "";

    if (!secretKey || !rfidCardId) {
      return NextResponse.json(
        { error: "Secret key ve RFID kart ID zorunludur." },
        { status: 400 },
      );
    }

    const device = await prisma.device.findFirst({
      where: { secretKey },
      include: { company: true },
    });

    if (!device || !device.company.isActive) {
      return NextResponse.json({ error: "Cihaz bulunamadi." }, { status: 404 });
    }

    const employee = await prisma.employee.findFirst({
      where: {
        companyId: device.companyId,
        rfidCardId,
        isActive: true,
      },
    });

    if (!employee) {
      await prisma.device.update({
        where: { id: device.id },
        data: { lastSeenAt: new Date(), lastDataTransferAt: new Date() },
      });

      return NextResponse.json(
        { error: "Bu RFID kart aktif bir personele tanimli degil." },
        { status: 404 },
      );
    }

    const latestLog = await prisma.attendanceLog.findFirst({
      where: {
        employeeId: employee.id,
        type: { in: [AttendanceType.ENTRY, AttendanceType.EXIT] },
      },
      orderBy: { scannedAt: "desc" },
    });
    const nextType =
      device.purpose === DevicePurpose.ENTRY
        ? AttendanceType.ENTRY
        : device.purpose === DevicePurpose.EXIT
          ? AttendanceType.EXIT
          : device.purpose === DevicePurpose.BREAK_START
            ? AttendanceType.BREAK_START
            : device.purpose === DevicePurpose.BREAK_END
              ? AttendanceType.BREAK_END
              : latestLog && entryExitTypes.has(latestLog.type) && latestLog.type === AttendanceType.ENTRY
                ? AttendanceType.EXIT
                : AttendanceType.ENTRY;

    const [log] = await prisma.$transaction([
      prisma.attendanceLog.create({
        data: {
          employeeId: employee.id,
          deviceId: device.id,
          type: nextType,
          rfidCardId,
        },
      }),
      prisma.device.update({
        where: { id: device.id },
        data: { lastSeenAt: new Date(), lastDataTransferAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      logId: log.id,
      type: log.type,
      scannedAt: log.scannedAt,
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department,
      },
      device: {
        id: device.id,
        name: device.name,
      },
    });
  } catch (error) {
    console.error("RFID scan error", error);

    return NextResponse.json(
      { error: "RFID kart okutma sirasinda beklenmeyen bir hata olustu." },
      { status: 500 },
    );
  }
}
