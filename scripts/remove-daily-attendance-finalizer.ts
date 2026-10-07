import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe("DROP EVENT IF EXISTS finalize_daily_attendance_event");
  await prisma.$executeRawUnsafe("DROP PROCEDURE IF EXISTS finalize_daily_attendance");

  const events = await prisma.$queryRawUnsafe<Array<{ eventCount: bigint }>>(`
    SELECT COUNT(*) AS eventCount
    FROM information_schema.EVENTS
    WHERE EVENT_SCHEMA = DATABASE()
      AND EVENT_NAME = 'finalize_daily_attendance_event'
  `);
  const procedures = await prisma.$queryRawUnsafe<Array<{ procedureCount: bigint }>>(`
    SELECT COUNT(*) AS procedureCount
    FROM information_schema.ROUTINES
    WHERE ROUTINE_SCHEMA = DATABASE()
      AND ROUTINE_TYPE = 'PROCEDURE'
      AND ROUTINE_NAME = 'finalize_daily_attendance'
  `);

  if (Number(events[0]?.eventCount ?? 0) !== 0 || Number(procedures[0]?.procedureCount ?? 0) !== 0) {
    throw new Error("Gün sonu hareket düzenleyicisi kaldırılamadı.");
  }
  console.log("Gün sonu hareket türü düzenleyicisi kaldırıldı.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
