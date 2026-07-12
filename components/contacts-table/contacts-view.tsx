"use client";

import { DataTable, type DefaultSort } from "@/components/data-table";
import {
  type ContactEditable,
  ContactFormDialog,
} from "@/components/contacts/contact-form-dialog";
import { DeleteContactDialog } from "@/components/contacts/delete-contact-dialog";
import { EditStatusDialog } from "@/components/contacts/edit-status-dialog";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/constants";
import type { Table as TanstackTable } from "@tanstack/react-table";
import { PlusIcon, UserPlusIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AssignDialog, type AssignTarget } from "./assign-dialog";
import {
  type AssigneeOption,
  buildContactColumns,
  type ContactRow,
} from "./columns";

const MAX_BULK = 25;

function contactName(contact: ContactRow): string {
  return (
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"
  );
}

function toEditable(contact: ContactRow): ContactEditable {
  return {
    id: contact.id,
    first_name: contact.first_name ?? null,
    last_name: contact.last_name ?? null,
    company: contact.company,
    job_title: contact.job_title,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    mobile_phone: contact.mobile_phone ?? null,
    city: contact.city ?? null,
    notes: contact.notes ?? null,
  };
}

export function ContactsView({
  viewer,
  contacts,
  assignees,
  pagesCount,
}: {
  viewer: Extract<Role, "admin" | "editor">;
  contacts: ContactRow[];
  assignees: AssigneeOption[];
  pagesCount: number;
}) {
  const [target, setTarget] = useState<AssignTarget | null>(null);
  const [formTarget, setFormTarget] = useState<
    { mode: "create" } | { mode: "edit"; contact: ContactRow } | null
  >(null);
  const [statusTarget, setStatusTarget] = useState<ContactRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactRow | null>(null);
  const tableRef = useRef<TanstackTable<ContactRow> | null>(null);

  const isAdmin = viewer === "admin";

  const columns = useMemo(
    () =>
      buildContactColumns({
        viewer,
        onAssign: (contact) => setTarget({ kind: "single", contact }),
        adminHandlers: isAdmin
          ? {
              onEdit: (contact) => setFormTarget({ mode: "edit", contact }),
              onEditStatus: setStatusTarget,
              onDelete: setDeleteTarget,
            }
          : undefined,
      }),
    [viewer, isAdmin],
  );

  const defaultSort: DefaultSort = useMemo(
    () =>
      isAdmin
        ? { id: "created_at", desc: true }
        : { id: "company", desc: false },
    [isAdmin],
  );

  return (
    <>
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setFormTarget({ mode: "create" })}>
            <PlusIcon data-icon="inline-start" />
            Novi kontakt
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={contacts}
        pagesCount={pagesCount}
        defaultSort={defaultSort}
        getRowId={(row) => String(row.id)}
        enableRowSelection
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
                  setTarget({
                    kind: "bulk",
                    contacts: selected.map((row) => row.original),
                  })
                }
              >
                <UserPlusIcon data-icon="inline-start" />
                Dodeli izabrane ({selected.length})
              </Button>
            </div>
          );
        }}
      />

      <AssignDialog
        target={target}
        assignees={assignees}
        onClose={() => setTarget(null)}
        onSuccess={() => {
          setTarget(null);
          tableRef.current?.resetRowSelection();
        }}
      />

      {formTarget && (
        <ContactFormDialog
          key={formTarget.mode === "edit" ? formTarget.contact.id : "create"}
          contact={
            formTarget.mode === "edit" ? toEditable(formTarget.contact) : null
          }
          onClose={() => setFormTarget(null)}
        />
      )}

      {statusTarget && (
        <EditStatusDialog
          key={statusTarget.id}
          contactId={statusTarget.id}
          contactName={contactName(statusTarget)}
          currentStatus={
            statusTarget.contact_status?.[0]?.communication_status ?? null
          }
          currentTag={statusTarget.contact_status?.[0]?.interest_tag ?? null}
          onClose={() => setStatusTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteContactDialog
          key={deleteTarget.id}
          contactId={deleteTarget.id}
          contactName={contactName(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
