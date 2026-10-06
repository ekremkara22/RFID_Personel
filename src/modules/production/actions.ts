"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS, type PermissionCode } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { ActionError } from "@/lib/action-error";
import { getId, getOptionalId, getOptionalNumber, getString } from "@/modules/shared/action-helpers";
import * as XLSX from "xlsx";

const basePath = "/dashboard/production";
const stationTypes = new Set(["GENERAL", "INJECTION", "CNC_TURNING", "CNC_MILLING", "ASSEMBLY", "QUALITY"]);

async function productionContext(permission: PermissionCode = PERMISSIONS.WORK_CENTER_MANAGE) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, permission);
  if (!authorization.companyId) throw new ActionError("Aktif firma seçilmedi.");
  return authorization.companyId;
}

function positiveInteger(value: number | null, label: string, fallback?: number, minimum = 1) {
  if (value == null && fallback != null) return fallback;
  if (!Number.isSafeInteger(value) || value == null || value < minimum) throw new ActionError(`${label} geçerli bir tam sayı olmalıdır.`);
  return value;
}

function invalidateDefinitions() {
  revalidatePath(basePath);
  revalidatePath(`${basePath}/definitions`);
  revalidatePath(`${basePath}/work-orders`);
  revalidatePath(`${basePath}/gantt`);
}

async function validateCalendarTemplate(companyId: number, calendarTemplateId: number | null) {
  if (!calendarTemplateId) return;
  const calendar = await prisma.workCalendarTemplate.findFirst({ where: { id: calendarTemplateId, companyId, isActive: true }, select: { id: true } });
  if (!calendar) throw new ActionError("Seçilen çalışma takvimi bu firmaya ait değil veya aktif değil.");
}

export async function createWorkCenterAction(formData: FormData) {
  const companyId = await productionContext();
  const code = getString(formData, "code").toUpperCase();
  const name = getString(formData, "name");
  const description = getString(formData, "description") || null;
  const calendarTemplateId = getOptionalId(formData, "calendarTemplateId");
  if (!code || !name) throw new ActionError("İş merkezi kodu ve adı zorunludur.");
  await validateCalendarTemplate(companyId, calendarTemplateId);
  await prisma.productionWorkCenter.create({ data: { companyId, code, name, description, calendarTemplateId } });
  invalidateDefinitions();
  redirect(`${basePath}/definitions/work-centers`);
}

export async function updateWorkCenterAction(formData: FormData) {
  const companyId = await productionContext();
  const id = getId(formData, "id");
  const code = getString(formData, "code").toUpperCase();
  const name = getString(formData, "name");
  if (!code || !name) throw new ActionError("İş merkezi kodu ve adı zorunludur.");
  const calendarTemplateId = getOptionalId(formData, "calendarTemplateId");
  await validateCalendarTemplate(companyId, calendarTemplateId);
  const result = await prisma.productionWorkCenter.updateMany({
    where: { id, companyId },
    data: { code, name, description: getString(formData, "description") || null, calendarTemplateId, isActive: formData.get("isActive") === "on" },
  });
  if (!result.count) throw new ActionError("İş merkezi bulunamadı.");
  invalidateDefinitions();
}

export async function deleteWorkCenterAction(formData: FormData) {
  const companyId = await productionContext();
  const id = getId(formData, "id");
  const [center, stationCount, orderCount] = await Promise.all([
    prisma.productionWorkCenter.findFirst({ where: { id, companyId } }),
    prisma.productionStation.count({ where: { companyId, workCenterId: id } }),
    prisma.productionWorkOrder.count({ where: { companyId, workCenterId: id } }),
  ]);
  if (!center) throw new ActionError("İş merkezi bulunamadı.");
  if (stationCount || orderCount) throw new ActionError("Bu iş merkezi istasyon veya iş emrinde kullanılıyor. Silmek yerine pasife alın.");
  await prisma.productionWorkCenter.delete({ where: { id } });
  invalidateDefinitions();
  redirect(`${basePath}/definitions/work-centers`);
}

export async function createStationAction(formData: FormData) {
  const companyId = await productionContext();
  const code = getString(formData, "code").toUpperCase();
  const name = getString(formData, "name");
  const workCenterId = getId(formData, "workCenterId");
  const stationType = getString(formData, "stationType") || "GENERAL";
  const calendarTemplateId = getOptionalId(formData, "calendarTemplateId");
  if (!code || !name) throw new ActionError("İstasyon kodu ve adı zorunludur.");
  if (!stationTypes.has(stationType)) throw new ActionError("İstasyon türü geçersiz.");
  const workCenter = await prisma.productionWorkCenter.findFirst({ where: { id: workCenterId, companyId } });
  if (!workCenter) throw new ActionError("Bağlı iş merkezi bulunamadı.");
  await validateCalendarTemplate(companyId, calendarTemplateId);
  await prisma.productionStation.create({ data: {
    companyId, workCenterId, code, name,
    stationType: stationType as never,
    description: getString(formData, "description") || null,
    calendarTemplateId,
  } });
  invalidateDefinitions();
  redirect(`${basePath}/definitions/stations`);
}

export async function createToolAction(formData: FormData) {
  const companyId = await productionContext();
  const code = getString(formData, "code").toUpperCase();
  const name = getString(formData, "name");
  if (!code || !name) throw new ActionError("Kalıp/aparat kodu ve adı zorunludur.");
  await prisma.productionTool.create({ data: { companyId, code, name, toolType: getString(formData, "toolType") || null, description: getString(formData, "description") || null } });
  invalidateDefinitions();
  redirect(`${basePath}/definitions/tools`);
}

export async function updateToolAction(formData: FormData) {
  const companyId = await productionContext();
  const id = getId(formData, "id");
  const code = getString(formData, "code").toUpperCase();
  const name = getString(formData, "name");
  if (!code || !name) throw new ActionError("Kalıp/aparat kodu ve adı zorunludur.");
  const result = await prisma.productionTool.updateMany({ where: { id, companyId }, data: { code, name, toolType: getString(formData, "toolType") || null, description: getString(formData, "description") || null, isActive: formData.get("isActive") === "on" } });
  if (!result.count) throw new ActionError("Kalıp/aparat bulunamadı.");
  invalidateDefinitions();
}

export async function deleteToolAction(formData: FormData) {
  const companyId = await productionContext();
  const id = getId(formData, "id");
  const [tool, cycleCount, orderCount] = await Promise.all([prisma.productionTool.findFirst({ where: { id, companyId } }), prisma.productionCycleTime.count({ where: { companyId, toolId: id } }), prisma.productionWorkOrder.count({ where: { companyId, toolId: id } })]);
  if (!tool) throw new ActionError("Kalıp/aparat bulunamadı.");
  if (cycleCount || orderCount) throw new ActionError("Bu kalıp/aparat çevrim standardı veya iş emrinde kullanılıyor. Silmek yerine pasife alın.");
  await prisma.productionTool.delete({ where: { id } });
  invalidateDefinitions();
  redirect(`${basePath}/definitions/tools`);
}

export async function updateStationAction(formData: FormData) {
  const companyId = await productionContext();
  const id = getId(formData, "id");
  const workCenterId = getId(formData, "workCenterId");
  const stationType = getString(formData, "stationType") || "GENERAL";
  const calendarTemplateId = getOptionalId(formData, "calendarTemplateId");
  const code = getString(formData, "code").toUpperCase();
  const name = getString(formData, "name");
  if (!code || !name) throw new ActionError("İstasyon kodu ve adı zorunludur.");
  if (!stationTypes.has(stationType)) throw new ActionError("İstasyon türü geçersiz.");
  const workCenter = await prisma.productionWorkCenter.findFirst({ where: { id: workCenterId, companyId } });
  if (!workCenter) throw new ActionError("Bağlı iş merkezi bulunamadı.");
  await validateCalendarTemplate(companyId, calendarTemplateId);
  const result = await prisma.productionStation.updateMany({ where: { id, companyId }, data: {
    workCenterId, code, name, stationType: stationType as never,
    description: getString(formData, "description") || null,
    calendarTemplateId, isActive: formData.get("isActive") === "on",
  } });
  if (!result.count) throw new ActionError("İstasyon bulunamadı.");
  invalidateDefinitions();
}

export async function deleteStationAction(formData: FormData) {
  const companyId = await productionContext();
  const id = getId(formData, "id");
  const [station, cycleCount, orderCount] = await Promise.all([
    prisma.productionStation.findFirst({ where: { id, companyId } }),
    prisma.productionCycleTime.count({ where: { companyId, stationId: id } }),
    prisma.productionWorkOrder.count({ where: { companyId, stationId: id } }),
  ]);
  if (!station) throw new ActionError("İstasyon bulunamadı.");
  if (cycleCount || orderCount) throw new ActionError("Bu istasyon çevrim standardı veya iş emrinde kullanılıyor. Silmek yerine pasife alın.");
  await prisma.productionStation.delete({ where: { id } });
  invalidateDefinitions();
  redirect(`${basePath}/definitions/stations`);
}

export async function createCycleTimeAction(formData: FormData) {
  const companyId = await productionContext();
  const stationId = getId(formData, "stationId");
  const itemCode = getString(formData, "itemCode").toUpperCase();
  const cycleSeconds = positiveInteger(getOptionalNumber(formData, "cycleSeconds"), "Çevrim süresi");
  const cavityCount = positiveInteger(getOptionalNumber(formData, "cavityCount"), "Göz adedi", 1);
  const setupMinutes = positiveInteger(getOptionalNumber(formData, "setupMinutes"), "Hazırlık süresi", 0, 0);
  if (!itemCode) throw new ActionError("Parça kodu zorunludur.");
  const station = await prisma.productionStation.findFirst({ where: { id: stationId, companyId } });
  if (!station) throw new ActionError("İstasyon bulunamadı.");
  const toolId = getOptionalId(formData, "toolId");
  if (toolId && !await prisma.productionTool.findFirst({ where: { id: toolId, companyId } })) throw new ActionError("Kalıp/aparat bulunamadı.");
  await prisma.productionCycleTime.create({ data: { companyId, stationId, toolId, itemCode, itemName: getString(formData, "itemName") || null, cycleSeconds, cavityCount, setupMinutes } });
  invalidateDefinitions();
}

export async function updateCycleTimeAction(formData: FormData) {
  const companyId = await productionContext();
  const id = getId(formData, "id");
  const stationId = getId(formData, "stationId");
  const itemCode = getString(formData, "itemCode").toUpperCase();
  if (!itemCode) throw new ActionError("Parça kodu zorunludur.");
  const station = await prisma.productionStation.findFirst({ where: { id: stationId, companyId } });
  if (!station) throw new ActionError("İstasyon bulunamadı.");
  const toolId = getOptionalId(formData, "toolId");
  if (toolId && !await prisma.productionTool.findFirst({ where: { id: toolId, companyId } })) throw new ActionError("Kalıp/aparat bulunamadı.");
  const result = await prisma.productionCycleTime.updateMany({ where: { id, companyId }, data: { stationId, toolId, itemCode, itemName: getString(formData, "itemName") || null, cycleSeconds: positiveInteger(getOptionalNumber(formData, "cycleSeconds"), "Çevrim süresi"), cavityCount: positiveInteger(getOptionalNumber(formData, "cavityCount"), "Göz adedi", 1), setupMinutes: positiveInteger(getOptionalNumber(formData, "setupMinutes"), "Hazırlık süresi", 0, 0), isActive: formData.get("isActive") === "on" } });
  if (!result.count) throw new ActionError("Çevrim standardı bulunamadı.");
  invalidateDefinitions();
}

export async function deleteCycleTimeAction(formData: FormData) {
  const companyId = await productionContext();
  const id = getId(formData, "id");
  const [cycle, orderCount] = await Promise.all([prisma.productionCycleTime.findFirst({ where: { id, companyId } }), prisma.productionWorkOrder.count({ where: { companyId, cycleTimeId: id } })]);
  if (!cycle) throw new ActionError("Çevrim standardı bulunamadı.");
  if (orderCount) throw new ActionError("Bu çevrim standardı iş emirlerinde kullanılıyor. Silmek yerine pasife alın.");
  await prisma.productionCycleTime.delete({ where: { id } });
  invalidateDefinitions();
}

export async function createWorkOrderFieldAction(formData: FormData) {
  const companyId = await productionContext(PERMISSIONS.CAPACITY_MANAGE);
  const fieldKey = getString(formData, "fieldKey").toLowerCase();
  const label = getString(formData, "label");
  const fieldType = getString(formData, "fieldType");
  if (!/^[a-z][a-z0-9_]{1,62}$/.test(fieldKey) || !label) {
    throw new ActionError("Alan anahtarı harfle başlamalı; yalnız küçük harf, rakam ve alt çizgi içermelidir.");
  }
  if (!new Set(["TEXT", "NUMBER", "DATE", "SELECT", "BOOLEAN"]).has(fieldType)) throw new ActionError("Alan türü geçersiz.");
  const optionsJson = getString(formData, "optionsJson");
  if (fieldType === "SELECT") {
    try {
      const options = JSON.parse(optionsJson);
      if (!Array.isArray(options) || !options.every((item) => typeof item === "string" && item.trim())) throw new Error();
    } catch {
      throw new ActionError("Seçim alanı için seçenekleri örnekteki gibi JSON dizi olarak girin.");
    }
  }
  const last = await prisma.productionCustomField.aggregate({ where: { companyId, entity: "WORK_ORDER" }, _max: { displayOrder: true } });
  await prisma.productionCustomField.create({ data: {
    companyId, entity: "WORK_ORDER", fieldKey, label, fieldType: fieldType as never,
    optionsJson: optionsJson || null, isRequired: formData.get("isRequired") === "on", displayOrder: (last._max.displayOrder ?? 0) + 10,
  } });
  revalidatePath(`${basePath}/work-orders`);
  revalidatePath(`${basePath}/work-orders/template`);
}

export async function moveWorkOrderAction(workOrderId: number, targetStationId: number, beforeWorkOrderId: number | null) {
  const companyId = await productionContext(PERMISSIONS.CAPACITY_MANAGE);
  if (!Number.isSafeInteger(workOrderId) || !Number.isSafeInteger(targetStationId)) throw new ActionError("Planlama kaydı geçersiz.");
  const [workOrder, targetStation] = await Promise.all([
    prisma.productionWorkOrder.findFirst({ where: { id: workOrderId, companyId } }),
    prisma.productionStation.findFirst({ where: { id: targetStationId, companyId, isActive: true } }),
  ]);
  if (!workOrder || !targetStation) throw new ActionError("İş emri veya hedef istasyon bulunamadı.");
  if (workOrder.isScheduleLocked) throw new ActionError("Kilitli iş emri taşınamaz.");
  const cycle = await prisma.productionCycleTime.findFirst({ where: { companyId, stationId: targetStationId, itemCode: workOrder.itemCode, isActive: true, ...(workOrder.toolId ? { toolId: workOrder.toolId } : { toolId: null }) }, orderBy: { updatedAt: "desc" } });
  if (targetStationId !== workOrder.stationId && !cycle) throw new ActionError("Hedef istasyonda bu parça için uygun çevrim standardı bulunamadı.");
  const targetQueue = await prisma.productionWorkOrder.findMany({ where: { companyId, stationId: targetStationId, status: { in: ["DRAFT", "PLANNED"] }, NOT: { id: workOrderId } }, orderBy: [{ sequence: "asc" }, { id: "asc" }], select: { id: true } });
  const beforeIndex = beforeWorkOrderId ? targetQueue.findIndex((item) => item.id === beforeWorkOrderId) : -1;
  const orderedIds = [...targetQueue.map((item) => item.id)];
  orderedIds.splice(beforeIndex >= 0 ? beforeIndex : orderedIds.length, 0, workOrderId);
  await prisma.$transaction([
    prisma.productionWorkOrder.update({ where: { id: workOrderId }, data: {
      stationId: targetStationId, workCenterId: targetStation.workCenterId,
      ...(cycle ? { cycleTimeId: cycle.id, cycleSecondsSnapshot: cycle.cycleSeconds, cavityCountSnapshot: cycle.cavityCount, setupMinutesSnapshot: cycle.setupMinutes, calculatedMinutes: Math.ceil((Number(workOrder.quantity) / cycle.cavityCount * cycle.cycleSeconds) / 60) + cycle.setupMinutes } : {}),
    } }),
    ...orderedIds.map((id, index) => prisma.productionWorkOrder.update({ where: { id }, data: { sequence: (index + 1) * 100 } })),
  ]);
  revalidatePath(`${basePath}/gantt`);
  revalidatePath(`${basePath}/work-orders`);
}

export async function createWorkOrderAction(formData: FormData) {
  const companyId = await productionContext(PERMISSIONS.CAPACITY_MANAGE);
  const workOrderNo = getString(formData, "workOrderNo").toUpperCase();
  const itemCode = getString(formData, "itemCode").toUpperCase();
  const stationId = getId(formData, "stationId");
  const quantity = getOptionalNumber(formData, "quantity");
  if (!workOrderNo || !itemCode || !quantity || quantity <= 0) throw new ActionError("İş emri, parça ve miktar zorunludur.");
  const station = await prisma.productionStation.findFirst({ where: { id: stationId, companyId, isActive: true } });
  if (!station) throw new ActionError("Planlanacak aktif istasyon bulunamadı.");
  const toolId = getOptionalId(formData, "toolId");
  const matchedCycle = await prisma.productionCycleTime.findFirst({
    where: { companyId, stationId, itemCode, isActive: true, ...(toolId ? { toolId } : { toolId: null }) },
    orderBy: { updatedAt: "desc" },
  });
  const manualCycleSeconds = getOptionalNumber(formData, "cycleSeconds");
  const cycleSeconds = matchedCycle?.cycleSeconds ?? positiveInteger(manualCycleSeconds, "Çevrim süresi");
  const cavityCount = matchedCycle?.cavityCount ?? positiveInteger(getOptionalNumber(formData, "cavityCount"), "Göz adedi", 1);
  const setupMinutes = matchedCycle?.setupMinutes ?? positiveInteger(getOptionalNumber(formData, "setupMinutes"), "Hazırlık süresi", 0, 0);
  const calculatedMinutes = Math.ceil((quantity / cavityCount * cycleSeconds) / 60) + setupMinutes;
  const last = await prisma.productionWorkOrder.aggregate({ where: { companyId, stationId }, _max: { sequence: true } });
  const customFieldDefinitions = await prisma.productionCustomField.findMany({ where: { companyId, entity: "WORK_ORDER", isActive: true }, orderBy: { displayOrder: "asc" } });
  const customFields: Record<string, string> = {};
  for (const field of customFieldDefinitions) {
    const value = getString(formData, `custom_${field.fieldKey}`);
    if (field.isRequired && !value) throw new ActionError(`${field.label} zorunludur.`);
    if (value) customFields[field.fieldKey] = value;
  }
  await prisma.productionWorkOrder.create({ data: {
    companyId, workOrderNo, orderNo: getString(formData, "orderNo") || null, itemCode, itemName: getString(formData, "itemName") || null,
    quantity, workCenterId: station.workCenterId, stationId, toolId, cycleTimeId: matchedCycle?.id ?? null,
    cycleSecondsSnapshot: cycleSeconds, cavityCountSnapshot: cavityCount, setupMinutesSnapshot: setupMinutes, calculatedMinutes,
    dueDate: getString(formData, "dueDate") ? new Date(`${getString(formData, "dueDate")}T12:00:00`) : null,
    sequence: (last._max.sequence ?? 0) + 100, status: "PLANNED", customFieldsJson: Object.keys(customFields).length ? JSON.stringify(customFields) : null,
  } });
  revalidatePath(`${basePath}/work-orders`);
  revalidatePath(`${basePath}/gantt`);
}

function importCell(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return value == null ? "" : String(value).trim();
}

export async function importWorkOrdersAction(formData: FormData) {
  const companyId = await productionContext(PERMISSIONS.CAPACITY_MANAGE);
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new ActionError("İçe aktarılacak Excel veya CSV dosyasını seçin.");
  if (file.size > 10 * 1024 * 1024) throw new ActionError("Dosya boyutu 10 MB sınırını aşıyor.");
  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) throw new ActionError("Dosyada okunabilir bir çalışma sayfası bulunamadı.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  if (!rows.length) throw new ActionError("Dosyada aktarılacak satır bulunamadı.");
  if (rows.length > 2_000) throw new ActionError("Bir dosyada en fazla 2.000 iş emri aktarılabilir.");
  const [stations, tools, cycles, customFields] = await Promise.all([
    prisma.productionStation.findMany({ where: { companyId, isActive: true }, select: { id: true, code: true, workCenterId: true } }),
    prisma.productionTool.findMany({ where: { companyId, isActive: true }, select: { id: true, code: true } }),
    prisma.productionCycleTime.findMany({ where: { companyId, isActive: true }, orderBy: { updatedAt: "desc" } }),
    prisma.productionCustomField.findMany({ where: { companyId, entity: "WORK_ORDER", isActive: true }, orderBy: { displayOrder: "asc" } }),
  ]);
  const stationByCode = new Map(stations.map((station) => [station.code.toUpperCase(), station]));
  const toolByCode = new Map(tools.map((tool) => [tool.code.toUpperCase(), tool]));
  const errors: string[] = [];
  const seenWorkOrders = new Set<string>();
  const pending: Array<{ workOrderNo: string; orderNo: string | null; itemCode: string; itemName: string | null; quantity: number; stationId: number; workCenterId: number; toolId: number | null; cycleTimeId: number | null; cycleSecondsSnapshot: number; cavityCountSnapshot: number; setupMinutesSnapshot: number; calculatedMinutes: number; dueDate: Date | null; customFieldsJson: string | null }> = [];
  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    const workOrderNo = importCell(row, "İş Emri No").toUpperCase();
    const itemCode = importCell(row, "Parça Kodu").toUpperCase();
    const quantity = Number(importCell(row, "Miktar").replace(",", "."));
    const station = stationByCode.get(importCell(row, "İstasyon Kodu").toUpperCase());
    const toolCode = importCell(row, "Kalıp/Aparat Kodu").toUpperCase();
    const tool = toolCode ? toolByCode.get(toolCode) : undefined;
    if (!workOrderNo || !itemCode || !Number.isFinite(quantity) || quantity <= 0 || !station || (toolCode && !tool)) {
      errors.push(`Satır ${line}: iş emri no, parça kodu, miktar ve geçerli istasyon kodu zorunludur${toolCode && !tool ? "; kalıp/aparat kodu bulunamadı" : ""}.`);
      continue;
    }
    if (seenWorkOrders.has(workOrderNo)) { errors.push(`Satır ${line}: iş emri no dosyada tekrar ediyor.`); continue; }
    seenWorkOrders.add(workOrderNo);
    const matchingCycle = cycles.find((cycle) => cycle.stationId === station.id && cycle.itemCode === itemCode && cycle.toolId === (tool?.id ?? null));
    const rawCycleSeconds = Number(importCell(row, "Çevrim Süresi (sn)"));
    const rawCavityCount = Number(importCell(row, "Göz Adedi"));
    const rawSetupMinutes = Number(importCell(row, "Hazırlık Süresi (dk)"));
    const cycleSeconds = matchingCycle?.cycleSeconds ?? rawCycleSeconds;
    const cavityCount = matchingCycle?.cavityCount ?? (Number.isSafeInteger(rawCavityCount) && rawCavityCount > 0 ? rawCavityCount : 1);
    const setupMinutes = matchingCycle?.setupMinutes ?? (Number.isSafeInteger(rawSetupMinutes) && rawSetupMinutes >= 0 ? rawSetupMinutes : 0);
    if (!Number.isSafeInteger(cycleSeconds) || cycleSeconds <= 0) { errors.push(`Satır ${line}: çevrim standardı bulunamadı; çevrim süresini saniye olarak girin.`); continue; }
    const customValues: Record<string, string> = {};
    let customError = false;
    for (const field of customFields) {
      const value = importCell(row, field.label);
      if (field.isRequired && !value) { errors.push(`Satır ${line}: ${field.label} zorunludur.`); customError = true; }
      if (value) customValues[field.fieldKey] = value;
    }
    if (customError) continue;
    const dueDateValue = importCell(row, "Termin Tarihi");
    const dueDate = dueDateValue ? new Date(`${dueDateValue}T12:00:00`) : null;
    if (dueDateValue && Number.isNaN(dueDate?.getTime())) { errors.push(`Satır ${line}: termin tarihi geçersiz.`); continue; }
    pending.push({ workOrderNo, orderNo: importCell(row, "Sipariş No") || null, itemCode, itemName: importCell(row, "Parça Adı") || null, quantity, stationId: station.id, workCenterId: station.workCenterId, toolId: tool?.id ?? null, cycleTimeId: matchingCycle?.id ?? null, cycleSecondsSnapshot: cycleSeconds, cavityCountSnapshot: cavityCount, setupMinutesSnapshot: setupMinutes, calculatedMinutes: Math.ceil((quantity / cavityCount * cycleSeconds) / 60) + setupMinutes, dueDate, customFieldsJson: Object.keys(customValues).length ? JSON.stringify(customValues) : null });
  }
  if (errors.length) throw new ActionError(`İçe aktarma yapılmadı. ${errors.slice(0, 8).join(" ")}${errors.length > 8 ? ` (+${errors.length - 8} hata)` : ""}`);
  const existing = await prisma.productionWorkOrder.findMany({ where: { companyId, workOrderNo: { in: pending.map((item) => item.workOrderNo) } }, select: { workOrderNo: true } });
  if (existing.length) throw new ActionError(`Bu iş emri numaraları zaten kayıtlı: ${existing.map((item) => item.workOrderNo).slice(0, 8).join(", ")}`);
  const currentSequences = await prisma.productionWorkOrder.groupBy({ by: ["stationId"], where: { companyId }, _max: { sequence: true } });
  const sequences = new Map(currentSequences.map((item) => [item.stationId, item._max.sequence ?? 0]));
  await prisma.productionWorkOrder.createMany({ data: pending.map((item) => ({ ...item, companyId, sequence: (sequences.set(item.stationId, (sequences.get(item.stationId) ?? 0) + 100), sequences.get(item.stationId)!), status: "PLANNED", source: "IMPORT" })) });
  revalidatePath(`${basePath}/work-orders`);
  revalidatePath(`${basePath}/gantt`);
}
