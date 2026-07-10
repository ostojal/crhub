import { formatPhoneNumber } from "@/lib/format";
import { ColumnDef } from "@tanstack/react-table";
import { Contact } from "./contacts-table";

export const columns: ColumnDef<Contact>[] = [
  {
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    header: "Ime",
  },
  {
    accessorKey: "company",
    header: "Firma",
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
