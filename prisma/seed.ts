import "dotenv/config";
import bcrypt from "bcryptjs";
import { subHours } from "date-fns";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
  AttendanceType,
  PrismaClient,
  Role,
} from "../src/generated/prisma/client";

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

async function main() {
  const superadminPassword = await bcrypt.hash("Admin123!", 10);
  const companyAdminPassword = await bcrypt.hash("Firma123!", 10);
  const employeePassword = await bcrypt.hash("Personel123!", 10);

  const company = await prisma.company.upsert({
    where: { id: "demo-company" },
    update: {
      name: "Demo Sirketi",
      contactName: "Ayse Kaya",
      contactEmail: "iletisim@demosirketi.com",
      contactPhone: "0555 000 00 00",
      address: "Istanbul",
      isActive: true,
    },
    create: {
      id: "demo-company",
      name: "Demo Sirketi",
      contactName: "Ayse Kaya",
      contactEmail: "iletisim@demosirketi.com",
      contactPhone: "0555 000 00 00",
      address: "Istanbul",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@checkinqr.local" },
    update: {
      name: "Super Admin",
      firstName: "Super",
      lastName: "Admin",
      password: superadminPassword,
      role: Role.SUPERADMIN,
      companyId: null,
    },
    create: {
      email: "admin@checkinqr.local",
      name: "Super Admin",
      firstName: "Super",
      lastName: "Admin",
      password: superadminPassword,
      role: Role.SUPERADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "firmaadmin@checkinqr.local" },
    update: {
      name: "Firma Yoneticisi",
      firstName: "Firma",
      lastName: "Yoneticisi",
      password: companyAdminPassword,
      role: Role.COMPANY_ADMIN,
      companyId: company.id,
    },
    create: {
      email: "firmaadmin@checkinqr.local",
      name: "Firma Yoneticisi",
      firstName: "Firma",
      lastName: "Yoneticisi",
      password: companyAdminPassword,
      role: Role.COMPANY_ADMIN,
      companyId: company.id,
    },
  });

  const demoEmployees = [
    {
      firstName: "Ahmet",
      lastName: "Yilmaz",
      email: "ahmet@demosirketi.com",
      department: "Uretim",
      age: 29,
    },
    {
      firstName: "Elif",
      lastName: "Demir",
      email: "elif@demosirketi.com",
      department: "Muhasebe",
      age: 34,
    },
    {
      firstName: "Can",
      lastName: "Aydin",
      email: "can@demosirketi.com",
      department: "Sevkiyat",
      age: 26,
    },
  ];

  for (const demoEmployee of demoEmployees) {
    const existingEmployee =
      (await prisma.employee.findFirst({
        where: {
          companyId: company.id,
          OR: [
            { email: demoEmployee.email },
            {
              firstName: demoEmployee.firstName,
              lastName: demoEmployee.lastName,
            },
          ],
        },
      })) ?? null;

    if (existingEmployee) {
      await prisma.employee.update({
        where: { id: existingEmployee.id },
        data: {
          firstName: demoEmployee.firstName,
          lastName: demoEmployee.lastName,
          email: demoEmployee.email,
          password: employeePassword,
          department: demoEmployee.department,
          age: demoEmployee.age,
          allowedLatitude: 41.0082,
          allowedLongitude: 28.9784,
          allowedRadiusM: 250,
          isActive: true,
        },
      });
    } else {
      await prisma.employee.create({
        data: {
          firstName: demoEmployee.firstName,
          lastName: demoEmployee.lastName,
          email: demoEmployee.email,
          password: employeePassword,
          department: demoEmployee.department,
          age: demoEmployee.age,
          allowedLatitude: 41.0082,
          allowedLongitude: 28.9784,
          allowedRadiusM: 250,
          companyId: company.id,
        },
      });
    }
  }

  const employees = await prisma.employee.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "asc" },
  });

  const device = await prisma.device.upsert({
    where: { macAddress: "DEMO-DEVICE-001" },
    update: {
      name: "Demo Giris Cihazi",
      companyId: company.id,
      activeQrToken: crypto.randomUUID(),
      qrUpdatedAt: new Date(),
      qrExpiresAt: new Date(Date.now() + 5_000),
      lastSeenAt: new Date(),
    },
    create: {
      name: "Demo Giris Cihazi",
      macAddress: "DEMO-DEVICE-001",
      companyId: company.id,
      activeQrToken: crypto.randomUUID(),
      qrUpdatedAt: new Date(),
      qrExpiresAt: new Date(Date.now() + 5_000),
      lastSeenAt: new Date(),
    },
  });

  const logCount = await prisma.attendanceLog.count({
    where: { employee: { companyId: company.id } },
  });

  if (logCount === 0 && employees.length > 0) {
    const [firstEmployee, secondEmployee] = employees;

    await prisma.attendanceLog.createMany({
      data: [
        {
          employeeId: firstEmployee.id,
          deviceId: device.id,
          type: AttendanceType.ENTRY,
          scannedAt: subHours(new Date(), 7),
        },
        {
          employeeId: firstEmployee.id,
          deviceId: device.id,
          type: AttendanceType.MEAL_START,
          scannedAt: subHours(new Date(), 3),
        },
        {
          employeeId: firstEmployee.id,
          deviceId: device.id,
          type: AttendanceType.MEAL_END,
          scannedAt: subHours(new Date(), 2),
        },
        {
          employeeId: secondEmployee.id,
          deviceId: device.id,
          type: AttendanceType.ENTRY,
          scannedAt: subHours(new Date(), 8),
        },
        {
          employeeId: secondEmployee.id,
          deviceId: device.id,
          type: AttendanceType.BREAK_START,
          scannedAt: subHours(new Date(), 4),
        },
        {
          employeeId: secondEmployee.id,
          deviceId: device.id,
          type: AttendanceType.BREAK_END,
          scannedAt: subHours(new Date(), 3),
        },
      ],
    });
  }

  console.log("Seed tamamlandi.");
  console.log("Super Admin: admin@checkinqr.local / Admin123!");
  console.log("Firma Admin: firmaadmin@checkinqr.local / Firma123!");
  console.log("Personel: ahmet@demosirketi.com / Personel123!");
}

main()
  .catch((error) => {
    console.error("Seed hatasi:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
