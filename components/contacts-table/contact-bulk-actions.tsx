"use client";

import {
  InfoIcon,
  PhoneOutgoingIcon,
  Trash2Icon,
  UserRoundMinus,
  UserRoundPlusIcon,
} from "lucide-react";
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
import { Button } from "../ui/button";
import { type ContactRow } from "./columns";

// Sve akcije stoje odmah u traci — bez međukoraka kroz meni, jer se traka i
// tako pojavljuje tek kad postoji izbor
export function ContactBulkActions({
  contacts,
  viewer,
  onAssign,
  onEditStatus,
  onLog,
  onDone,
}: {
  contacts: ContactRow[];
  viewer: "admin" | "editor";
  onAssign: (contacts: ContactRow[]) => void;
  onEditStatus: (contacts: ContactRow[]) => void;
  onLog: (contacts: ContactRow[]) => void;
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
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => onAssign(contacts)}
      >
        <UserRoundPlusIcon data-icon="inline-start" />
        Dodeli pristup
      </Button>

      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={handleUnassign}
      >
        <UserRoundMinus data-icon="inline-start" />
        Ukloni pristup
      </Button>

      {isAdmin && (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => onEditStatus(contacts)}
          >
            <InfoIcon data-icon="inline-start" />
            Promeni status
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => onLog(contacts)}
          >
            <PhoneOutgoingIcon data-icon="inline-start" />
            Evidentiraj kontaktiranje
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={isPending}>
                <Trash2Icon data-icon="inline-start" />
                Obriši
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Da li ste sigurni da želite da obrišete {contacts.length}{" "}
                  kontakata?
                </AlertDialogTitle>

                <AlertDialogDescription>
                  Ova akcija je nepovratna. Svi izabrani kontakti će biti trajno
                  obrisani iz baze podataka bez mogućnosti vraćanja, zajedno sa
                  istorijom kontaktiranja i dodelama.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Odustani</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                  Obriši
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
