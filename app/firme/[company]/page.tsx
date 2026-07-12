import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/dal";
import { formatPhoneNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type CompanyContact = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  city: string | null;
  contact_status: {
    communication_status: string | null;
    interest_tag: string | null;
  }[];
  assignments: { users: { full_name: string | null } | null }[];
  interactions: { count: number }[];
};

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  await requireRole("admin");

  const { company: rawCompany } = await params;
  const company = decodeURIComponent(rawCompany);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, job_title, email, phone, mobile_phone, city, contact_status(communication_status, interest_tag, updated_at), assignments(users(full_name)), interactions(count)",
    )
    .eq("company", company)
    .order("updated_at", {
      referencedTable: "contact_status",
      ascending: false,
    })
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-red-500">
          Greška pri učitavanju firme: {error.message}
        </p>
      </div>
    );
  }

  const contacts = (data ?? []) as unknown as CompanyContact[];
  if (contacts.length === 0) notFound();

  const contactedCount = contacts.filter(
    (contact) => (contact.interactions[0]?.count ?? 0) > 0,
  ).length;

  // "Prihvaćeno" na bilo kom kontaktu = firma je prihvatila partnerstvo
  const accepted = contacts.some(
    (contact) =>
      contact.contact_status[0]?.communication_status === "Prihvaćeno",
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Link
        href="/contacts"
        className="mb-4 inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Kontakti
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-foreground">{company}</h1>
        {accepted ? (
          <Badge>
            <CheckIcon data-icon="inline-start" />
            Prihvatili partnerstvo
          </Badge>
        ) : (
          <Badge variant="outline">Partnerstvo nije prihvaćeno</Badge>
        )}
      </div>

      <p className="mb-6 text-sm text-foreground/60">
        Kontakata: {contacts.length} · Kontaktirano: {contactedCount} od{" "}
        {contacts.length}
      </p>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Ime i Prezime</TableHead>
              <TableHead className="px-4">Pozicija</TableHead>
              <TableHead className="px-4">Grad</TableHead>
              <TableHead className="px-4">Telefon</TableHead>
              <TableHead className="px-4">Email</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Kontaktiran</TableHead>
              <TableHead className="px-4">Dodeljen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const name =
                [contact.first_name, contact.last_name]
                  .filter(Boolean)
                  .join(" ") || "—";
              const phoneRaw = contact.phone ?? contact.mobile_phone;
              const status = contact.contact_status[0] ?? null;
              const interactionsCount = contact.interactions[0]?.count ?? 0;
              const assigneeName =
                contact.assignments[0]?.users?.full_name ?? null;

              return (
                <TableRow key={contact.id}>
                  <TableCell className="px-4">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4">
                    {contact.job_title || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4">
                    {contact.city || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex items-center gap-1">
                      {formatPhoneNumber(phoneRaw) || (
                        <span className="text-muted-foreground">-</span>
                      )}
                      {phoneRaw && (
                        <CopyButton value={phoneRaw} label="Telefon" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex items-center gap-1">
                      {contact.email || (
                        <span className="text-muted-foreground">-</span>
                      )}
                      {contact.email && (
                        <CopyButton value={contact.email} label="Email" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">
                        {status?.communication_status ?? "Nije kontaktiran"}
                      </Badge>
                      {status?.interest_tag && (
                        <Badge variant="outline">{status.interest_tag}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    {interactionsCount > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckIcon className="size-4 text-primary" />
                        Da ({interactionsCount})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Ne</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4">
                    {assigneeName || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
