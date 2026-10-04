CREATE TABLE `ModuleDefinition` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(64) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ModuleDefinition_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `ModuleDefinition` (`key`, `name`, `description`, `createdAt`, `updatedAt`)
VALUES
    ('HR', 'İK', 'Personel, PDKS, izin, takvim, cihaz ve insan kaynakları raporları.', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('PRODUCTION_PLANNING', 'Üretim Planlama', 'İş merkezleri, kapasite planlama, üretim takvimi ve üretim raporları.', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
