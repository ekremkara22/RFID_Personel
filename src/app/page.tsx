"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Factory,
  FileSpreadsheet,
  HardHat,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Rocket,
  ShieldCheck,
  Store,
  Warehouse,
  X,
  IdCard,
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

const audienceCards = [
  {
    title: "Fabrikalar",
    description: "Vardiyalı ekiplerin giriş-çıkışlarını RFID kart takip sistemi ile anlık izleyin.",
    icon: Factory,
  },
  {
    title: "Ofisler",
    description: "Hibrit ve merkez ofis ekipleri için turnikesiz PDKS akışını sadeleştirin.",
    icon: Building2,
  },
  {
    title: "Şantiyeler",
    description: "Saha personelini RFID okuyucu ve merkezi panel ile doğru noktada takip edin.",
    icon: HardHat,
  },
  {
    title: "Mağazalar",
    description: "Şube ekiplerinin günlük yoklama ve mesai kayıtlarını tek panelden yönetin.",
    icon: Store,
  },
  {
    title: "Depolar",
    description: "Giriş yoğunluğu yüksek operasyonlarda hızlı RFID kart okuma akışı kullanın.",
    icon: Warehouse,
  },
  {
    title: "KOBİ'ler",
    description: "Kart okuyucu tabanlı PDKS deneyimine kısa sürede geçin.",
    icon: BriefcaseBusiness,
  },
];

const featureCards = [
  {
    title: "RFID Kart Okuma",
    description: "Personel kartları hızlı ve temassız okunur.",
    icon: IdCard,
  },
  {
    title: "Cihaz Noktası",
    description: "Her okuyucu ilgili iş yeri veya giriş noktasıyla eşleştirilir.",
    icon: MapPin,
  },
  {
    title: "Anlık Bildirimler",
    description: "Giriş/çıkışta yöneticiye anında bildirim iletir.",
    icon: Bell,
  },
  {
    title: "Excel & PDF Rapor",
    description: "Ay sonu raporlarını tek tıkla alın.",
    icon: FileSpreadsheet,
  },
  {
    title: "Sınırsız Geçmiş",
    description: "Tüm kayıtlar bulutta güvenle saklanır.",
    icon: Cloud,
  },
  {
    title: "Kolay Kurulum",
    description: "5 dakikada kur, eğitim gerekmez.",
    icon: Rocket,
  },
];

const workflowSteps = [
  "İş yerine RFID okuyucu cihaz yerleştirilir.",
  "Personel RFID kartını okuyucuya yaklaştırır.",
  "Giriş-çıkış bilgileri yönetici panelinde anlık görüntülenir.",
];

const trustItems = [
  "Turnike maliyetine alternatif",
  "Hızlı kurulum",
  "RFID kart takibi",
  "Web yönetim paneli",
  "Cihaz bazlı doğrulama",
  "Bulut tabanlı yapı",
];

const faqItems = [
  {
    question: "Cihazın internet bağlantısı kesilirse ne olur?",
    answer:
      "RFID okuyucu cihaz bağlantı durumunu bildirir. İnternet erişimi geri geldiğinde kayıt akışı tekrar devam eder; kritik senaryolar için işletmenize uygun çalışma kuralı demo sırasında belirlenir.",
  },
  {
    question: "RFID kart sistemi için özel donanım gerekiyor mu?",
    answer:
      "Evet. RFID okuyucu cihaz ve personel kartları gerekir. İhtiyaç varsa cihaz ve kart kurulum modeli demo sırasında birlikte netleştirilir.",
  },
  {
    question: "Verilerim güvende mi, KVKK uyumlu musunuz?",
    answer:
      "Kayıtlar bulut altyapısında güvenle saklanır. KVKK süreçleri için aydınlatma metni, erişim yetkileri ve veri saklama yaklaşımı işletmenizin politikasına göre yapılandırılır.",
  },
  {
    question: "Birden fazla şube için kullanabilir miyim?",
    answer:
      "Evet. Birden fazla şube, depo veya saha noktası tek web yönetim paneli üzerinden izlenebilir; şube bazlı raporlama yapılabilir.",
  },
  {
    question: "Ücretsiz deneme süresi var mı?",
    answer:
      "Demo talebi sonrasında ekibinizin kullanım senaryosuna göre deneme veya pilot kurulum seçenekleri birlikte planlanır.",
  },
  {
    question: "Mevcut İK veya bordro sistemimizle entegre olur mu?",
    answer:
      "Excel ve PDF raporlar hemen kullanılabilir. İhtiyaca göre İK, bordro veya ERP sistemleri için entegrasyon kapsamı ayrıca değerlendirilir.",
  },
];

function LinkedInIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

export default function Home() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isDemoSubmitted, setIsDemoSubmitted] = useState(false);

  const openDemoModal = () => {
    setIsDemoSubmitted(false);
    setIsDemoModalOpen(true);
  };

  const handleDemoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDemoSubmitted(true);
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as const },
    },
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.16 },
    },
  };

  return (
    <main className={styles.main}>
      <nav className={styles.navbar}>
        <div className={`container ${styles.navContainer}`}>
          <Link href="#" className={styles.logo} aria-label="RFID Personel Takip ana sayfa">
            RFID <span className="text-gradient">Personel Takip</span>
          </Link>
          <div className={styles.navLinks}>
            <Link href="#hedef-kitle" className={styles.navLink}>
              Kimler İçin?
            </Link>
            <Link href="#ozellikler" className={styles.navLink}>
              Özellikler
            </Link>
            <Link href="#sss" className={styles.navLink}>
              SSS
            </Link>
            <Link href="/login" className={styles.panelButton}>
              Panel Girişi
            </Link>
          </div>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroBgGlow} />
        <div className="container">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.p variants={fadeUp} className={styles.heroEyebrow}>
              RFID kartlı PDKS ve web yönetim paneli
            </motion.p>
            <motion.h1 variants={fadeUp} className={styles.heroTitle}>
              Personel giriş-çıkışlarını{" "}
              <span className="text-gradient">RFID kart ile dijital yönetin</span>
            </motion.h1>
            <motion.p variants={fadeUp} className={styles.heroSubtitle}>
              RFID Personel Takip; kart okuyucu cihazlar, personel kartları ve web
              yönetim panelini tek bulut tabanlı sistemde birleştirir.
            </motion.p>
            <motion.div variants={fadeUp} className={styles.heroBtns}>
              <button className="btn-primary" onClick={openDemoModal}>
                Demo Talep Et
              </button>
              <Link href="#nasil-calisir" className="btn-outline">
                Nasıl Çalışır?
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="hedef-kitle" className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Kimler için <span className="text-gradient">uygun?</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Personel giriş çıkış takip sistemi ihtiyacı olan her işletme için sade ve hızlı çözüm.
            </p>
          </div>
          <motion.div
            className={styles.cardGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
          >
            {audienceCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.article key={card.title} variants={fadeUp} className={styles.infoCard}>
                  <div className={styles.featureIcon}>
                    <Icon size={24} />
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section id="ozellikler" className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Öne çıkan <span className="text-gradient">özellikler</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              RFID kartlı personel takip sistemi için ihtiyaç duyulan temel kontroller tek yerde.
            </p>
          </div>
          <motion.div
            className={styles.featuresGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
          >
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.article key={feature.title} variants={fadeUp} className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <Icon size={24} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section id="nasil-calisir" className={`${styles.section} ${styles.workflowSection}`}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Ürün nasıl <span className="text-gradient">çalışır?</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              RFID Personel Takip ile kurulum ve günlük kullanım üç adımda tamamlanır.
            </p>
          </div>
          <div className={styles.workflowGrid}>
            {workflowSteps.map((step, index) => (
              <article key={step} className={styles.workflowCard}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.trustSection}>
        <div className="container">
          <div className={styles.trustPanel}>
            <div>
              <p className={styles.sectionEyebrow}>Dijital dönüşüm</p>
              <h2>Flodeka ile işletmenizi dijitalleştirin</h2>
              <p>
                RFID kartlı PDKS yaklaşımıyla kayıtları standartlaştırın, cihazlar ve web yönetim paneliyle
                personel süreçlerini daha görünür hale getirin.
              </p>
            </div>
            <div className={styles.trustGrid}>
              {trustItems.map((item) => (
                <div key={item} className={styles.trustItem}>
                  <ShieldCheck size={20} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.referencesSection}>
        <div className="container">
          <div className={styles.referenceBox}>
            <h2>Referanslarımız yakında burada yer alacak.</h2>
            <p>RFID Personel Takip kullanan işletmelerden örnekleri kısa süre içinde paylaşacağız.</p>
          </div>
        </div>
      </section>

      <section id="sss" className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Sıkça Sorulan Sorular</h2>
            <p className={styles.sectionSubtitle}>
              Demo öncesinde en çok merak edilen başlıkları kısa cevaplarla topladık.
            </p>
          </div>
          <div className={styles.faqList}>
            {faqItems.map((item) => (
              <details key={item.question} className={styles.faqItem}>
                <summary>
                  <span>{item.question}</span>
                  <ChevronDown size={20} />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer id="iletisim" className={styles.footer}>
        <div className="container">
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <h2>RFID Personel Takip</h2>
              <p>
                RFID kartlı personel takip sistemi, cihaz entegrasyonu ve web yönetim paneliyle
                işletmenizin giriş-çıkış süreçlerini dijitalleştirir.
              </p>
            </div>
            <div className={styles.footerContact}>
              <a href="mailto:info@rfidpersoneltakip.com">
                <Mail size={18} /> info@rfidpersoneltakip.com
              </a>
              <a href="tel:+905550000000">
                <Phone size={18} /> +90 555 000 00 00
              </a>
              <a href="https://wa.me/905550000000" target="_blank" rel="noreferrer">
                <MessageCircle size={18} /> WhatsApp
              </a>
            </div>
            <div className={styles.socialLinks} aria-label="Sosyal medya linkleri">
              <a href="https://www.linkedin.com/company/flodeka" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <LinkedInIcon />
              </a>
              <a href="https://www.instagram.com/flodeka" target="_blank" rel="noreferrer" aria-label="Instagram">
                <InstagramIcon />
              </a>
            </div>
          </div>
          <div className={styles.footerLinks}>
            <Link href="#">KVKK Aydınlatma Metni</Link>
            <Link href="#">Gizlilik Politikası</Link>
            <Link href="#">Kullanım Şartları</Link>
            <Link href="#iletisim">İletişim</Link>
          </div>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} RFID Personel Takip PDKS. Tüm Hakları Saklıdır.
          </p>
        </div>
      </footer>

      {isDemoModalOpen && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => setIsDemoModalOpen(false)}
        >
          <motion.div
            className={`glass-panel ${styles.demoModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-modal-title"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              type="button"
              aria-label="Modalı kapat"
              onClick={() => setIsDemoModalOpen(false)}
            >
              <X size={20} />
            </button>
            <div className={styles.modalHeader}>
              <p className={styles.modalEyebrow}>RFID Personel Takip Demo</p>
              <h2 id="demo-modal-title">Demo Talep Et</h2>
              <p>
                Bilgilerinizi bırakın, ekibimiz işletmeniz için en uygun RFID personel
                takip kurulumunu anlatsın.
              </p>
            </div>
            {isDemoSubmitted ? (
              <div className={styles.successMessage} role="status">
                <CheckCircle2 size={28} />
                <h3>Demo talebiniz alındı</h3>
                <p>En kısa sürede sizinle iletişime geçeceğiz.</p>
              </div>
            ) : (
              <form className={styles.demoForm} onSubmit={handleDemoSubmit}>
                <label>
                  Ad Soyad
                  <input name="fullName" type="text" autoComplete="name" required />
                </label>
                <label>
                  Firma Adı
                  <input name="company" type="text" autoComplete="organization" required />
                </label>
                <label>
                  Telefon
                  <input name="phone" type="tel" autoComplete="tel" required />
                </label>
                <label>
                  E-posta
                  <input name="email" type="email" autoComplete="email" required />
                </label>
                <button className="btn-primary" type="submit">
                  Gönder
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </main>
  );
}
