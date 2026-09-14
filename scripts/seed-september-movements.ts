import { AttendanceType } from "../src/generated/prisma/client";
import { dateOnlyFromKey } from "../src/lib/app-time";
import { prisma } from "../src/lib/prisma";
import { saveResolvedEmployeeWorkCalendar } from "../src/lib/work-calendar";

const YEAR = 2026;
const MONTH = 9;

function dayKey(day: number) {
  return `${YEAR}-${String(MONTH).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function atIstanbulTime(key: string, time: string, offsetMinutes = 0) {
  const [year, month, day] = key.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 3, minute + offsetMinutes));
}

async function main() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true, company: { isActive: true } },
    orderBy: [{ companyId: "asc" }, { department: "asc" }, { id: "asc" }],
  });
  const devices = await prisma.device.findMany({ orderBy: [{ companyId: "asc" }, { id: "asc" }] });
  const deviceByCompany = new Map<number, number>();
  for (const device of devices) {
    if (device.companyId && !deviceByCompany.has(device.companyId)) deviceByCompany.set(device.companyId, device.id);
  }

  const monthStart = atIstanbulTime("2026-09-01", "00:00");
  const monthEnd = atIstanbulTime("2026-10-01", "00:00");

  const movements: Array<{
    employeeId: number;
    deviceId: number;
    scannedAt: Date;
    type: AttendanceType;
    rfidCardId: string | null;
  }> = [];
  let lateCount = 0;

  for (let day = 1; day <= 30; day += 1) {
    const key = dayKey(day);
    for (let employeeIndex = 0; employeeIndex < employees.length; employeeIndex += 1) {
      const employee = employees[employeeIndex];
      const deviceId = deviceByCompany.get(employee.companyId);
      if (!deviceId) continue;

      const calendar = await saveResolvedEmployeeWorkCalendar(employee.id, dateOnlyFromKey(key));
      if (!calendar.plannedStart || !calendar.plannedEnd || calendar.plannedNetMinutes <= 0) continue;

      const pattern = (employee.id * 7 + day * 3) % 10;
      const lateOffset = pattern <= 2 ? 8 + pattern * 11 : pattern === 3 ? 4 : -5 - (pattern % 3);
      if (lateOffset > 0) lateCount += 1;
      const plannedBreakMinutes = Math.max(calendar.plannedBreakMinutes, 30);
      const breakExtra = (employee.id + day) % 4 === 0 ? 24 : (employee.id + day) % 5 === 0 ? 12 : -8;
      const breakDuration = Math.max(20, plannedBreakMinutes + breakExtra);
      const breakStart = calendar.plannedBreakStart ?? "12:30";
      const breakStartOffset = (employeeIndex + day) % 9 - 4;
      const exitOffset = (employee.id + day) % 6 === 0 ? -18 : 7;

      movements.push({
        employeeId: employee.id,
        deviceId,
        scannedAt: atIstanbulTime(key, calendar.plannedStart, lateOffset),
        type: AttendanceType.ENTRY,
        rfidCardId: employee.rfidCardId,
      });
      movements.push({
        employeeId: employee.id,
        deviceId,
        scannedAt: atIstanbulTime(key, breakStart, breakStartOffset),
        type: AttendanceType.BREAK_START,
        rfidCardId: employee.rfidCardId,
      });
      movements.push({
        employeeId: employee.id,
        deviceId,
        scannedAt: atIstanbulTime(key, breakStart, breakStartOffset + breakDuration),
        type: AttendanceType.BREAK_END,
        rfidCardId: employee.rfidCardId,
      });
      movements.push({
        employeeId: employee.id,
        deviceId,
        scannedAt: atIstanbulTime(key, calendar.plannedEnd, exitOffset),
        type: AttendanceType.EXIT,
        rfidCardId: employee.rfidCardId,
      });
    }
  }

  await prisma.$transaction([
    prisma.attendanceLog.deleteMany({ where: { scannedAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.attendanceLog.createMany({ data: movements }),
  ]);
  console.log(`${employees.length} aktif personel için ${movements.length} Eylül hareketi eklendi.`);
  console.log(`${lateCount} geç giriş içeren dağılım oluşturuldu.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
