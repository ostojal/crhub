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
import { cancelScheduledEmail } from "@/lib/actions/emails";
import { EMAIL_STATUS_LABELS, type EmailStatus } from "@/lib/constants";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

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

            {email.status === "scheduled" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isPending}
                onClick={() => handleCancel(email.id)}
              >
                Otkaži
              </Button>
            )}
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
                  {email.status === "scheduled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleCancel(email.id)}
                    >
                      Otkaži
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
