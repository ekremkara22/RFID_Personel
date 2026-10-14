import assert from "node:assert/strict";
import test from "node:test";
import { calculateGrossToNet, calculateNetToGross } from "./salary-calculation";

test("Excel örneğiyle 123.456 TL brütten nete sonuçları aynı kuruşları üretir", () => {
  const result = calculateGrossToNet(123_456, "incentive");

  assert.deepEqual(result.months.map((month) => month.net), [
    92_721.96, 91_728.2, 87_475.08, 86_092.55, 80_129.45, 80_129.45,
    80_455.87, 81_533.21, 81_533.22, 81_533.22, 81_533.22, 81_533.22,
  ]);
  assert.equal(result.annualNet, 1_006_398.65);
  assert.equal(result.annualEmployerCost, 1_759_248);
});

test("Excel örneğiyle 123.456 TL netten brüte sonuçları aynı kuruşları üretir", () => {
  const result = calculateNetToGross(123_456, "incentive");

  assert.deepEqual(result.months.map((month) => month.gross), [
    166_446.09, 173_358.4, 181_449.71, 194_145.91, 194_145.92, 194_145.92,
    193_613.35, 191_855.56, 191_855.58, 205_353.77, 215_797.46, 215_797.46,
  ]);
  assert.equal(result.annualGross, 2_317_965.13);
  assert.equal(result.annualEmployerCost, 2_752_583.6);
});


test("firma bordro parametreleri kaydedilmeden önce doğrulanır", async () => {
  const { validateSalaryParameters, cloneSalaryParameters } = await import("./salary-calculation");
  assert.equal(validateSalaryParameters(cloneSalaryParameters()).ok, true);
  const gap = cloneSalaryParameters();
  gap.taxBrackets[1].lower = 200_000;
  assert.equal(validateSalaryParameters(gap).ok, false);
  const ceiling = cloneSalaryParameters();
  ceiling.socialSecurityCeiling = 10;
  assert.equal(validateSalaryParameters(ceiling).ok, false);
  assert.equal(validateSalaryParameters(null).ok, false);
});
