import assert from "node:assert/strict";
import test from "node:test";
import { buildRegistrationNotification } from "./registration-notification";

test("yeni kayıt bildirimi temel kullanıcı bilgilerini Türkiye saatiyle içerir", () => {
  const message = buildRegistrationNotification({
    id: 42,
    firstName: "Ayşe",
    lastName: "Yılmaz",
    email: "ayse@example.com",
    phone: "+90 555 000 00 00",
    createdAt: new Date("2026-10-19T18:30:00.000Z"),
    trialEndsAt: new Date("2026-11-02T18:30:00.000Z"),
  });

  assert.equal(message.subject, "Yeni Flodeska kaydı: Ayşe Yılmaz");
  assert.match(message.text, /Kullanıcı numarası: 42/);
  assert.match(message.text, /E-posta: ayse@example\.com/);
  assert.match(message.text, /19 Ekim 2026 21:30:00/);
  assert.match(message.text, /2 Kasım 2026 21:30:00/);
});

test("HTML bildirimindeki kullanıcı metinlerini güvenli biçimde kaçırır", () => {
  const message = buildRegistrationNotification({
    id: 7,
    firstName: "<Ayşe>",
    lastName: "Yılmaz & Ortakları",
    email: "ayse@example.com",
    phone: null,
    createdAt: new Date("2026-10-19T18:30:00.000Z"),
    trialEndsAt: null,
  });

  assert.doesNotMatch(message.html, /<Ayşe>/);
  assert.match(message.html, /&lt;Ayşe&gt; Yılmaz &amp; Ortakları/);
  assert.match(message.text, /Telefon: Belirtilmedi/);
});
