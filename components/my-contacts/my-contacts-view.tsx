"use client";

import { CopyButton } from "@/components/copy-button";
import { DataTable } from "@/components/data-table";
import { ComposeEmailDialog } from "@/components/email/compose-email-dialog";
import {
  type LogContact,
  LogInteractionDialog,
} from "@/components/interactions/log-interaction-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MobileCard, MobileField } from "@/components/ui/mobile-list";
import { formatPhoneNumber } from "@/lib/format";
import type { Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { ChevronDownIcon, MailIcon, PhoneOutgoingIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildMyContactColumns,
  contactDisplayName,
  type MyContact,
} from "./columns";

const MAX_BULK = 25;

// "Već kontaktiran" = status je pomeren sa početnog. Podatak već stiže uz
// kontakt, pa nema dodatnih upita.
function isContacted(contact: MyContact): boolean {
  const status = contact.contact_status?.[0]?.communication_status;
  return !!status && status !== "Nije kontaktiran";
}

export function MyContactsView({ contacts }: { contacts: MyContact[] }) {
  const [logTargets, setLogTargets] = useState<LogContact[] | null>(null);
  const [composeTarget, setComposeTarget] = useState<LogContact | null>(null);
  const [showContacted, setShowContacted] = useState(false);
  // Promena vrednosti remountuje tabele i time briše izbor redova nakon
  // završenog bulk evidentiranja
  const [selectionToken, setSelectionToken] = useState(0);

  const columns = useMemo(
    () =>
      buildMyContactColumns({
        onCompose: (contact) =>
          setComposeTarget({
            id: contact.id,
            name: contactDisplayName(contact),
          }),
        onLog: (contact) =>
          setLogTargets([
            { id: contact.id, name: contactDisplayName(contact) },
          ]),
      }),
    [],
  );

  const [pending, contacted] = useMemo(() => {
    const done: MyContact[] = [];
    const todo: MyContact[] = [];

    for (const contact of contacts) {
      (isContacted(contact) ? done : todo).push(contact);
    }

    return [todo, done];
  }, [contacts]);

  const closeDialogs = () => {
    setLogTargets(null);
    setSelectionToken((token) => token + 1);
  };

  const renderMobileCard = (row: Row<MyContact>) => {
    const contact = row.original;
    const rawPhone = contact.phone ?? contact.mobile_phone;
    const status = contact.contact_status?.[0]?.communication_status;

    return (
      <MobileCard className="space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Izaberi kontakt"
            className="mt-1"
          />
          <Link
            href={`/contacts/${contact.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {contactDisplayName(contact)}
          </Link>
        </div>

        <div className="border-t pt-2">
          {contact.company && (
            <MobileField label="Firma">{contact.company}</MobileField>
          )}
          {contact.job_title && (
            <MobileField label="Pozicija">{contact.job_title}</MobileField>
          )}
          {rawPhone && (
            <MobileField label="Telefon">
              <span className="inline-flex items-center gap-1">
                {formatPhoneNumber(rawPhone)}
                <CopyButton value={rawPhone} label="Telefon" />
              </span>
            </MobileField>
          )}
          {contact.email && (
            <MobileField label="Email">
              <span className="inline-flex items-center gap-1 lowercase">
                {contact.email}
                <CopyButton value={contact.email} label="Email" />
              </span>
            </MobileField>
          )}
          <MobileField label="Status">
            <StatusBadge status={status} />
          </MobileField>
          <MobileField label="Dodeljeno">
            {format(contact.assigned_at, "dd.MM.yyyy.")}
          </MobileField>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={!contact.email}
            title={contact.email ? undefined : "Kontakt nema email adresu"}
            onClick={() =>
              setComposeTarget({
                id: contact.id,
                name: contactDisplayName(contact),
              })
            }
          >
            <MailIcon data-icon="inline-start" />
            Kontaktiraj
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() =>
              setLogTargets([
                { id: contact.id, name: contactDisplayName(contact) },
              ])
            }
          >
            <PhoneOutgoingIcon data-icon="inline-start" />
            Evidentiraj
          </Button>
        </div>
      </MobileCard>
    );
  };

  const renderTable = (data: MyContact[], section: string) => (
    <DataTable
      key={`${section}-${selectionToken}`}
      columns={columns}
      data={data}
      pagesCount={1}
      hidePagination
      defaultSort={{ id: "assigned_at", desc: true }}
      getRowId={(row) => String(row.id)}
      enableRowSelection
      renderMobileCard={renderMobileCard}
      toolbar={(table) => {
        const selected = table.getSelectedRowModel().rows;

        if (selected.length === 0) return null;

        return (
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Izabrano kontakata: {selected.length}
              {selected.length > MAX_BULK && ` (najviše ${MAX_BULK} odjednom)`}
            </p>
            <Button
              size="sm"
              disabled={selected.length > MAX_BULK}
              onClick={() =>
                setLogTargets(
                  selected.map((row) => ({
                    id: row.original.id,
                    name: contactDisplayName(row.original),
                  })),
                )
              }
            >
              <PhoneOutgoingIcon data-icon="inline-start" />
              Evidentiraj izabrane ({selected.length})
            </Button>
          </div>
        );
      }}
    />
  );

  return (
    <>
      {pending.length > 0 ? (
        renderTable(pending, "pending")
      ) : (
        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          {contacts.length === 0
            ? "Nemaš dodeljenih kontakata."
            : "Svi dodeljeni kontakti su već kontaktirani."}
        </div>
      )}

      {contacted.length > 0 && (
        <section className="mt-8">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowContacted((open) => !open)}
            aria-expanded={showContacted}
          >
            <span>Već kontaktirani ({contacted.length})</span>
            <ChevronDownIcon
              className={`size-4 transition-transform ${showContacted ? "rotate-180" : ""}`}
            />
          </Button>

          {showContacted && (
            <div className="mt-3">{renderTable(contacted, "contacted")}</div>
          )}
        </section>
      )}

      {logTargets && (
        <LogInteractionDialog
          key={logTargets.map((c) => c.id).join(",")}
          contacts={logTargets}
          onClose={closeDialogs}
        />
      )}

      {composeTarget && (
        <ComposeEmailDialog
          key={composeTarget.id}
          contactId={composeTarget.id}
          contactName={composeTarget.name}
          onClose={() => setComposeTarget(null)}
        />
      )}
    </>
  );
}
