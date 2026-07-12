"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { unassignContact } from "@/lib/actions/assignments";
import {
  MoreHorizontalIcon,
  PencilIcon,
  TagIcon,
  Trash2Icon,
  UserMinusIcon,
  UserPlusIcon,
} from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { type ContactRow, isAssigned } from "./columns";

export type AdminRowHandlers = {
  onEdit: (contact: ContactRow) => void;
  onEditStatus: (contact: ContactRow) => void;
  onDelete: (contact: ContactRow) => void;
};

export function ContactRowActions({
  contact,
  onAssign,
  adminHandlers,
}: {
  contact: ContactRow;
  onAssign: (contact: ContactRow) => void;
  adminHandlers?: AdminRowHandlers;
}) {
  const [isPending, startTransition] = useTransition();

  const handleUnassign = () => {
    startTransition(async () => {
      const result = await unassignContact(contact.id);

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Akcije za kontakt"
          disabled={isPending}
        >
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onAssign(contact)}>
          <UserPlusIcon />
          {isAssigned(contact) ? "Prebaci dodelu" : "Dodeli korisniku"}
        </DropdownMenuItem>
        {isAssigned(contact) && (
          <DropdownMenuItem onSelect={handleUnassign}>
            <UserMinusIcon />
            Ukloni dodelu
          </DropdownMenuItem>
        )}

        {adminHandlers && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => adminHandlers.onEdit(contact)}>
              <PencilIcon />
              Izmeni podatke
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => adminHandlers.onEditStatus(contact)}
            >
              <TagIcon />
              Izmeni status
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => adminHandlers.onDelete(contact)}
            >
              <Trash2Icon />
              Obriši
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
