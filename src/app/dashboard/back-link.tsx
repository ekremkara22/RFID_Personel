import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "./page.module.css";

export function BackLink({ href, label = "Geri" }: { href: string; label?: string }) {
  return (
    <Link href={href} className={styles.backLink} aria-label={label}>
      <ArrowLeft size={18} />
    </Link>
  );
}
