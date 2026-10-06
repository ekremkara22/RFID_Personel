"use client";

import Image from "next/image";
import styles from "./site.module.css";

export function ModuleSlider() {
  return (
    <section className={styles.slider} aria-roledescription="carousel" aria-label="Flodeska modülleri">
      <div className={styles.slideCopy}>
        <span className={styles.eyebrow}>DİJİTAL SÜREÇ PLATFORMU</span>
        <h1>İş süreçleri, tek ve anlaşılır bir akışta.</h1>
        <p>
          Flodeska; insanı, süreçleri ve bağlı cihazları aynı dijital omurgada
          birleştirerek işletmenizin çalışma biçimini görünür hale getirir.
        </p>
      </div>
      <div className={styles.slideVisual}>
        <Image
          src="/images/marketing/flodeska-tanitim-yatay-v1.png"
          alt="Flodeska RFID cihazı ve personel takip yönetim paneli"
          width={1680}
          height={945}
          priority
          unoptimized
          sizes="(max-width: 1200px) 100vw, 1200px"
        />
        <div className={styles.sliderStatus} aria-label="1 modülden 1. modül">01 / 01</div>
      </div>
    </section>
  );
}
