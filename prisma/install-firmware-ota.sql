ALTER TABLE `Device`
  ADD COLUMN IF NOT EXISTS `firmwareVersion` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `lastFirmwareCheckAt` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `lastFirmwareUpdateAt` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `firmwareLastError` TEXT NULL;

CREATE TABLE IF NOT EXISTS `FirmwareRelease` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `version` VARCHAR(191) NOT NULL,
  `releaseNotes` TEXT NULL,
  `originalFileName` VARCHAR(191) NOT NULL,
  `storageKey` VARCHAR(191) NOT NULL,
  `sizeBytes` INTEGER UNSIGNED NOT NULL,
  `sha256` CHAR(64) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdById` INTEGER UNSIGNED NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `FirmwareRelease_version_key`(`version`),
  UNIQUE INDEX `FirmwareRelease_storageKey_key`(`storageKey`),
  PRIMARY KEY (`id`),
  CONSTRAINT `FirmwareRelease_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `FirmwareDeployment` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `releaseId` INTEGER UNSIGNED NOT NULL,
  `deviceId` INTEGER UNSIGNED NOT NULL,
  `status` ENUM('PENDING', 'DOWNLOADING', 'INSTALLED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `downloadToken` VARCHAR(191) NOT NULL,
  `attemptCount` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  `lastError` TEXT NULL,
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `downloadStartedAt` DATETIME(3) NULL,
  `installedAt` DATETIME(3) NULL,
  `lastReportedAt` DATETIME(3) NULL,
  `createdById` INTEGER UNSIGNED NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `FirmwareDeployment_downloadToken_key`(`downloadToken`),
  INDEX `FirmwareDeployment_deviceId_status_requestedAt_idx`(`deviceId`, `status`, `requestedAt`),
  INDEX `FirmwareDeployment_releaseId_status_idx`(`releaseId`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `FirmwareDeployment_releaseId_fkey` FOREIGN KEY (`releaseId`) REFERENCES `FirmwareRelease`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FirmwareDeployment_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FirmwareDeployment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
