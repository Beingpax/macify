"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmitButton({ children, disabled, ...props }: ComponentProps<"button">) {
  const { pending, data } = useFormStatus();
  const active = !props.name || data?.get(props.name) === props.value;
  return <button {...props} disabled={disabled || pending} aria-disabled={disabled || pending}>
    {pending && active ? "Processing…" : children}
  </button>;
}
