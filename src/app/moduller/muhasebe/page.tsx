import type { Metadata } from "next";
import Link from "next/link";
import { BudgetReportPreview } from "@/components/marketing/budget-report-preview";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { ModuleActions } from "@/components/marketing/module-actions";
import { ModuleBuyBar, ModuleSideCard } from "@/components/marketing/module-card";
import { getMarketingModule } from "@/lib/marketing/modules";
import { MODULES } from "@/modules/registry";
import styles from "../../marketing.module.css";

export const metadata: Metadata = {
  title: "Muhasebe Modülü: Brütten Nete Maaş Hesaplama ve Bütçe Raporu",
  description: "Brütten nete ve netten brüte maaş hesaplama, 2026 bordro parametreleri, işveren maliyeti ve departman bazlı yıllık personel bütçe raporu. 14 gün ücretsiz deneyin.",
  alternates: { canonical: "/moduller/muhasebe" },
};

export const revalidate = 300;

const FAQ = [
  { q: "Maaşları her ay elle mi giriyorum?", a: "Hayır. Personelin aylık brüt veya net maaşını bir kez girersiniz; 12 aylık hesap kümülatif vergi matrahıyla otomatik yapılır. Planlanan bir zammın yıllık maliyete etkisini bütçe raporundaki zam senaryosuyla görebilirsiniz." },
  { q: "Yeni yılın asgari ücreti ve vergi dilimleri değişince ne olur?", a: "2026 değerleri hazır gelir. Mevzuat değiştiğinde vergi dilimlerini, SGK taban ve tavanını ve asgari ücret istisnalarını Parametreler ekranından kendiniz güncelleyebilirsiniz." },
  { q: "İK modülünü almadan kullanabilir miyim?", a: "Evet. Muhasebe modülünün departman, pozisyon, yaka tipi ve personel listesi kendine aittir. Listeyi elle girebilir veya CSV dosyasıyla içe aktarabilirsiniz." },
  { q: "Deneme süresinde neler açık?", a: "Hesaplama, bütçe raporu ve tüm tanımlar açıktır. CSV ile içe/dışa aktarma ve PDF çıktısı ücretli lisansla açılır." },
];

export default async function AccountingModulePage() {
  const accounting = await getMarketingModule(MODULES.ACCOUNTING);
  const faqJsonLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  };
  const productJsonLd = {
    "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Flodeska Muhasebe", applicationCategory: "BusinessApplication", operatingSystem: "Web",
    description: metadata.description, url: "https://flodeska.com/moduller/muhasebe", publisher: { "@type": "Organization", name: "Flodeska" },
  };

  return <MarketingShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([productJsonLd, faqJsonLd]) }} />
    <div>
      <section className={styles.pageHero}><div className="container">
        <div className={styles.breadcrumbs}><Link href="/">Ana Sayfa</Link> / <Link href="/moduller">Modüller</Link> / Muhasebe</div>
        <h1>Maaşı, işveren maliyetini ve yıllık bütçeyi aynı listeden hesaplayın.</h1>
        <p>Brütten nete ya da netten brüte, 12 ayın tamamını SGK, gelir vergisi dilimleri, damga vergisi ve asgari ücret istisnasıyla hesaplar. Sonuçlar departman, pozisyon ve yaka bazında bütçe raporuna dönüşür.</p>
        <div className={styles.pageHeroActions}><ModuleActions module={accounting} />{accounting.priceLabel ? <small>{accounting.priceLabel}</small> : null}</div>
      </div></section>

      <section className={styles.section}><div className={`container ${styles.contentGrid}`}>
        <article className={styles.prose}>
          <h2>Kimin işine yarar?</h2>
          <p>Bordroyu dışarıdaki bir müşavire yaptıran ama maaş tekliflerini, zam etkisini ve yıllık personel maliyetini kendi tarafında bilmek isteyen işletmeler için. İK uzmanı, finans sorumlusu veya firma sahibi; Excel’de formül takip etmeden aynı sonuca ulaşır.</p>

          <h2>Brütten nete ve netten brüte maaş hesaplama</h2>
          <p>Personelin maaşını brüt ya da net olarak girersiniz. Sistem ayı ayına hesaplar ve her ay için şu kalemleri gösterir:</p>
          <ul>
            <li>SGK matrahı (taban ve tavan sınırlarıyla), SGK işçi payı ve işsizlik sigortası</li>
            <li>Gelir vergisi matrahı, <strong>kümülatif matrah</strong> ve dilim geçişleri</li>
            <li>Asgari ücret gelir vergisi ve damga vergisi istisnaları</li>
            <li>Net ödenen tutar ve işveren SGK ile işsizlik payı dahil toplam maliyet</li>
          </ul>
          <p>Kümülatif matrah aydan aya taşındığı için yılın ikinci yarısında üst dilime geçen bir çalışanın net maaşının neden düştüğü tabloda açıkça görünür. Netten brüte hesap da aynı motoru tersten çalıştırır; bulunan brüt tekrar nete çevrildiğinde aynı neti verir.</p>

          <h2>Çalışan tipine göre prim oranları</h2>
          <div className={styles.tableWrap}><table>
            <thead><tr><th>Çalışan tipi</th><th>İşveren SGK</th><th>İşveren işsizlik</th></tr></thead>
            <tbody>
              <tr><td>5510 teşvikli</td><td>%16,75</td><td>%2</td></tr>
              <tr><td>Teşviksiz</td><td>%20,75</td><td>%2</td></tr>
              <tr><td>Emekli (SGDP)</td><td>%24,5</td><td>—</td></tr>
            </tbody>
          </table></div>
          <p>Oranlar 2026 parametreleridir ve Parametreler ekranından değiştirilebilir.</p>

          <h2>Bütçe raporu</h2>
          <p>Hesaplanan listeler tek tıkla yıllık bütçe raporuna dönüşür. Aşağıdaki görsel 24 kişilik örnek bir firmanın verisiyle hazırlanmıştır.</p>
          <div className={styles.productVisual}><BudgetReportPreview /></div>
          <p className={styles.figureNote}>Örnek veri: 24 personel, 19 milyon ₺ yıllık bütçe limiti. Aylık maliyet sabitken kümülatif vergi matrahı yükseldikçe çalışana net geçen pay azalır.</p>
          <ul>
            <li><strong>Özet:</strong> personel sayısı, yıllık brüt, net, işveren maliyeti, işveren yükü ve kişi başı aylık maliyet</li>
            <li><strong>Maliyet anatomisi:</strong> her 100 ₺ işveren maliyetinin ne kadarının çalışana net geçtiği, ne kadarının prim ve vergiye gittiği</li>
            <li><strong>Departman, pozisyon, yaka ve çalışan tipi</strong> kırılımları; pay oranlarıyla birlikte</li>
            <li><strong>Aylık özet:</strong> brüt, net, maliyet ve kümülatif maliyet</li>
            <li><strong>Senaryolar:</strong> bütçe limiti girip kalan tutarı veya aşımı görme, yüzde zam senaryosu deneme</li>
            <li>En yüksek maliyetli personel listesi ve kısa değerlendirme notları</li>
          </ul>

          <h2>Tanımlar ve veri aktarımı</h2>
          <p>Departman, pozisyon ve yaka tipi (beyaz yaka, mavi yaka gibi) tanımlarını kendiniz oluşturursunuz. Personel kartında maaş tipi, aylık tutar, çalışan tipi ve işe giriş tarihi tutulur. Mevcut listenizi CSV ile içe aktarabilir, sonuçları CSV veya PDF olarak dışa alabilirsiniz.</p>
          <div className={styles.callout}><p>14 günlük denemede hesaplama ve bütçe raporu açıktır; CSV içe/dışa aktarma ve PDF çıktısı ücretli lisansla açılır.</p></div>

          <h2>Sık sorulan sorular</h2>
          <div className={styles.faq}>{FAQ.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div>

          <h2>Devamını okuyun</h2>
          <p><Link href="/blog/brutten-nete-maas-hesaplama-ve-isveren-maliyeti">Brütten nete maaş hesaplama ve işveren maliyeti: 2026 rehberi</Link></p>
        </article>
        <ModuleSideCard module={accounting} note="Maaş hesaplama, bordro parametreleri ve yıllık personel bütçe raporu." />
      </div></section>
    </div>
    <ModuleBuyBar module={accounting} />
  </MarketingShell>;
}
