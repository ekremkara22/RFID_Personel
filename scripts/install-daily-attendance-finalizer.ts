import { prisma } from "../src/lib/prisma";

function getNextRunUtc() {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    20,
    59,
    0,
  ));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 19).replace("T", " ");
}

const procedureSql = `
CREATE PROCEDURE finalize_daily_attendance()
BEGIN
  DROP TEMPORARY TABLE IF EXISTS daily_attendance_ranks;
  CREATE TEMPORARY TABLE daily_attendance_ranks AS
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY employeeId ORDER BY scannedAt ASC, id ASC) AS row_number_in_day,
    COUNT(*) OVER (PARTITION BY employeeId) AS movement_count
  FROM AttendanceLog
  WHERE scannedAt >= UTC_DATE() - INTERVAL 3 HOUR
    AND scannedAt < UTC_DATE() + INTERVAL 21 HOUR;

  UPDATE AttendanceLog AS movement
  INNER JOIN daily_attendance_ranks AS ranked ON ranked.id = movement.id
  SET movement.type = CASE
    WHEN ranked.row_number_in_day = 1 THEN 'ENTRY'
    WHEN ranked.row_number_in_day = ranked.movement_count AND ranked.movement_count > 1 THEN 'EXIT'
    ELSE movement.type
  END;
  DROP TEMPORARY TABLE IF EXISTS daily_attendance_ranks;
END`;

async function main() {
  const schedulerRows = await prisma.$queryRawUnsafe<Array<{ schedulerStatus: string }>>(
    "SELECT @@GLOBAL.event_scheduler AS schedulerStatus",
  );
  if (String(schedulerRows[0]?.schedulerStatus).toUpperCase() !== "ON") {
    throw new Error(
      "MariaDB event_scheduler kapalı. Sunucu yöneticisi SET GLOBAL event_scheduler = ON komutunu çalıştırmalıdır.",
    );
  }
  await prisma.$executeRawUnsafe("DROP EVENT IF EXISTS finalize_daily_attendance_event");
  await prisma.$executeRawUnsafe("DROP PROCEDURE IF EXISTS finalize_daily_attendance");
  await prisma.$executeRawUnsafe(procedureSql);
  await prisma.$executeRawUnsafe(`
    CREATE EVENT finalize_daily_attendance_event
    ON SCHEDULE EVERY 1 DAY STARTS '${getNextRunUtc()}'
    ON COMPLETION PRESERVE ENABLE
    DO CALL finalize_daily_attendance()
  `);

  const events = await prisma.$queryRawUnsafe<Array<{ EVENT_NAME: string; STATUS: string; STARTS: Date }>>(`
    SELECT EVENT_NAME, STATUS, STARTS
    FROM information_schema.EVENTS
    WHERE EVENT_SCHEMA = DATABASE()
      AND EVENT_NAME = 'finalize_daily_attendance_event'
  `);
  if (events.length !== 1 || events[0].STATUS !== "ENABLED") {
    throw new Error("Gün sonu event görevi doğrulanamadı.");
  }
  console.log(`Gün sonu görevi aktif. İlk çalışma (UTC): ${events[0].STARTS}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
