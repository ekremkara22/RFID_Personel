import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
export default async function Layout({ children }: { children: React.ReactNode }) { const { authorization } = await requireSessionUser(); if (!authorization.permissions.has(PERMISSIONS.REPORT_VIEW)) redirect("/dashboard"); return children; }
