"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../page.module.css";

const TABS = [
  { href: "/dashboard/sales/orders", label: "Siparişler" },
  { href: "/dashboard/sales/products", label: "Ürünler" },
  { href: "/dashboard/sales/activations", label: "Lisans Kuyruğu" },
  { href: "/dashboard/sales/license-products", label: "Ürün Eşlemeleri" },
  { href: "/dashboard/sales/integrations", label: "Entegrasyonlar" },
] as const;

export function SalesTabs() {
  const pathname = usePathname();
  return (
    <nav className={styles.tabBar} aria-label="Satış ve pazarlama bölümleri">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={active ? styles.tabLinkActive : styles.tabLink} aria-current={active ? "page" : undefined}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
