import type { Metadata } from "next";
import "./globals.css";

const isStaging = process.env.APP_ENV === "staging";

export const metadata: Metadata = {
  title: isStaging
    ? "TEST ORTAMI | RFID Personel Takip"
    : "RFID Personel Takip | Kartli Personel Takip ve PDKS Sistemi",
  description:
    "RFID Personel Takip ile personel giriş çıkışlarını RFID kart okuyucu cihazlar ve web yönetim paneliyle takip edin.",
  ...(isStaging
    ? {
        robots: {
          index: false,
          follow: false,
          nocache: true,
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={isStaging ? "staging-environment" : undefined}>
        {isStaging ? (
          <div className="staging-banner" role="status">
            TEST ORTAMI — Buradaki işlemler canlı sistemi etkilemez
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
