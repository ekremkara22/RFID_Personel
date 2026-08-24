import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RFID Personel Takip | Kartli Personel Takip ve PDKS Sistemi",
  description:
    "RFID Personel Takip ile personel giriş çıkışlarını RFID kart okuyucu cihazlar ve web yönetim paneliyle takip edin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
