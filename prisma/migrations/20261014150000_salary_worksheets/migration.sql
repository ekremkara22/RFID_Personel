-- Additive only: persisted salary sheets and company payroll parameters.

-- CreateTable
CREATE TABLE `SalaryWorksheetRow` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `mode` ENUM('GROSS_TO_NET', 'NET_TO_GROSS') NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NULL,
    `position` VARCHAR(191) NULL,
    `workforceType` ENUM('BLUE_COLLAR', 'WHITE_COLLAR') NULL,
    `insuranceType` ENUM('INCENTIVE', 'NO_INCENTIVE', 'RETIRED') NOT NULL DEFAULT 'INCENTIVE',
    `amount` DECIMAL(12, 2) NOT NULL,
    `employeeId` INTEGER UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SalaryWorksheetRow_companyId_mode_sortOrder_idx`(`companyId`, `mode`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalaryParameterSet` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `parametersJson` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SalaryParameterSet_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SalaryWorksheetRow` ADD CONSTRAINT `SalaryWorksheetRow_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalaryWorksheetRow` ADD CONSTRAINT `SalaryWorksheetRow_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalaryParameterSet` ADD CONSTRAINT `SalaryParameterSet_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
