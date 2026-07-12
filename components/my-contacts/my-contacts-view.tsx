"use client";

import { DataTable } from "@/components/data-table";
import {
  type LogContact,
  LogInteractionDialog,
} from "@/components/interactions/log-interaction-dialog";
import { Button } from "@/components/ui/button";
import { PhoneOutgoingIcon } from "lucide-react";
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
  const tableRef = useRef<TanstackTable<MyContact> | null>(null);

  const columns = useMemo(
    () =>
      buildMyContactColumns({
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
    </>
  );
}
