import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateGrossMinutes,
  calculateNetMinutes,
  formatMinutes,
  isDateWithinRange,
  resolveEmploymentStatus,
} from "./work-calendar-rules";

test("normal calisma gunu net suresini hesaplar", () => {
  assert.equal(calculateGrossMinutes("08:30", "18:00"), 570);
  assert.equal(calculateNetMinutes("08:30", "18:00", 60), 510);
  assert.equal(formatMinutes(510), "8 sa 30 dk");
});

test("gece yarısını gecen vardiya suresini hesaplar", () => {
  assert.equal(calculateGrossMinutes("22:00", "06:00", true), 480);
  assert.equal(calculateNetMinutes("22:00", "06:00", 30, true), 450);
});

test("ise giris ve ayrilis tarih araligini dikkate alir", () => {
  const employee = {
    isActive: true,
    hireDate: new Date("2026-08-10"),
    terminationDate: new Date("2026-08-20"),
  };

  assert.equal(resolveEmploymentStatus(employee, new Date("2026-08-09")), "BEFORE_HIRE");
  assert.equal(resolveEmploymentStatus(employee, new Date("2026-08-10")), "ACTIVE");
  assert.equal(resolveEmploymentStatus(employee, new Date("2026-08-21")), "AFTER_TERMINATION");
});

test("pasif personel tarih araligindan bagimsiz pasif kalir", () => {
  assert.equal(resolveEmploymentStatus({ isActive: false }, new Date("2026-08-24")), "PASSIVE");
});

test("tarih araligi sinirlari dahil calisir", () => {
  assert.equal(isDateWithinRange(new Date("2026-08-24"), new Date("2026-08-24"), new Date("2026-08-24")), true);
  assert.equal(isDateWithinRange(new Date("2026-08-23"), new Date("2026-08-24"), null), false);
});
