import { notFound } from "next/navigation";

export function parseRouteId(value: string) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    notFound();
  }
  return id;
}
