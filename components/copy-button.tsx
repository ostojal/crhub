"use client";

import { Button } from "@/components/ui/button";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

// Mala ikonica pored vrednosti (telefon, email...) koja je kopira u clipboard
export function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
      aria-label={`Kopiraj ${label}`}
      onClick={(event) => {
        event.stopPropagation();
        navigator.clipboard.writeText(value);
        toast.success(`${label} je kopiran u clipboard.`);
      }}
    >
      <CopyIcon className="size-3.5" />
    </Button>
  );
}
