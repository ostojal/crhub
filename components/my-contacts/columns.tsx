import { dashValue } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { formatPhoneNumber } from "@/lib/format";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { PhoneOutgoingIcon } from "lucide-react";
import Link from "next/link";

export type MyContact = {
  id: number;
  assigned_at: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  city: string | null;
  contact_status: {
    communication_status: string | null;
    interest_tag: string | null;
    updated_at: string;
  }[];
};

export function contactDisplayName(contact: {
  first_name: string | null;
  last_name: string | null;
}): string {
  return (
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"
  );
}

export function buildMyContactColumns({
  onLog,
}: {
  onLog: (contact: MyContact) => void;
}): ColumnDef<MyContact>[] {
  return [
    {
      id: "name",
      accessorFn: (row) => contactDisplayName(row),
      header: "Ime i Prezime",
      cell: ({ row }) => (
        <Link
          href={`/contacts/${row.original.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {contactDisplayName(row.original)}
        </Link>
      ),
    },
    {
      id: "company",
      accessorKey: "company",
      header: "Firma",
      cell: ({ getValue }) => dashValue(getValue()),
    },
    {
      id: "job_title",
      accessorKey: "job_title",
      header: "Pozicija",
      cell: ({ getValue }) => dashValue(getValue()),
    },
    {
      id: "phone",
      accessorFn: (row) => formatPhoneNumber(row.phone ?? row.mobile_phone),
      header: "Telefon",
      cell: ({ getValue }) => dashValue(getValue()),
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => dashValue(getValue()),
    },
    {
      id: "status",
      accessorFn: (row) =>
        row.contact_status?.[0]?.communication_status ?? null,
      header: "Status",
      cell: ({ getValue }) => dashValue(getValue()),
    },
    {
      id: "assigned_at",
      accessorFn: (row) => format(row.assigned_at, "dd.MM.yyyy."),
      header: "Dodeljen",
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Akcije</span>,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onLog(row.original)}
        >
          <PhoneOutgoingIcon data-icon="inline-start" />
          Evidentiraj
        </Button>
      ),
    },
  ];
}
