import { redirect } from "next/navigation";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
export default async function Layout({ children }: { children: React.ReactNode }) { const { authorization } = await requireSessionUser(); if (!can(authorization, PERMISSIONS.REPORT_VIEW)) redirect("/dashboard"); return children; }
