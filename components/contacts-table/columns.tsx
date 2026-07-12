import { CopyButton } from "@/components/copy-button";
import { dashValue, SortableColumnHeader } from "@/components/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import type { Role } from "@/lib/constants";
import { formatPhoneNumber } from "@/lib/format";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { NotebookTextIcon } from "lucide-react";
import {
  ContactActions,
  type ContactActionHandlers,
} from "./contact-actions";

export type AssigneeOption = {
  id: number;
  full_name: string | null;
  email: string | null;
};

export type ContactAssignment = {
  user_id: number | null;
  users: { id: number; full_name: string | null } | null;
};

// Editor dobija samo id, company, job_title i dodelu — PII polja postoje
// isključivo u adminovom SELECT-u i zato su opciona
export type ContactRow = {
  id: number;
  company: string | null;
  job_title: string | null;
  assignments: ContactAssignment[];
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  city?: string | null;
  notes?: string | null;
  created_at?: string;
  contact_status?: {
    communication_status: string | null;
    interest_tag: string | null;
    updated_at: string;
  }[];
};

export function getAssigneeName(row: ContactRow): string | null {
  return row.assignments[0]?.users?.full_name ?? null;
}

export function isAssigned(row: ContactRow): boolean {
  return !!row.assignments[0]?.users;
}

export function contactName(contact: ContactRow): string {
  return (
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"
  );
}

type BuildColumnsOptions = {
  viewer: Extract<Role, "admin" | "editor">;
  handlers: ContactActionHandlers;
};

export function buildContactColumns({
  viewer,
  handlers,
}: BuildColumnsOptions): ColumnDef<ContactRow>[] {
  const select: ColumnDef<ContactRow> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };

  const company: ColumnDef<ContactRow> = {
    id: "company",
    accessorKey: "company",
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Firma" />
    ),
    cell: ({ getValue }) => dashValue(getValue()),
  };

  const jobTitle: ColumnDef<ContactRow> = {
    id: "job_title",
    accessorKey: "job_title",
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Pozicija" />
    ),
    cell: ({ getValue }) => dashValue(getValue()),
  };

  const assignee: ColumnDef<ContactRow> = {
    id: "assignee",
    accessorFn: (row) => getAssigneeName(row),
    header: "Dodeljen",
    cell: ({ getValue }) => dashValue(getValue()),
  };

  const actions: ColumnDef<ContactRow> = {
    id: "actions",
    cell: ({ row }) => (
      <ContactActions
        contact={row.original}
        viewer={viewer}
        handlers={handlers}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };

  if (viewer === "editor") {
    return [select, company, jobTitle, assignee, actions];
  }

  return [
    select,
    {
      id: "name",
      accessorFn: (row) =>
        [row.first_name, row.last_name].filter(Boolean).join(" "),
      header: ({ column }) => (
        <SortableColumnHeader column={column} title="Ime i Prezime" />
      ),
      cell: ({ row, cell }) => {
        return (
          <div className="flex items-center gap-2">
            {dashValue(cell.getValue<string>())}
            {row.original.notes && (
              <NotebookTextIcon className="size-4 text-muted-foreground" />
            )}
          </div>
        );
      },
    },
    company,
    jobTitle,
    {
      id: "city",
      accessorKey: "city",
      header: ({ column }) => (
        <SortableColumnHeader column={column} title="Grad" />
      ),
      cell: ({ getValue }) => dashValue(getValue()),
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      cell: ({ row, getValue }) => (
        <div className="flex items-center gap-1">
          {dashValue(getValue())}
          {row.original.email && (
            <CopyButton value={row.original.email} label="Email" />
          )}
        </div>
      ),
    },
    {
      id: "mobile_phone",
      header: "Mobilni Telefon",
      accessorFn: (row) => formatPhoneNumber(row.mobile_phone),
      cell: ({ row, getValue }) => (
        <div className="flex items-center gap-1">
          {dashValue(getValue())}
          {row.original.mobile_phone && (
            <CopyButton
              value={row.original.mobile_phone}
              label="Mobilni telefon"
            />
          )}
        </div>
      ),
    },
    {
      id: "phone",
      header: "Fiksni Telefon",
      accessorFn: (row) => formatPhoneNumber(row.phone),
      cell: ({ row, getValue }) => (
        <div className="flex items-center gap-1">
          {dashValue(getValue())}
          {row.original.phone && (
            <CopyButton value={row.original.phone} label="Fiksni telefon" />
          )}
        </div>
      ),
    },
    {
      id: "created_at",
      accessorFn: (row) =>
        row.created_at ? format(row.created_at, "dd.MM.yyyy.") : null,
      header: ({ column }) => (
        <SortableColumnHeader column={column} title="Dodat" />
      ),
      cell: ({ getValue }) => dashValue(getValue()),
    },
    {
      id: "contact_status",
      accessorFn: (row) =>
        row.contact_status?.[0]?.communication_status ?? "Nepoznat",
      header: "Status",
    },
    assignee,
    actions,
  ];
}

export function columnIdToLabel(columnId: string) {
  switch (columnId) {
    case "name":
      return "Ime i Prezime";
    case "company":
      return "Firma";
    case "job_title":
      return "Pozicija";
    case "city":
      return "Grad";
    case "email":
      return "Email";
    case "mobile_phone":
      return "Mobilni Telefon";
    case "phone":
      return "Fiksni Telefon";
    case "created_at":
      return "Dodat";
    case "contact_status":
      return "Status";
    case "assignee":
      return "Dodeljen";
    default:
      return columnId;
  }
}
