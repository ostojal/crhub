"use client";

import {
  CopyIcon,
  EditIcon,
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
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Contact } from "./contacts-table";
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

export function ContactActions({ contact }: { contact: Contact }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-max">
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(contact.id)}
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
            onClick={() => navigator.clipboard.writeText(contact.mobile_phone!)}
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
          <DropdownMenuItem>
            <NotebookIcon />
            Prikaži Note
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <EditIcon />
          Promeni Info
        </DropdownMenuItem>

        <DropdownMenuItem>
          <InfoIcon />
          Promeni Status
        </DropdownMenuItem>

        <DropdownMenuItem>
          <NotebookPenIcon />
          Promeni Note
        </DropdownMenuItem>

        <DropdownMenuItem>
          <UserRoundPlusIcon />
          Dodeli Pristup
        </DropdownMenuItem>

        <DropdownMenuItem>
          <UserRoundMinus />
          Ukloni Pristup
        </DropdownMenuItem>

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
                {contact.first_name} {contact.last_name}?
              </AlertDialogTitle>

              <AlertDialogDescription>
                Ova akcija je nepovratna. Kontakt će biti trajno obrisan iz baze
                podataka bez mogućnosti vraćanja.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Odustani</AlertDialogCancel>
              <AlertDialogAction>Obriši</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
