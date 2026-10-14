/**
 * Staging-only demo data for Muhasebe screens: department categories, departments, positions,
 * personnel cards with salaries and both salary sheets. Re-running replaces the previous demo data.
 *
 *   SEED_COMPANY_ID=3 npx tsx scripts/seed-accounting-demo.ts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient, type SalaryInsuranceType, type WorkforceType } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");
const parsedUrl = new URL(databaseUrl);
const database = parsedUrl.pathname.replace(/^\//, "");
if (!database.toLowerCase().includes("staging")) throw new Error(`Demo verisi yalnız staging veritabanına yazılabilir. Hedef: ${database}`);
const companyId = Number(process.env.SEED_COMPANY_ID);
if (!Number.isSafeInteger(companyId) || companyId <= 0) throw new Error("SEED_COMPANY_ID gerekli.");

const prisma = new PrismaClient({ adapter: new PrismaMariaDb({ host: parsedUrl.hostname, port: parsedUrl.port ? Number(parsedUrl.port) : 3306, user: decodeURIComponent(parsedUrl.username), password: decodeURIComponent(parsedUrl.password), database }) });

const DEMO_PREFIX = "DEMO-";
const CATEGORIES = ["Üretim", "Destek Hizmetleri", "İdari", "Satış ve Pazarlama"];
const DEPARTMENTS: [string, string][] = [
  ["Üretim", "Üretim"], ["Kalite Kontrol", "Üretim"], ["Bakım ve Onarım", "Destek Hizmetleri"], ["Depo ve Lojistik", "Destek Hizmetleri"],
  ["Bilgi İşlem", "Destek Hizmetleri"], ["Muhasebe ve Finans", "İdari"], ["İnsan Kaynakları", "İdari"], ["Yönetim", "İdari"], ["Satış", "Satış ve Pazarlama"],
];
const POSITIONS = ["Genel Müdür", "Fabrika Müdürü", "Departman Müdürü", "Mühendis", "Uzman", "Vardiya Amiri", "Usta", "Operatör", "Teknisyen", "Forklift Operatörü", "Depo Sorumlusu", "Satış Temsilcisi", "Asistan"];

type Person = [name: string, department: string, position: string, collar: WorkforceType, insurance: SalaryInsuranceType, amount: number];

// Brütten Nete: production and support staff, monthly gross.
const GROSS_STAFF: Person[] = [
  ["Mehmet Yılmaz", "Üretim", "Vardiya Amiri", "BLUE_COLLAR", "INCENTIVE", 52_000], ["Ali Kaya", "Üretim", "Usta", "BLUE_COLLAR", "INCENTIVE", 46_500],
  ["Hasan Demir", "Üretim", "Usta", "BLUE_COLLAR", "INCENTIVE", 45_000], ["Mustafa Çelik", "Üretim", "Operatör", "BLUE_COLLAR", "INCENTIVE", 38_500],
  ["Hüseyin Şahin", "Üretim", "Operatör", "BLUE_COLLAR", "INCENTIVE", 37_000], ["İbrahim Yıldız", "Üretim", "Operatör", "BLUE_COLLAR", "INCENTIVE", 36_000],
  ["Murat Öztürk", "Üretim", "Operatör", "BLUE_COLLAR", "INCENTIVE", 35_500], ["Emre Aydın", "Üretim", "Operatör", "BLUE_COLLAR", "INCENTIVE", 34_800],
  ["Osman Arslan", "Üretim", "Operatör", "BLUE_COLLAR", "RETIRED", 36_500], ["Kemal Doğan", "Üretim", "Operatör", "BLUE_COLLAR", "INCENTIVE", 33_030],
  ["Yusuf Kılıç", "Üretim", "Operatör", "BLUE_COLLAR", "INCENTIVE", 33_030], ["Serkan Aslan", "Üretim", "Operatör", "BLUE_COLLAR", "INCENTIVE", 33_030],
  ["Burak Çetin", "Üretim", "Operatör", "BLUE_COLLAR", "INCENTIVE", 34_000], ["Volkan Kara", "Üretim", "Operatör", "BLUE_COLLAR", "NO_INCENTIVE", 35_000],
  ["Fatih Koç", "Kalite Kontrol", "Mühendis", "WHITE_COLLAR", "INCENTIVE", 68_000], ["Gökhan Kurt", "Kalite Kontrol", "Teknisyen", "BLUE_COLLAR", "INCENTIVE", 42_000],
  ["Sinan Özdemir", "Kalite Kontrol", "Teknisyen", "BLUE_COLLAR", "INCENTIVE", 40_500], ["Erkan Şimşek", "Bakım ve Onarım", "Usta", "BLUE_COLLAR", "INCENTIVE", 49_000],
  ["Tolga Polat", "Bakım ve Onarım", "Teknisyen", "BLUE_COLLAR", "INCENTIVE", 44_000], ["Cem Erdoğan", "Bakım ve Onarım", "Teknisyen", "BLUE_COLLAR", "RETIRED", 43_000],
  ["Kadir Aksoy", "Depo ve Lojistik", "Depo Sorumlusu", "BLUE_COLLAR", "INCENTIVE", 45_500], ["Umut Yavuz", "Depo ve Lojistik", "Forklift Operatörü", "BLUE_COLLAR", "INCENTIVE", 38_000],
  ["Onur Güneş", "Depo ve Lojistik", "Forklift Operatörü", "BLUE_COLLAR", "INCENTIVE", 37_500], ["Barış Tekin", "Depo ve Lojistik", "Operatör", "BLUE_COLLAR", "INCENTIVE", 33_030],
  ["Deniz Uçar", "Bilgi İşlem", "Uzman", "WHITE_COLLAR", "INCENTIVE", 72_000], ["Can Korkmaz", "Bilgi İşlem", "Teknisyen", "WHITE_COLLAR", "INCENTIVE", 48_000],
];

// Netten Brüte: office staff whose salaries are agreed as net.
const NET_STAFF: Person[] = [
  ["Ahmet Karaca", "Yönetim", "Genel Müdür", "WHITE_COLLAR", "NO_INCENTIVE", 185_000], ["Selim Bozkurt", "Yönetim", "Fabrika Müdürü", "WHITE_COLLAR", "NO_INCENTIVE", 130_000],
  ["Elif Şen", "Yönetim", "Asistan", "WHITE_COLLAR", "INCENTIVE", 36_000], ["Zeynep Akın", "Muhasebe ve Finans", "Departman Müdürü", "WHITE_COLLAR", "INCENTIVE", 95_000],
  ["Ayşe Ünal", "Muhasebe ve Finans", "Uzman", "WHITE_COLLAR", "INCENTIVE", 52_000], ["Merve Bulut", "Muhasebe ve Finans", "Uzman", "WHITE_COLLAR", "INCENTIVE", 48_500],
  ["Gizem Taş", "İnsan Kaynakları", "Uzman", "WHITE_COLLAR", "INCENTIVE", 50_000], ["Büşra Işık", "İnsan Kaynakları", "Asistan", "WHITE_COLLAR", "INCENTIVE", 34_500],
  ["Emine Coşkun", "Satış", "Departman Müdürü", "WHITE_COLLAR", "INCENTIVE", 98_000], ["Okan Sarı", "Satış", "Satış Temsilcisi", "WHITE_COLLAR", "INCENTIVE", 55_000],
  ["Ceren Ateş", "Satış", "Satış Temsilcisi", "WHITE_COLLAR", "INCENTIVE", 53_000], ["Tuğba Er", "Satış", "Satış Temsilcisi", "WHITE_COLLAR", "INCENTIVE", 51_500],
  ["Levent Oral", "Üretim", "Departman Müdürü", "WHITE_COLLAR", "INCENTIVE", 105_000], ["Berk Kaplan", "Üretim", "Mühendis", "WHITE_COLLAR", "INCENTIVE", 62_000],
];

async function main() {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true } });

  const categoryIds = new Map<string, number>();
  for (const name of CATEGORIES) {
    const category = await prisma.departmentCategory.upsert({ where: { companyId_name: { companyId, name } }, create: { companyId, name }, update: { isActive: true } });
    categoryIds.set(name, category.id);
  }
  const departmentIds = new Map<string, number>();
  for (const [name, category] of DEPARTMENTS) {
    const department = await prisma.department.upsert({ where: { companyId_name: { companyId, name } }, create: { companyId, name, categoryId: categoryIds.get(category)! }, update: { isActive: true, categoryId: categoryIds.get(category)! } });
    departmentIds.set(name, department.id);
  }
  const positionIds = new Map<string, number>();
  for (const name of POSITIONS) {
    const position = await prisma.position.upsert({ where: { companyId_name: { companyId, name } }, create: { companyId, name }, update: { isActive: true } });
    positionIds.set(name, position.id);
  }

  // Replace earlier demo personnel and both sheets so the report always shows one consistent data set.
  await prisma.salaryWorksheetRow.deleteMany({ where: { companyId } });
  const removed = await prisma.employee.deleteMany({ where: { companyId, registrationNumber: { startsWith: DEMO_PREFIX } } });

  let sequence = 1000;
  const createEmployees = async (people: Person[], grossOf: (person: Person) => number) => {
    const ids: number[] = [];
    for (const [index, person] of people.entries()) {
      const [fullName, department, position, collar, insurance] = person;
      const [firstName, ...rest] = fullName.split(" ");
      sequence += 1;
      const employee = await prisma.employee.create({
        data: {
          companyId,
          firstName,
          lastName: rest.join(" "),
          registrationNumber: `${DEMO_PREFIX}${sequence}`,
          department,
          departmentId: departmentIds.get(department)!,
          positionId: positionIds.get(position)!,
          workforceType: collar,
          salaryInsuranceType: insurance,
          grossSalary: grossOf(person),
          age: 24 + ((index * 7) % 30),
          hireDate: new Date(Date.UTC(2015 + (index % 11), (index * 5) % 12, 1 + (index % 27))),
        },
        select: { id: true },
      });
      ids.push(employee.id);
    }
    return ids;
  };

  const grossIds = await createEmployees(GROSS_STAFF, (person) => person[5]);
  // Net-agreed staff get an approximate gross on their card; the sheet keeps the agreed net.
  const netIds = await createEmployees(NET_STAFF, (person) => Math.round(person[5] * 1.42));

  const rows = (people: Person[], ids: number[], mode: "GROSS_TO_NET" | "NET_TO_GROSS") => people.map(([name, department, position, collar, insurance, amount], index) => ({
    companyId, mode, sortOrder: index, name, department, position, workforceType: collar, insuranceType: insurance, amount, employeeId: ids[index],
  }));
  await prisma.salaryWorksheetRow.createMany({ data: [...rows(GROSS_STAFF, grossIds, "GROSS_TO_NET"), ...rows(NET_STAFF, netIds, "NET_TO_GROSS")] });

  const owner = await prisma.companyMembership.findFirst({ where: { companyId, role: { key: "OWNER" } }, select: { user: { select: { email: true, trialEndsAt: true, moduleEntitlements: { select: { moduleKey: true, expiresAt: true } } } } } });
  console.log(JSON.stringify({
    company: company.name,
    categories: CATEGORIES.length,
    departments: DEPARTMENTS.length,
    positions: POSITIONS.length,
    removedDemoEmployees: removed.count,
    employees: grossIds.length + netIds.length,
    grossToNetRows: GROSS_STAFF.length,
    netToGrossRows: NET_STAFF.length,
    ownerLicenses: owner?.user.moduleEntitlements ?? [],
    ownerTrialEndsAt: owner?.user.trialEndsAt ?? null,
  }, null, 2));
}

main().finally(() => prisma.$disconnect());
