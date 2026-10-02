export type HealthLevel = "healthy" | "warning" | "critical" | "unknown";

export function usageHealthLevel(
  percentage: number | null,
  warningAt = 80,
  criticalAt = 90,
): HealthLevel {
  if (percentage === null || !Number.isFinite(percentage)) return "unknown";
  if (percentage >= criticalAt) return "critical";
  if (percentage >= warningAt) return "warning";
  return "healthy";
}

export function latencyHealthLevel(milliseconds: number | null): HealthLevel {
  if (milliseconds === null || !Number.isFinite(milliseconds)) return "critical";
  if (milliseconds >= 500) return "critical";
  if (milliseconds >= 200) return "warning";
  return "healthy";
}

export function overallHealthLevel(levels: HealthLevel[]): HealthLevel {
  if (levels.includes("critical")) return "critical";
  if (levels.includes("warning")) return "warning";
  if (levels.every((level) => level === "unknown")) return "unknown";
  return "healthy";
}
