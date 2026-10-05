CREATE TABLE `ProductionWorkCenter` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `calendarTemplateId` INTEGER UNSIGNED NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductionWorkCenter_companyId_code_key`(`companyId`, `code`),
    INDEX `ProductionWorkCenter_companyId_isActive_name_idx`(`companyId`, `isActive`, `name`),
    INDEX `ProductionWorkCenter_calendarTemplateId_idx`(`calendarTemplateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProductionStation` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `workCenterId` INTEGER UNSIGNED NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `stationType` ENUM('GENERAL', 'INJECTION', 'CNC_TURNING', 'CNC_MILLING', 'ASSEMBLY', 'QUALITY') NOT NULL DEFAULT 'GENERAL',
    `description` TEXT NULL,
    `calendarTemplateId` INTEGER UNSIGNED NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductionStation_companyId_code_key`(`companyId`, `code`),
    INDEX `ProductionStation_companyId_workCenterId_isActive_idx`(`companyId`, `workCenterId`, `isActive`),
    INDEX `ProductionStation_calendarTemplateId_idx`(`calendarTemplateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProductionTool` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `toolType` VARCHAR(80) NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductionTool_companyId_code_key`(`companyId`, `code`),
    INDEX `ProductionTool_companyId_isActive_name_idx`(`companyId`, `isActive`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProductionCycleTime` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `stationId` INTEGER UNSIGNED NOT NULL,
    `toolId` INTEGER UNSIGNED NULL,
    `itemCode` VARCHAR(96) NOT NULL,
    `itemName` VARCHAR(255) NULL,
    `cycleSeconds` INTEGER UNSIGNED NOT NULL,
    `cavityCount` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `setupMinutes` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `validFrom` DATETIME(3) NULL,
    `validTo` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductionCycleTime_companyId_stationId_itemCode_isActive_idx`(`companyId`, `stationId`, `itemCode`, `isActive`),
    INDEX `ProductionCycleTime_companyId_toolId_idx`(`companyId`, `toolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProductionCustomField` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `entity` VARCHAR(64) NOT NULL DEFAULT 'WORK_ORDER',
    `fieldKey` VARCHAR(64) NOT NULL,
    `label` VARCHAR(160) NOT NULL,
    `fieldType` ENUM('TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN') NOT NULL DEFAULT 'TEXT',
    `optionsJson` TEXT NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT false,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductionCustomField_companyId_entity_fieldKey_key`(`companyId`, `entity`, `fieldKey`),
    INDEX `ProductionCustomField_companyId_entity_isActive_displayOrder_idx`(`companyId`, `entity`, `isActive`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProductionImportTemplate` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `entity` VARCHAR(64) NOT NULL DEFAULT 'WORK_ORDER',
    `name` VARCHAR(160) NOT NULL,
    `columnsJson` LONGTEXT NOT NULL,
    `mappingJson` LONGTEXT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductionImportTemplate_companyId_entity_name_key`(`companyId`, `entity`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProductionWorkOrder` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `workOrderNo` VARCHAR(96) NOT NULL,
    `orderNo` VARCHAR(96) NULL,
    `itemCode` VARCHAR(96) NOT NULL,
    `itemName` VARCHAR(255) NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `workCenterId` INTEGER UNSIGNED NOT NULL,
    `stationId` INTEGER UNSIGNED NOT NULL,
    `toolId` INTEGER UNSIGNED NULL,
    `cycleTimeId` INTEGER UNSIGNED NULL,
    `cycleSecondsSnapshot` INTEGER UNSIGNED NOT NULL,
    `cavityCountSnapshot` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `setupMinutesSnapshot` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `calculatedMinutes` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `dueDate` DATETIME(3) NULL,
    `plannedStartAt` DATETIME(3) NULL,
    `plannedEndAt` DATETIME(3) NULL,
    `sequence` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `isScheduleLocked` BOOLEAN NOT NULL DEFAULT false,
    `customFieldsJson` LONGTEXT NULL,
    `source` VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductionWorkOrder_companyId_workOrderNo_key`(`companyId`, `workOrderNo`),
    INDEX `ProductionWorkOrder_companyId_stationId_sequence_idx`(`companyId`, `stationId`, `sequence`),
    INDEX `ProductionWorkOrder_companyId_dueDate_status_idx`(`companyId`, `dueDate`, `status`),
    INDEX `ProductionWorkOrder_workCenterId_idx`(`workCenterId`),
    INDEX `ProductionWorkOrder_toolId_idx`(`toolId`),
    INDEX `ProductionWorkOrder_cycleTimeId_idx`(`cycleTimeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ProductionWorkCenter` ADD CONSTRAINT `ProductionWorkCenter_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductionWorkCenter` ADD CONSTRAINT `ProductionWorkCenter_calendarTemplateId_fkey` FOREIGN KEY (`calendarTemplateId`) REFERENCES `WorkCalendarTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ProductionStation` ADD CONSTRAINT `ProductionStation_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductionStation` ADD CONSTRAINT `ProductionStation_workCenterId_fkey` FOREIGN KEY (`workCenterId`) REFERENCES `ProductionWorkCenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ProductionStation` ADD CONSTRAINT `ProductionStation_calendarTemplateId_fkey` FOREIGN KEY (`calendarTemplateId`) REFERENCES `WorkCalendarTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ProductionTool` ADD CONSTRAINT `ProductionTool_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductionCycleTime` ADD CONSTRAINT `ProductionCycleTime_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductionCycleTime` ADD CONSTRAINT `ProductionCycleTime_stationId_fkey` FOREIGN KEY (`stationId`) REFERENCES `ProductionStation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ProductionCycleTime` ADD CONSTRAINT `ProductionCycleTime_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `ProductionTool`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ProductionCustomField` ADD CONSTRAINT `ProductionCustomField_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductionImportTemplate` ADD CONSTRAINT `ProductionImportTemplate_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductionWorkOrder` ADD CONSTRAINT `ProductionWorkOrder_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductionWorkOrder` ADD CONSTRAINT `ProductionWorkOrder_workCenterId_fkey` FOREIGN KEY (`workCenterId`) REFERENCES `ProductionWorkCenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ProductionWorkOrder` ADD CONSTRAINT `ProductionWorkOrder_stationId_fkey` FOREIGN KEY (`stationId`) REFERENCES `ProductionStation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ProductionWorkOrder` ADD CONSTRAINT `ProductionWorkOrder_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `ProductionTool`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ProductionWorkOrder` ADD CONSTRAINT `ProductionWorkOrder_cycleTimeId_fkey` FOREIGN KEY (`cycleTimeId`) REFERENCES `ProductionCycleTime`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
