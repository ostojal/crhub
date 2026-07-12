"use client";

import { Trash2Icon, UserRoundMinus, UserRoundPlusIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { unassignContacts } from "@/lib/actions/assignments";
import { deleteContacts } from "@/lib/actions/contacts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { type ContactRow } from "./columns";

export function ContactBulkActions({
  contacts,
  viewer,
  onAssign,
  onDone,
}: {
  contacts: ContactRow[];
  viewer: "admin" | "editor";
  onAssign: (contacts: ContactRow[]) => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isAdmin = viewer === "admin";

  const handleUnassign = () => {
    startTransition(async () => {
      const result = await unassignContacts(contacts.map((c) => c.id));

      if (result.ok) {
        toast.success(result.message);
        onDone();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteContacts(contacts.map((c) => c.id));

      if (result.ok) {
        toast.success(result.message);
        onDone();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isPending}>
          Bulk Actions
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-max">
        <DropdownMenuItem onSelect={() => onAssign(contacts)}>
          <UserRoundPlusIcon />
          Dodeli Pristup
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={handleUnassign}>
          <UserRoundMinus />
          Ukloni Pristup
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                  }}
                >
                  <Trash2Icon />
                  Obriši
                </DropdownMenuItem>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Da li ste sigurni da želite da obrišete {contacts.length}{" "}
                    kontakata?
                  </AlertDialogTitle>

                  <AlertDialogDescription>
                    Ova akcija je nepovratna. Svi izabrani kontakti će biti
                    trajno obrisani iz baze podataka bez mogućnosti vraćanja,
                    zajedno sa istorijom kontaktiranja i dodelama.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>Odustani</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    Obriši
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
