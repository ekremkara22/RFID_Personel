/**
 * Staging-only demo data for the Muhasebe module: its own departments, positions, collar types,
 * personnel and both salary sheets. İK tables are not written; the script only removes the İK demo
 * records an earlier version of this script created (DEMO- personnel and their unused departments).
 *
 *   SEED_COMPANY_ID=3 npx tsx scripts/seed-accounting-demo.ts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient, type SalaryInsuranceType } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");
const parsedUrl = new URL(databaseUrl);
const database = parsedUrl.pathname.replace(/^\//, "");
if (!database.toLowerCase().includes("staging")) throw new Error(`Demo verisi yalnız staging veritabanına yazılabilir. Hedef: ${database}`);
const companyId = Number(process.env.SEED_COMPANY_ID);
if (!Number.isSafeInteger(companyId) || companyId <= 0) throw new Error("SEED_COMPANY_ID gerekli.");

const prisma = new PrismaClient({ adapter: new PrismaMariaDb({ host: parsedUrl.hostname, port: parsedUrl.port ? Number(parsedUrl.port) : 3306, user: decodeURIComponent(parsedUrl.username), password: decodeURIComponent(parsedUrl.password), database }) });

const DEMO_PREFIX = "DEMO-";
const DEPARTMENTS = ["Üretim", "Kalite Kontrol", "Bakım ve Onarım", "Depo ve Lojistik", "Bilgi İşlem", "Muhasebe ve Finans", "İnsan Kaynakları", "Yönetim", "Satış"];
const POSITIONS = ["Genel Müdür", "Fabrika Müdürü", "Departman Müdürü", "Mühendis", "Uzman", "Vardiya Amiri", "Usta", "Operatör", "Teknisyen", "Forklift Operatörü", "Depo Sorumlusu", "Satış Temsilcisi", "Asistan"];
const COLLARS = ["Mavi Yaka", "Beyaz Yaka"];
// Seeded into İK by the previous version of this script on 2026-10-14; removed only if still unused.
const LEGACY_HR_DEPARTMENTS = DEPARTMENTS;
const LEGACY_SEED_DAY = new Date("2026-10-14T00:00:00Z");

type Person = [name: string, department: string, position: string, collar: string, insurance: SalaryInsuranceType, amount: number];
const M = "Mavi Yaka";
const B = "Beyaz Yaka";

// Brütten Nete: production and support staff, monthly gross.
const GROSS_STAFF: Person[] = [
  ["Mehmet Yılmaz", "Üretim", "Vardiya Amiri", M, "INCENTIVE", 52_000], ["Ali Kaya", "Üretim", "Usta", M, "INCENTIVE", 46_500],
  ["Hasan Demir", "Üretim", "Usta", M, "INCENTIVE", 45_000], ["Mustafa Çelik", "Üretim", "Operatör", M, "INCENTIVE", 38_500],
  ["Hüseyin Şahin", "Üretim", "Operatör", M, "INCENTIVE", 37_000], ["İbrahim Yıldız", "Üretim", "Operatör", M, "INCENTIVE", 36_000],
  ["Murat Öztürk", "Üretim", "Operatör", M, "INCENTIVE", 35_500], ["Emre Aydın", "Üretim", "Operatör", M, "INCENTIVE", 34_800],
  ["Osman Arslan", "Üretim", "Operatör", M, "RETIRED", 36_500], ["Kemal Doğan", "Üretim", "Operatör", M, "INCENTIVE", 33_030],
  ["Yusuf Kılıç", "Üretim", "Operatör", M, "INCENTIVE", 33_030], ["Serkan Aslan", "Üretim", "Operatör", M, "INCENTIVE", 33_030],
  ["Burak Çetin", "Üretim", "Operatör", M, "INCENTIVE", 34_000], ["Volkan Kara", "Üretim", "Operatör", M, "NO_INCENTIVE", 35_000],
  ["Fatih Koç", "Kalite Kontrol", "Mühendis", B, "INCENTIVE", 68_000], ["Gökhan Kurt", "Kalite Kontrol", "Teknisyen", M, "INCENTIVE", 42_000],
  ["Sinan Özdemir", "Kalite Kontrol", "Teknisyen", M, "INCENTIVE", 40_500], ["Erkan Şimşek", "Bakım ve Onarım", "Usta", M, "INCENTIVE", 49_000],
  ["Tolga Polat", "Bakım ve Onarım", "Teknisyen", M, "INCENTIVE", 44_000], ["Cem Erdoğan", "Bakım ve Onarım", "Teknisyen", M, "RETIRED", 43_000],
  ["Kadir Aksoy", "Depo ve Lojistik", "Depo Sorumlusu", M, "INCENTIVE", 45_500], ["Umut Yavuz", "Depo ve Lojistik", "Forklift Operatörü", M, "INCENTIVE", 38_000],
  ["Onur Güneş", "Depo ve Lojistik", "Forklift Operatörü", M, "INCENTIVE", 37_500], ["Barış Tekin", "Depo ve Lojistik", "Operatör", M, "INCENTIVE", 33_030],
  ["Deniz Uçar", "Bilgi İşlem", "Uzman", B, "INCENTIVE", 72_000], ["Can Korkmaz", "Bilgi İşlem", "Teknisyen", B, "INCENTIVE", 48_000],
];

// Netten Brüte: office staff whose salaries are agreed as net.
const NET_STAFF: Person[] = [
  ["Ahmet Karaca", "Yönetim", "Genel Müdür", B, "NO_INCENTIVE", 185_000], ["Selim Bozkurt", "Yönetim", "Fabrika Müdürü", B, "NO_INCENTIVE", 130_000],
  ["Elif Şen", "Yönetim", "Asistan", B, "INCENTIVE", 36_000], ["Zeynep Akın", "Muhasebe ve Finans", "Departman Müdürü", B, "INCENTIVE", 95_000],
  ["Ayşe Ünal", "Muhasebe ve Finans", "Uzman", B, "INCENTIVE", 52_000], ["Merve Bulut", "Muhasebe ve Finans", "Uzman", B, "INCENTIVE", 48_500],
  ["Gizem Taş", "İnsan Kaynakları", "Uzman", B, "INCENTIVE", 50_000], ["Büşra Işık", "İnsan Kaynakları", "Asistan", B, "INCENTIVE", 34_500],
  ["Emine Coşkun", "Satış", "Departman Müdürü", B, "INCENTIVE", 98_000], ["Okan Sarı", "Satış", "Satış Temsilcisi", B, "INCENTIVE", 55_000],
  ["Ceren Ateş", "Satış", "Satış Temsilcisi", B, "INCENTIVE", 53_000], ["Tuğba Er", "Satış", "Satış Temsilcisi", B, "INCENTIVE", 51_500],
  ["Levent Oral", "Üretim", "Departman Müdürü", B, "INCENTIVE", 105_000], ["Berk Kaplan", "Üretim", "Mühendis", B, "INCENTIVE", 62_000],
];

async function cleanUpLegacyHrDemo() {
  const removedEmployees = await prisma.employee.deleteMany({ where: { companyId, registrationNumber: { startsWith: DEMO_PREFIX } } });
  const candidates = await prisma.department.findMany({
    where: { companyId, name: { in: LEGACY_HR_DEPARTMENTS }, createdAt: { gte: LEGACY_SEED_DAY } },
    select: { id: true, name: true, _count: { select: { employees: true, calendarAssignments: true, calendarSpecialDays: true, dailyExceptions: true, membershipScopes: true } } },
  });
  const unused = candidates.filter((item) => Object.values(item._count).every((count) => count === 0));
  if (unused.length) await prisma.department.deleteMany({ where: { id: { in: unused.map((item) => item.id) } } });
  return { removedHrDemoEmployees: removedEmployees.count, removedHrDemoDepartments: unused.map((item) => item.name) };
}

async function upsertNames(kind: "department" | "position" | "collar", names: string[]) {
  const ids = new Map<string, number>();
  for (const name of names) {
    const where = { companyId_name: { companyId, name } };
    const row = kind === "department"
      ? await prisma.accountingDepartment.upsert({ where, create: { companyId, name }, update: { isActive: true } })
      : kind === "position"
        ? await prisma.accountingPosition.upsert({ where, create: { companyId, name }, update: { isActive: true } })
        : await prisma.accountingCollarType.upsert({ where, create: { companyId, name }, update: { isActive: true } });
    ids.set(name, row.id);
  }
  return ids;
}

async function main() {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true } });
  const cleanup = await cleanUpLegacyHrDemo();

  const departmentIds = await upsertNames("department", DEPARTMENTS);
  const positionIds = await upsertNames("position", POSITIONS);
  const collarIds = await upsertNames("collar", COLLARS);

  await prisma.salaryWorksheetRow.deleteMany({ where: { companyId } });
  const removedDemo = await prisma.accountingPersonnel.deleteMany({ where: { companyId, registrationNumber: { startsWith: DEMO_PREFIX } } });

  let sequence = 1000;
  const createPersonnel = async (people: Person[], grossOf: (person: Person) => number) => {
    const ids: number[] = [];
    for (const [index, person] of people.entries()) {
      const [fullName, department, position, collar, insurance] = person;
      const parts = fullName.split(" ");
      sequence += 1;
      const row = await prisma.accountingPersonnel.create({
        data: {
          companyId,
          firstName: parts.slice(0, -1).join(" "),
          lastName: parts[parts.length - 1],
          registrationNumber: `${DEMO_PREFIX}${sequence}`,
          departmentId: departmentIds.get(department)!,
          positionId: positionIds.get(position)!,
          collarTypeId: collarIds.get(collar)!,
          insuranceType: insurance,
          grossSalary: grossOf(person),
          hireDate: new Date(Date.UTC(2015 + (index % 11), (index * 5) % 12, 1 + (index % 27))),
        },
        select: { id: true },
      });
      ids.push(row.id);
    }
    return ids;
  };

  const grossIds = await createPersonnel(GROSS_STAFF, (person) => person[5]);
  // Net-agreed staff get an approximate gross on their card; the sheet keeps the agreed net.
  const netIds = await createPersonnel(NET_STAFF, (person) => Math.round(person[5] * 1.42));

  const rows = (people: Person[], ids: number[], mode: "GROSS_TO_NET" | "NET_TO_GROSS") => people.map(([name, department, position, collarType, insuranceType, amount], index) => ({
    companyId, mode, sortOrder: index, name, department, position, collarType, insuranceType, amount, personnelId: ids[index],
  }));
  await prisma.salaryWorksheetRow.createMany({ data: [...rows(GROSS_STAFF, grossIds, "GROSS_TO_NET"), ...rows(NET_STAFF, netIds, "NET_TO_GROSS")] });

  console.log(JSON.stringify({
    company: company.name,
    ...cleanup,
    accountingDepartments: DEPARTMENTS.length,
    accountingPositions: POSITIONS.length,
    accountingCollarTypes: COLLARS.length,
    replacedDemoPersonnel: removedDemo.count,
    accountingPersonnel: grossIds.length + netIds.length,
    grossToNetRows: GROSS_STAFF.length,
    netToGrossRows: NET_STAFF.length,
  }, null, 2));
}

main().finally(() => prisma.$disconnect());
