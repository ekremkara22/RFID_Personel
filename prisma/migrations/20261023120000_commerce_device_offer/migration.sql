-- Additive only: the physical product offered as the RFID reader in the customer panel.

-- AlterTable
ALTER TABLE `CommerceProduct` ADD COLUMN `isDeviceOffer` BOOLEAN NOT NULL DEFAULT false;
