"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import ui from "../management.module.css";

export function HealthRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") startTransition(() => router.refresh());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <button
      type="button"
      className={ui.secondaryAction}
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw size={15} aria-hidden="true" />
      {pending ? "Yenileniyor…" : "Durumu yenile"}
    </button>
  );
}
