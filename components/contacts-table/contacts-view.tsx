"use client";

import { DataTable, type DefaultSort } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/constants";
import type { Table as TanstackTable } from "@tanstack/react-table";
import { UserPlusIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AssignDialog, type AssignTarget } from "./assign-dialog";
import {
  type AssigneeOption,
  buildContactColumns,
  type ContactRow,
} from "./columns";

const MAX_BULK = 25;

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
  const tableRef = useRef<TanstackTable<ContactRow> | null>(null);

  const columns = useMemo(
    () =>
      buildContactColumns({
        viewer,
        onAssign: (contact) => setTarget({ kind: "single", contact }),
      }),
    [viewer],
  );

  const defaultSort: DefaultSort = useMemo(
    () =>
      viewer === "admin"
        ? { id: "created_at", desc: true }
        : { id: "company", desc: false },
    [viewer],
  );

  return (
    <>
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
    </>
  );
}
