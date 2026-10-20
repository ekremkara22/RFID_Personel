#!/usr/bin/env python3
"""Raspberry Pi bridge: local MQTT <-> Flodeska smart-home sync API."""

from __future__ import annotations

import json
import os
import platform
import socket
import ssl
import threading
import time
import urllib.error
import urllib.request
from typing import Any

import paho.mqtt.client as mqtt

AGENT_VERSION = "0.1.0"
API_URL = os.environ.get("FLODESKA_SMART_HOME_URL", "").rstrip("/")
API_KEY = os.environ.get("FLODESKA_SMART_HOME_API_KEY", "")
MQTT_HOST = os.environ.get("FLODESKA_MQTT_HOST", "127.0.0.1")
MQTT_PORT = int(os.environ.get("FLODESKA_MQTT_PORT", "1883"))

nodes: dict[str, dict[str, Any]] = {}
acknowledgements: list[dict[str, Any]] = []
lock = threading.Lock()


def on_connect(client: mqtt.Client, _userdata: Any, _flags: Any, reason_code: Any, _properties: Any = None) -> None:
    if int(reason_code) != 0:
        print(f"MQTT bağlantısı başarısız: {reason_code}", flush=True)
        return
    client.subscribe("flodeska/nodes/+/state", qos=1)
    client.subscribe("flodeska/nodes/+/ack", qos=1)
    print("Yerel MQTT bağlantısı kuruldu.", flush=True)


def on_message(_client: mqtt.Client, _userdata: Any, message: mqtt.MQTTMessage) -> None:
    parts = message.topic.split("/")
    if len(parts) != 4:
        return
    hardware_id, event = parts[2], parts[3]
    try:
        payload = json.loads(message.payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return
    if not isinstance(payload, dict):
        return
    with lock:
        if event == "state":
            nodes[hardware_id] = {
                "hardwareId": hardware_id,
                "name": str(payload.get("name") or hardware_id)[:100],
                "room": payload.get("room"),
                "kind": payload.get("kind", "OTHER"),
                "capabilities": payload.get("capabilities", {}),
                "state": payload.get("state", {}),
                "telemetry": payload.get("telemetry", {}),
                "firmwareVersion": payload.get("firmwareVersion"),
                "rssi": payload.get("rssi"),
                "meshLayer": payload.get("meshLayer"),
            }
        elif event == "ack" and isinstance(payload.get("id"), int):
            acknowledgements.append({
                "id": payload["id"],
                "status": "COMPLETED" if payload.get("ok") is True else "FAILED",
                "error": None if payload.get("ok") is True else str(payload.get("error") or "Cihaz komutu uygulayamadı.")[:500],
            })


def sync(client: mqtt.Client) -> int:
    with lock:
        node_snapshot = list(nodes.values())
        ack_snapshot = list(acknowledgements)
    body = json.dumps({
        "gateway": {
            "agentVersion": AGENT_VERSION,
            "systemVersion": f"{platform.system()} {platform.release()}",
            "ipAddress": socket.gethostbyname(socket.gethostname()),
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
    for command in result.get("commands", []):
        hardware_id = command.get("hardwareId")
        if hardware_id:
            client.publish(f"flodeska/nodes/{hardware_id}/command", json.dumps(command), qos=1)
    return max(2, min(60, int(result.get("nextPollSeconds", 5))))


def main() -> None:
    if not API_URL.startswith("https://") or not API_KEY.startswith("shg_"):
        raise SystemExit("FLODESKA_SMART_HOME_URL (https) ve FLODESKA_SMART_HOME_API_KEY ayarlanmalıdır.")
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"flodeska-pi-{socket.gethostname()}")
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    client.loop_start()
    delay = 2
    try:
        while True:
            try:
                delay = sync(client)
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as error:
                print(f"Flodeska senkronizasyonu bekliyor: {type(error).__name__}", flush=True)
                delay = min(60, max(5, delay * 2))
            time.sleep(delay)
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
