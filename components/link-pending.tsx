"use client";

import { useLinkStatus } from "next/link";
import { Loader2Icon } from "lucide-react";

// Spinner koji se pojavi čim se klikne na roditeljski <Link>, dok traje
// navigacija — trenutni feedback dok se sledeća strana učitava.
export function LinkPending() {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  return (
    <Loader2Icon
      aria-hidden
      className="ml-1 size-3.5 shrink-0 animate-spin text-muted-foreground"
    />
  );
}
