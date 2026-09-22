"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export function DeviceStatusRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        startTransition(() => router.refresh());
      }
    }, 30_000);
    return () => clearInterval(timer);
  }, [router]);

  return <button type="button" className={styles.smallButton} disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Yenileniyor…" : "Durumu yenile"}</button>;
}
