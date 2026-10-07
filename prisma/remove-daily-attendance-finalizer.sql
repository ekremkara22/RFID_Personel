-- Gün sonu hareket türlerini otomatik değiştiren eski görevi kaldırır.
-- Çalıştırma: mysql --database=<veritabani> < prisma/remove-daily-attendance-finalizer.sql

DROP EVENT IF EXISTS finalize_daily_attendance_event;
DROP PROCEDURE IF EXISTS finalize_daily_attendance;

SELECT EVENT_NAME, STATUS
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = DATABASE()
  AND EVENT_NAME = 'finalize_daily_attendance_event';

SELECT ROUTINE_NAME, ROUTINE_TYPE
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
  AND ROUTINE_TYPE = 'PROCEDURE'
  AND ROUTINE_NAME = 'finalize_daily_attendance';
