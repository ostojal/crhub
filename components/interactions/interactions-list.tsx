"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteInteraction,
  setInteractionType,
} from "@/lib/actions/interactions";
import {
  CONTACT_TYPES,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPES,
  NOTE_TYPE,
} from "@/lib/constants";
import { isOneOf } from "@/lib/validate";
import { format } from "date-fns";
import { MoreHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export type InteractionItem = {
  id: number;
  user_id: number | null;
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
  canEditId,
}: {
  interactions: InteractionItem[];
  // "all" za admina, id korisnika za ostale, izostavljeno kad se ne sme ništa.
  // Menu je samo prečica — same akcije ponovo proveravaju pravo na serveru.
  canEditId?: "all" | number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (interactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Još nema evidentiranih kontaktiranja.
      </p>
    );
  }

  const changeType = (id: number, type: string) => {
    startTransition(async () => {
      const result = await setInteractionType(id, type);

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const remove = (id: number) => {
    startTransition(async () => {
      const result = await deleteInteraction(id);

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <ul className="space-y-4">
      {interactions.map((interaction) => {
        const who =
          interaction.users?.full_name || interaction.users?.email || "—";
        const isNote = interaction.type === NOTE_TYPE;
        const canEdit =
          canEditId === "all" ||
          (canEditId !== undefined && canEditId === interaction.user_id);

        return (
          <li
            key={interaction.id}
            className="rounded-md border px-4 py-3 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isNote ? "outline" : "secondary"}>
                  {typeLabel(interaction.type)}
                </Badge>
                <span className="text-muted-foreground">
                  {format(interaction.created_at, "dd.MM.yyyy. HH:mm")}
                </span>
                <span className="text-muted-foreground">·</span>
                <span>{who}</span>
              </div>

              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      disabled={isPending}
                      aria-label="Akcije"
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isNote
                      ? CONTACT_TYPES.map((type) => (
                          <DropdownMenuItem
                            key={type}
                            onSelect={() => changeType(interaction.id, type)}
                          >
                            Prebaci u: {INTERACTION_TYPE_LABELS[type]}
                          </DropdownMenuItem>
                        ))
                      : [
                          <DropdownMenuItem
                            key={NOTE_TYPE}
                            onSelect={() =>
                              changeType(interaction.id, NOTE_TYPE)
                            }
                          >
                            Prebaci u belešku
                          </DropdownMenuItem>,
                          ...CONTACT_TYPES.filter(
                            (type) => type !== interaction.type,
                          ).map((type) => (
                            <DropdownMenuItem
                              key={type}
                              onSelect={() => changeType(interaction.id, type)}
                            >
                              Prebaci u: {INTERACTION_TYPE_LABELS[type]}
                            </DropdownMenuItem>
                          )),
                        ]}
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => remove(interaction.id)}
                    >
                      Obriši unos
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
