-- Additive only: existing users keep their current licenses (no trial, no expiry).
ALTER TABLE `User`
    ADD COLUMN `selfRegistered` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `trialEndsAt` DATETIME(3) NULL;

ALTER TABLE `UserModuleEntitlement`
    ADD COLUMN `expiresAt` DATETIME(3) NULL;

ALTER TABLE `ModuleDefinition`
    ADD COLUMN `purchaseUrl` VARCHAR(500) NULL,
    ADD COLUMN `priceLabel` VARCHAR(100) NULL;

INSERT IGNORE INTO `ModuleDefinition` (`key`, `name`, `description`, `createdAt`, `updatedAt`)
VALUES ('ACCOUNTING', 'Muhasebe', 'Maaş hesaplama, brütten nete, netten brüte ve bordro sabitleri.', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
