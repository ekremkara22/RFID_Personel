-- Her gece 23:59 Türkiye saatinde o günün kart hareketlerini kesinleştirir.
-- Kurulum: mysql --database=<veritabani> < prisma/install-daily-attendance-finalizer.sql
-- MySQL/MariaDB event_scheduler sunucu ayarı ON olmalıdır.

SET time_zone = '+00:00';
SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS finalize_daily_attendance_event;
DROP PROCEDURE IF EXISTS finalize_daily_attendance;

DELIMITER //

CREATE PROCEDURE finalize_daily_attendance()
BEGIN
  DROP TEMPORARY TABLE IF EXISTS daily_attendance_ranks;

  CREATE TEMPORARY TABLE daily_attendance_ranks AS
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY employeeId
      ORDER BY scannedAt ASC, id ASC
    ) AS row_number_in_day,
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
END//

DELIMITER ;

SET @next_run = TIMESTAMP(UTC_DATE(), '20:59:00');
SET @next_run = IF(UTC_TIMESTAMP() < @next_run, @next_run, @next_run + INTERVAL 1 DAY);
SET @create_event = CONCAT(
  'CREATE EVENT finalize_daily_attendance_event ',
  'ON SCHEDULE EVERY 1 DAY STARTS ''',
  DATE_FORMAT(@next_run, '%Y-%m-%d %H:%i:%s'),
  ''' ON COMPLETION PRESERVE ENABLE ',
  'DO CALL finalize_daily_attendance()'
);
PREPARE create_event_statement FROM @create_event;
EXECUTE create_event_statement;
DEALLOCATE PREPARE create_event_statement;

SELECT EVENT_NAME, STATUS, STARTS, INTERVAL_VALUE, INTERVAL_FIELD
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = DATABASE()
  AND EVENT_NAME = 'finalize_daily_attendance_event';
