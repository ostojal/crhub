import { Badge } from "@/components/ui/badge";
import { INTERACTION_TYPE_LABELS } from "@/lib/constants";
import { isOneOf } from "@/lib/validate";
import { INTERACTION_TYPES } from "@/lib/constants";
import { format } from "date-fns";

export type InteractionItem = {
  id: number;
  type: string | null;
  notes: string | null;
  created_at: string;
  users: { full_name: string | null; email: string | null } | null;
};

function typeLabel(type: string | null): string {
  if (type && isOneOf(type, INTERACTION_TYPES)) {
    return INTERACTION_TYPE_LABELS[type];
  }
  return type || "Nepoznato";
}

export function InteractionsList({
  interactions,
}: {
  interactions: InteractionItem[];
}) {
  if (interactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Još nema evidentiranih kontaktiranja.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {interactions.map((interaction) => {
        const who =
          interaction.users?.full_name || interaction.users?.email || "—";

        return (
          <li
            key={interaction.id}
            className="rounded-md border px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{typeLabel(interaction.type)}</Badge>
              <span className="text-muted-foreground">
                {format(interaction.created_at, "dd.MM.yyyy. HH:mm")}
              </span>
              <span className="text-muted-foreground">·</span>
              <span>{who}</span>
            </div>
            {interaction.notes && (
              <p className="mt-2 whitespace-pre-wrap text-foreground/80">
                {interaction.notes}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
