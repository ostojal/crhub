"use client";

import { DataTable } from "@/components/data-table";
import { LogInteractionDialog } from "@/components/interactions/log-interaction-dialog";
import { useMemo, useState } from "react";
import {
  buildMyContactColumns,
  contactDisplayName,
  type MyContact,
} from "./columns";

export function MyContactsView({
  contacts,
  pagesCount,
}: {
  contacts: MyContact[];
  pagesCount: number;
}) {
  const [logTarget, setLogTarget] = useState<MyContact | null>(null);

  const columns = useMemo(
    () => buildMyContactColumns({ onLog: setLogTarget }),
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
      />

      {logTarget && (
        <LogInteractionDialog
          key={logTarget.id}
          contactId={logTarget.id}
          contactName={contactDisplayName(logTarget)}
          onClose={() => setLogTarget(null)}
        />
      )}
    </>
  );
}
