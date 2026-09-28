import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { requireSessionUser } from "@/lib/session";
export default async function Layout({ children }: { children: React.ReactNode }) { const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.LEAVE_VIEW); return children; }
