"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../accounting.module.css";

const items = [
  { href: "/dashboard/accounting/salary-calculation/net-to-gross", label: "Netten Brüte" },
  { href: "/dashboard/accounting/salary-calculation/gross-to-net", label: "Brütten Nete" },
] as const;

export function SalaryNavigation() {
  const pathname = usePathname();
  return (
    <nav className={styles.tabs} aria-label="Maaş hesaplama sayfaları">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={`${styles.tab} ${pathname === item.href ? styles.tabActive : ""}`} aria-current={pathname === item.href ? "page" : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
