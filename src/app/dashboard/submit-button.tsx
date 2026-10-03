"use client";

import { useContext } from "react";
import { ActionFormPending } from "./action-form";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
};

export function SubmitButton({
  idleLabel,
  pendingLabel,
  className,
}: SubmitButtonProps) {
  const { pending: formPending } = useFormStatus();
  const actionPending = useContext(ActionFormPending);
  const pending = formPending || actionPending;

  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
