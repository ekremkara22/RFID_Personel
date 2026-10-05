import { prisma } from "../src/lib/prisma";

async function main() {
  const company = await prisma.company.findFirst({ orderBy: { id: "asc" } });
  if (!company) throw new Error("Örnek üretim verisi için firma bulunamadı.");
  const centers = await Promise.all([
    prisma.productionWorkCenter.upsert({ where: { companyId_code: { companyId: company.id, code: "ENJEKSIYON" } }, create: { companyId: company.id, code: "ENJEKSIYON", name: "Enjeksiyon Atölyesi" }, update: { name: "Enjeksiyon Atölyesi", isActive: true } }),
    prisma.productionWorkCenter.upsert({ where: { companyId_code: { companyId: company.id, code: "CNC" } }, create: { companyId: company.id, code: "CNC", name: "CNC İşleme" }, update: { name: "CNC İşleme", isActive: true } }),
  ]);
  const stations = await Promise.all([
    prisma.productionStation.upsert({ where: { companyId_code: { companyId: company.id, code: "ENJ-01" } }, create: { companyId: company.id, workCenterId: centers[0].id, code: "ENJ-01", name: "Enjeksiyon Makinesi 01", stationType: "INJECTION" }, update: { workCenterId: centers[0].id, isActive: true } }),
    prisma.productionStation.upsert({ where: { companyId_code: { companyId: company.id, code: "ENJ-02" } }, create: { companyId: company.id, workCenterId: centers[0].id, code: "ENJ-02", name: "Enjeksiyon Makinesi 02", stationType: "INJECTION" }, update: { workCenterId: centers[0].id, isActive: true } }),
    prisma.productionStation.upsert({ where: { companyId_code: { companyId: company.id, code: "CNC-01" } }, create: { companyId: company.id, workCenterId: centers[1].id, code: "CNC-01", name: "CNC Torna 01", stationType: "CNC_TURNING" }, update: { workCenterId: centers[1].id, isActive: true } }),
  ]);
  const mold = await prisma.productionTool.upsert({ where: { companyId_code: { companyId: company.id, code: "KALIP-24" } }, create: { companyId: company.id, code: "KALIP-24", name: "Kapak Kalıbı 24 Göz", toolType: "Kalıp" }, update: { isActive: true } });
  const cycleRows = [{ stationId: stations[0].id, toolId: mold.id, itemCode: "KPK-100", itemName: "Plastik Kapak", cycleSeconds: 42, cavityCount: 24, setupMinutes: 30 }, { stationId: stations[1].id, toolId: mold.id, itemCode: "KPK-100", itemName: "Plastik Kapak", cycleSeconds: 47, cavityCount: 24, setupMinutes: 30 }, { stationId: stations[2].id, toolId: null, itemCode: "MIL-220", itemName: "Çelik Mil", cycleSeconds: 155, cavityCount: 1, setupMinutes: 20 }];
  for (const cycle of cycleRows) { const existing = await prisma.productionCycleTime.findFirst({ where: { companyId: company.id, stationId: cycle.stationId, toolId: cycle.toolId, itemCode: cycle.itemCode } }); if (!existing) await prisma.productionCycleTime.create({ data: { companyId: company.id, ...cycle } }); }
  for (const [index, sample] of [{ no: "DEMO-ENJ-001", itemCode: "KPK-100", itemName: "Plastik Kapak", quantity: 24000, station: stations[0], toolId: mold.id, seconds: 42, cavities: 24, setup: 30 }, { no: "DEMO-ENJ-002", itemCode: "KPK-100", itemName: "Plastik Kapak", quantity: 12000, station: stations[1], toolId: mold.id, seconds: 47, cavities: 24, setup: 30 }, { no: "DEMO-CNC-001", itemCode: "MIL-220", itemName: "Çelik Mil", quantity: 350, station: stations[2], toolId: null, seconds: 155, cavities: 1, setup: 20 }].entries()) { await prisma.productionWorkOrder.upsert({ where: { companyId_workOrderNo: { companyId: company.id, workOrderNo: sample.no } }, create: { companyId: company.id, workOrderNo: sample.no, orderNo: `SIP-DEMO-${index + 1}`, itemCode: sample.itemCode, itemName: sample.itemName, quantity: sample.quantity, workCenterId: sample.station.workCenterId, stationId: sample.station.id, toolId: sample.toolId, cycleSecondsSnapshot: sample.seconds, cavityCountSnapshot: sample.cavities, setupMinutesSnapshot: sample.setup, calculatedMinutes: Math.ceil(sample.quantity / sample.cavities * sample.seconds / 60) + sample.setup, sequence: (index + 1) * 100, status: "PLANNED", source: "DEMO" }, update: {} }); }
  console.log(`Demo üretim verisi eklendi: ${company.name}`);
}
main().finally(() => prisma.$disconnect());
