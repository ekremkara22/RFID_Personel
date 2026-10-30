-- Additive only: whether excess over the planned break is deducted from attendance time.

-- AlterTable
ALTER TABLE `Company` ADD COLUMN `breakDeductionMode` ENUM('PLANNED', 'PLANNED_AND_EXCESS') NOT NULL DEFAULT 'PLANNED_AND_EXCESS';
