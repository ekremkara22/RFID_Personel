"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Copy, KeyRound, Plus, RotateCw } from "lucide-react";

import { createSmartHomeGatewayAction, rotateSmartHomeGatewayKeyAction, type GatewayKeyResult } from "@/modules/smart-home/actions";
import ui from "../management.module.css";
import styles from "./smart-home.module.css";

function ApiKeyResult({ result }: { result: GatewayKeyResult | null }) {
  const [copied, setCopied] = useState(false);
  if (!result) return null;
  if (!result.ok || !result.apiKey) return <div className={ui.actionFeedback} data-error="true" role="alert">{result.message}</div>;
  return (
    <div className={styles.keyResult} role="status">
      <div><strong>Bu anahtarı şimdi kopyalayın</strong><p>{result.message}</p></div>
      <code>{result.apiKey}</code>
      <button type="button" className={ui.secondaryAction} onClick={async () => { await navigator.clipboard.writeText(result.apiKey ?? ""); setCopied(true); }}>
        {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Kopyalandı" : "Kopyala"}
      </button>
    </div>
  );
}

export function CreateGatewayForm() {
  const [result, setResult] = useState<GatewayKeyResult | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} className={styles.gatewayCreate} onSubmit={(event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      startTransition(async () => {
        const response = await createSmartHomeGatewayAction(formData);
        setResult(response);
        if (response.ok) formRef.current?.reset();
      });
    }}>
      <label className={ui.formField}><span>Raspberry Pi adı</span><input name="name" minLength={2} maxLength={100} placeholder="Örn. Odamdaki Raspberry Pi" required /></label>
      <button type="submit" className={ui.primaryAction} disabled={pending}><Plus size={16} />{pending ? "Oluşturuluyor..." : "Geçit oluştur"}</button>
      <ApiKeyResult result={result} />
    </form>
  );
}

export function RotateGatewayKey({ gatewayId }: { gatewayId: number }) {
  const [result, setResult] = useState<GatewayKeyResult | null>(null);
  const [pending, startTransition] = useTransition();
  return <div className={styles.rotateKey}>
    <button type="button" className={ui.secondaryAction} disabled={pending} onClick={() => startTransition(async () => {
      const data = new FormData(); data.set("gatewayId", String(gatewayId)); setResult(await rotateSmartHomeGatewayKeyAction(data));
    })}><RotateCw size={15} />{pending ? "Yenileniyor..." : "Anahtarı yenile"}</button>
    {result?.ok ? <div className={styles.rotatedKey}><KeyRound size={15} /><code>{result.apiKey}</code></div> : result ? <p className={styles.inlineError}>{result.message}</p> : null}
  </div>;
}
