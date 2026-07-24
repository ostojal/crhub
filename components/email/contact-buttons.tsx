"use client";

import { ComposeEmailDialog } from "@/components/email/compose-email-dialog";
import { LogInteractionDialog } from "@/components/interactions/log-interaction-dialog";
import { Button } from "@/components/ui/button";
import { MailIcon, PhoneOutgoingIcon } from "lucide-react";
import { useState } from "react";

// Slanje mejla je glavna radnja; ručno evidentiranje ostaje uz nju za pozive,
// LinkedIn i mejlove poslate van aplikacije
export function ContactButtons({
  contactId,
  contactName,
  contactEmail,
}: {
  contactId: number;
  contactName: string;
  contactEmail: string | null;
}) {
  const [dialog, setDialog] = useState<"compose" | "log" | null>(null);

  return (
    <>
      <Button
        onClick={() => setDialog("compose")}
        disabled={!contactEmail}
        title={contactEmail ? undefined : "Kontakt nema email adresu"}
      >
        <MailIcon data-icon="inline-start" />
        Kontaktiraj
      </Button>

      <Button variant="outline" onClick={() => setDialog("log")}>
        <PhoneOutgoingIcon data-icon="inline-start" />
        Evidentiraj
      </Button>

      {dialog === "compose" && (
        <ComposeEmailDialog
          contactId={contactId}
          contactName={contactName}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "log" && (
        <LogInteractionDialog
          contacts={[{ id: contactId, name: contactName }]}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
