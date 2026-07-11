import { formatPhoneNumber } from "@/lib/format";
import { Column, ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/button";
import { Contact } from "./contacts-table";
import { format } from "date-fns";

export const columns: ColumnDef<Contact>[] = [
  {
    id: "name",
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,

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
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorFn: (row) => formatPhoneNumber(row.phone ?? row.mobile_phone!),
    header: "Telefon",
  },
  {
    id: "created_at",
    accessorFn: (row) => format(row.created_at, "dd.MM.yy."),

    header: ({ column }) => (
      <SortableColumnHeader column={column} title="Datum kreiranja" />
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
