import { cn } from "@/lib/utils";

// Kartica koja na mobilnom zamenjuje red tabele, tako da se sve vidi u jednom
// pogledu bez horizontalnog skrolovanja.
export function MobileCard({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-md border bg-card p-3 text-sm", className)}
      {...props}
    />
  );
}

// Jedan red "labela — vrednost" unutar kartice.
export function MobileField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 py-0.5",
        className,
      )}
    >
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right break-words">{children}</span>
    </div>
  );
}
