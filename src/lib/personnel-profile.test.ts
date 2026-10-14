import { test } from "node:test";
import assert from "node:assert/strict";
import { parseImportDate, parseMoney, parseSalaryInsuranceType, parseWorkforceType, salaryEngineType } from "./personnel-profile";

test("tablo tutarları Türkçe ve düz biçimde okunur", () => {
  assert.equal(parseMoney("45.000,50"), 45000.5);
  assert.equal(parseMoney("45000.50"), 45000.5);
  assert.equal(parseMoney("45.000"), 45000);
  assert.equal(parseMoney("₺ 33.030,00"), 33030);
  assert.equal(parseMoney(28500), 28500);
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney("-100"), undefined);
  assert.equal(parseMoney("on bin"), undefined);
});

test("personel tipi ve SGK tipi Türkçe etiketlerden çözülür", () => {
  assert.equal(parseWorkforceType("Mavi Yaka"), "BLUE_COLLAR");
  assert.equal(parseWorkforceType(" beyaz  yaka "), "WHITE_COLLAR");
  assert.equal(parseWorkforceType(""), null);
  assert.equal(parseWorkforceType("Gri yaka"), undefined);
  assert.equal(parseSalaryInsuranceType(""), "INCENTIVE");
  assert.equal(parseSalaryInsuranceType("Emekli"), "RETIRED");
  assert.equal(parseSalaryInsuranceType("TEŞVİKSİZ"), "NO_INCENTIVE");
  assert.equal(salaryEngineType("NO_INCENTIVE"), "no-incentive");
});

test("içe aktarma tarihleri geçersiz günleri reddeder", () => {
  assert.equal(parseImportDate("05.01.2026")?.toISOString(), "2026-01-05T00:00:00.000Z");
  assert.equal(parseImportDate("2026-01-05")?.toISOString(), "2026-01-05T00:00:00.000Z");
  assert.equal(parseImportDate("31.02.2026"), undefined);
  assert.equal(parseImportDate(""), null);
});
