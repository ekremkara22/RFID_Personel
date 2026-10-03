"use client";

import { createContext, useEffect, useRef, useState, useTransition, type ComponentProps } from "react";
import { unstable_rethrow } from "next/navigation";
import type { ActionResult } from "@/lib/action-error";
import ui from "./management.module.css";

export const ActionFormPending = createContext(false);

export function ActionForm({ action, children, ...props }: Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: (data: FormData) => Promise<ActionResult | void>;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result && !result.ok) feedback.current?.focus();
  }, [result]);
  return <ActionFormPending.Provider value={pending}><form {...props} aria-busy={pending} onSubmit={(event) => {
    event.preventDefault();
    if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    submitting.current = true;
    setResult(null);
    startTransition(async () => {
      try {
        const response = await action(data);
        setResult(response ?? { ok: true, message: "Değişiklikler kaydedildi." });
      } catch (error) {
        unstable_rethrow(error);
        setResult({ ok: false, message: "Sunucudan yanıt alınamadı. Bağlantınızı ve kayıt durumunu kontrol edip tekrar deneyin." });
      } finally {
        submitting.current = false;
      }
    });
  }}>
    {result ? <div ref={feedback} tabIndex={-1} className={ui.actionFeedback} role={result.ok ? "status" : "alert"} data-error={!result.ok}>{result.message}</div> : null}
    {children}
  </form></ActionFormPending.Provider>;
}
