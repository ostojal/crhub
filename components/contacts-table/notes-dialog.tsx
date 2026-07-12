"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { contactName, type ContactRow } from "./columns";
import { editNote } from "./edit-note";

type NotesDialogProps = {
  contact: ContactRow;
  defaultEditing?: boolean;
  children: React.ReactNode;
};

export function NotesDialog({
  defaultEditing,
  contact,
  children,
}: NotesDialogProps) {
  const [editing, setEditing] = useState(false);

  // Bez beleške nema šta da se prikaže, ali u edit režimu može da se doda
  if (!contact.notes && !defaultEditing) {
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
          <DialogTitle>{contactName(contact)} - Notes</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          action={async (formData) => {
            if (!editing) return;

            const newNote = String(formData.get("note") ?? "").trim();
            if (newNote === (contact.notes ?? "").trim()) {
              return;
            }

            const result = await editNote(contact.id, newNote);

            if (result.ok) {
              toast.success(result.message);
            } else {
              toast.error(result.error);
            }
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
