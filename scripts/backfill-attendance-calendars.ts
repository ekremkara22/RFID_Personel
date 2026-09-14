import { getAppDayKey, dateOnlyFromKey } from "../src/lib/app-time";
import { prisma } from "../src/lib/prisma";
import { saveResolvedEmployeeWorkCalendar } from "../src/lib/work-calendar";

async function main() {
  const since = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  const logs = await prisma.attendanceLog.findMany({
    where: { scannedAt: { gte: since } },
    select: { employeeId: true, scannedAt: true },
    orderBy: { scannedAt: "asc" },
  });

  const targets = new Map<string, { employeeId: number; workDate: Date }>();
  for (const log of logs) {
    const dayKey = getAppDayKey(log.scannedAt);
    targets.set(`${log.employeeId}-${dayKey}`, {
      employeeId: log.employeeId,
      workDate: dateOnlyFromKey(dayKey),
    });
  }

  for (const target of targets.values()) {
    await saveResolvedEmployeeWorkCalendar(target.employeeId, target.workDate);
  }

  console.log(`${targets.size} personel-gün takvim kaydı güncellendi.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

