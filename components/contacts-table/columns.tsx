import { formatPhoneNumber } from "@/lib/format";
import { Column, ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/button";
import { Contact } from "./contacts-table";
import { format } from "date-fns";

export const columns: ColumnDef<Contact>[] = [
  {
    id: "name",
    accessorFn: (row) =>
      [row.first_name, row.last_name].filter(Boolean).join(" "),

    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Ime i Prezime" />
    ),
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
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorFn: (row) => formatPhoneNumber(row.phone ?? row.mobile_phone),
    header: "Telefon",
  },
  {
    id: "created_at",
    accessorFn: (row) => format(row.created_at, "dd.MM.yyyy."),

    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Dodat" />
    ),
  },
  {
    accessorFn: (row) =>
      row.contact_status[0]?.communication_status ?? "Nepoznat",
    header: "Status",
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
