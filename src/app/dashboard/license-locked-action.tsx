"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import ui from "./management.module.css";

/**
 * A paid-only action shown as a passive button while the company only has trial access.
 * Hover, keyboard focus or a tap opens the explanation with a link to the module store;
 * the real action is never wired, and the server rejects the call as well.
 */
export function LicenseLockedAction({ children, moduleName, variant = "secondary" }: {
  children: ReactNode;
  moduleName: string;
  variant?: "primary" | "secondary";
}) {
  const tooltipId = useId();
  const wrap = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <span
      ref={wrap}
      className={ui.lockedActionWrap}
      data-open={open || undefined}
      onBlur={(event) => { if (!wrap.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }}
      onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
    >
      <button
        type="button"
        className={`${variant === "primary" ? ui.primaryAction : ui.secondaryAction} ${ui.lockedAction}`}
        aria-disabled="true"
        aria-describedby={tooltipId}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {children}<Lock size={14} aria-hidden="true" />
      </button>
      <span role="tooltip" id={tooltipId} className={ui.lockedTooltip}>
        Bu işlem lisanslı kullanıcılara açıktır. {moduleName} modülü lisansını alarak etkinleştirebilirsiniz.
        <Link href="/dashboard/store" className={ui.lockedTooltipLink}>Modül mağazasına git</Link>
      </span>
    </span>
  );
}
