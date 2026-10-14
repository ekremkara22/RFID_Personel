-- Muhasebe gets its own personnel and definitions; İK tables return to their original shape.
-- The İK columns/tables removed here were added by the two previous migrations and were only
-- ever filled on staging; production has never had data in them.

-- İK: remove accounting fields from Employee and Department
ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_positionId_fkey`;
ALTER TABLE `Employee`
    DROP COLUMN `positionId`,
    DROP COLUMN `workforceType`,
    DROP COLUMN `grossSalary`,
    DROP COLUMN `salaryInsuranceType`;

ALTER TABLE `Department` DROP FOREIGN KEY `Department_categoryId_fkey`;
ALTER TABLE `Department` DROP COLUMN `categoryId`;

DROP TABLE `Position`;
DROP TABLE `DepartmentCategory`;

-- Muhasebe definitions
CREATE TABLE `AccountingDepartment` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AccountingDepartment_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AccountingPosition` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AccountingPosition_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AccountingCollarType` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AccountingCollarType_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AccountingPersonnel` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `registrationNumber` VARCHAR(64) NULL,
    `departmentId` INTEGER UNSIGNED NULL,
    `positionId` INTEGER UNSIGNED NULL,
    `collarTypeId` INTEGER UNSIGNED NULL,
    `insuranceType` ENUM('INCENTIVE', 'NO_INCENTIVE', 'RETIRED') NOT NULL DEFAULT 'INCENTIVE',
    `grossSalary` DECIMAL(12, 2) NULL,
    `hireDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AccountingPersonnel_companyId_registrationNumber_key`(`companyId`, `registrationNumber`),
    INDEX `AccountingPersonnel_companyId_isActive_idx`(`companyId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AccountingDepartment` ADD CONSTRAINT `AccountingDepartment_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AccountingPosition` ADD CONSTRAINT `AccountingPosition_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AccountingCollarType` ADD CONSTRAINT `AccountingCollarType_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AccountingPersonnel` ADD CONSTRAINT `AccountingPersonnel_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AccountingPersonnel` ADD CONSTRAINT `AccountingPersonnel_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `AccountingDepartment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AccountingPersonnel` ADD CONSTRAINT `AccountingPersonnel_positionId_fkey` FOREIGN KEY (`positionId`) REFERENCES `AccountingPosition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AccountingPersonnel` ADD CONSTRAINT `AccountingPersonnel_collarTypeId_fkey` FOREIGN KEY (`collarTypeId`) REFERENCES `AccountingCollarType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Salary sheets: link to Muhasebe personnel instead of İK employees; collar becomes a definition name.
ALTER TABLE `SalaryWorksheetRow` DROP FOREIGN KEY `SalaryWorksheetRow_employeeId_fkey`;
ALTER TABLE `SalaryWorksheetRow` ADD COLUMN `collarType` VARCHAR(191) NULL, ADD COLUMN `personnelId` INTEGER UNSIGNED NULL;
UPDATE `SalaryWorksheetRow` SET `collarType` = CASE `workforceType` WHEN 'BLUE_COLLAR' THEN 'Mavi Yaka' WHEN 'WHITE_COLLAR' THEN 'Beyaz Yaka' ELSE NULL END;
ALTER TABLE `SalaryWorksheetRow` DROP COLUMN `workforceType`, DROP COLUMN `employeeId`;
ALTER TABLE `SalaryWorksheetRow` ADD CONSTRAINT `SalaryWorksheetRow_personnelId_fkey` FOREIGN KEY (`personnelId`) REFERENCES `AccountingPersonnel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
