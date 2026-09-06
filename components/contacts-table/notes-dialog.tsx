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
  // Belešku piše samo admin; uredniku se ista beleška prikazuje bez izmene
  canEdit?: boolean;
  children: React.ReactNode;
};

export function NotesDialog({
  defaultEditing,
  canEdit = true,
  contact,
  children,
}: NotesDialogProps) {
  // Kad beleške još nema, dijalog se otvara pravo u režimu pisanja — inače
  // prva beleška ne bi mogla da se doda
  const startsEditing = canEdit && (defaultEditing || !contact.notes);
  const [editing, setEditing] = useState(startsEditing);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          setEditing(startsEditing);
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contactName(contact)} — beleška</DialogTitle>
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
              rows={5}
              placeholder="Trajna napomena o kontaktu..."
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

          {!editing && canEdit && (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                Izmeni belešku
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
