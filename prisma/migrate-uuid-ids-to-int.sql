-- One-time MariaDB migration: UUID primary/foreign keys -> INT UNSIGNED AUTO_INCREMENT.
-- Take a full database backup before running this script.

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `Company` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `CompanyCategory` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `RoleDefinition` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `User` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `UserCompanyAccess` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `Employee` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `Department` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `Branch` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `Manager` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `Device` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `UserDeviceAccess` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `AttendanceLog` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `LeaveRequest` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `WorkCalendarTemplate` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `WorkCalendarWeekday` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `CalendarAssignment` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `CalendarSpecialDay` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `CalendarDailyException` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `EmployeeDailyCalendar` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;
ALTER TABLE `CalendarChangeLog` ADD COLUMN `newId` INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE;

ALTER TABLE `User` ADD COLUMN `companyId_new` INT UNSIGNED NULL;
ALTER TABLE `UserCompanyAccess` ADD COLUMN `userId_new` INT UNSIGNED NULL, ADD COLUMN `companyId_new` INT UNSIGNED NULL;
ALTER TABLE `Employee` ADD COLUMN `companyId_new` INT UNSIGNED NULL;
ALTER TABLE `Department` ADD COLUMN `companyId_new` INT UNSIGNED NULL;
ALTER TABLE `Branch` ADD COLUMN `companyId_new` INT UNSIGNED NULL;
ALTER TABLE `Manager` ADD COLUMN `companyId_new` INT UNSIGNED NULL;
ALTER TABLE `Device` ADD COLUMN `companyId_new` INT UNSIGNED NULL;
ALTER TABLE `UserDeviceAccess` ADD COLUMN `userId_new` INT UNSIGNED NULL, ADD COLUMN `deviceId_new` INT UNSIGNED NULL;
ALTER TABLE `AttendanceLog` ADD COLUMN `employeeId_new` INT UNSIGNED NULL, ADD COLUMN `deviceId_new` INT UNSIGNED NULL;
ALTER TABLE `LeaveRequest` ADD COLUMN `employeeId_new` INT UNSIGNED NULL, ADD COLUMN `companyId_new` INT UNSIGNED NULL;
ALTER TABLE `WorkCalendarTemplate` ADD COLUMN `companyId_new` INT UNSIGNED NULL;
ALTER TABLE `WorkCalendarWeekday` ADD COLUMN `calendarTemplateId_new` INT UNSIGNED NULL;
ALTER TABLE `CalendarAssignment`
  ADD COLUMN `calendarTemplateId_new` INT UNSIGNED NULL,
  ADD COLUMN `companyId_new` INT UNSIGNED NULL,
  ADD COLUMN `branchId_new` INT UNSIGNED NULL,
  ADD COLUMN `departmentId_new` INT UNSIGNED NULL,
  ADD COLUMN `employeeId_new` INT UNSIGNED NULL;
ALTER TABLE `CalendarSpecialDay`
  ADD COLUMN `companyId_new` INT UNSIGNED NULL,
  ADD COLUMN `branchId_new` INT UNSIGNED NULL,
  ADD COLUMN `departmentId_new` INT UNSIGNED NULL,
  ADD COLUMN `employeeId_new` INT UNSIGNED NULL;
ALTER TABLE `CalendarDailyException`
  ADD COLUMN `companyId_new` INT UNSIGNED NULL,
  ADD COLUMN `branchId_new` INT UNSIGNED NULL,
  ADD COLUMN `departmentId_new` INT UNSIGNED NULL,
  ADD COLUMN `employeeId_new` INT UNSIGNED NULL,
  ADD COLUMN `createdById_new` INT UNSIGNED NULL,
  ADD COLUMN `approvedById_new` INT UNSIGNED NULL;
ALTER TABLE `EmployeeDailyCalendar`
  ADD COLUMN `employeeId_new` INT UNSIGNED NULL,
  ADD COLUMN `leaveId_new` INT UNSIGNED NULL,
  ADD COLUMN `calendarTemplateId_new` INT UNSIGNED NULL,
  ADD COLUMN `ruleSourceId_new` INT UNSIGNED NULL;
ALTER TABLE `CalendarChangeLog`
  ADD COLUMN `companyId_new` INT UNSIGNED NULL,
  ADD COLUMN `recordId_new` INT UNSIGNED NULL,
  ADD COLUMN `changedById_new` INT UNSIGNED NULL,
  ADD COLUMN `approvedById_new` INT UNSIGNED NULL;

UPDATE `User` x LEFT JOIN `Company` c ON c.id = x.companyId SET x.companyId_new = c.newId;
UPDATE `UserCompanyAccess` x JOIN `User` u ON u.id = x.userId JOIN `Company` c ON c.id = x.companyId SET x.userId_new = u.newId, x.companyId_new = c.newId;
UPDATE `Employee` x JOIN `Company` c ON c.id = x.companyId SET x.companyId_new = c.newId;
UPDATE `Department` x JOIN `Company` c ON c.id = x.companyId SET x.companyId_new = c.newId;
UPDATE `Branch` x JOIN `Company` c ON c.id = x.companyId SET x.companyId_new = c.newId;
UPDATE `Manager` x JOIN `Company` c ON c.id = x.companyId SET x.companyId_new = c.newId;
UPDATE `Device` x LEFT JOIN `Company` c ON c.id = x.companyId SET x.companyId_new = c.newId;
UPDATE `UserDeviceAccess` x JOIN `User` u ON u.id = x.userId JOIN `Device` d ON d.id = x.deviceId SET x.userId_new = u.newId, x.deviceId_new = d.newId;
UPDATE `AttendanceLog` x JOIN `Employee` e ON e.id = x.employeeId LEFT JOIN `Device` d ON d.id = x.deviceId SET x.employeeId_new = e.newId, x.deviceId_new = d.newId;
UPDATE `LeaveRequest` x JOIN `Employee` e ON e.id = x.employeeId JOIN `Company` c ON c.id = x.companyId SET x.employeeId_new = e.newId, x.companyId_new = c.newId;
UPDATE `WorkCalendarTemplate` x JOIN `Company` c ON c.id = x.companyId SET x.companyId_new = c.newId;
UPDATE `WorkCalendarWeekday` x JOIN `WorkCalendarTemplate` t ON t.id = x.calendarTemplateId SET x.calendarTemplateId_new = t.newId;
UPDATE `CalendarAssignment` x
LEFT JOIN `WorkCalendarTemplate` t ON t.id = x.calendarTemplateId
LEFT JOIN `Company` c ON c.id = x.companyId
LEFT JOIN `Branch` b ON b.id = x.branchId
LEFT JOIN `Department` d ON d.id = x.departmentId
LEFT JOIN `Employee` e ON e.id = x.employeeId
SET x.calendarTemplateId_new = t.newId, x.companyId_new = c.newId, x.branchId_new = b.newId, x.departmentId_new = d.newId, x.employeeId_new = e.newId;
UPDATE `CalendarSpecialDay` x
LEFT JOIN `Company` c ON c.id = x.companyId
LEFT JOIN `Branch` b ON b.id = x.branchId
LEFT JOIN `Department` d ON d.id = x.departmentId
LEFT JOIN `Employee` e ON e.id = x.employeeId
SET x.companyId_new = c.newId, x.branchId_new = b.newId, x.departmentId_new = d.newId, x.employeeId_new = e.newId;
UPDATE `CalendarDailyException` x
LEFT JOIN `Company` c ON c.id = x.companyId
LEFT JOIN `Branch` b ON b.id = x.branchId
LEFT JOIN `Department` d ON d.id = x.departmentId
LEFT JOIN `Employee` e ON e.id = x.employeeId
LEFT JOIN `User` cu ON cu.id = x.createdById
LEFT JOIN `User` au ON au.id = x.approvedById
SET x.companyId_new = c.newId, x.branchId_new = b.newId, x.departmentId_new = d.newId, x.employeeId_new = e.newId, x.createdById_new = cu.newId, x.approvedById_new = au.newId;
UPDATE `EmployeeDailyCalendar` x
JOIN `Employee` e ON e.id = x.employeeId
LEFT JOIN `LeaveRequest` l ON l.id = x.leaveId
LEFT JOIN `WorkCalendarTemplate` t ON t.id = x.calendarTemplateId
SET x.employeeId_new = e.newId, x.leaveId_new = l.newId, x.calendarTemplateId_new = t.newId;
UPDATE `EmployeeDailyCalendar` x JOIN `LeaveRequest` r ON r.id = x.ruleSourceId SET x.ruleSourceId_new = r.newId WHERE x.ruleSourceType = 'APPROVED_LEAVE';
UPDATE `EmployeeDailyCalendar` x JOIN `CalendarDailyException` r ON r.id = x.ruleSourceId SET x.ruleSourceId_new = r.newId WHERE x.ruleSourceType LIKE '%DAILY_EXCEPTION';
UPDATE `EmployeeDailyCalendar` x JOIN `CalendarSpecialDay` r ON r.id = x.ruleSourceId SET x.ruleSourceId_new = r.newId WHERE x.ruleSourceType IN ('SPECIAL_NON_WORKING_DAY', 'SPECIAL_WORKING_DAY', 'OFFICIAL_HOLIDAY');
UPDATE `EmployeeDailyCalendar` x JOIN `CalendarAssignment` r ON r.id = x.ruleSourceId SET x.ruleSourceId_new = r.newId WHERE x.ruleSourceType LIKE '%CALENDAR_ASSIGNMENT%' OR x.ruleSourceType = 'CALENDAR_ASSIGNMENT_CONFLICT';
UPDATE `EmployeeDailyCalendar` x JOIN `WorkCalendarTemplate` r ON r.id = x.ruleSourceId SET x.ruleSourceId_new = r.newId WHERE x.ruleSourceType = 'COMPANY_DEFAULT_CALENDAR';
UPDATE `CalendarChangeLog` x
LEFT JOIN `Company` c ON c.id = x.companyId
LEFT JOIN `User` cu ON cu.id = x.changedById
LEFT JOIN `User` au ON au.id = x.approvedById
SET x.companyId_new = c.newId, x.changedById_new = cu.newId, x.approvedById_new = au.newId;
UPDATE `CalendarChangeLog` x JOIN `WorkCalendarTemplate` r ON r.id = x.recordId SET x.recordId_new = r.newId WHERE x.recordType = 'TEMPLATE';
UPDATE `CalendarChangeLog` x JOIN `WorkCalendarWeekday` r ON r.id = x.recordId SET x.recordId_new = r.newId WHERE x.recordType = 'WEEKDAY';
UPDATE `CalendarChangeLog` x JOIN `CalendarAssignment` r ON r.id = x.recordId SET x.recordId_new = r.newId WHERE x.recordType = 'ASSIGNMENT';
UPDATE `CalendarChangeLog` x JOIN `CalendarSpecialDay` r ON r.id = x.recordId SET x.recordId_new = r.newId WHERE x.recordType = 'SPECIAL_DAY';
UPDATE `CalendarChangeLog` x JOIN `CalendarDailyException` r ON r.id = x.recordId SET x.recordId_new = r.newId WHERE x.recordType = 'DAILY_EXCEPTION';
UPDATE `CalendarChangeLog` x JOIN `EmployeeDailyCalendar` r ON r.id = x.recordId SET x.recordId_new = r.newId WHERE x.recordType = 'EMPLOYEE_DAILY_CALENDAR';
UPDATE `CalendarChangeLog` SET recordId_new = newId WHERE recordId_new IS NULL;

ALTER TABLE `AttendanceLog` DROP FOREIGN KEY `AttendanceLog_deviceId_fkey`, DROP FOREIGN KEY `AttendanceLog_employeeId_fkey`;
ALTER TABLE `Branch` DROP FOREIGN KEY `Branch_companyId_fkey`;
ALTER TABLE `CalendarAssignment` DROP FOREIGN KEY `CalendarAssignment_branchId_fkey`, DROP FOREIGN KEY `CalendarAssignment_calendarTemplateId_fkey`, DROP FOREIGN KEY `CalendarAssignment_companyId_fkey`, DROP FOREIGN KEY `CalendarAssignment_departmentId_fkey`, DROP FOREIGN KEY `CalendarAssignment_employeeId_fkey`;
ALTER TABLE `CalendarDailyException` DROP FOREIGN KEY `CalendarDailyException_branchId_fkey`, DROP FOREIGN KEY `CalendarDailyException_companyId_fkey`, DROP FOREIGN KEY `CalendarDailyException_departmentId_fkey`, DROP FOREIGN KEY `CalendarDailyException_employeeId_fkey`;
ALTER TABLE `CalendarSpecialDay` DROP FOREIGN KEY `CalendarSpecialDay_branchId_fkey`, DROP FOREIGN KEY `CalendarSpecialDay_companyId_fkey`, DROP FOREIGN KEY `CalendarSpecialDay_departmentId_fkey`, DROP FOREIGN KEY `CalendarSpecialDay_employeeId_fkey`;
ALTER TABLE `Department` DROP FOREIGN KEY `Department_companyId_fkey`;
ALTER TABLE `Device` DROP FOREIGN KEY `Device_companyId_fkey`;
ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_companyId_fkey`;
ALTER TABLE `EmployeeDailyCalendar` DROP FOREIGN KEY `EmployeeDailyCalendar_calendarTemplateId_fkey`, DROP FOREIGN KEY `EmployeeDailyCalendar_employeeId_fkey`, DROP FOREIGN KEY `EmployeeDailyCalendar_leaveId_fkey`;
ALTER TABLE `LeaveRequest` DROP FOREIGN KEY `LeaveRequest_employeeId_fkey`;
ALTER TABLE `Manager` DROP FOREIGN KEY `Manager_companyId_fkey`;
ALTER TABLE `User` DROP FOREIGN KEY `User_companyId_fkey`;
ALTER TABLE `UserCompanyAccess` DROP FOREIGN KEY `UserCompanyAccess_companyId_fkey`, DROP FOREIGN KEY `UserCompanyAccess_userId_fkey`;
ALTER TABLE `UserDeviceAccess` DROP FOREIGN KEY `UserDeviceAccess_deviceId_fkey`, DROP FOREIGN KEY `UserDeviceAccess_userId_fkey`;
ALTER TABLE `WorkCalendarTemplate` DROP FOREIGN KEY `WorkCalendarTemplate_companyId_fkey`;
ALTER TABLE `WorkCalendarWeekday` DROP FOREIGN KEY `WorkCalendarWeekday_calendarTemplateId_fkey`;

ALTER TABLE `UserCompanyAccess` DROP INDEX `UserCompanyAccess_userId_companyId_key`;
ALTER TABLE `Employee` DROP INDEX `Employee_companyId_registrationNumber_key`;
ALTER TABLE `Department` DROP INDEX `Department_companyId_name_key`;
ALTER TABLE `Branch` DROP INDEX `Branch_companyId_name_key`;
ALTER TABLE `Manager` DROP INDEX `Manager_companyId_name_key`;
ALTER TABLE `Device` DROP INDEX `Device_companyId_code_key`;
ALTER TABLE `UserDeviceAccess` DROP INDEX `UserDeviceAccess_userId_deviceId_key`;
ALTER TABLE `WorkCalendarTemplate` DROP INDEX `WorkCalendarTemplate_companyId_code_key`;
ALTER TABLE `WorkCalendarWeekday` DROP INDEX `WorkCalendarWeekday_calendarTemplateId_weekday_key`;
ALTER TABLE `EmployeeDailyCalendar` DROP INDEX `EmployeeDailyCalendar_employeeId_workDate_key`;

ALTER TABLE `User` DROP COLUMN `companyId`, CHANGE `companyId_new` `companyId` INT UNSIGNED NULL;
ALTER TABLE `UserCompanyAccess` DROP COLUMN `userId`, DROP COLUMN `companyId`, CHANGE `userId_new` `userId` INT UNSIGNED NOT NULL, CHANGE `companyId_new` `companyId` INT UNSIGNED NOT NULL;
ALTER TABLE `Employee` DROP COLUMN `companyId`, CHANGE `companyId_new` `companyId` INT UNSIGNED NOT NULL;
ALTER TABLE `Department` DROP COLUMN `companyId`, CHANGE `companyId_new` `companyId` INT UNSIGNED NOT NULL;
ALTER TABLE `Branch` DROP COLUMN `companyId`, CHANGE `companyId_new` `companyId` INT UNSIGNED NOT NULL;
ALTER TABLE `Manager` DROP COLUMN `companyId`, CHANGE `companyId_new` `companyId` INT UNSIGNED NOT NULL;
ALTER TABLE `Device` DROP COLUMN `companyId`, CHANGE `companyId_new` `companyId` INT UNSIGNED NULL;
ALTER TABLE `UserDeviceAccess` DROP COLUMN `userId`, DROP COLUMN `deviceId`, CHANGE `userId_new` `userId` INT UNSIGNED NOT NULL, CHANGE `deviceId_new` `deviceId` INT UNSIGNED NOT NULL;
ALTER TABLE `AttendanceLog` DROP COLUMN `employeeId`, DROP COLUMN `deviceId`, CHANGE `employeeId_new` `employeeId` INT UNSIGNED NOT NULL, CHANGE `deviceId_new` `deviceId` INT UNSIGNED NULL;
ALTER TABLE `LeaveRequest` DROP COLUMN `employeeId`, DROP COLUMN `companyId`, CHANGE `employeeId_new` `employeeId` INT UNSIGNED NOT NULL, CHANGE `companyId_new` `companyId` INT UNSIGNED NOT NULL;
ALTER TABLE `WorkCalendarTemplate` DROP COLUMN `companyId`, CHANGE `companyId_new` `companyId` INT UNSIGNED NOT NULL;
ALTER TABLE `WorkCalendarWeekday` DROP COLUMN `calendarTemplateId`, CHANGE `calendarTemplateId_new` `calendarTemplateId` INT UNSIGNED NOT NULL;
ALTER TABLE `CalendarAssignment` DROP COLUMN `calendarTemplateId`, DROP COLUMN `companyId`, DROP COLUMN `branchId`, DROP COLUMN `departmentId`, DROP COLUMN `employeeId`, CHANGE `calendarTemplateId_new` `calendarTemplateId` INT UNSIGNED NOT NULL, CHANGE `companyId_new` `companyId` INT UNSIGNED NOT NULL, CHANGE `branchId_new` `branchId` INT UNSIGNED NULL, CHANGE `departmentId_new` `departmentId` INT UNSIGNED NULL, CHANGE `employeeId_new` `employeeId` INT UNSIGNED NULL;
ALTER TABLE `CalendarSpecialDay` DROP COLUMN `companyId`, DROP COLUMN `branchId`, DROP COLUMN `departmentId`, DROP COLUMN `employeeId`, CHANGE `companyId_new` `companyId` INT UNSIGNED NOT NULL, CHANGE `branchId_new` `branchId` INT UNSIGNED NULL, CHANGE `departmentId_new` `departmentId` INT UNSIGNED NULL, CHANGE `employeeId_new` `employeeId` INT UNSIGNED NULL;
ALTER TABLE `CalendarDailyException` DROP COLUMN `companyId`, DROP COLUMN `branchId`, DROP COLUMN `departmentId`, DROP COLUMN `employeeId`, DROP COLUMN `createdById`, DROP COLUMN `approvedById`, CHANGE `companyId_new` `companyId` INT UNSIGNED NOT NULL, CHANGE `branchId_new` `branchId` INT UNSIGNED NULL, CHANGE `departmentId_new` `departmentId` INT UNSIGNED NULL, CHANGE `employeeId_new` `employeeId` INT UNSIGNED NULL, CHANGE `createdById_new` `createdById` INT UNSIGNED NULL, CHANGE `approvedById_new` `approvedById` INT UNSIGNED NULL;
ALTER TABLE `EmployeeDailyCalendar` DROP COLUMN `employeeId`, DROP COLUMN `leaveId`, DROP COLUMN `calendarTemplateId`, DROP COLUMN `ruleSourceId`, CHANGE `employeeId_new` `employeeId` INT UNSIGNED NOT NULL, CHANGE `leaveId_new` `leaveId` INT UNSIGNED NULL, CHANGE `calendarTemplateId_new` `calendarTemplateId` INT UNSIGNED NULL, CHANGE `ruleSourceId_new` `ruleSourceId` INT UNSIGNED NULL;
ALTER TABLE `CalendarChangeLog` DROP COLUMN `companyId`, DROP COLUMN `recordId`, DROP COLUMN `changedById`, DROP COLUMN `approvedById`, CHANGE `companyId_new` `companyId` INT UNSIGNED NULL, CHANGE `recordId_new` `recordId` INT UNSIGNED NOT NULL, CHANGE `changedById_new` `changedById` INT UNSIGNED NULL, CHANGE `approvedById_new` `approvedById` INT UNSIGNED NULL;

ALTER TABLE `Company` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `CompanyCategory` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `RoleDefinition` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `User` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `UserCompanyAccess` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `Employee` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `Department` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `Branch` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `Manager` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `Device` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `UserDeviceAccess` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `AttendanceLog` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `LeaveRequest` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `WorkCalendarTemplate` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `WorkCalendarWeekday` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `CalendarAssignment` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `CalendarSpecialDay` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `CalendarDailyException` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `EmployeeDailyCalendar` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;
ALTER TABLE `CalendarChangeLog` DROP PRIMARY KEY, DROP COLUMN `id`, CHANGE `newId` `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`), DROP INDEX `newId`;

ALTER TABLE `User` ADD CONSTRAINT `User_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UserCompanyAccess` ADD UNIQUE INDEX `UserCompanyAccess_userId_companyId_key` (`userId`,`companyId`), ADD CONSTRAINT `UserCompanyAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `UserCompanyAccess_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Employee` ADD UNIQUE INDEX `Employee_companyId_registrationNumber_key` (`companyId`,`registrationNumber`), ADD CONSTRAINT `Employee_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Department` ADD UNIQUE INDEX `Department_companyId_name_key` (`companyId`,`name`), ADD CONSTRAINT `Department_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Branch` ADD UNIQUE INDEX `Branch_companyId_name_key` (`companyId`,`name`), ADD CONSTRAINT `Branch_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Manager` ADD UNIQUE INDEX `Manager_companyId_name_key` (`companyId`,`name`), ADD CONSTRAINT `Manager_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Device` ADD UNIQUE INDEX `Device_companyId_code_key` (`companyId`,`code`), ADD CONSTRAINT `Device_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `UserDeviceAccess` ADD UNIQUE INDEX `UserDeviceAccess_userId_deviceId_key` (`userId`,`deviceId`), ADD CONSTRAINT `UserDeviceAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `UserDeviceAccess_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AttendanceLog` ADD CONSTRAINT `AttendanceLog_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `AttendanceLog_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WorkCalendarTemplate` ADD UNIQUE INDEX `WorkCalendarTemplate_companyId_code_key` (`companyId`,`code`), ADD CONSTRAINT `WorkCalendarTemplate_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WorkCalendarWeekday` ADD UNIQUE INDEX `WorkCalendarWeekday_calendarTemplateId_weekday_key` (`calendarTemplateId`,`weekday`), ADD CONSTRAINT `WorkCalendarWeekday_calendarTemplateId_fkey` FOREIGN KEY (`calendarTemplateId`) REFERENCES `WorkCalendarTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CalendarAssignment` ADD CONSTRAINT `CalendarAssignment_calendarTemplateId_fkey` FOREIGN KEY (`calendarTemplateId`) REFERENCES `WorkCalendarTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `CalendarAssignment_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `CalendarAssignment_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `CalendarAssignment_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `CalendarAssignment_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CalendarSpecialDay` ADD CONSTRAINT `CalendarSpecialDay_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `CalendarSpecialDay_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `CalendarSpecialDay_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `CalendarSpecialDay_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CalendarDailyException` ADD CONSTRAINT `CalendarDailyException_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `CalendarDailyException_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `CalendarDailyException_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `CalendarDailyException_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EmployeeDailyCalendar` ADD UNIQUE INDEX `EmployeeDailyCalendar_employeeId_workDate_key` (`employeeId`,`workDate`), ADD CONSTRAINT `EmployeeDailyCalendar_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT `EmployeeDailyCalendar_leaveId_fkey` FOREIGN KEY (`leaveId`) REFERENCES `LeaveRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE, ADD CONSTRAINT `EmployeeDailyCalendar_calendarTemplateId_fkey` FOREIGN KEY (`calendarTemplateId`) REFERENCES `WorkCalendarTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
