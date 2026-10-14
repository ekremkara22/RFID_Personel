-- Additive only: new definition tables and optional personnel fields.

-- CreateTable
CREATE TABLE `DepartmentCategory` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DepartmentCategory_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Position` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Position_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Department` ADD COLUMN `categoryId` INTEGER UNSIGNED NULL;

-- AlterTable
ALTER TABLE `Employee`
    ADD COLUMN `positionId` INTEGER UNSIGNED NULL,
    ADD COLUMN `workforceType` ENUM('BLUE_COLLAR', 'WHITE_COLLAR') NULL,
    ADD COLUMN `grossSalary` DECIMAL(12, 2) NULL,
    ADD COLUMN `salaryInsuranceType` ENUM('INCENTIVE', 'NO_INCENTIVE', 'RETIRED') NOT NULL DEFAULT 'INCENTIVE';

-- AddForeignKey
ALTER TABLE `DepartmentCategory` ADD CONSTRAINT `DepartmentCategory_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Position` ADD CONSTRAINT `Position_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `DepartmentCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_positionId_fkey` FOREIGN KEY (`positionId`) REFERENCES `Position`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
