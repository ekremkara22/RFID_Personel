import { redirect } from "next/navigation";
import { can } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
export default async function Layout({ children }: { children: React.ReactNode }) { const { user, authorization } = await requireSessionUser(); if (user.role === "SUPERADMIN") return children; if (!can(authorization, PERMISSIONS.SETTINGS_MANAGE)) redirect("/dashboard"); return children; }
