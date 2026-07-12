import { formatPhoneNumber } from "@/lib/format";
import { Column, ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  NotebookTextIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { ContactActions } from "./contact-actions";
import { Contact } from "./contacts-table";

export const columns: ColumnDef<Contact>[] = [
  {
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
  },
  {
    id: "name",
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,

    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Ime i Prezime" />
    ),

    cell: ({ row, cell }) => {
      return (
        <div className="flex items-center gap-2">
          {cell.getValue<string>()}
          {row.original.notes && (
            <NotebookTextIcon className="size-4 text-muted-foreground" />
          )}
        </div>
      );
    },
  },
  {
    id: "company",
    accessorKey: "company",

    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Firma" />
    ),
  },
  {
    id: "job_title",
    accessorKey: "job_title",

    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Pozicija" />
    ),
  },
  {
    id: "city",
    accessorKey: "city",

    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Grad" />
    ),
  },
  {
    id: "email",
    accessorKey: "email",
    header: "Email",
  },
  {
    id: "mobile_phone",
    header: "Mobilni Telefon",
    accessorFn: (row) => formatPhoneNumber(row.mobile_phone),
  },
  {
    id: "phone",
    header: "Fiksni Telefon",
    accessorFn: (row) => formatPhoneNumber(row.phone),
  },
  {
    id: "created_at",
    accessorFn: (row) => format(row.created_at, "dd.MM.yyyy."),

    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Dodat" />
    ),
  },
  {
    id: "contact_status",
    accessorFn: (row) =>
      row.contact_status[0]?.communication_status ?? "Nepoznat",
    header: "Status",
  },
  {
    id: "actions",
    cell: ({ row }) => <ContactActions contact={row.original} />,
    enableSorting: false,
    enableHiding: false,
  },
];

function SortableColumnHeader({
  column,
  title,
}: {
  column: Column<Contact, unknown>;
  title: string;
}) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="w-full justify-between"
    >
      {title}
      {column.getIsSorted() === "asc" ? (
        <ChevronUp className="ml-2 size-4" />
      ) : column.getIsSorted() === "desc" ? (
        <ChevronDown className="ml-2 size-4" />
      ) : (
        <ChevronsUpDown className="ml-2 size-4 text-muted-foreground/70" />
      )}
    </Button>
  );
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
    default:
      return columnId;
  }
}
