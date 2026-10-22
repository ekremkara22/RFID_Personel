#!/usr/bin/env python3
"""Raspberry Pi bridge: USB-serial mesh root ESP32 <-> Flodeska smart-home sync API.

Protocol: see PROTOCOL.md. One JSON object per line in both directions.
"""

from __future__ import annotations

import json
import os
import platform
import re
import socket
import ssl
import subprocess
import threading
import time
import urllib.error
import urllib.request
from typing import Any

AGENT_VERSION = "0.3.0"
API_URL = os.environ.get("FLODESKA_SMART_HOME_URL", "").strip().rstrip("/")
API_KEY = os.environ.get("FLODESKA_SMART_HOME_API_KEY", "").strip()
SERIAL_PORT = os.environ.get("FLODESKA_SERIAL_PORT", "/dev/ttyACM0").strip()
SERIAL_BAUD = int(os.environ.get("FLODESKA_SERIAL_BAUD", "115200"))
# "Ad|MAC|IP" entries separated by ";", e.g. "Masaüstü|AA:BB:CC:DD:EE:FF|192.168.1.50"
WOL_TARGETS = os.environ.get("FLODESKA_WOL_TARGETS", "").strip()

NODE_MAX_AGE_SECONDS = 600  # Same limit as SMART_HOME_NODE_MAX_AGE_SECONDS on the server.
MAX_LINE_BYTES = 4096
MAX_PENDING_ACKS = 100

nodes: dict[str, tuple[dict[str, Any], float]] = {}
acknowledgements: list[dict[str, Any]] = []
lock = threading.Lock()


def log(message: str) -> None:
    print(message, flush=True)


def handle_message(message: Any) -> None:
    """Applies one message coming from the mesh root (or the simulator)."""
    if not isinstance(message, dict):
        return
    kind = message.get("type")
    hardware_id = message.get("hardwareId")
    if kind == "log":
        log(f"[kök] {str(message.get('message'))[:300]}")
        return
    if not isinstance(hardware_id, str) or not hardware_id or len(hardware_id) > 64:
        return
    now = time.monotonic()
    with lock:
        if kind == "state":
            nodes[hardware_id] = ({
                "hardwareId": hardware_id,
                "name": message.get("name"),
                "room": message.get("room"),
                "kind": message.get("kind", "OTHER"),
                "capabilities": message.get("capabilities"),
                "state": message.get("state"),
                "telemetry": message.get("telemetry"),
                "firmwareVersion": message.get("firmwareVersion"),
                "rssi": message.get("rssi"),
                "meshLayer": message.get("meshLayer"),
            }, now)
        elif kind == "ack" and isinstance(message.get("id"), int):
            ok = message.get("ok") is True
            acknowledgements.append({
                "id": message["id"],
                "status": "COMPLETED" if ok else "FAILED",
                "error": None if ok else str(message.get("error") or "Cihaz komutu uygulayamadı.")[:500],
            })
            del acknowledgements[:-MAX_PENDING_ACKS]
            if hardware_id in nodes:
                nodes[hardware_id] = (nodes[hardware_id][0], now)
        elif kind == "leave":
            nodes.pop(hardware_id, None)


class SerialLink:
    """Reads lines from the mesh root over USB and reconnects when the cable is unplugged."""

    def __init__(self, port: str, baud: int) -> None:
        import serial  # Imported here so simulator mode does not need pyserial.

        self._serial_module = serial
        self._port = port
        self._baud = baud
        self._connection: Any = None
        self._write_lock = threading.Lock()
        threading.Thread(target=self._read_forever, daemon=True).start()

    def _open(self) -> Any:
        connection = self._serial_module.Serial()
        connection.port = self._port
        connection.baudrate = self._baud
        connection.timeout = 1
        # Avoid resetting the ESP32 through DTR/RTS when the port is opened.
        connection.dtr = False
        connection.rts = False
        connection.open()
        return connection

    def _read_forever(self) -> None:
        reported = False
        while True:
            try:
                self._connection = self._open()
                log(f"Kök ESP32 bağlantısı açıldı: {self._port}")
                reported = False
                buffer = b""
                while True:
                    buffer += self._connection.read(self._connection.in_waiting or 1)
                    while b"\n" in buffer:
                        line, buffer = buffer.split(b"\n", 1)
                        self._handle_line(line)
                    if len(buffer) > MAX_LINE_BYTES:
                        buffer = b""
            except (OSError, self._serial_module.SerialException) as error:
                if not reported:
                    log(f"Kök ESP32 bağlantısı yok ({type(error).__name__}: {self._port}); 5 sn arayla yeniden denenecek.")
                    reported = True
                self._close()
                time.sleep(5)

    def _handle_line(self, line: bytes) -> None:
        line = line.strip()
        if not line.startswith(b"{"):
            return  # ESP-IDF boot logs and other non-protocol output.
        try:
            handle_message(json.loads(line.decode("utf-8")))
        except (UnicodeDecodeError, json.JSONDecodeError):
            pass

    def _close(self) -> None:
        connection, self._connection = self._connection, None
        if connection is not None:
            try:
                connection.close()
            except OSError:
                pass

    def send(self, message: dict[str, Any]) -> bool:
        connection = self._connection
        if connection is None:
            return False
        try:
            with self._write_lock:
                connection.write(json.dumps(message, separators=(",", ":")).encode("utf-8") + b"\n")
            return True
        except (OSError, self._serial_module.SerialException):
            return False


class SimulatedLink:
    """Fake mesh with one light, for testing the Pi and panel before any ESP32 is connected."""

    hardware_id = "sim-isik-1"

    def __init__(self) -> None:
        self._power = False
        self._applied: set[int] = set()
        threading.Thread(target=self._heartbeat, daemon=True).start()
        log("Simülasyon modu: gerçek ESP32 yerine sahte bir ışık düğümü kullanılıyor.")

    def _publish_state(self) -> None:
        handle_message({
            "type": "state", "hardwareId": self.hardware_id, "name": "Simülasyon ışığı", "room": "Test",
            "kind": "LIGHT", "capabilities": {"power": True}, "state": {"power": self._power},
            "telemetry": {"temperature": 22.5}, "firmwareVersion": "sim", "rssi": -50, "meshLayer": 2,
        })

    def _heartbeat(self) -> None:
        while True:
            self._publish_state()
            time.sleep(20)

    def send(self, message: dict[str, Any]) -> bool:
        if message.get("hardwareId") != self.hardware_id or not isinstance(message.get("id"), int):
            return True
        command_id = message["id"]
        payload = message.get("payload") or {}
        ok = message.get("command") == "SET_POWER" and isinstance(payload.get("power"), bool)
        if ok and command_id not in self._applied:
            self._applied.add(command_id)
            self._power = payload["power"]
            self._publish_state()
        handle_message({"type": "ack", "hardwareId": self.hardware_id, "id": command_id, "ok": ok, "error": None if ok else "Desteklenmeyen komut."})
        return True


class WakeOnLan:
    """Computers on the home LAN, shown as Pi-hosted nodes that can be woken with a magic packet."""

    def __init__(self, config: str) -> None:
        self.targets: dict[str, dict[str, Any]] = {}
        for entry in filter(None, (item.strip() for item in config.split(";"))):
            parts = [part.strip() for part in entry.split("|")]
            mac = parts[1].upper().replace("-", ":") if len(parts) > 1 else ""
            if len(parts) != 3 or not parts[0] or not re.fullmatch(r"([0-9A-F]{2}:){5}[0-9A-F]{2}", mac):
                raise SystemExit(f"FLODESKA_WOL_TARGETS girdisi geçersiz: {entry} (beklenen: Ad|AA:BB:CC:DD:EE:FF|192.168.1.50)")
            hardware_id = "wol-" + mac.replace(":", "")
            self.targets[hardware_id] = {"name": parts[0][:100], "mac": mac, "ip": parts[2]}
        if self.targets:
            log(f"Wake-on-LAN hedefleri: {', '.join(target['name'] for target in self.targets.values())}")
            threading.Thread(target=self._watch, daemon=True).start()

    @staticmethod
    def _is_up(ip: str) -> bool:
        # Windows firewall usually drops ping, so a TCP answer (even "refused") on RDP/SMB also counts as on.
        for port in (3389, 445):
            try:
                with socket.create_connection((ip, port), timeout=1):
                    return True
            except ConnectionRefusedError:
                return True
            except OSError:
                pass
        try:
            return subprocess.run(["ping", "-c", "1", "-W", "1", ip], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False).returncode == 0
        except OSError:
            return False

    def _watch(self) -> None:
        while True:
            for hardware_id, target in self.targets.items():
                handle_message({
                    "type": "state", "hardwareId": hardware_id, "name": target["name"], "kind": "OTHER",
                    "capabilities": {"wake": True}, "state": {"power": self._is_up(target["ip"])},
                    "telemetry": {"ip": target["ip"]},
                })
            time.sleep(15)

    def send(self, message: dict[str, Any]) -> bool:
        target = self.targets.get(message.get("hardwareId", ""))
        if target is None or not isinstance(message.get("id"), int):
            return False
        payload = message.get("payload") or {}
        error = None
        if message.get("command") != "SET_POWER" or payload.get("power") is not True:
            error = "Bilgisayar yalnız uzaktan açılabilir; kapatma desteklenmiyor."
        else:
            packet = b"\xff" * 6 + bytes.fromhex(target["mac"].replace(":", "")) * 16
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sender:
                    sender.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                    for _ in range(3):
                        sender.sendto(packet, ("255.255.255.255", 9))
                log(f"Wake-on-LAN paketi gönderildi: {target['name']}")
            except OSError as send_error:
                error = f"Wake-on-LAN paketi gönderilemedi: {type(send_error).__name__}"
        handle_message({"type": "ack", "hardwareId": message["hardwareId"], "id": message["id"], "ok": error is None, "error": error})
        return True


def local_ip() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("1.1.1.1", 80))  # No packet is sent; only selects the outgoing interface.
            return probe.getsockname()[0]
    except OSError:
        return None


def sync(link: SerialLink | SimulatedLink | None, wake_on_lan: WakeOnLan) -> int:
    now = time.monotonic()
    with lock:
        for hardware_id in [key for key, (_, seen) in nodes.items() if now - seen > NODE_MAX_AGE_SECONDS]:
            del nodes[hardware_id]
        node_snapshot = [{**data, "lastSeenSecondsAgo": int(now - seen)} for data, seen in nodes.values()]
        ack_snapshot = list(acknowledgements)
    body = json.dumps({
        "gateway": {
            "agentVersion": AGENT_VERSION,
            "systemVersion": f"{platform.system()} {platform.release()}",
            "ipAddress": local_ip(),
        },
        "nodes": node_snapshot,
        "acknowledgements": ack_snapshot,
    }).encode("utf-8")
    request = urllib.request.Request(
        f"{API_URL}/api/smart-home/sync",
        data=body,
        method="POST",
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json", "User-Agent": f"flodeska-pi-agent/{AGENT_VERSION}"},
    )
    with urllib.request.urlopen(request, timeout=15, context=ssl.create_default_context()) as response:
        result = json.loads(response.read().decode("utf-8"))
    with lock:
        for acknowledged in ack_snapshot:
            if acknowledged in acknowledgements:
                acknowledgements.remove(acknowledged)
    for reason in result.get("rejected", [])[:5]:
        log(f"Sunucu bir kaydı reddetti: {reason}")
    for command in result.get("commands", []):
        hardware_id = command.get("hardwareId")
        if not hardware_id:
            continue
        if hardware_id in wake_on_lan.targets:
            wake_on_lan.send(command)
        elif link is None or not link.send({"type": "command", **command}):
            log("Komut kök ESP32'ye iletilemedi; sunucu kısa süre sonra tekrar gönderecek.")
    return max(2, min(60, int(result.get("nextPollSeconds", 5))))


def main() -> None:
    if not API_URL.startswith("https://") or not API_KEY.startswith("shg_"):
        raise SystemExit("FLODESKA_SMART_HOME_URL (https) ve FLODESKA_SMART_HOME_API_KEY ayarlanmalıdır.")
    log(f"Flodeska akıllı ev ajanı {AGENT_VERSION} başladı: {API_URL}")
    wake_on_lan = WakeOnLan(WOL_TARGETS)
    link: SerialLink | SimulatedLink | None = None
    if SERIAL_PORT == "simulate":
        link = SimulatedLink()
    elif SERIAL_PORT != "none":
        link = SerialLink(SERIAL_PORT, SERIAL_BAUD)
    delay = 2
    connected = False
    while True:
        try:
            delay = sync(link, wake_on_lan)
            if not connected:
                log("Flodeska bağlantısı kuruldu.")
                connected = True
        except urllib.error.HTTPError as error:
            connected = False
            log("Geçit anahtarı geçersiz; paneldeki anahtarı kontrol edin." if error.code == 401 else f"Flodeska isteği reddetti: HTTP {error.code}")
            delay = min(60, max(5, delay * 2))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError, ValueError) as error:
            connected = False
            log(f"Flodeska senkronizasyonu bekliyor: {type(error).__name__}")
            delay = min(60, max(5, delay * 2))
        time.sleep(delay)


if __name__ == "__main__":
    main()
