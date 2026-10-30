-- Additive only: per-company entry/exit-only attendance mode and the "intermediate scan" movement type.

-- AlterTable
ALTER TABLE `Company` ADD COLUMN `attendanceTrackingMode` ENUM('BREAK_TRACKING', 'ENTRY_EXIT_ONLY') NOT NULL DEFAULT 'BREAK_TRACKING';

-- AlterTable
ALTER TABLE `AttendanceLog` MODIFY `type` ENUM('ENTRY', 'EXIT', 'BREAK_START', 'BREAK_END', 'MEAL_START', 'MEAL_END', 'INTERMEDIATE') NOT NULL;

-- AlterTable
ALTER TABLE `AttendanceMovementAudit` MODIFY `oldType` ENUM('ENTRY', 'EXIT', 'BREAK_START', 'BREAK_END', 'MEAL_START', 'MEAL_END', 'INTERMEDIATE') NULL,
    MODIFY `newType` ENUM('ENTRY', 'EXIT', 'BREAK_START', 'BREAK_END', 'MEAL_START', 'MEAL_END', 'INTERMEDIATE') NULL;
