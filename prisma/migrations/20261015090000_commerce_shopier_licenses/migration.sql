-- Additive only: Satış & Pazarlama Faz 1 (Shopier orders -> module license activation).

-- CreateTable
CREATE TABLE `IntegrationCredential` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `provider` VARCHAR(32) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `encryptedValue` TEXT NOT NULL,
    `last4` VARCHAR(8) NULL,
    `updatedById` INTEGER UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `IntegrationCredential_updatedById_idx`(`updatedById`),
    UNIQUE INDEX `IntegrationCredential_provider_key_key`(`provider`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShopierLicenseProduct` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `shopierProductId` VARCHAR(64) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `moduleKey` VARCHAR(64) NOT NULL,
    `durationDays` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShopierLicenseProduct_shopierProductId_key`(`shopierProductId`),
    INDEX `ShopierLicenseProduct_moduleKey_idx`(`moduleKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShopierOrder` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `shopierOrderId` VARCHAR(64) NOT NULL,
    `status` VARCHAR(16) NOT NULL,
    `paymentStatus` VARCHAR(16) NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `total` DECIMAL(12, 2) NOT NULL,
    `buyerEmail` VARCHAR(191) NULL,
    `buyerName` VARCHAR(200) NULL,
    `buyerPhone` VARCHAR(32) NULL,
    `orderedAt` DATETIME(3) NOT NULL,
    `refundStatus` VARCHAR(16) NULL,
    `payload` LONGTEXT NOT NULL,
    `source` VARCHAR(16) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShopierOrder_shopierOrderId_key`(`shopierOrderId`),
    INDEX `ShopierOrder_orderedAt_idx`(`orderedAt`),
    INDEX `ShopierOrder_buyerEmail_idx`(`buyerEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShopierOrderLicense` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER UNSIGNED NOT NULL,
    `shopierProductId` VARCHAR(64) NOT NULL,
    `moduleKey` VARCHAR(64) NOT NULL,
    `durationDays` INTEGER NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('PENDING_MATCH', 'ACTIVATED', 'REFUNDED', 'IGNORED') NOT NULL,
    `userId` INTEGER UNSIGNED NULL,
    `activatedAt` DATETIME(3) NULL,
    `activatedById` INTEGER UNSIGNED NULL,
    `expiresAtAfter` DATETIME(3) NULL,
    `note` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ShopierOrderLicense_status_idx`(`status`),
    INDEX `ShopierOrderLicense_userId_idx`(`userId`),
    INDEX `ShopierOrderLicense_activatedById_idx`(`activatedById`),
    UNIQUE INDEX `ShopierOrderLicense_orderId_shopierProductId_key`(`orderId`, `shopierProductId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `IntegrationCredential` ADD CONSTRAINT `IntegrationCredential_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShopierOrderLicense` ADD CONSTRAINT `ShopierOrderLicense_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `ShopierOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShopierOrderLicense` ADD CONSTRAINT `ShopierOrderLicense_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShopierOrderLicense` ADD CONSTRAINT `ShopierOrderLicense_activatedById_fkey` FOREIGN KEY (`activatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
