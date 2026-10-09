ALTER TABLE `Company`
  ADD COLUMN `attendanceFinalizationDelayMinutes` INTEGER NOT NULL DEFAULT 120;

ALTER TABLE `AttendanceMovementAudit`
  MODIFY `changedById` INTEGER UNSIGNED NULL;

ALTER TABLE `EmployeeDailyCalendar`
  ADD COLUMN `attendanceFinalizedAt` DATETIME(3) NULL,
  ADD COLUMN `attendanceFinalizationStatus` VARCHAR(32) NULL,
  ADD COLUMN `attendanceFinalizationNote` TEXT NULL;
