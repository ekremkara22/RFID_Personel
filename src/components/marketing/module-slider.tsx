"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import styles from "./site.module.css";

export function ModuleSlider() {
  return (
    <section className={styles.slider} aria-roledescription="carousel" aria-label="Flodeska modülleri">
      <div className={styles.slideCopy}>
        <span className={styles.eyebrow}>İK MODÜLÜ · AKTİF</span>
        <h1>İş süreçleri, tek ve anlaşılır bir akışta.</h1>
        <p>
          Flodeska; personel takibinden planlamaya, bağlı cihazlardan raporlamaya kadar
          işletmenizin süreçlerini aynı dijital omurgada birleştirir.
        </p>
        <div className={styles.slideHighlights}>
          <span><CheckCircle2 size={18} /> RFID ile giriş, çıkış ve mola takibi</span>
          <span><CheckCircle2 size={18} /> Canlı operasyon görünümü ve raporlama</span>
        </div>
        <div className={styles.heroActions}>
          <Link href="/moduller/ik-rfid-personel-takip" className={styles.primaryButton}>
            İK &amp; RFID modülünü incele <ArrowRight size={18} />
          </Link>
          <Link href="/iletisim" className={styles.secondaryButton}>Görüşme planla</Link>
        </div>
      </div>
      <div className={styles.slideVisual}>
        <Image
          src="/images/marketing/flodeska-tanitim-yatay-v1.png"
          alt="Flodeska RFID cihazı ve personel takip yönetim paneli"
          width={1680}
          height={945}
          priority
          unoptimized
          sizes="(max-width: 900px) 100vw, 56vw"
        />
        <div className={styles.sliderStatus} aria-label="1 modülden 1. modül">01 / 01</div>
      </div>
    </section>
  );
}
