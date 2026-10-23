import Link from "next/link";
import { CheckCircle2, Circle, CreditCard, ExternalLink, PenLine, ShoppingCart } from "lucide-react";
import { simulateDemoCardScanAction } from "@/modules/attendance/actions";
import { ActionForm } from "./action-form";
import { SubmitButton } from "./submit-button";
import ui from "./management.module.css";
import styles from "./onboarding.module.css";

export type OnboardingProgress = {
  employeeCount: number;
  cardCount: number;
  calendarAssignmentCount: number;
  hasMovement: boolean;
  deviceCount: number;
};

export type DeviceOffer = { title: string; price: string; currency: string; url: string } | null;

type Step = { key: string; title: string; description: string; done: boolean; href?: string; actionLabel?: string };

function formatPrice(offer: NonNullable<DeviceOffer>) {
  const amount = Number(offer.price);
  if (!Number.isFinite(amount)) return `${offer.price} ${offer.currency}`;
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: offer.currency }).format(amount);
}

/** A company that already reads cards from its own device is in use; the guide no longer shows there. */
export function onboardingComplete(progress: OnboardingProgress) {
  return progress.hasMovement && progress.deviceCount > 0;
}

/** First-run guide for a company owner; the dashboard hides it once every step is done. */
export function OnboardingChecklist({ progress, trialActive, canCreateMovement, demoEmployees, deviceOffer }: {
  progress: OnboardingProgress;
  trialActive: boolean;
  canCreateMovement: boolean;
  demoEmployees: { id: number; name: string }[];
  deviceOffer: DeviceOffer;
}) {
  const steps: Step[] = [
    { key: "employees", title: "Personelinizi ekleyin", description: "Tek tek ekleyin veya Excel listesiyle toplu aktarın.", done: progress.employeeCount > 0, href: "/dashboard/employees/new", actionLabel: "Personel ekle" },
    { key: "cards", title: "RFID kart numaralarını tanımlayın", description: "Her personelin kart numarasını kaydına girin; okuyucu kartı bu numarayla tanır.", done: progress.cardCount > 0, href: "/dashboard/employees", actionLabel: "Personel kayıtları" },
    { key: "calendar", title: "Çalışma takvimi atayın", description: "Mesai ve mola saatleri geç kalma ve puantaj hesaplarının temelidir.", done: progress.calendarAssignmentCount > 0, href: "/dashboard/calendar/assignments", actionLabel: "Takvim ata" },
    { key: "movement", title: "İlk hareketi kaydedin", description: trialActive ? "Okuyucunuz gelmeden demo kart okutmayla veya elle giriş-çıkış ekleyerek raporları görün." : "Elle giriş-çıkış ekleyerek raporları görün.", done: progress.hasMovement },
    { key: "device", title: "RFID okuyucunuzu bağlayın", description: "Personel kartını okuttuğunda giriş, çıkış ve mola panele kendiliğinden düşer.", done: progress.deviceCount > 0 },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const showDemo = trialActive && canCreateMovement && demoEmployees.length > 0;

  return (
    <section className={ui.surface} aria-labelledby="onboarding-title">
      <div className={ui.sectionHeading}>
        <div>
          <h2 id="onboarding-title">Kuruluma başlayın</h2>
          <p>Bu adımlar tamamlandığında PDKS panelinizdeki raporlar dolmaya başlar.</p>
        </div>
        <span className={ui.countBadge} aria-label={`${steps.length} adımdan ${doneCount} adım tamamlandı`}>{doneCount} / {steps.length}</span>
      </div>

      <ol className={styles.stepList}>
        {steps.map((step) => (
          <li key={step.key} className={styles.step} data-done={step.done}>
            <span className={styles.stepIcon} aria-hidden="true">{step.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}</span>
            <div className={styles.stepBody}>
              <div className={styles.stepCopy}>
                <strong>{step.title}</strong>
                <span>{step.done ? "Tamamlandı" : step.description}</span>
              </div>

              {!step.done && step.href ? <Link href={step.href} className={`${ui.secondaryAction} ${ui.compactAction}`}>{step.actionLabel}</Link> : null}

              {!step.done && step.key === "movement" ? (
                <div className={styles.stepPanel}>
                  {showDemo ? (
                    <ActionForm action={simulateDemoCardScanAction} className={styles.demoForm}>
                      <label className={ui.formField}>
                        <span>Demo okuyucu: personel seçin</span>
                        <select name="employeeId" required defaultValue="">
                          <option value="" disabled>Personel seçin</option>
                          {demoEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                        </select>
                      </label>
                      <SubmitButton idleLabel="Kartı okut" pendingLabel="Okutuluyor..." className={ui.secondaryAction} icon={<CreditCard size={16} />} />
                    </ActionForm>
                  ) : null}
                  {showDemo ? <p className={styles.panelHint}>Demo okuma şimdiki saatle, gerçek bir çift yönlü okuyucu gibi giriş/çıkış sırasını kendisi belirler. Kayıt hareket geçmişinde “demo kart okutma” notuyla görünür. Bu seçenek deneme süresi bitince kapanır.</p> : null}
                  {canCreateMovement ? <Link href="/dashboard/movements/new" className={`${ui.secondaryAction} ${ui.compactAction}`}><PenLine size={14} />Elle hareket ekle</Link> : null}
                </div>
              ) : null}

              {!step.done && step.key === "device" ? (
                <div className={styles.stepPanel}>
                  {deviceOffer ? (
                    <a href={deviceOffer.url} target="_blank" rel="noopener noreferrer" className={`${ui.secondaryAction} ${ui.compactAction}`} aria-label={`${deviceOffer.title} satın al (Shopier, yeni sekmede açılır)`}>
                      <ShoppingCart size={14} />Okuyucu satın al · {formatPrice(deviceOffer)}<ExternalLink size={13} aria-hidden="true" />
                    </a>
                  ) : (
                    <Link href="/iletisim" className={`${ui.secondaryAction} ${ui.compactAction}`}><ShoppingCart size={14} />Okuyucu için iletişime geçin</Link>
                  )}
                  <p className={styles.panelHint}>Okuyucunun firmanıza tanımlanmasını biz yaparız; siz cihazın kurulum ekranından Wi-Fi bilginizi girersiniz.</p>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
