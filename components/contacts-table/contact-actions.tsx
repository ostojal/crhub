"use client";

import {
  CopyIcon,
  EditIcon,
  ExternalLinkIcon,
  InfoIcon,
  MailIcon,
  MoreHorizontal,
  NotebookIcon,
  NotebookPenIcon,
  PhoneCallIcon,
  Trash2Icon,
  UserRoundMinus,
  UserRoundPlusIcon,
  VoicemailIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { unassignContact } from "@/lib/actions/assignments";
import {
  deleteContact,
  getContactDeleteImpact,
} from "@/lib/actions/contacts";
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
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { contactName, type ContactRow, isAssigned } from "./columns";

export type ContactActionHandlers = {
  onAssign: (contact: ContactRow) => void;
  onEdit: (contact: ContactRow) => void;
  onEditStatus: (contact: ContactRow) => void;
};

export function ContactActions({
  contact,
  viewer,
  handlers,
}: {
  contact: ContactRow;
  viewer: "admin" | "editor";
  handlers: ContactActionHandlers;
}) {
  const [isPending, startTransition] = useTransition();
  const isAdmin = viewer === "admin";

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

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteContact(contact.id);

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
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-max">
        {isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link href={`/contacts/${contact.id}`}>
                <ExternalLinkIcon />
                Detalji
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(String(contact.id))}
            >
              <CopyIcon />
              Kopiraj Id
            </DropdownMenuItem>

            {contact.email && (
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(contact.email!)}
              >
                <MailIcon />
                Kopiraj Email
              </DropdownMenuItem>
            )}

            {contact.mobile_phone && (
              <DropdownMenuItem
                onClick={() =>
                  navigator.clipboard.writeText(contact.mobile_phone!)
                }
              >
                <PhoneCallIcon />
                Kopiraj Mobilni
              </DropdownMenuItem>
            )}

            {contact.phone && (
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(contact.phone!)}
              >
                <VoicemailIcon />
                Kopiraj Fiksni
              </DropdownMenuItem>
            )}

            {contact.notes && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <NotebookIcon />
                    Prikaži Note
                  </DropdownMenuItem>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Note — {contactName(contact)}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="whitespace-pre-wrap">
                      {contact.notes}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Zatvori</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={() => handlers.onEdit(contact)}>
              <EditIcon />
              Promeni Info
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => handlers.onEditStatus(contact)}>
              <InfoIcon />
              Promeni Status
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => handlers.onEdit(contact)}>
              <NotebookPenIcon />
              Promeni Note
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuItem onSelect={() => handlers.onAssign(contact)}>
          <UserRoundPlusIcon />
          Dodeli Pristup
        </DropdownMenuItem>

        {isAssigned(contact) && (
          <DropdownMenuItem onSelect={handleUnassign}>
            <UserRoundMinus />
            Ukloni Pristup
          </DropdownMenuItem>
        )}

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
                    Da li ste sigurni da želite da obrišete kontakt{" "}
                    {contactName(contact)}?
                  </AlertDialogTitle>

                  <AlertDialogDescription>
                    Ova akcija je nepovratna. Kontakt će biti trajno obrisan iz
                    baze podataka bez mogućnosti vraćanja.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <DeleteImpactNote contactId={contact.id} />

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

// Učitava se tek kad se dijalog otvori (mount sadržaja) i upozorava šta se
// sve briše zajedno sa kontaktom
function DeleteImpactNote({ contactId }: { contactId: number }) {
  const [impact, setImpact] = useState<{
    interactions: number;
    assigned: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getContactDeleteImpact(contactId).then((result) => {
      if (!cancelled && result.ok) {
        setImpact({
          interactions: result.interactions,
          assigned: result.assigned,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (!impact || (impact.interactions === 0 && !impact.assigned)) return null;

  return (
    <p className="text-sm text-amber-600 dark:text-amber-500">
      Zajedno sa kontaktom
      {impact.interactions > 0 &&
        ` se briše i istorija kontaktiranja (${impact.interactions})`}
      {impact.interactions > 0 && impact.assigned && ", a"}
      {impact.assigned && " kontakt nestaje iz radnog prostora korisnika"}.
    </p>
  );
}
