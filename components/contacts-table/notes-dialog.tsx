import { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Contact } from "./contacts-table";
import { editNote } from "./edit-note";

type NotesDialogProps = {
  contact: Contact;
  defaultEditing?: boolean;
  children: React.ReactNode;
};

export function NotesDialog({
  defaultEditing,
  contact,
  children,
}: NotesDialogProps) {
  const [editing, setEditing] = useState(false);

  if (!contact.notes) {
    return null;
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          setEditing(defaultEditing ?? false);
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {contact.first_name} {contact.last_name} - Notes
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          action={(e) => {
            if (!editing) return;

            const newNote = e.get("note") as string;
            if (newNote.trim() === contact.notes?.trim()) {
              return;
            }

            editNote(contact.id, newNote.trim());
          }}
        >
          {editing && (
            <Textarea
              spellCheck="false"
              defaultValue={contact.notes ?? ""}
              name="note"
            />
          )}

          {!editing && (
            <div className="wrap-break-word whitespace-pre-wrap">
              {contact.notes ?? ""}
            </div>
          )}

          {editing && (
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Otkaži</Button>
              </DialogClose>

              <DialogClose type="submit" asChild>
                <Button>Sačuvaj</Button>
              </DialogClose>
            </DialogFooter>
          )}

          {!editing && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Promeni Note
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
