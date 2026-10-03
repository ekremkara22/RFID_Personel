-- CreateTable
CREATE TABLE `Company` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyCategory` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyCategory_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoleDefinition` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` ENUM('SUPERADMIN', 'COMPANY_ADMIN', 'EMPLOYEE') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RoleDefinition_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(64) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `tcNo` VARCHAR(191) NULL,
    `role` ENUM('SUPERADMIN', 'COMPANY_ADMIN', 'EMPLOYEE') NOT NULL DEFAULT 'COMPANY_ADMIN',
    `companyId` INTEGER UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserModuleEntitlement` (
    `userId` INTEGER UNSIGNED NOT NULL,
    `moduleKey` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserModuleEntitlement_moduleKey_idx`(`moduleKey`),
    PRIMARY KEY (`userId`, `moduleKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserCompanyAccess` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` INTEGER UNSIGNED NOT NULL,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserCompanyAccess_userId_companyId_key`(`userId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyRole` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyRole_companyId_key_key`(`companyId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyRoleModule` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `roleId` INTEGER UNSIGNED NOT NULL,
    `moduleKey` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CompanyRoleModule_moduleKey_idx`(`moduleKey`),
    UNIQUE INDEX `CompanyRoleModule_roleId_moduleKey_key`(`roleId`, `moduleKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyRolePermission` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `roleId` INTEGER UNSIGNED NOT NULL,
    `permission` VARCHAR(96) NOT NULL,

    UNIQUE INDEX `CompanyRolePermission_roleId_permission_key`(`roleId`, `permission`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyMembership` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` INTEGER UNSIGNED NOT NULL,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `roleId` INTEGER UNSIGNED NOT NULL,
    `employeeId` INTEGER UNSIGNED NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `scopeMode` ENUM('COMPANY', 'RESTRICTED', 'OWN', 'NONE') NOT NULL DEFAULT 'NONE',
    `sessionVersion` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyMembership_employeeId_key`(`employeeId`),
    INDEX `CompanyMembership_companyId_status_idx`(`companyId`, `status`),
    UNIQUE INDEX `CompanyMembership_userId_companyId_key`(`userId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MembershipModule` (
    `membershipId` INTEGER UNSIGNED NOT NULL,
    `moduleKey` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MembershipModule_moduleKey_idx`(`moduleKey`),
    PRIMARY KEY (`membershipId`, `moduleKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MembershipBranchScope` (
    `membershipId` INTEGER UNSIGNED NOT NULL,
    `branchId` INTEGER UNSIGNED NOT NULL,

    PRIMARY KEY (`membershipId`, `branchId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MembershipDepartmentScope` (
    `membershipId` INTEGER UNSIGNED NOT NULL,
    `departmentId` INTEGER UNSIGNED NOT NULL,

    PRIMARY KEY (`membershipId`, `departmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MembershipEmployeeScope` (
    `membershipId` INTEGER UNSIGNED NOT NULL,
    `employeeId` INTEGER UNSIGNED NOT NULL,

    PRIMARY KEY (`membershipId`, `employeeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MembershipDeviceScope` (
    `membershipId` INTEGER UNSIGNED NOT NULL,
    `deviceId` INTEGER UNSIGNED NOT NULL,

    PRIMARY KEY (`membershipId`, `deviceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MembershipTeamScope` (
    `membershipId` INTEGER UNSIGNED NOT NULL,
    `teamId` INTEGER UNSIGNED NOT NULL,

    PRIMARY KEY (`membershipId`, `teamId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyTeam` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyTeam_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyTeamEmployee` (
    `teamId` INTEGER UNSIGNED NOT NULL,
    `employeeId` INTEGER UNSIGNED NOT NULL,

    PRIMARY KEY (`teamId`, `employeeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyInvitation` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `roleId` INTEGER UNSIGNED NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `scopeMode` ENUM('COMPANY', 'RESTRICTED', 'OWN', 'NONE') NOT NULL DEFAULT 'NONE',
    `scopeJson` TEXT NULL,
    `moduleKeysJson` TEXT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `createdById` INTEGER UNSIGNED NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CompanyInvitation_tokenHash_key`(`tokenHash`),
    INDEX `CompanyInvitation_companyId_email_status_idx`(`companyId`, `email`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyAccessAudit` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `actorUserId` INTEGER UNSIGNED NOT NULL,
    `targetUserId` INTEGER UNSIGNED NULL,
    `action` VARCHAR(96) NOT NULL,
    `summary` TEXT NOT NULL,
    `metadataJson` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CompanyAccessAudit_companyId_createdAt_idx`(`companyId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Employee` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `photoUrl` VARCHAR(191) NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `department` VARCHAR(191) NOT NULL,
    `branch` VARCHAR(191) NULL,
    `managerName` VARCHAR(191) NULL,
    `hireDate` DATETIME(3) NULL,
    `terminationDate` DATETIME(3) NULL,
    `age` INTEGER NOT NULL,
    `rfidCardId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `branchId` INTEGER UNSIGNED NULL,
    `departmentId` INTEGER UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Employee_email_key`(`email`),
    UNIQUE INDEX `Employee_rfidCardId_key`(`rfidCardId`),
    UNIQUE INDEX `Employee_companyId_registrationNumber_key`(`companyId`, `registrationNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Department` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Department_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Branch` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Branch_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Manager` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Manager_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Device` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `macAddress` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `branchLocation` VARCHAR(191) NULL,
    `purpose` ENUM('ENTRY', 'EXIT', 'BREAK_START', 'BREAK_END', 'BIDIRECTIONAL') NOT NULL DEFAULT 'BIDIRECTIONAL',
    `secretKey` VARCHAR(191) NOT NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `lastDataTransferAt` DATETIME(3) NULL,
    `clockOffsetMinutes` INTEGER NULL,
    `firmwareVersion` VARCHAR(191) NULL,
    `lastFirmwareCheckAt` DATETIME(3) NULL,
    `lastFirmwareUpdateAt` DATETIME(3) NULL,
    `firmwareLastError` TEXT NULL,
    `pendingQueueCount` INTEGER UNSIGNED NULL,
    `oldestQueuedAt` DATETIME(3) NULL,
    `clockSynchronized` BOOLEAN NULL,
    `lastSendError` TEXT NULL,
    `healthReportedAt` DATETIME(3) NULL,
    `companyId` INTEGER UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Device_macAddress_key`(`macAddress`),
    UNIQUE INDEX `Device_companyId_code_key`(`companyId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FirmwareRelease` (
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
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FirmwareDeployment` (
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
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserDeviceAccess` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `userId` INTEGER UNSIGNED NOT NULL,
    `deviceId` INTEGER UNSIGNED NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserDeviceAccess_userId_deviceId_key`(`userId`, `deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttendanceLog` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER UNSIGNED NOT NULL,
    `deviceId` INTEGER UNSIGNED NULL,
    `clientEventId` VARCHAR(96) NULL,
    `scannedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `receivedAt` DATETIME(3) NULL,
    `type` ENUM('ENTRY', 'EXIT', 'BREAK_START', 'BREAK_END', 'MEAL_START', 'MEAL_END') NOT NULL,
    `rfidCardId` VARCHAR(191) NULL,

    UNIQUE INDEX `AttendanceLog_deviceId_clientEventId_key`(`deviceId`, `clientEventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttendanceReviewResolution` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER UNSIGNED NOT NULL,
    `workDate` DATETIME(3) NOT NULL,
    `fingerprint` VARCHAR(64) NOT NULL,
    `resolutionNote` TEXT NOT NULL,
    `resolvedById` INTEGER UNSIGNED NOT NULL,
    `resolvedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AttendanceReviewResolution_workDate_resolvedAt_idx`(`workDate`, `resolvedAt`),
    UNIQUE INDEX `AttendanceReviewResolution_employeeId_workDate_fingerprint_key`(`employeeId`, `workDate`, `fingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttendanceMovementAudit` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `sourceLogId` INTEGER UNSIGNED NULL,
    `employeeId` INTEGER UNSIGNED NOT NULL,
    `movementDateTime` DATETIME(3) NOT NULL,
    `oldType` ENUM('ENTRY', 'EXIT', 'BREAK_START', 'BREAK_END', 'MEAL_START', 'MEAL_END') NULL,
    `newType` ENUM('ENTRY', 'EXIT', 'BREAK_START', 'BREAK_END', 'MEAL_START', 'MEAL_END') NULL,
    `oldScannedAt` DATETIME(3) NULL,
    `newScannedAt` DATETIME(3) NULL,
    `operation` ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    `changedById` INTEGER UNSIGNED NOT NULL,
    `correctionReason` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AttendanceMovementAudit_employeeId_movementDateTime_idx`(`employeeId`, `movementDateTime`),
    INDEX `AttendanceMovementAudit_sourceLogId_idx`(`sourceLogId`),
    INDEX `AttendanceMovementAudit_changedById_createdAt_idx`(`changedById`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveRequest` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER UNSIGNED NOT NULL,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `type` ENUM('ANNUAL', 'EXCUSE', 'UNPAID', 'MEDICAL', 'ADMINISTRATIVE', 'HOURLY', 'HALF_DAY') NOT NULL,
    `durationType` ENUM('FULL_DAY', 'HALF_DAY', 'HOURLY') NOT NULL,
    `approvalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `startTime` VARCHAR(191) NULL,
    `endTime` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkCalendarTemplate` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `validFrom` DATETIME(3) NULL,
    `validTo` DATETIME(3) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WorkCalendarTemplate_companyId_code_key`(`companyId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkCalendarWeekday` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `calendarTemplateId` INTEGER UNSIGNED NOT NULL,
    `weekday` INTEGER NOT NULL,
    `dayType` ENUM('NORMAL_WORK', 'WEEKLY_REST', 'NON_WORKING', 'OFFICIAL_HOLIDAY', 'COMPANY_HOLIDAY', 'HALF_WORK', 'EXTRA_WORK', 'SPECIAL_WORK', 'LEAVE', 'CONFLICT') NOT NULL DEFAULT 'NORMAL_WORK',
    `startTime` VARCHAR(191) NULL,
    `endTime` VARCHAR(191) NULL,
    `breakStartTime` VARCHAR(191) NULL,
    `breakEndTime` VARCHAR(191) NULL,
    `crossesMidnight` BOOLEAN NOT NULL DEFAULT false,
    `breakMinutes` INTEGER NOT NULL DEFAULT 0,
    `plannedGrossMinutes` INTEGER NOT NULL DEFAULT 0,
    `plannedNetMinutes` INTEGER NOT NULL DEFAULT 0,
    `checkLateArrival` BOOLEAN NOT NULL DEFAULT true,
    `checkEarlyDeparture` BOOLEAN NOT NULL DEFAULT true,
    `checkAbsence` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WorkCalendarWeekday_calendarTemplateId_weekday_key`(`calendarTemplateId`, `weekday`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalendarAssignment` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `calendarTemplateId` INTEGER UNSIGNED NOT NULL,
    `scopeType` ENUM('COMPANY', 'BRANCH', 'DEPARTMENT', 'EMPLOYEE') NOT NULL,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `branchId` INTEGER UNSIGNED NULL,
    `departmentId` INTEGER UNSIGNED NULL,
    `employeeId` INTEGER UNSIGNED NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NULL,
    `priority` INTEGER NOT NULL DEFAULT 100,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `description` VARCHAR(191) NULL,
    `conflictApproved` BOOLEAN NOT NULL DEFAULT false,
    `conflictReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalendarSpecialDay` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `specialDayType` ENUM('OFFICIAL_HOLIDAY', 'COMPANY_HOLIDAY', 'ADMINISTRATIVE_HOLIDAY', 'HALF_WORK', 'EXTRA_WORK', 'DEPARTMENT_HOLIDAY', 'DEPARTMENT_WORK', 'BRANCH_HOLIDAY', 'BRANCH_WORK') NOT NULL,
    `dateFrom` DATETIME(3) NOT NULL,
    `dateTo` DATETIME(3) NOT NULL,
    `isHalfDay` BOOLEAN NOT NULL DEFAULT false,
    `startTime` VARCHAR(191) NULL,
    `endTime` VARCHAR(191) NULL,
    `breakMinutes` INTEGER NOT NULL DEFAULT 0,
    `scopeType` ENUM('COMPANY', 'BRANCH', 'DEPARTMENT', 'EMPLOYEE') NOT NULL DEFAULT 'COMPANY',
    `companyId` INTEGER UNSIGNED NOT NULL,
    `branchId` INTEGER UNSIGNED NULL,
    `departmentId` INTEGER UNSIGNED NULL,
    `employeeId` INTEGER UNSIGNED NULL,
    `description` VARCHAR(191) NULL,
    `repeatsYearly` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalendarDailyException` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `workDate` DATETIME(3) NOT NULL,
    `scopeType` ENUM('COMPANY', 'BRANCH', 'DEPARTMENT', 'EMPLOYEE') NOT NULL,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `branchId` INTEGER UNSIGNED NULL,
    `departmentId` INTEGER UNSIGNED NULL,
    `employeeId` INTEGER UNSIGNED NULL,
    `originalDayType` ENUM('NORMAL_WORK', 'WEEKLY_REST', 'NON_WORKING', 'OFFICIAL_HOLIDAY', 'COMPANY_HOLIDAY', 'HALF_WORK', 'EXTRA_WORK', 'SPECIAL_WORK', 'LEAVE', 'CONFLICT') NULL,
    `newDayType` ENUM('NORMAL_WORK', 'WEEKLY_REST', 'NON_WORKING', 'OFFICIAL_HOLIDAY', 'COMPANY_HOLIDAY', 'HALF_WORK', 'EXTRA_WORK', 'SPECIAL_WORK', 'LEAVE', 'CONFLICT') NOT NULL,
    `newStartTime` VARCHAR(191) NULL,
    `newEndTime` VARCHAR(191) NULL,
    `newBreakMinutes` INTEGER NULL,
    `changeReason` VARCHAR(191) NOT NULL,
    `approvalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    `createdById` INTEGER UNSIGNED NULL,
    `approvedById` INTEGER UNSIGNED NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeDailyCalendar` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER UNSIGNED NOT NULL,
    `workDate` DATETIME(3) NOT NULL,
    `employmentStatus` ENUM('ACTIVE', 'PASSIVE', 'BEFORE_HIRE', 'AFTER_TERMINATION') NOT NULL,
    `dayType` ENUM('NORMAL_WORK', 'WEEKLY_REST', 'NON_WORKING', 'OFFICIAL_HOLIDAY', 'COMPANY_HOLIDAY', 'HALF_WORK', 'EXTRA_WORK', 'SPECIAL_WORK', 'LEAVE', 'CONFLICT') NOT NULL,
    `plannedStart` VARCHAR(191) NULL,
    `plannedEnd` VARCHAR(191) NULL,
    `plannedBreakStart` VARCHAR(191) NULL,
    `plannedBreakEnd` VARCHAR(191) NULL,
    `crossesMidnight` BOOLEAN NOT NULL DEFAULT false,
    `plannedBreakMinutes` INTEGER NOT NULL DEFAULT 0,
    `plannedGrossMinutes` INTEGER NOT NULL DEFAULT 0,
    `plannedNetMinutes` INTEGER NOT NULL DEFAULT 0,
    `checkLateArrival` BOOLEAN NOT NULL DEFAULT false,
    `checkEarlyDeparture` BOOLEAN NOT NULL DEFAULT false,
    `checkAbsence` BOOLEAN NOT NULL DEFAULT false,
    `leaveId` INTEGER UNSIGNED NULL,
    `calendarTemplateId` INTEGER UNSIGNED NULL,
    `ruleSourceType` VARCHAR(191) NOT NULL,
    `ruleSourceId` INTEGER UNSIGNED NULL,
    `calculationStatus` ENUM('CALCULATED', 'CONFLICT', 'MISSING_DEFAULT', 'OUT_OF_EMPLOYMENT') NOT NULL DEFAULT 'CALCULATED',
    `calculationReason` VARCHAR(191) NOT NULL,
    `calculatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmployeeDailyCalendar_employeeId_workDate_key`(`employeeId`, `workDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalendarChangeLog` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NULL,
    `recordType` ENUM('TEMPLATE', 'WEEKDAY', 'ASSIGNMENT', 'SPECIAL_DAY', 'DAILY_EXCEPTION', 'EMPLOYEE_DAILY_CALENDAR') NOT NULL,
    `recordId` INTEGER UNSIGNED NOT NULL,
    `oldValue` TEXT NULL,
    `newValue` TEXT NULL,
    `changeReason` TEXT NULL,
    `changedById` INTEGER UNSIGNED NULL,
    `approvedById` INTEGER UNSIGNED NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollPeriod` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER UNSIGNED NOT NULL,
    `year` SMALLINT UNSIGNED NOT NULL,
    `month` TINYINT UNSIGNED NOT NULL,
    `status` ENUM('OPEN', 'APPROVED', 'LOCKED') NOT NULL DEFAULT 'OPEN',
    `snapshotJson` LONGTEXT NULL,
    `snapshotCreatedAt` DATETIME(3) NULL,
    `approvalNote` TEXT NULL,
    `approvedById` INTEGER UNSIGNED NULL,
    `approvedAt` DATETIME(3) NULL,
    `lockedById` INTEGER UNSIGNED NULL,
    `lockedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PayrollPeriod_status_year_month_idx`(`status`, `year`, `month`),
    UNIQUE INDEX `PayrollPeriod_companyId_year_month_key`(`companyId`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserModuleEntitlement` ADD CONSTRAINT `UserModuleEntitlement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCompanyAccess` ADD CONSTRAINT `UserCompanyAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCompanyAccess` ADD CONSTRAINT `UserCompanyAccess_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyRole` ADD CONSTRAINT `CompanyRole_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyRoleModule` ADD CONSTRAINT `CompanyRoleModule_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `CompanyRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyRolePermission` ADD CONSTRAINT `CompanyRolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `CompanyRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyMembership` ADD CONSTRAINT `CompanyMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyMembership` ADD CONSTRAINT `CompanyMembership_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyMembership` ADD CONSTRAINT `CompanyMembership_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `CompanyRole`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyMembership` ADD CONSTRAINT `CompanyMembership_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipModule` ADD CONSTRAINT `MembershipModule_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `CompanyMembership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipBranchScope` ADD CONSTRAINT `MembershipBranchScope_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `CompanyMembership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipBranchScope` ADD CONSTRAINT `MembershipBranchScope_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipDepartmentScope` ADD CONSTRAINT `MembershipDepartmentScope_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `CompanyMembership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipDepartmentScope` ADD CONSTRAINT `MembershipDepartmentScope_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipEmployeeScope` ADD CONSTRAINT `MembershipEmployeeScope_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `CompanyMembership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipEmployeeScope` ADD CONSTRAINT `MembershipEmployeeScope_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipDeviceScope` ADD CONSTRAINT `MembershipDeviceScope_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `CompanyMembership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipDeviceScope` ADD CONSTRAINT `MembershipDeviceScope_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipTeamScope` ADD CONSTRAINT `MembershipTeamScope_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `CompanyMembership`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipTeamScope` ADD CONSTRAINT `MembershipTeamScope_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `CompanyTeam`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyTeam` ADD CONSTRAINT `CompanyTeam_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyTeamEmployee` ADD CONSTRAINT `CompanyTeamEmployee_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `CompanyTeam`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyTeamEmployee` ADD CONSTRAINT `CompanyTeamEmployee_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyInvitation` ADD CONSTRAINT `CompanyInvitation_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyInvitation` ADD CONSTRAINT `CompanyInvitation_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `CompanyRole`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyInvitation` ADD CONSTRAINT `CompanyInvitation_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyAccessAudit` ADD CONSTRAINT `CompanyAccessAudit_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyAccessAudit` ADD CONSTRAINT `CompanyAccessAudit_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyAccessAudit` ADD CONSTRAINT `CompanyAccessAudit_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Manager` ADD CONSTRAINT `Manager_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FirmwareRelease` ADD CONSTRAINT `FirmwareRelease_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FirmwareDeployment` ADD CONSTRAINT `FirmwareDeployment_releaseId_fkey` FOREIGN KEY (`releaseId`) REFERENCES `FirmwareRelease`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FirmwareDeployment` ADD CONSTRAINT `FirmwareDeployment_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FirmwareDeployment` ADD CONSTRAINT `FirmwareDeployment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDeviceAccess` ADD CONSTRAINT `UserDeviceAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDeviceAccess` ADD CONSTRAINT `UserDeviceAccess_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceLog` ADD CONSTRAINT `AttendanceLog_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceLog` ADD CONSTRAINT `AttendanceLog_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceReviewResolution` ADD CONSTRAINT `AttendanceReviewResolution_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceReviewResolution` ADD CONSTRAINT `AttendanceReviewResolution_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceMovementAudit` ADD CONSTRAINT `AttendanceMovementAudit_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceMovementAudit` ADD CONSTRAINT `AttendanceMovementAudit_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkCalendarTemplate` ADD CONSTRAINT `WorkCalendarTemplate_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkCalendarWeekday` ADD CONSTRAINT `WorkCalendarWeekday_calendarTemplateId_fkey` FOREIGN KEY (`calendarTemplateId`) REFERENCES `WorkCalendarTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarAssignment` ADD CONSTRAINT `CalendarAssignment_calendarTemplateId_fkey` FOREIGN KEY (`calendarTemplateId`) REFERENCES `WorkCalendarTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarAssignment` ADD CONSTRAINT `CalendarAssignment_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarAssignment` ADD CONSTRAINT `CalendarAssignment_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarAssignment` ADD CONSTRAINT `CalendarAssignment_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarAssignment` ADD CONSTRAINT `CalendarAssignment_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarSpecialDay` ADD CONSTRAINT `CalendarSpecialDay_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarSpecialDay` ADD CONSTRAINT `CalendarSpecialDay_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarSpecialDay` ADD CONSTRAINT `CalendarSpecialDay_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarSpecialDay` ADD CONSTRAINT `CalendarSpecialDay_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarDailyException` ADD CONSTRAINT `CalendarDailyException_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarDailyException` ADD CONSTRAINT `CalendarDailyException_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarDailyException` ADD CONSTRAINT `CalendarDailyException_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CalendarDailyException` ADD CONSTRAINT `CalendarDailyException_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeDailyCalendar` ADD CONSTRAINT `EmployeeDailyCalendar_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeDailyCalendar` ADD CONSTRAINT `EmployeeDailyCalendar_leaveId_fkey` FOREIGN KEY (`leaveId`) REFERENCES `LeaveRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeDailyCalendar` ADD CONSTRAINT `EmployeeDailyCalendar_calendarTemplateId_fkey` FOREIGN KEY (`calendarTemplateId`) REFERENCES `WorkCalendarTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollPeriod` ADD CONSTRAINT `PayrollPeriod_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollPeriod` ADD CONSTRAINT `PayrollPeriod_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollPeriod` ADD CONSTRAINT `PayrollPeriod_lockedById_fkey` FOREIGN KEY (`lockedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
