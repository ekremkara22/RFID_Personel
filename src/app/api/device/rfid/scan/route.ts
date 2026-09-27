import { NextResponse } from "next/server";
import { AttendanceType, DevicePurpose } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppDayRange, getAppMinutes } from "@/lib/app-time";
import { normalizeClientEventId, resolveDeviceScanTime } from "@/lib/device-scan";
import { timeToMinutes } from "@/lib/work-calendar-rules";
import { saveResolvedEmployeeWorkCalendar } from "@/lib/work-calendar";
import { EXIT_TOLERANCE_MINUTES, inferBidirectionalMovement } from "@/lib/attendance-sequence";
import { assertPayrollPeriodUnlocked } from "@/lib/payroll-period";

function normalizeCardId(cardId: string) {
  return cardId.trim().toUpperCase();
}

function isNearTime(nowMinutes: number, plannedTime?: string | null) {
  const plannedMinutes = timeToMinutes(plannedTime);
  return plannedMinutes !== null && Math.abs(nowMinutes - plannedMinutes) <= EXIT_TOLERANCE_MINUTES;
}

function successResponse(params: {
  log: { id: number; type: AttendanceType; scannedAt: Date };
  employee: { id: number; firstName: string; lastName: string; department: string };
  device: { id: number; name: string };
  duplicate?: boolean;
}) {
  return NextResponse.json({
    success: true,
    duplicate: params.duplicate ?? false,
    logId: params.log.id,
    type: params.log.type,
    scannedAt: params.log.scannedAt,
    employee: params.employee,
    device: params.device,
  });
}

async function inferAttendanceType(params: {
  employeeId: number;
  devicePurpose: DevicePurpose;
  scannedAt: Date;
}) {
  const day = getAppDayRange(params.scannedAt);
  const [todayLogs, dailyCalendar] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: {
        employeeId: params.employeeId,
        scannedAt: { gte: day.start, lt: day.end },
      },
      orderBy: { scannedAt: "asc" },
    }),
    saveResolvedEmployeeWorkCalendar(params.employeeId, day.dateOnly),
  ]);

  if (todayLogs.length === 0) {
    return AttendanceType.ENTRY;
  }

  if (params.devicePurpose === DevicePurpose.ENTRY) return AttendanceType.ENTRY;
  if (params.devicePurpose === DevicePurpose.EXIT) return AttendanceType.EXIT;
  if (params.devicePurpose === DevicePurpose.BREAK_START) return AttendanceType.BREAK_START;
  if (params.devicePurpose === DevicePurpose.BREAK_END) return AttendanceType.BREAK_END;

  return inferBidirectionalMovement({
    logs: todayLogs,
    isNearPlannedEnd: isNearTime(getAppMinutes(params.scannedAt), dailyCalendar.plannedEnd),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secretKey = typeof body?.secretKey === "string" ? body.secretKey.trim() : "";
    const rfidCardId =
      typeof body?.rfidCardId === "string" ? normalizeCardId(body.rfidCardId) : "";
    const clientEventId = normalizeClientEventId(body?.clientEventId);
    const macAddress = typeof body?.macAddress === "string" ? body.macAddress.trim().toUpperCase() : "";
    const ipAddress = typeof body?.ipAddress === "string" ? body.ipAddress.trim() : "";
    const scanTime = resolveDeviceScanTime(body?.scannedAt);

    if (!secretKey || !rfidCardId) {
      return NextResponse.json(
        { error: "Secret key ve RFID kart ID zorunludur." },
        { status: 400 },
      );
    }
    if (body?.clientEventId && !clientEventId) {
      return NextResponse.json({ error: "Okutma olay kimligi gecersiz." }, { status: 400 });
    }
    if (!scanTime.ok) {
      return NextResponse.json({ error: scanTime.error }, { status: 400 });
    }
    const scannedAt = scanTime.scannedAt;

    const device = await prisma.device.findFirst({
      where: { secretKey },
      include: { company: true },
    });

    if (!device || !device.companyId || !device.company?.isActive) {
      return NextResponse.json({ error: "Cihaz bulunamadi." }, { status: 404 });
    }

    if (clientEventId) {
      const existingLog = await prisma.attendanceLog.findFirst({
        where: { deviceId: device.id, clientEventId },
        include: { employee: true },
      });
      if (existingLog) {
        await prisma.device.update({
          where: { id: device.id },
          data: { lastSeenAt: new Date(), lastDataTransferAt: new Date() },
        });
        return successResponse({
          log: existingLog,
          employee: existingLog.employee,
          device,
          duplicate: true,
        });
      }
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
        {
          code: "UNKNOWN_CARD",
          rfidCardId,
          error: "Bu RFID kart aktif bir personele tanimli degil.",
        },
        { status: 404 },
      );
    }

    await assertPayrollPeriodUnlocked(employee.companyId, scannedAt);

    const nextType = await inferAttendanceType({
      employeeId: employee.id,
      devicePurpose: device.purpose,
      scannedAt,
    });

    const [log] = await prisma.$transaction([
      prisma.attendanceLog.create({
        data: {
          employeeId: employee.id,
          deviceId: device.id,
          ...(clientEventId ? { clientEventId } : {}),
          type: nextType,
          rfidCardId,
          scannedAt,
          receivedAt: new Date(),
        },
      }),
      prisma.device.update({
        where: { id: device.id },
        data: {
          lastSeenAt: new Date(),
          lastDataTransferAt: new Date(),
          ...(macAddress ? { macAddress } : {}),
          ...(ipAddress ? { ipAddress } : {}),
        },
      }),
    ]);

    return successResponse({
      log,
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
    if (error instanceof Error && error.message.includes("puantaj dönemi kilitli")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "Okutma zaten kaydediliyor; cihaz yeniden sorgulayabilir." },
        { status: 503 },
      );
    }
    console.error("RFID scan error", error);

    return NextResponse.json(
      { error: "RFID kart okutma sirasinda beklenmeyen bir hata olustu." },
      { status: 500 },
    );
  }
}
