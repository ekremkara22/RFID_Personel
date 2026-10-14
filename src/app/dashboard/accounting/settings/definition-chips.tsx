import Link from "next/link";
import { Plus, X } from "lucide-react";
import { ActionForm } from "@/app/dashboard/action-form";
import { SubmitButton } from "@/app/dashboard/submit-button";
import type { ActionResult } from "@/lib/action-error";
import styles from "../accounting.module.css";

type FormAction = (data: FormData) => Promise<ActionResult | void>;

/** Compact chip list with inline add/remove, matching the definition cards of the Net-Brüt tool. */
export function DefinitionChips({ title, items, placeholder, createAction, deleteAction, canManage, manageHref }: {
  title: string;
  items: { id: number; name: string; inUse: boolean }[];
  placeholder: string;
  createAction: FormAction;
  deleteAction: FormAction;
  canManage: boolean;
  manageHref: string;
}) {
  return (
    <section className={styles.paramCard}>
      <h3>{title}</h3>
      <ul className={styles.chips}>
        {items.length === 0 ? <li className={styles.chipEmpty}>Tanım yok</li> : items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            {canManage && !item.inUse ? (
              <ActionForm action={deleteAction} className={styles.chipForm}>
                <input type="hidden" name="id" value={item.id} />
                <SubmitButton idleLabel="" pendingLabel="…" className={styles.chipRemove} icon={<X size={13} />} ariaLabel={`${item.name} tanımını sil`} />
              </ActionForm>
            ) : null}
          </li>
        ))}
      </ul>
      {canManage ? (
        <ActionForm action={createAction} className={styles.chipAdd}>
          <input name="name" required minLength={2} maxLength={100} placeholder={placeholder} aria-label={`${title} için yeni ad`} />
          <SubmitButton idleLabel="Ekle" pendingLabel="Ekleniyor..." className={styles.chipAddButton} icon={<Plus size={14} />} />
        </ActionForm>
      ) : null}
      <Link href={manageHref} className={styles.chipLink}>Tüm tanımları yönet</Link>
    </section>
  );
}
