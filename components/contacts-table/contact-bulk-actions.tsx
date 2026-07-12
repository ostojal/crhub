import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Contact } from "./contacts-table";
import { Trash2Icon, UserRoundMinus, UserRoundPlusIcon } from "lucide-react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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

export function ContactBulkActions({ contacts }: { contacts: Contact[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Bulk Actions</Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-max">
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
                Da li ste sigurni da želite da obrišete {contacts.length}{" "}
                kontakata?
              </AlertDialogTitle>

              <AlertDialogDescription>
                Ova akcija je nepovratna. Svi izabrani kontakti će biti trajno
                obrisani iz baze podataka bez mogućnosti vraćanja.
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
