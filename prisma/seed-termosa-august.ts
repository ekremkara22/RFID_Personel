import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
  AttendanceType,
  CalendarCalculationStatus,
  CalendarScopeType,
  DevicePurpose,
  EmploymentStatus,
  LeaveApprovalStatus,
  LeaveDurationType,
  LeaveType,
  PrismaClient,
  SpecialDayType,
  WorkDayType,
} from "../src/generated/prisma/client";
import {
  calculateGrossMinutes,
  calculateNetMinutes,
  resolveEmploymentStatus,
  startOfLocalDay,
} from "../src/lib/work-calendar-rules";

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

const augustStart = new Date("2026-08-01T00:00:00");
const augustEnd = new Date("2026-08-31T23:59:59");

const termosaEmployees = [
  ["Fedi Murat", "İşliyen", "Finans"],
  ["Onur Can", "Şeker", "Satış-operasyon"],
  ["Semih", "Arı", "Operasyon"],
  ["Volkan", "Bayrak", "Muhasebe"],
  ["Özlem", "Hanım", "Mutfak"],
  ["Kaan", "Yüksek", "Muhasebe"],
  ["Yusuf", "Er", "Operasyon"],
  ["Ali Eren", "Kaya", "IT"],
  ["Mustafa", "Ofisboy", "Ofisboy"],
  ["Muhammed", "Kaya", "Elektrik"],
  ["Gürkan", "Zorba", "Mimar"],
  ["Tayyip", "Arı", "Mühendis"],
  ["Uğurcan", "Parla", "Mühendis"],
  ["Taha Emrullah", "Kaçuru", "IT"],
  ["Selçuk", "Er", "Muhasebe"],
  ["Osman Ahmet", "Kömürcü", "Hukuk"],
] as const;

function dateAt(day: number, time: string) {
  return new Date(`2026-08-${String(day).padStart(2, "0")}T${time}:00`);
}

function getWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function addMinutes(date: Date, minutes: number) {
  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return nextDate;
}

async function ensureDepartment(companyId: string, name: string) {
  await prisma.department.upsert({
    where: { companyId_name: { companyId, name } },
    update: { isActive: true },
    create: { companyId, name, isActive: true },
  });
}

async function ensureBranch(companyId: string) {
  return prisma.branch.upsert({
    where: { companyId_name: { companyId, name: "Merkez" } },
    update: { isActive: true, location: "Termosa Merkez" },
    create: { companyId, name: "Merkez", location: "Termosa Merkez", isActive: true },
  });
}

async function ensureTemplate(companyId: string) {
  await prisma.workCalendarTemplate.updateMany({
    where: { companyId, isDefault: true },
    data: { isDefault: false },
  });

  const template = await prisma.workCalendarTemplate.upsert({
    where: { companyId_code: { companyId, code: "TERMOSA-GENEL-2026" } },
    update: {
      name: "Termosa Genel Calisma Takvimi",
      description: "Ağustos test verileri için 6 gün çalışma planı.",
      validFrom: augustStart,
      validTo: new Date("2026-12-31T23:59:59"),
      isDefault: true,
      isActive: true,
    },
    create: {
      companyId,
      code: "TERMOSA-GENEL-2026",
      name: "Termosa Genel Calisma Takvimi",
      description: "Ağustos test verileri için 6 gün çalışma planı.",
      validFrom: augustStart,
      validTo: new Date("2026-12-31T23:59:59"),
      isDefault: true,
      isActive: true,
    },
  });

  for (const weekday of [1, 2, 3, 4, 5, 6, 7]) {
    const isSaturday = weekday === 6;
    const isSunday = weekday === 7;
    const startTime = isSunday ? null : "08:30";
    const endTime = isSunday ? null : isSaturday ? "13:00" : "18:00";
    const breakMinutes = isSunday || isSaturday ? 0 : 60;
    const gross = calculateGrossMinutes(startTime, endTime);
    const net = calculateNetMinutes(startTime, endTime, breakMinutes);

    await prisma.workCalendarWeekday.upsert({
      where: { calendarTemplateId_weekday: { calendarTemplateId: template.id, weekday } },
      update: {
        dayType: isSunday ? WorkDayType.WEEKLY_REST : isSaturday ? WorkDayType.HALF_WORK : WorkDayType.NORMAL_WORK,
        startTime,
        endTime,
        crossesMidnight: false,
        breakMinutes,
        plannedGrossMinutes: gross,
        plannedNetMinutes: net,
        checkLateArrival: !isSunday,
        checkEarlyDeparture: !isSunday,
        checkAbsence: !isSunday,
      },
      create: {
        calendarTemplateId: template.id,
        weekday,
        dayType: isSunday ? WorkDayType.WEEKLY_REST : isSaturday ? WorkDayType.HALF_WORK : WorkDayType.NORMAL_WORK,
        startTime,
        endTime,
        crossesMidnight: false,
        breakMinutes,
        plannedGrossMinutes: gross,
        plannedNetMinutes: net,
        checkLateArrival: !isSunday,
        checkEarlyDeparture: !isSunday,
        checkAbsence: !isSunday,
      },
    });
  }

  const existingAssignment = await prisma.calendarAssignment.findFirst({
    where: {
      companyId,
      calendarTemplateId: template.id,
      scopeType: CalendarScopeType.COMPANY,
      validFrom: augustStart,
    },
  });

  if (existingAssignment) {
    await prisma.calendarAssignment.update({
      where: { id: existingAssignment.id },
      data: { validTo: augustEnd, priority: 100, isActive: true, description: "Termosa Ağustos test ataması" },
    });
  } else {
    await prisma.calendarAssignment.create({
      data: {
        companyId,
        calendarTemplateId: template.id,
        scopeType: CalendarScopeType.COMPANY,
        validFrom: augustStart,
        validTo: augustEnd,
        priority: 100,
        description: "Termosa Ağustos test ataması",
      },
    });
  }

  return template;
}

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: { contains: "Termosa" } },
  });

  if (!company) {
    throw new Error("Termosa firmasi bulunamadi.");
  }

  const branch = await ensureBranch(company.id);
  const departments = [...new Set(termosaEmployees.map((employee) => employee[2]))];
  for (const department of departments) {
    await ensureDepartment(company.id, department);
  }

  const template = await ensureTemplate(company.id);

  await prisma.calendarSpecialDay.upsert({
    where: { id: `${company.id}-2026-08-30-official` },
    update: {
      name: "30 Ağustos Zafer Bayramı",
      specialDayType: SpecialDayType.OFFICIAL_HOLIDAY,
      dateFrom: new Date("2026-08-30T00:00:00"),
      dateTo: new Date("2026-08-30T23:59:59"),
      isActive: true,
    },
    create: {
      id: `${company.id}-2026-08-30-official`,
      companyId: company.id,
      name: "30 Ağustos Zafer Bayramı",
      specialDayType: SpecialDayType.OFFICIAL_HOLIDAY,
      dateFrom: new Date("2026-08-30T00:00:00"),
      dateTo: new Date("2026-08-30T23:59:59"),
      scopeType: CalendarScopeType.COMPANY,
      description: "Ağustos test verisi resmi tatil kaydı",
      isActive: true,
    },
  });

  const employees = [];
  for (let index = 0; index < termosaEmployees.length; index += 1) {
    const [firstName, lastName, department] = termosaEmployees[index];
    const registrationNumber = `TRM-${String(index + 1).padStart(3, "0")}`;
    const rfidCardId = `TRM-RFID-${String(index + 1).padStart(4, "0")}`;
    const existingEmployee = await prisma.employee.findFirst({
      where: { companyId: company.id, firstName, lastName },
    });

    const employee = existingEmployee
      ? await prisma.employee.update({
          where: { id: existingEmployee.id },
          data: {
            department,
            branch: branch.name,
            registrationNumber,
            rfidCardId,
            hireDate: new Date("2026-01-01T00:00:00"),
            terminationDate: null,
            age: 30,
            isActive: true,
          },
        })
      : await prisma.employee.create({
          data: {
            companyId: company.id,
            firstName,
            lastName,
            department,
            branch: branch.name,
            registrationNumber,
            rfidCardId,
            hireDate: new Date("2026-01-01T00:00:00"),
            age: 30,
            isActive: true,
          },
        });

    employees.push(employee);
  }

  const device = await prisma.device.upsert({
    where: { macAddress: "TERMOSA-TEST-RFID-01" },
    update: {
      companyId: company.id,
      code: "TERMOSA-GIRIS-01",
      name: "Termosa Test RFID Okuyucu",
      branchLocation: branch.name,
      purpose: DevicePurpose.BIDIRECTIONAL,
      lastSeenAt: new Date(),
      lastDataTransferAt: new Date(),
    },
    create: {
      companyId: company.id,
      code: "TERMOSA-GIRIS-01",
      name: "Termosa Test RFID Okuyucu",
      macAddress: "TERMOSA-TEST-RFID-01",
      branchLocation: branch.name,
      purpose: DevicePurpose.BIDIRECTIONAL,
      lastSeenAt: new Date(),
      lastDataTransferAt: new Date(),
    },
  });

  await prisma.leaveRequest.deleteMany({
    where: {
      companyId: company.id,
      startDate: { gte: augustStart },
      endDate: { lte: augustEnd },
      description: { contains: "Ağustos test" },
    },
  });

  const leavePlan = [
    { employee: "Özlem Hanım", type: LeaveType.ANNUAL, durationType: LeaveDurationType.FULL_DAY, start: 10, end: 12 },
    { employee: "Kaan Yüksek", type: LeaveType.MEDICAL, durationType: LeaveDurationType.FULL_DAY, start: 24, end: 25 },
    { employee: "Semih Arı", type: LeaveType.HOURLY, durationType: LeaveDurationType.HOURLY, start: 18, end: 18, startTime: "09:00", endTime: "11:00" },
    { employee: "Ali Eren Kaya", type: LeaveType.HALF_DAY, durationType: LeaveDurationType.HALF_DAY, start: 21, end: 21, startTime: "13:00", endTime: "18:00" },
  ];

  for (const leave of leavePlan) {
    const employee = employees.find((item) => `${item.firstName} ${item.lastName}` === leave.employee);
    if (!employee) continue;

    await prisma.leaveRequest.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        type: leave.type,
        durationType: leave.durationType,
        approvalStatus: LeaveApprovalStatus.APPROVED,
        startDate: dateAt(leave.start, "00:00"),
        endDate: dateAt(leave.end, "23:59"),
        startTime: leave.startTime ?? null,
        endTime: leave.endTime ?? null,
        description: "Ağustos test izin kaydı",
      },
    });
  }

  await prisma.attendanceLog.deleteMany({
    where: {
      deviceId: device.id,
      scannedAt: { gte: augustStart, lte: augustEnd },
    },
  });

  await prisma.employeeDailyCalendar.deleteMany({
    where: {
      employee: { companyId: company.id },
      workDate: { gte: augustStart, lte: augustEnd },
    },
  });

  const weekdays = await prisma.workCalendarWeekday.findMany({
    where: { calendarTemplateId: template.id },
  });
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      companyId: company.id,
      approvalStatus: LeaveApprovalStatus.APPROVED,
      startDate: { lte: augustEnd },
      endDate: { gte: augustStart },
    },
  });

  const dailyCalendarData = [];
  const logData = [];
  const absentPattern = new Map([
    ["Yusuf Er", [6, 17]],
    ["Mustafa Ofisboy", [14]],
    ["Muhammed Kaya", [20]],
    ["Selçuk Er", [27]],
  ]);

  for (let day = 1; day <= 31; day += 1) {
    const workDate = startOfLocalDay(dateAt(day, "00:00"));
    const weekday = weekdays.find((item) => item.weekday === getWeekday(workDate));
    const isOfficialHoliday = day === 30;

    for (let employeeIndex = 0; employeeIndex < employees.length; employeeIndex += 1) {
      const employee = employees[employeeIndex];
      const fullName = `${employee.firstName} ${employee.lastName}`;
      const leave = leaves.find((item) => {
        return item.employeeId === employee.id && item.startDate <= workDate && item.endDate >= workDate;
      });
      const employmentStatus = resolveEmploymentStatus(employee, workDate) as EmploymentStatus;
      const fullDayLeave = leave?.durationType === LeaveDurationType.FULL_DAY;
      const dayType = fullDayLeave
        ? WorkDayType.LEAVE
        : isOfficialHoliday
          ? WorkDayType.OFFICIAL_HOLIDAY
          : weekday?.dayType ?? WorkDayType.NON_WORKING;
      const plannedStart = fullDayLeave || isOfficialHoliday ? null : weekday?.startTime ?? null;
      const plannedEnd = fullDayLeave || isOfficialHoliday ? null : weekday?.endTime ?? null;
      const plannedBreakMinutes = fullDayLeave || isOfficialHoliday ? 0 : weekday?.breakMinutes ?? 0;
      const plannedGrossMinutes = fullDayLeave || isOfficialHoliday ? 0 : weekday?.plannedGrossMinutes ?? 0;
      const plannedNetMinutes = fullDayLeave || isOfficialHoliday ? 0 : weekday?.plannedNetMinutes ?? 0;
      const requiresWork = employmentStatus === EmploymentStatus.ACTIVE && plannedNetMinutes > 0;

      dailyCalendarData.push({
        employeeId: employee.id,
        workDate,
        employmentStatus,
        dayType,
        plannedStart,
        plannedEnd,
        crossesMidnight: false,
        plannedBreakMinutes,
        plannedGrossMinutes,
        plannedNetMinutes,
        checkLateArrival: requiresWork,
        checkEarlyDeparture: requiresWork,
        checkAbsence: requiresWork,
        leaveId: leave?.id ?? null,
        calendarTemplateId: template.id,
        ruleSourceType: fullDayLeave ? "APPROVED_LEAVE" : isOfficialHoliday ? "OFFICIAL_HOLIDAY" : "COMPANY_DEFAULT_CALENDAR",
        ruleSourceId: fullDayLeave ? leave?.id ?? null : isOfficialHoliday ? `${company.id}-2026-08-30-official` : template.id,
        calculationStatus: CalendarCalculationStatus.CALCULATED,
        calculationReason: fullDayLeave
          ? "Onaylı tam gün izin/rapor"
          : isOfficialHoliday
            ? "30 Ağustos resmi tatili"
            : "Termosa varsayılan çalışma takvimi",
      });

      if (!requiresWork || fullDayLeave) continue;
      if (absentPattern.get(fullName)?.includes(day)) continue;

      const lateOffset = (employeeIndex + day) % 7 === 0 ? 22 : (employeeIndex + day) % 5 === 0 ? 9 : -7;
      const entry = addMinutes(dateAt(day, plannedStart ?? "08:30"), lateOffset);
      const exitOffset = (employeeIndex + day) % 6 === 0 ? -18 : 8;
      const exit = addMinutes(dateAt(day, plannedEnd ?? "18:00"), exitOffset);

      logData.push({
        employeeId: employee.id,
        deviceId: device.id,
        scannedAt: entry,
        type: AttendanceType.ENTRY,
        rfidCardId: employee.rfidCardId,
      });

      if (plannedBreakMinutes > 0) {
        logData.push({
          employeeId: employee.id,
          deviceId: device.id,
          scannedAt: dateAt(day, "12:30"),
          type: AttendanceType.BREAK_START,
          rfidCardId: employee.rfidCardId,
        });
        logData.push({
          employeeId: employee.id,
          deviceId: device.id,
          scannedAt: dateAt(day, "13:30"),
          type: AttendanceType.BREAK_END,
          rfidCardId: employee.rfidCardId,
        });
      }

      logData.push({
        employeeId: employee.id,
        deviceId: device.id,
        scannedAt: exit,
        type: AttendanceType.EXIT,
        rfidCardId: employee.rfidCardId,
      });
    }
  }

  await prisma.employeeDailyCalendar.createMany({ data: dailyCalendarData });
  await prisma.attendanceLog.createMany({ data: logData });

  console.log(`Termosa firma: ${company.name}`);
  console.log(`Personel sayisi: ${employees.length}`);
  console.log(`Gunluk takvim kaydi: ${dailyCalendarData.length}`);
  console.log(`RFID hareket kaydi: ${logData.length}`);
}

main()
  .catch((error) => {
    console.error("Termosa August seed hatasi:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
