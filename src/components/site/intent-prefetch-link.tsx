"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentPropsWithoutRef, FocusEvent, PointerEvent } from "react";

type IntentPrefetchLinkProps = LinkProps
  & Omit<ComponentPropsWithoutRef<"a">, keyof LinkProps>
  & { href: string };

export function IntentPrefetchLink({
  href,
  onFocus,
  onPointerEnter,
  ...props
}: IntentPrefetchLinkProps) {
  const router = useRouter();

  function prefetch() {
    router.prefetch(href);
  }

  function handleFocus(event: FocusEvent<HTMLAnchorElement>) {
    prefetch();
    onFocus?.(event);
  }

  function handlePointerEnter(event: PointerEvent<HTMLAnchorElement>) {
    prefetch();
    onPointerEnter?.(event);
  }

  return (
    <Link
      {...props}
      href={href}
      onFocus={handleFocus}
      onPointerEnter={handlePointerEnter}
      prefetch={false}
    />
  );
}
