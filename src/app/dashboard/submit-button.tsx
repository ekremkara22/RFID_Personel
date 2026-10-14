"use client";

import { useContext, type ReactNode } from "react";
import { ActionFormPending } from "./action-form";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  icon?: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
};

export function SubmitButton({
  idleLabel,
  pendingLabel,
  className,
  icon,
  ariaLabel,
  disabled = false,
}: SubmitButtonProps) {
  const { pending: formPending } = useFormStatus();
  const actionPending = useContext(ActionFormPending);
  const pending = formPending || actionPending;

  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-label={ariaLabel}>
      {icon}
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
