import { formatPhoneNumber } from "@/lib/format";
import { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/button";
import { Contact } from "./contacts-table";

export const columns: ColumnDef<Contact>[] = [
  {
    id: "name",
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,

    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-between"
        >
          Ime
          {column.getIsSorted() === "asc" ? (
            <ChevronUp className="ml-2 size-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ChevronDown className="ml-2 size-4" />
          ) : (
            <ChevronsUpDown className="ml-2 size-4 text-muted-foreground/70" />
          )}
        </Button>
      );
    },
  },
  {
    id: "company",
    accessorKey: "company",

    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-between"
        >
          Firma
          {column.getIsSorted() === "asc" ? (
            <ChevronUp className="ml-2 size-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ChevronDown className="ml-2 size-4" />
          ) : (
            <ChevronsUpDown className="ml-2 size-4 text-muted-foreground/70" />
          )}
        </Button>
      );
    },
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
    accessorFn: (row) =>
      row.contact_status[0]?.communication_status ?? "Nepoznat",
    header: "Status",
  },
];
