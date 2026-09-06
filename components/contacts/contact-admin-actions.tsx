"use client";

import { Button } from "@/components/ui/button";
import {
  type ContactEditable,
  ContactFormDialog,
} from "@/components/contacts/contact-form-dialog";
import { EditStatusDialog } from "@/components/contacts/edit-status-dialog";
import { PencilIcon, TagIcon } from "lucide-react";
import { useState } from "react";

export function ContactAdminActions({
  contact,
  contactName,
  currentStatus,
  currentTag,
  canEditContact,
}: {
  contact: ContactEditable;
  contactName: string;
  currentStatus: string | null;
  currentTag: string | null;
  // Same podatke kontakta menja samo admin; status menja i urednik
  canEditContact: boolean;
}) {
  const [dialog, setDialog] = useState<"edit" | "status" | null>(null);

  return (
    <>
      <div className="flex gap-2">
        {canEditContact && (
          <Button variant="outline" onClick={() => setDialog("edit")}>
            <PencilIcon data-icon="inline-start" />
            Izmeni podatke
          </Button>
        )}
        <Button variant="outline" onClick={() => setDialog("status")}>
          <TagIcon data-icon="inline-start" />
          Izmeni status
        </Button>
      </div>

      {dialog === "edit" && canEditContact && (
        <ContactFormDialog contact={contact} onClose={() => setDialog(null)} />
      )}

      {dialog === "status" && (
        <EditStatusDialog
          contacts={[{ id: contact.id, name: contactName }]}
          currentStatus={currentStatus}
          currentTag={currentTag}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
