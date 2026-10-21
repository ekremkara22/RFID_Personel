import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Activity, Box, CirclePower, Cpu, House, Radio, Router, Thermometer, Wifi, WifiOff } from "lucide-react";

import { ActionForm } from "@/app/dashboard/action-form";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { requireSessionUser } from "@/lib/session";
import { parseSmartHomeJson } from "@/lib/smart-home";
import { queueSmartHomePowerAction } from "@/modules/smart-home/actions";
import { getSmartHomeDashboard } from "@/modules/smart-home/repository";
import { CreateGatewayForm, RotateGatewayKey } from "./gateway-key-form";
import ui from "../management.module.css";
import styles from "./smart-home.module.css";

function isOnline(lastSeenAt: Date | null, thresholdSeconds = 30) {
  return !!lastSeenAt && Date.now() - lastSeenAt.getTime() <= thresholdSeconds * 1_000;
}

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Istanbul" }).format(value) : "Henüz bağlantı yok";
}

function valueLabel(value: unknown, suffix = "") {
  return typeof value === "number" || typeof value === "string" ? `${value}${suffix}` : "—";
}

export default async function SmartHomePage() {
  await connection();
  const { user } = await requireSessionUser();
  if (user.role !== "SUPERADMIN") redirect("/dashboard");

  const gateways = await getSmartHomeDashboard(user.id);
  const nodes = gateways.flatMap((gateway) => gateway.nodes);
  const onlineGateways = gateways.filter((gateway) => isOnline(gateway.lastSeenAt)).length;
  const onlineNodes = nodes.filter((node) => isOnline(node.lastSeenAt, 45)).length;
  const pendingCommands = gateways.flatMap((gateway) => gateway.commands).filter((command) => command.status === "PENDING" || command.status === "SENT").length;

  return <div className={ui.managementPage}>
    <header className={ui.pageHeader}>
      <div className={ui.headerCopy}>
        <p className={ui.kicker}>Kişisel kontrol alanı</p>
        <h1 className={ui.pageTitle}>Akıllı Ev</h1>
        <p className={ui.pageDescription}>Odanızdaki Raspberry Pi geçidini ve ona bağlı ESP32-C3 düğümlerini izleyin, cihaz komutlarını güvenli kuyruk üzerinden yönetin.</p>
      </div>
      <div className={ui.headerActions}><span className={styles.privateBadge}><House size={15} /> Yalnız hesabınız</span></div>
    </header>

    <section className={styles.summaryGrid} aria-label="Akıllı ev özeti">
      <article className={styles.summaryCard}><Router size={19} /><div><span>Raspberry Pi</span><strong>{onlineGateways} / {gateways.length}</strong><small>çevrimiçi geçit</small></div></article>
      <article className={styles.summaryCard}><Cpu size={19} /><div><span>ESP32 düğümleri</span><strong>{onlineNodes} / {nodes.length}</strong><small>çevrimiçi cihaz</small></div></article>
      <article className={styles.summaryCard}><Activity size={19} /><div><span>Komut kuyruğu</span><strong>{pendingCommands}</strong><small>bekleyen veya iletilen</small></div></article>
    </section>

    <section className={ui.surface}>
      <div className={ui.sectionHeading}><div><h2>Raspberry Pi geçidi ekle</h2><p>Oluşan anahtar yalnız bir kez gösterilir ve Pi üzerindeki ajan ayarına yazılır.</p></div><Radio size={18} /></div>
      <CreateGatewayForm />
    </section>

    {gateways.length === 0 ? <section className={ui.surface}><p className={ui.emptyState}>Henüz geçit yok. Yukarıdan Raspberry Pi geçidi oluşturduktan sonra kurulum paketindeki ajanı başlatın.</p></section> : null}

    {gateways.map((gateway) => {
      const gatewayOnline = isOnline(gateway.lastSeenAt);
      return <section className={ui.surface} key={gateway.id}>
        <div className={ui.sectionHeading}>
          <div><h2>{gateway.name}</h2><p>Son bağlantı: {formatDate(gateway.lastSeenAt)} · Anahtar sonu: ••••{gateway.apiKeyLast4}</p></div>
          <div className={ui.toolbarActions}><span className={gatewayOnline ? styles.onlineBadge : styles.offlineBadge}>{gatewayOnline ? <Wifi size={14} /> : <WifiOff size={14} />}{gatewayOnline ? "Çevrimiçi" : "Çevrimdışı"}</span><RotateGatewayKey gatewayId={gateway.id} /></div>
        </div>
        <div className={styles.gatewayMeta}>
          <span><strong>Ajan</strong>{gateway.agentVersion ?? "Bekleniyor"}</span><span><strong>Sistem</strong>{gateway.systemVersion ?? "Bekleniyor"}</span><span><strong>IP</strong>{gateway.ipAddress ?? "Bekleniyor"}</span>
        </div>

        <div className={styles.nodeGrid}>
          {gateway.nodes.length === 0 ? <p className={ui.emptyState}>Pi henüz bir ESP32-C3 düğümü bildirmedi.</p> : gateway.nodes.map((node) => {
            const state = parseSmartHomeJson(node.stateJson);
            const telemetry = parseSmartHomeJson(node.telemetryJson);
            const power = typeof state.power === "boolean" ? state.power : null;
            const controllable = node.kind === "SWITCH" || node.kind === "LIGHT" || power !== null;
            const online = isOnline(node.lastSeenAt, 45);
            return <article className={styles.nodeCard} key={node.id}>
              <div className={styles.nodeHeader}><span className={styles.nodeIcon}>{node.kind === "CLIMATE" ? <Thermometer size={18} /> : node.kind === "SENSOR" ? <Activity size={18} /> : <CirclePower size={18} />}</span><span className={online ? styles.onlineDot : styles.offlineDot} aria-label={online ? "Çevrimiçi" : "Çevrimdışı"} /></div>
              <div><h3>{node.name}</h3><p>{node.room ?? "Oda belirtilmedi"} · {node.hardwareId}</p></div>
              <dl className={styles.nodeStats}>
                <div><dt>Durum</dt><dd>{power === null ? (online ? "Bağlı" : "Çevrimdışı") : power ? "Açık" : "Kapalı"}</dd></div>
                <div><dt>Sinyal</dt><dd>{valueLabel(node.rssi, " dBm")}</dd></div>
                <div><dt>Sıcaklık</dt><dd>{valueLabel(telemetry.temperature, " °C")}</dd></div>
                <div><dt>Nem</dt><dd>{valueLabel(telemetry.humidity, "%")}</dd></div>
              </dl>
              {controllable ? <ActionForm action={queueSmartHomePowerAction} className={styles.nodeAction}>
                <input type="hidden" name="nodeId" value={node.id} /><input type="hidden" name="power" value={power ? "off" : "on"} />
                <SubmitButton idleLabel={power ? "Kapat" : "Aç"} pendingLabel="Gönderiliyor..." className={power ? ui.secondaryAction : ui.primaryAction} disabled={!online} />
              </ActionForm> : <p className={styles.sensorNote}>Bu düğüm yalnız telemetri bildiriyor.</p>}
            </article>;
          })}
        </div>

        {gateway.commands.length > 0 ? <details className={styles.commandHistory}><summary>Son komutlar</summary><ul>{gateway.commands.map((command) => <li key={command.id}><Box size={14} /><span>{command.node?.name ?? "Geçit"}</span><code>{command.command}</code><span data-status={command.status}>{command.status === "COMPLETED" ? "Tamamlandı" : command.status === "FAILED" ? "Başarısız" : command.status === "CANCELLED" ? "İptal" : command.status === "SENT" ? "İletildi" : "Bekliyor"}</span></li>)}</ul></details> : null}
      </section>;
    })}

    <section className={styles.architectureNote}><Radio size={19} /><div><strong>Önerilen ağ yapısı</strong><p>Raspberry Pi yalnız internete bağlanır ve Flodeska ajanını çalıştırır. Pi’ye USB ile bağlı kök ESP32, ESP32-C3 düğümleriyle modemden bağımsız ESP-WIFI-MESH ağı kurar; komutlar Pi üzerinden bu kök düğüme iletilir.</p></div></section>
  </div>;
}
