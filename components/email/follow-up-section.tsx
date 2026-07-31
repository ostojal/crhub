"use client";

import { ComposeEmailDialog } from "@/components/email/compose-email-dialog";
import { LogInteractionDialog } from "@/components/interactions/log-interaction-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { markReplyReceived } from "@/lib/actions/follow-up";
import type { FollowUpItem, FollowUpQueue } from "@/lib/follow-up";
import { format } from "date-fns";
import { MailIcon, PhoneOutgoingIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

type OpenDialog =
  | { kind: "compose"; item: FollowUpItem }
  | { kind: "call"; item: FollowUpItem }
  | null;

// Srpska množina: 1 dan, 2–4 dana, 5+ dana, uz izuzetak za 11–14
function daysLabel(days: number): string {
  if (days === 0) return "danas";

  const lastTwo = days % 100;
  const last = days % 10;
  const unit =
    lastTwo >= 11 && lastTwo <= 14
      ? "radnih dana"
      : last === 1
        ? "radnog dana"
        : last >= 2 && last <= 4
          ? "radna dana"
          : "radnih dana";

  return `pre ${days} ${unit}`;
}

// Kontakti kojima je poslat mejl, a odgovor nije stigao. Sekcije se
// prikazuju samo kad imaju sadržaj — inače stranica ostaje kakva je bila.
export function FollowUpSections({ queue }: { queue: FollowUpQueue }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [isPending, startTransition] = useTransition();

  const handleReply = (contactId: number) => {
    startTransition(async () => {
      const result = await markReplyReceived(contactId);

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const closeDialog = () => {
    setDialog(null);
    router.refresh();
  };

  if (queue.followUp.length === 0 && queue.call.length === 0) return null;

  const row = (item: FollowUpItem, actions: ReactNode) => (
    <li
      key={item.contactId}
      className="flex flex-wrap items-center justify-between gap-3 p-3"
    >
      <div className="min-w-0">
        <Link
          href={`/contacts/${item.contactId}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {item.name}
        </Link>
        {item.company && (
          <span className="ml-2 text-sm text-muted-foreground">
            {item.company}
          </span>
        )}
        <p className="text-xs text-muted-foreground">
          Kontaktiran {daysLabel(item.workingDaysAgo)} (
          {format(item.lastContactAt, "dd.MM.yyyy.")})
        </p>
      </div>

      <div className="flex flex-wrap gap-2">{actions}</div>
    </li>
  );

  const replyButton = (item: FollowUpItem) => (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => handleReply(item.contactId)}
    >
      Dobijen odgovor
    </Button>
  );

  return (
    <div className="mb-6 space-y-4">
      {queue.followUp.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Za follow up ({queue.followUp.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Prošlo je dovoljno radnih dana od prvog kontaktiranja, a odgovor
              nije evidentiran.
            </p>
            <ul className="divide-y rounded-md border">
              {queue.followUp.map((item) =>
                row(
                  item,
                  <>
                    <Button
                      size="sm"
                      disabled={!item.email}
                      title={
                        item.email ? undefined : "Kontakt nema email adresu"
                      }
                      onClick={() => setDialog({ kind: "compose", item })}
                    >
                      <MailIcon data-icon="inline-start" />
                      Pošalji follow up
                    </Button>
                    {replyButton(item)}
                  </>,
                ),
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {queue.call.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Za poziv ({queue.call.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ni na follow up nije stigao odgovor — sledeći korak je poziv
              telefonom.
            </p>
            <ul className="divide-y rounded-md border">
              {queue.call.map((item) =>
                row(
                  item,
                  <>
                    {item.phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${item.phone}`}>{item.phone}</a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => setDialog({ kind: "call", item })}
                    >
                      <PhoneOutgoingIcon data-icon="inline-start" />
                      Evidentiraj poziv
                    </Button>
                    {replyButton(item)}
                  </>,
                ),
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {dialog?.kind === "compose" && (
        <ComposeEmailDialog
          key={`follow-up-${dialog.item.contactId}`}
          contactId={dialog.item.contactId}
          contactName={dialog.item.name}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === "call" && (
        <LogInteractionDialog
          key={`call-${dialog.item.contactId}`}
          contacts={[{ id: dialog.item.contactId, name: dialog.item.name }]}
          defaultType="poziv"
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
