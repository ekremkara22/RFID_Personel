import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flodeka CheckInQR | QR Kodlu Personel Takip ve PDKS Sistemi",
  description:
    "Flodeka CheckInQR ile personel giriş çıkışlarını QR kod, mobil uygulama ve GPS doğrulama ile takip edin. Turnikesiz, hızlı kurulumlu ve bulut tabanlı PDKS çözümü.",
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
