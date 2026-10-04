import type { Metadata } from "next";
import "./globals.css";

const isStaging = process.env.APP_ENV === "staging";

export const metadata: Metadata = {
  metadataBase: new URL(isStaging ? "https://test.flodeska.com" : "https://flodeska.com"),
  title: {
    default: isStaging ? "TEST ORTAMI | Flodeska" : "Flodeska | Dijital İş Süreçleri ve IoT",
    template: isStaging ? "%s | TEST | Flodeska" : "%s | Flodeska",
  },
  description:
    "Flodeska; İK, RFID personel takibi, planlama ve bağlı cihaz süreçlerini tek dijital operasyon platformunda buluşturur.",
  applicationName: "Flodeska",
  keywords: ["iş süreçleri", "RFID personel takip", "PDKS", "IoT", "dijital dönüşüm", "personel takip sistemi"],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Flodeska",
    title: "Flodeska | Dijital İş Süreçleri ve IoT",
    description: "İnsan, süreç ve bağlı cihazları tek dijital operasyon platformunda buluşturun.",
    images: [{ url: "/images/marketing/flodeska-tanitim-yatay-v1.png", width: 1680, height: 945, alt: "Flodeska dijital operasyon platformu" }],
  },
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
