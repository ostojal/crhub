import { CONTACT_CATEGORY_LABELS, type ContactCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Pilula kategorije kontakta. Boje su namerno van palete StatusBadge-a
// (siva/zelena/plava/žuta/crvena) da se dve vrste oznaka ne mešaju u tabeli.
const CATEGORY_STYLES: Record<ContactCategory, string> = {
  finansijski:
    "border-violet-600/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  naturalni:
    "border-teal-600/30 bg-teal-500/15 text-teal-700 dark:text-teal-400",
  nagradni:
    "border-orange-600/30 bg-orange-500/15 text-orange-700 dark:text-orange-400",
};

export function CategoryBadge({
  category,
  className,
}: {
  category: ContactCategory;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap normal-case",
        CATEGORY_STYLES[category],
        className,
      )}
    >
      {CONTACT_CATEGORY_LABELS[category]}
    </span>
  );
}
