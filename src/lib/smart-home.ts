import { createHash, randomBytes } from "node:crypto";

export const SMART_HOME_NODE_KINDS = ["SWITCH", "LIGHT", "SENSOR", "CLIMATE", "SECURITY", "OTHER"] as const;
export type SmartHomeNodeKindValue = (typeof SMART_HOME_NODE_KINDS)[number];

export type SmartHomeSyncPayload = {
  gateway: { agentVersion: string | null; systemVersion: string | null; ipAddress: string | null };
  nodes: Array<{
    hardwareId: string; name: string; room: string | null; kind: SmartHomeNodeKindValue;
    capabilitiesJson: string | null; stateJson: string | null; telemetryJson: string | null;
    firmwareVersion: string | null; rssi: number | null; meshLayer: number | null;
  }>;
  acknowledgements: Array<{ id: number; status: "COMPLETED" | "FAILED"; error: string | null }>;
};

export function generateSmartHomeApiKey() {
  return `shg_${randomBytes(32).toString("base64url")}`;
}

export function hashSmartHomeApiKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} nesne olmalıdır.`);
  return value as Record<string, unknown>;
}

function optionalString(value: unknown, maxLength: number, label: string) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label} metin olmalıdır.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new Error(`${label} en fazla ${maxLength} karakter olmalıdır.`);
  return normalized;
}

function jsonField(value: unknown, label: string) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} nesne olmalıdır.`);
  const serialized = JSON.stringify(value);
  if (serialized.length > 8_192) throw new Error(`${label} çok büyük.`);
  return serialized;
}

function optionalInteger(value: unknown, min: number, max: number, label: string) {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) throw new Error(`${label} geçersiz.`);
  return Number(value);
}

export function parseSmartHomeSyncPayload(input: unknown): SmartHomeSyncPayload {
  const root = asObject(input, "İstek gövdesi");
  const gatewayValue = root.gateway === undefined ? {} : asObject(root.gateway, "gateway");
  const nodesValue = root.nodes === undefined ? [] : root.nodes;
  const acknowledgementsValue = root.acknowledgements === undefined ? [] : root.acknowledgements;
  if (!Array.isArray(nodesValue) || nodesValue.length > 100) throw new Error("nodes en fazla 100 öğe içeren bir dizi olmalıdır.");
  if (!Array.isArray(acknowledgementsValue) || acknowledgementsValue.length > 100) throw new Error("acknowledgements en fazla 100 öğe içeren bir dizi olmalıdır.");

  const nodes = nodesValue.map((value, index) => {
    const node = asObject(value, `nodes[${index}]`);
    const hardwareId = optionalString(node.hardwareId, 64, `nodes[${index}].hardwareId`);
    if (!hardwareId || !/^[A-Za-z0-9:._-]+$/.test(hardwareId)) throw new Error(`nodes[${index}].hardwareId geçersiz.`);
    const kind = optionalString(node.kind, 20, `nodes[${index}].kind`) ?? "OTHER";
    if (!SMART_HOME_NODE_KINDS.includes(kind as SmartHomeNodeKindValue)) throw new Error(`nodes[${index}].kind geçersiz.`);
    return {
      hardwareId,
      name: optionalString(node.name, 100, `nodes[${index}].name`) ?? hardwareId,
      room: optionalString(node.room, 100, `nodes[${index}].room`),
      kind: kind as SmartHomeNodeKindValue,
      capabilitiesJson: jsonField(node.capabilities, `nodes[${index}].capabilities`),
      stateJson: jsonField(node.state, `nodes[${index}].state`),
      telemetryJson: jsonField(node.telemetry, `nodes[${index}].telemetry`),
      firmwareVersion: optionalString(node.firmwareVersion, 32, `nodes[${index}].firmwareVersion`),
      rssi: optionalInteger(node.rssi, -127, 0, `nodes[${index}].rssi`),
      meshLayer: optionalInteger(node.meshLayer, 0, 25, `nodes[${index}].meshLayer`),
    };
  });

  const acknowledgements = acknowledgementsValue.map((value, index) => {
    const acknowledgement = asObject(value, `acknowledgements[${index}]`);
    const id = optionalInteger(acknowledgement.id, 1, Number.MAX_SAFE_INTEGER, `acknowledgements[${index}].id`);
    if (id === null) throw new Error(`acknowledgements[${index}].id zorunludur.`);
    if (acknowledgement.status !== "COMPLETED" && acknowledgement.status !== "FAILED") throw new Error(`acknowledgements[${index}].status geçersiz.`);
    const status: "COMPLETED" | "FAILED" = acknowledgement.status;
    return { id, status, error: optionalString(acknowledgement.error, 500, `acknowledgements[${index}].error`) };
  });

  return {
    gateway: {
      agentVersion: optionalString(gatewayValue.agentVersion, 32, "gateway.agentVersion"),
      systemVersion: optionalString(gatewayValue.systemVersion, 120, "gateway.systemVersion"),
      ipAddress: optionalString(gatewayValue.ipAddress, 64, "gateway.ipAddress"),
    },
    nodes,
    acknowledgements,
  };
}

export function parseSmartHomeJson(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
