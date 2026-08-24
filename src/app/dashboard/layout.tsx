import { requireSessionUser } from "@/lib/session";
import { DashboardShell } from "./shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSessionUser();

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
