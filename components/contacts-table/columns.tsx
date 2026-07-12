import { Checkbox } from "@/components/ui/checkbox";
import { dashValue, SortableColumnHeader } from "@/components/data-table";
import { formatPhoneNumber } from "@/lib/format";
import type { Role } from "@/lib/constants";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ContactRowActions } from "./row-actions";

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

type BuildColumnsOptions = {
  viewer: Extract<Role, "admin" | "editor">;
  onAssign: (contact: ContactRow) => void;
};

export function buildContactColumns({
  viewer,
  onAssign,
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
        aria-label="Izaberi sve na stranici"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Izaberi red"
      />
    ),
    enableSorting: false,
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
    header: () => <span className="sr-only">Akcije</span>,
    cell: ({ row }) => (
      <ContactRowActions contact={row.original} onAssign={onAssign} />
    ),
    enableSorting: false,
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
      cell: ({ getValue }) => dashValue(getValue()),
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
      cell: ({ getValue }) => dashValue(getValue()),
    },
    {
      id: "phone",
      accessorFn: (row) => formatPhoneNumber(row.phone ?? row.mobile_phone),
      header: "Telefon",
      cell: ({ getValue }) => dashValue(getValue()),
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
      id: "status",
      accessorFn: (row) =>
        row.contact_status?.[0]?.communication_status ?? null,
      header: "Status",
      cell: ({ getValue }) => dashValue(getValue()),
    },
    assignee,
    actions,
  ];
}
