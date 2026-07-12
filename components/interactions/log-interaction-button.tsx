"use client";

import { Button } from "@/components/ui/button";
import { LogInteractionDialog } from "@/components/interactions/log-interaction-dialog";
import { PhoneOutgoingIcon } from "lucide-react";
import { useState } from "react";

export function LogInteractionButton({
  contactId,
  contactName,
}: {
  contactId: number;
  contactName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PhoneOutgoingIcon data-icon="inline-start" />
        Evidentiraj kontaktiranje
      </Button>

      {open && (
        <LogInteractionDialog
          contacts={[{ id: contactId, name: contactName }]}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
