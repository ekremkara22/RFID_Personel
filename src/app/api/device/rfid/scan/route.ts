import { NextResponse } from "next/server";
import { AttendanceType, DevicePurpose } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { timeToMinutes } from "@/lib/work-calendar-rules";
import { EXIT_TOLERANCE_MINUTES, inferBidirectionalMovement } from "@/lib/attendance-sequence";

function normalizeCardId(cardId: string) {
  return cardId.trim().toUpperCase();
}

function getDayStart(date: Date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function getNextDay(date: Date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

function getLogMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function isNearTime(nowMinutes: number, plannedTime?: string | null) {
  const plannedMinutes = timeToMinutes(plannedTime);
  return plannedMinutes !== null && Math.abs(nowMinutes - plannedMinutes) <= EXIT_TOLERANCE_MINUTES;
}

async function inferAttendanceType(params: {
  employeeId: number;
  devicePurpose: DevicePurpose;
  scannedAt: Date;
}) {
  const dayStart = getDayStart(params.scannedAt);
  const dayEnd = getNextDay(dayStart);
  const todayLogs = await prisma.attendanceLog.findMany({
    where: {
      employeeId: params.employeeId,
      scannedAt: { gte: dayStart, lt: dayEnd },
    },
    orderBy: { scannedAt: "asc" },
  });

  if (todayLogs.length === 0) {
    return AttendanceType.ENTRY;
  }

  if (params.devicePurpose === DevicePurpose.ENTRY) return AttendanceType.ENTRY;
  if (params.devicePurpose === DevicePurpose.EXIT) return AttendanceType.EXIT;
  if (params.devicePurpose === DevicePurpose.BREAK_START) return AttendanceType.BREAK_START;
  if (params.devicePurpose === DevicePurpose.BREAK_END) return AttendanceType.BREAK_END;

  const dailyCalendar = await prisma.employeeDailyCalendar.findUnique({
    where: {
      employeeId_workDate: {
        employeeId: params.employeeId,
        workDate: dayStart,
      },
    },
  });
  return inferBidirectionalMovement({
    logs: todayLogs,
    isNearPlannedEnd: isNearTime(getLogMinutes(params.scannedAt), dailyCalendar?.plannedEnd),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secretKey = typeof body?.secretKey === "string" ? body.secretKey.trim() : "";
    const rfidCardId =
      typeof body?.rfidCardId === "string" ? normalizeCardId(body.rfidCardId) : "";
    const macAddress = typeof body?.macAddress === "string" ? body.macAddress.trim().toUpperCase() : "";
    const ipAddress = typeof body?.ipAddress === "string" ? body.ipAddress.trim() : "";
    const scannedAt = new Date();

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

    if (!device || !device.companyId || !device.company?.isActive) {
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
          type: nextType,
          rfidCardId,
          scannedAt,
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
