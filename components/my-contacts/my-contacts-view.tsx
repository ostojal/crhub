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
import { format } from "date-fns";
import { MailIcon, PhoneOutgoingIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { Table as TanstackTable } from "@tanstack/react-table";
import {
  buildMyContactColumns,
  contactDisplayName,
  type MyContact,
} from "./columns";

const MAX_BULK = 25;

export function MyContactsView({
  contacts,
  pagesCount,
}: {
  contacts: MyContact[];
  pagesCount: number;
}) {
  const [logTargets, setLogTargets] = useState<LogContact[] | null>(null);
  const [composeTarget, setComposeTarget] = useState<LogContact | null>(null);
  const tableRef = useRef<TanstackTable<MyContact> | null>(null);

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

  return (
    <>
      <DataTable
        columns={columns}
        data={contacts}
        pagesCount={pagesCount}
        defaultSort={{ id: "assigned_at", desc: true }}
        getRowId={(row) => String(row.id)}
        enableRowSelection
        renderMobileCard={(row) => {
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
                  <MobileField label="Pozicija">
                    {contact.job_title}
                  </MobileField>
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
                    <span className="inline-flex items-center gap-1">
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
                  title={
                    contact.email ? undefined : "Kontakt nema email adresu"
                  }
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
        }}
        toolbar={(table) => {
          tableRef.current = table;
          const selected = table.getSelectedRowModel().rows;

          if (selected.length === 0) return null;

          return (
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Izabrano kontakata: {selected.length}
                {selected.length > MAX_BULK &&
                  ` (najviše ${MAX_BULK} odjednom)`}
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

      {logTargets && (
        <LogInteractionDialog
          key={logTargets.map((c) => c.id).join(",")}
          contacts={logTargets}
          onClose={() => {
            setLogTargets(null);
            tableRef.current?.resetRowSelection();
          }}
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
