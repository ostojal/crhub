"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { unassignContact } from "@/lib/actions/assignments";
import { MoreHorizontalIcon, UserMinusIcon, UserPlusIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { type ContactRow, isAssigned } from "./columns";

export function ContactRowActions({
  contact,
  onAssign,
}: {
  contact: ContactRow;
  onAssign: (contact: ContactRow) => void;
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
