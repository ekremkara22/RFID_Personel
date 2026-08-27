import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
  AttendanceType,
  EmploymentStatus,
  PrismaClient,
} from "../src/generated/prisma/client";
import { startOfLocalDay, timeToMinutes } from "../src/lib/work-calendar-rules";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const parsedUrl = new URL(databaseUrl);
const adapter = new PrismaMariaDb({
  host: parsedUrl.hostname,
  port: parsedUrl.port ? Number(parsedUrl.port) : 3306,
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database: parsedUrl.pathname.replace(/^\//, ""),
});
const prisma = new PrismaClient({ adapter });

const rangeStart = new Date("2026-08-10T00:00:00");
const rangeEnd = new Date("2026-08-23T23:59:59");

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateAt(day: number, time: string) {
  return new Date(`2026-08-${String(day).padStart(2, "0")}T${time}:00`);
}

function addMinutes(date: Date, minutes: number) {
  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return nextDate;
}

function getFallbackCalendar(day: number) {
  const date = dateAt(day, "00:00");
  const isSunday = date.getDay() === 0;

  return {
    employeeId: 0,
    workDate: startOfLocalDay(date),
    employmentStatus: EmploymentStatus.ACTIVE,
    plannedStart: isSunday ? null : "08:30",
    plannedEnd: isSunday ? null : "18:00",
    plannedBreakStart: isSunday ? null : "12:30",
    plannedBreakEnd: isSunday ? null : "13:30",
    plannedNetMinutes: isSunday ? 0 : 510,
    checkLateArrival: !isSunday,
    checkEarlyDeparture: !isSunday,
  };
}

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: { contains: "Termosa" } },
    orderBy: { id: "asc" },
  });

  if (!company) {
    throw new Error("Termosa firmasi bulunamadi.");
  }

  const [employees, device] = await Promise.all([
    prisma.employee.findMany({
      where: {
        companyId: company.id,
        isActive: true,
      },
      orderBy: [{ department: "asc" }, { firstName: "asc" }],
    }),
    prisma.device.findFirst({
      where: { companyId: company.id },
      orderBy: [{ lastSeenAt: "desc" }, { id: "asc" }],
    }),
  ]);

  if (employees.length === 0) {
    throw new Error("Termosa icin aktif personel bulunamadi.");
  }

  if (!device) {
    throw new Error("Termosa icin kayitli cihaz bulunamadi. Hareketler cihazsiz eklenmedi.");
  }

  const dailyCalendars = await prisma.employeeDailyCalendar.findMany({
    where: {
      employeeId: { in: employees.map((employee) => employee.id) },
      workDate: { gte: rangeStart, lte: rangeEnd },
    },
  });
  const dailyCalendarMap = new Map(
    dailyCalendars.map((calendar) => [`${calendar.employeeId}-${getDayKey(calendar.workDate)}`, calendar]),
  );

  const existingLogs = await prisma.attendanceLog.findMany({
    where: {
      employeeId: { in: employees.map((employee) => employee.id) },
      scannedAt: { gte: rangeStart, lte: rangeEnd },
    },
    select: {
      employeeId: true,
      scannedAt: true,
      type: true,
    },
  });
  const existingLogKeys = new Set(
    existingLogs.map((log) => `${log.employeeId}-${log.type}-${log.scannedAt.getTime()}`),
  );

  const logData = [];
  const absentPattern = new Map<string, number[]>([
    ["Yusuf Er", [11]],
    ["Mustafa Ofisboy", [14]],
    ["Muhammed Kaya", [18]],
    ["Selçuk Er", [21]],
  ]);

  for (let day = 10; day <= 23; day += 1) {
    const workDate = startOfLocalDay(dateAt(day, "00:00"));

    for (let employeeIndex = 0; employeeIndex < employees.length; employeeIndex += 1) {
      const employee = employees[employeeIndex];
      const employeeName = `${employee.firstName} ${employee.lastName}`.trim();
      const calendar = dailyCalendarMap.get(`${employee.id}-${getDayKey(workDate)}`) ?? getFallbackCalendar(day);

      if (calendar.employmentStatus !== EmploymentStatus.ACTIVE || calendar.plannedNetMinutes <= 0) continue;
      if (!calendar.plannedStart || !calendar.plannedEnd) continue;
      if (absentPattern.get(employeeName)?.includes(day)) continue;

      const startMinutes = timeToMinutes(calendar.plannedStart) ?? timeToMinutes("08:30") ?? 510;
      const endMinutes = timeToMinutes(calendar.plannedEnd) ?? timeToMinutes("18:00") ?? 1080;
      const lateOffset = (employeeIndex + day) % 6 === 0 ? 38 : (employeeIndex + day) % 4 === 0 ? 17 : (employeeIndex + day) % 5 === 0 ? 7 : -6;
      const exitOffset = (employeeIndex + day) % 7 === 0 ? -52 : (employeeIndex + day) % 5 === 0 ? -24 : 8;
      const breakStartOffset = (employeeIndex + day) % 5 === 0 ? 11 : -3;
      const breakEndOffset = (employeeIndex + day) % 4 === 0 ? 16 : 4;

      logData.push({
        employeeId: employee.id,
        deviceId: device.id,
        scannedAt: addMinutes(dateAt(day, calendar.plannedStart), lateOffset),
        type: AttendanceType.ENTRY,
        rfidCardId: employee.rfidCardId,
      });

      if (calendar.plannedBreakStart && calendar.plannedBreakEnd && endMinutes - startMinutes > 360) {
        logData.push({
          employeeId: employee.id,
          deviceId: device.id,
          scannedAt: addMinutes(dateAt(day, calendar.plannedBreakStart), breakStartOffset),
          type: AttendanceType.BREAK_START,
          rfidCardId: employee.rfidCardId,
        });
        logData.push({
          employeeId: employee.id,
          deviceId: device.id,
          scannedAt: addMinutes(dateAt(day, calendar.plannedBreakEnd), breakEndOffset),
          type: AttendanceType.BREAK_END,
          rfidCardId: employee.rfidCardId,
        });
      }

      logData.push({
        employeeId: employee.id,
        deviceId: device.id,
        scannedAt: addMinutes(dateAt(day, calendar.plannedEnd), exitOffset),
        type: AttendanceType.EXIT,
        rfidCardId: employee.rfidCardId,
      });
    }
  }

  const logsToCreate = logData.filter((log) => !existingLogKeys.has(`${log.employeeId}-${log.type}-${log.scannedAt.getTime()}`));

  if (logsToCreate.length > 0) {
    await prisma.attendanceLog.createMany({ data: logsToCreate });
  }

  const lateEntryCount = logData.filter((log) => {
    if (log.type !== AttendanceType.ENTRY) return false;

    const plannedStart = dailyCalendarMap.get(`${log.employeeId}-${getDayKey(startOfLocalDay(log.scannedAt))}`)?.plannedStart ?? "08:30";
    const plannedStartMinutes = timeToMinutes(plannedStart);
    if (plannedStartMinutes === null) return false;

    return log.scannedAt.getHours() * 60 + log.scannedAt.getMinutes() > plannedStartMinutes;
  }).length;
  const earlyExitCount = logData.filter((log) => {
    if (log.type !== AttendanceType.EXIT) return false;

    const plannedEnd = dailyCalendarMap.get(`${log.employeeId}-${getDayKey(startOfLocalDay(log.scannedAt))}`)?.plannedEnd ?? "18:00";
    const plannedEndMinutes = timeToMinutes(plannedEnd);
    if (plannedEndMinutes === null) return false;

    return log.scannedAt.getHours() * 60 + log.scannedAt.getMinutes() < plannedEndMinutes;
  }).length;

  console.log(`Termosa firma: ${company.name}`);
  console.log(`Aralik: 10.08.2026 - 23.08.2026`);
  console.log(`Mevcut hareket: ${existingLogs.length}`);
  console.log(`Planlanan hareket: ${logData.length}`);
  console.log(`Eklenen hareket: ${logsToCreate.length}`);
  console.log(`Atlanan hareket: ${logData.length - logsToCreate.length}`);
  console.log(`Gec giris adedi: ${lateEntryCount}`);
  console.log(`Erken cikis adedi: ${earlyExitCount}`);
}

main()
  .catch((error) => {
    console.error("Termosa hareket seed hatasi:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
