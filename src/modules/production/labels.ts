export const PRODUCTION_STATION_TYPES = [
  ["GENERAL", "Genel"],
  ["INJECTION", "Enjeksiyon"],
  ["CNC_TURNING", "CNC Torna"],
  ["CNC_MILLING", "CNC Freze"],
  ["ASSEMBLY", "Montaj"],
  ["QUALITY", "Kalite"],
] as const;

export function productionStationTypeLabel(value: string) {
  return PRODUCTION_STATION_TYPES.find(([key]) => key === value)?.[1] ?? value;
}
