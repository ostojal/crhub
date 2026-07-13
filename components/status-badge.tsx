import { cn } from "@/lib/utils";

// Zaobljeni obojeni okvir oko statusa komunikacije. Boja nosi značenje:
// zeleno = poslato/prihvaćeno, žuto = na čekanju, sivo = nije kontaktiran,
// plavo = dobijen odgovor, crveno = odbijeno. Prazan status → "Nije
// kontaktiran". Čista prezentaciona komponenta — radi i na serveru i na klijentu.
const STATUS_STYLES: Record<string, string> = {
  "Nije kontaktiran":
    "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  Poslato:
    "border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-400",
  "Dobijen odgovor":
    "border-sky-600/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  "Na čekanju":
    "border-amber-600/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Prihvaćeno:
    "border-emerald-600/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Odbijeno: "border-red-600/30 bg-red-500/10 text-red-700 dark:text-red-400",
};

const FALLBACK_LABEL = "Nije kontaktiran";

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const label = status || FALLBACK_LABEL;
  const style = STATUS_STYLES[label] ?? STATUS_STYLES[FALLBACK_LABEL];

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap normal-case",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
