"use client";

import { EmailPreviewDialog } from "@/components/email/email-preview-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEmailDetails, type EmailDetails } from "@/lib/actions/emails";
import { EMAIL_STATUS_LABELS, type EmailStatus } from "@/lib/constants";
import { format } from "date-fns";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type LoadedEmail = Extract<EmailDetails, { ok: true }>["email"];

export type ContactEmailItem = {
  id: number;
  subject: string;
  status: EmailStatus;
  scheduled_at: string;
  sent_at: string | null;
  senderName: string;
  canOpen: boolean;
};

const STATUS_VARIANT: Record<
  EmailStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  scheduled: "outline",
  sending: "secondary",
  sent: "default",
  failed: "destructive",
  cancelled: "secondary",
};

// Spisak mejlova poslatih ovom kontaktu; telo se učitava tek na klik, jer
// stranica kontakta ne treba da nosi ceo HTML svakog mejla
export function ContactEmailsList({ emails }: { emails: ContactEmailItem[] }) {
  const [preview, setPreview] = useState<LoadedEmail | null>(null);
  const [isPending, startTransition] = useTransition();

  if (emails.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ovom kontaktu još nije poslat mejl iz aplikacije.
      </p>
    );
  }

  const open = (emailId: number) => {
    startTransition(async () => {
      const result = await getEmailDetails(emailId);

      if (result.ok) setPreview(result.email);
      else toast.error(result.error);
    });
  };

  return (
    <>
      <ul className="space-y-3">
        {emails.map((email) => (
          <li
            key={email.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <p className="font-medium break-words">{email.subject}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                <Badge variant={STATUS_VARIANT[email.status]}>
                  {EMAIL_STATUS_LABELS[email.status]}
                </Badge>
                <span className="tabular-nums">
                  {format(
                    email.sent_at ?? email.scheduled_at,
                    "dd.MM.yyyy. HH:mm",
                  )}
                </span>
                <span>·</span>
                <span>{email.senderName}</span>
              </p>
            </div>

            {email.canOpen ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => open(email.id)}
              >
                Prikaži
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Sadržaj vidi pošiljalac
              </span>
            )}
          </li>
        ))}
      </ul>

      {preview && (
        <EmailPreviewDialog email={preview} onClose={() => setPreview(null)} />
      )}
    </>
  );
}
