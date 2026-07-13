import { CopyButton } from "@/components/copy-button";
import { dashValue } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
    },
    {
      id: "name",
      accessorFn: (row) => contactDisplayName(row),
      header: "Ime i prezime",
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
      header: "Kompanija",
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
      cell: ({ row, getValue }) => {
        const raw = row.original.phone ?? row.original.mobile_phone;
        return (
          <div className="flex items-center gap-1">
            {dashValue(getValue())}
            {raw && <CopyButton value={raw} label="Telefon" />}
          </div>
        );
      },
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
      id: "status",
      accessorFn: (row) =>
        row.contact_status?.[0]?.communication_status ?? null,
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.contact_status?.[0]?.communication_status}
        />
      ),
    },
    {
      id: "assigned_at",
      accessorFn: (row) => format(row.assigned_at, "dd.MM.yyyy."),
      header: "Dodeljeno",
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
