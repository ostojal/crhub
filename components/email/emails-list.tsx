"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MobileCard, MobileField } from "@/components/ui/mobile-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ComposeEmailDialog } from "@/components/email/compose-email-dialog";
import { EmailPreviewDialog } from "@/components/email/email-preview-dialog";
import {
  cancelScheduledEmail,
  getEmailDetails,
  type EmailDetails,
} from "@/lib/actions/emails";
import { EMAIL_STATUS_LABELS, type EmailStatus } from "@/lib/constants";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type LoadedEmail = Extract<EmailDetails, { ok: true }>["email"];

export type EmailListItem = {
  id: number;
  contact_id: number | null;
  to_email: string;
  subject: string;
  status: EmailStatus;
  scheduled_at: string;
  sent_at: string | null;
  error: string | null;
  contactName: string | null;
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

function whenLabel(email: EmailListItem): string {
  const date = email.sent_at ?? email.scheduled_at;
  return format(date, "dd.MM.yyyy. HH:mm");
}

export function EmailsList({ emails }: { emails: EmailListItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<LoadedEmail | null>(null);
  const [draft, setDraft] = useState<LoadedEmail | null>(null);

  // Pun sadržaj se učitava tek na klik — lista ga ne nosi sa sobom
  const open = (emailId: number, target: "preview" | "edit") => {
    startTransition(async () => {
      const result = await getEmailDetails(emailId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (target === "edit") setDraft(result.email);
      else setPreview(result.email);
    });
  };

  const handleCancel = (emailId: number) => {
    startTransition(async () => {
      const result = await cancelScheduledEmail(emailId);

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const recipient = (email: EmailListItem) =>
    email.contact_id ? (
      <Link
        href={`/contacts/${email.contact_id}`}
        className="underline-offset-4 hover:underline"
      >
        {email.contactName || email.to_email}
      </Link>
    ) : (
      (email.contactName ?? email.to_email)
    );

  if (emails.length === 0) {
    return (
      <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
        Još nema poslatih ni zakazanih mejlova.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {emails.map((email) => (
          <MobileCard key={email.id} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 font-medium">{recipient(email)}</span>
              <Badge variant={STATUS_VARIANT[email.status]}>
                {EMAIL_STATUS_LABELS[email.status]}
              </Badge>
            </div>

            <div className="border-t pt-2">
              <MobileField label="Naslov">{email.subject}</MobileField>
              <MobileField label="Adresa">{email.to_email}</MobileField>
              <MobileField label={email.sent_at ? "Poslat" : "Zakazan za"}>
                {whenLabel(email)}
              </MobileField>
            </div>

            {email.error && (
              <p className="text-xs text-destructive">{email.error}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={isPending}
                onClick={() => open(email.id, "preview")}
              >
                Prikaži
              </Button>
              {email.status === "scheduled" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={isPending}
                    onClick={() => open(email.id, "edit")}
                  >
                    Izmeni
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={isPending}
                    onClick={() => handleCancel(email.id)}
                  >
                    Otkaži
                  </Button>
                </>
              )}
            </div>
          </MobileCard>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Primalac</TableHead>
              <TableHead className="px-4">Naslov</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Vreme</TableHead>
              <TableHead className="px-4 text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.map((email) => (
              <TableRow key={email.id}>
                <TableCell className="px-4">
                  <div className="flex flex-col">
                    <span className="font-medium">{recipient(email)}</span>
                    <span className="text-xs text-muted-foreground">
                      {email.to_email}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate px-4">
                  {email.subject}
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex flex-col gap-1">
                    <Badge variant={STATUS_VARIANT[email.status]}>
                      {EMAIL_STATUS_LABELS[email.status]}
                    </Badge>
                    {email.error && (
                      <span className="text-xs text-destructive">
                        {email.error}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-4 whitespace-nowrap">
                  {whenLabel(email)}
                </TableCell>
                <TableCell className="px-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => open(email.id, "preview")}
                    >
                      Prikaži
                    </Button>
                    {email.status === "scheduled" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => open(email.id, "edit")}
                        >
                          Izmeni
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleCancel(email.id)}
                        >
                          Otkaži
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {preview && (
        <EmailPreviewDialog
          key={preview.id}
          email={preview}
          onClose={() => setPreview(null)}
        />
      )}

      {draft?.contactId && (
        <ComposeEmailDialog
          key={`edit-${draft.id}`}
          contactId={draft.contactId}
          contactName={draft.contactName ?? draft.toEmail}
          draft={{
            id: draft.id,
            subject: draft.subject,
            body: draft.body,
            ccIds: draft.ccIds,
            bccIds: draft.bccIds,
            attachmentIds: draft.attachmentIds,
            scheduledAt: draft.scheduledAt,
          }}
          onClose={() => {
            setDraft(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
