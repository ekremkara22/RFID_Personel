-- Additive only: Satış & Pazarlama Faz 2 (physical product catalog, order fulfillment).

-- AlterTable
ALTER TABLE `ShopierOrder`
    ADD COLUMN `hasPhysicalItems` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `shippingCompany` VARCHAR(16) NULL,
    ADD COLUMN `trackingNumber` VARCHAR(64) NULL,
    ADD COLUMN `fulfilledAt` DATETIME(3) NULL,
    ADD COLUMN `fulfilledById` INTEGER UNSIGNED NULL;

-- CreateIndex
CREATE INDEX `ShopierOrder_hasPhysicalItems_status_idx` ON `ShopierOrder`(`hasPhysicalItems`, `status`);
CREATE INDEX `ShopierOrder_fulfilledById_idx` ON `ShopierOrder`(`fulfilledById`);

-- Backfill: orders already stored keep their raw Shopier body in `payload`.
UPDATE `ShopierOrder`
SET `hasPhysicalItems` = true
WHERE JSON_VALID(`payload`)
  AND JSON_SEARCH(LOWER(JSON_EXTRACT(`payload`, '$.lineItems[*].type')), 'one', 'physical') IS NOT NULL;

-- CreateTable
CREATE TABLE `CommerceProduct` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'TRY',
    `vatPercent` INTEGER NULL,
    `shippingPayer` VARCHAR(16) NOT NULL DEFAULT 'buyerPays',
    `shippingPrice` DECIMAL(12, 2) NULL,
    `stockQuantity` INTEGER NULL,
    `dispatchDuration` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `shopierProductId` VARCHAR(64) NULL,
    `shopierUrl` VARCHAR(500) NULL,
    `publishedAt` DATETIME(3) NULL,
    `publishError` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommerceProduct_shopierProductId_key`(`shopierProductId`),
    INDEX `CommerceProduct_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommerceProductImage` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `productId` INTEGER UNSIGNED NOT NULL,
    `storageKey` VARCHAR(80) NULL,
    `sourceUrl` VARCHAR(500) NULL,
    `placement` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommerceProductImage_productId_placement_idx`(`productId`, `placement`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ShopierOrder` ADD CONSTRAINT `ShopierOrder_fulfilledById_fkey` FOREIGN KEY (`fulfilledById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommerceProductImage` ADD CONSTRAINT `CommerceProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `CommerceProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
