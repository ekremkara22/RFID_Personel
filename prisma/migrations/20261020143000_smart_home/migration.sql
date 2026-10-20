-- CreateTable
CREATE TABLE `SmartHomeGateway` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `ownerId` INTEGER UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `apiKeyHash` CHAR(64) NOT NULL,
    `apiKeyLast4` VARCHAR(4) NOT NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `ipAddress` VARCHAR(64) NULL,
    `agentVersion` VARCHAR(32) NULL,
    `systemVersion` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SmartHomeGateway_apiKeyHash_key`(`apiKeyHash`),
    INDEX `SmartHomeGateway_ownerId_lastSeenAt_idx`(`ownerId`, `lastSeenAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SmartHomeNode` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `gatewayId` INTEGER UNSIGNED NOT NULL,
    `hardwareId` VARCHAR(64) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `room` VARCHAR(100) NULL,
    `kind` ENUM('SWITCH', 'LIGHT', 'SENSOR', 'CLIMATE', 'SECURITY', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `capabilitiesJson` TEXT NULL,
    `stateJson` TEXT NULL,
    `telemetryJson` TEXT NULL,
    `firmwareVersion` VARCHAR(32) NULL,
    `rssi` INTEGER NULL,
    `meshLayer` TINYINT UNSIGNED NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastSeenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SmartHomeNode_gatewayId_hardwareId_key`(`gatewayId`, `hardwareId`),
    INDEX `SmartHomeNode_gatewayId_lastSeenAt_idx`(`gatewayId`, `lastSeenAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SmartHomeCommand` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `gatewayId` INTEGER UNSIGNED NOT NULL,
    `nodeId` INTEGER UNSIGNED NULL,
    `requestedById` INTEGER UNSIGNED NOT NULL,
    `command` VARCHAR(64) NOT NULL,
    `payloadJson` TEXT NULL,
    `status` ENUM('PENDING', 'SENT', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `attemptCount` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `error` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SmartHomeCommand_gatewayId_status_requestedAt_idx`(`gatewayId`, `status`, `requestedAt`),
    INDEX `SmartHomeCommand_nodeId_requestedAt_idx`(`nodeId`, `requestedAt`),
    INDEX `SmartHomeCommand_requestedById_idx`(`requestedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SmartHomeGateway` ADD CONSTRAINT `SmartHomeGateway_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmartHomeNode` ADD CONSTRAINT `SmartHomeNode_gatewayId_fkey` FOREIGN KEY (`gatewayId`) REFERENCES `SmartHomeGateway`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmartHomeCommand` ADD CONSTRAINT `SmartHomeCommand_gatewayId_fkey` FOREIGN KEY (`gatewayId`) REFERENCES `SmartHomeGateway`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmartHomeCommand` ADD CONSTRAINT `SmartHomeCommand_nodeId_fkey` FOREIGN KEY (`nodeId`) REFERENCES `SmartHomeNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SmartHomeCommand` ADD CONSTRAINT `SmartHomeCommand_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
