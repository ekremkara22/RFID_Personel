-- Muhasebe personnel can store either a gross or a net monthly salary.
ALTER TABLE `AccountingPersonnel`
    CHANGE COLUMN `grossSalary` `salaryAmount` DECIMAL(12, 2) NULL,
    ADD COLUMN `salaryBasis` ENUM('GROSS', 'NET') NOT NULL DEFAULT 'GROSS' AFTER `insuranceType`;
