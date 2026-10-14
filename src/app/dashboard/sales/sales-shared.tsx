import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { APP_TIME_ZONE } from "@/lib/app-time";
import { requireSessionUser } from "@/lib/session";
import type { BadgeTone } from "@/modules/commerce/labels";
import { SalesTabs } from "./sales-tabs";
import ui from "../management.module.css";

/** Satış & Pazarlama is a platform owner tool: every page re-checks the role (layouts and pages render in parallel). */
export async function requireSalesAdmin() {
  const session = await requireSessionUser();
  if (session.user.role !== "SUPERADMIN") redirect("/dashboard");
  return session;
}

export function SalesPageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Satış &amp; Pazarlama</p>
          <h1 className={ui.pageTitle}>{title}</h1>
          <p className={ui.pageDescription}>{description}</p>
        </div>
        {actions ? <div className={ui.headerActions}>{actions}</div> : null}
      </header>
      <SalesTabs />
    </>
  );
}

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  const className = tone === "success" ? ui.statusBadge : tone === "danger" ? ui.statusDanger : tone === "warning" ? ui.statusWarning : ui.statusNeutral;
  return <span className={className}><span className={ui.statusDot} />{children}</span>;
}

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", { timeZone: APP_TIME_ZONE, dateStyle: "short", timeStyle: "short" });

export function formatDateTime(value: Date | null | undefined) {
  return value ? dateTimeFormatter.format(value) : "—";
}

export function formatMoney(total: { toString(): string } | string | number, currency: string) {
  const amount = Number(total.toString());
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
