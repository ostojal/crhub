"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EmailDetails } from "@/lib/actions/emails";
import { EMAIL_STATUS_LABELS, type EmailStatus } from "@/lib/constants";
import { looksLikeHtml, sanitizeEmailHtml, textToHtml } from "@/lib/email/html";
import { formatBytes } from "@/lib/format";
import { format } from "date-fns";
import { PaperclipIcon } from "lucide-react";

type LoadedEmail = Extract<EmailDetails, { ok: true }>["email"];

// Prikazuje mejl onako kako je otišao — telo se renderuje kao HTML, isto kao
// kod primaoca, uz sanitizaciju pre ubacivanja u stranicu
export function EmailPreviewDialog({
  email,
  onClose,
}: {
  email: LoadedEmail;
  onClose: () => void;
}) {
  const html = sanitizeEmailHtml(
    looksLikeHtml(email.body) ? email.body : textToHtml(email.body),
  );

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Prima",
      value: <span className="lowercase">{email.toEmail}</span>,
    },
    ...(email.cc.length > 0
      ? [{ label: "CC", value: email.cc.join(", ") }]
      : []),
    ...(email.bcc.length > 0
      ? [{ label: "BCC", value: email.bcc.join(", ") }]
      : []),
    {
      label: email.sentAt ? "Poslat" : "Zakazan za",
      value: format(email.sentAt ?? email.scheduledAt, "dd.MM.yyyy. HH:mm"),
    },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{email.subject}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {EMAIL_STATUS_LABELS[email.status as EmailStatus] ??
                  email.status}
              </Badge>
              {email.contactName && <span>{email.contactName}</span>}
            </div>
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-1 border-b pb-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex gap-2">
              <dt className="w-24 shrink-0 text-muted-foreground">
                {row.label}
              </dt>
              <dd className="min-w-0 break-words">{row.value}</dd>
            </div>
          ))}
        </dl>

        {email.error && (
          <p className="text-sm text-destructive">{email.error}</p>
        )}

        {/* Sadržaj je prošao kroz sanitizaciju i pri upisu i ovde */}
        <div
          className="text-sm [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {email.attachments.length > 0 && (
          <div className="space-y-1 border-t pt-3">
            <p className="text-sm font-medium">Prilozi</p>
            {email.attachments.map((attachment) => (
              <p
                key={attachment.id}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <PaperclipIcon className="size-4 shrink-0" />
                {attachment.name}
                <span>({formatBytes(attachment.size_bytes)})</span>
              </p>
            ))}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Zatvori
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
