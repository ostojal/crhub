import { InteractionsList } from "@/components/interactions/interactions-list";
import { LogInteractionButton } from "@/components/interactions/log-interaction-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireContactAccess } from "@/lib/dal";
import { formatPhoneNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const contactId = Number(rawId);
  if (!Number.isInteger(contactId) || contactId <= 0) notFound();

  const me = await requireContactAccess(contactId);

  const supabase = createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select(
      "*, contact_status(communication_status, interest_tag, updated_at), assignments(assigned_at, users(id, full_name, email))",
    )
    .eq("id", contactId)
    .order("updated_at", {
      referencedTable: "contact_status",
      ascending: false,
    })
    .maybeSingle();

  if (!contact) notFound();

  const { data: interactions } = await supabase
    .from("interactions")
    .select("id, type, notes, created_at, users(full_name, email)")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(100);

  const name =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—";
  const status = contact.contact_status[0] ?? null;
  const assignment = contact.assignments[0] ?? null;
  const assigneeName =
    assignment?.users?.full_name || assignment?.users?.email || null;

  const backHref = me.role === "user" ? "/moji-kontakti" : "/contacts";
  const backLabel = me.role === "user" ? "Moji kontakti" : "Kontakti";

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "Firma", value: contact.company },
    { label: "Pozicija", value: contact.job_title },
    { label: "Grad", value: contact.city },
    { label: "Email", value: contact.email },
    { label: "Telefon", value: formatPhoneNumber(contact.phone) },
    {
      label: "Mobilni",
      value: formatPhoneNumber(contact.mobile_phone),
    },
    {
      label: "Dodat",
      value: format(contact.created_at, "dd.MM.yyyy."),
    },
    { label: "Dodeljen", value: assigneeName },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {backLabel}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{name}</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {[contact.job_title, contact.company].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">
              {status?.communication_status ?? "Nije kontaktiran"}
            </Badge>
            {status?.interest_tag && (
              <Badge variant="outline">{status.interest_tag}</Badge>
            )}
          </div>
        </div>

        <LogInteractionButton contactId={contact.id} contactName={name} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Podaci</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {fields.map((field) => (
                <div
                  key={field.label}
                  className="flex items-baseline justify-between gap-4"
                >
                  <dt className="shrink-0 text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="text-right">
                    {field.value || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </dd>
                </div>
              ))}
              {contact.notes && (
                <div>
                  <dt className="text-muted-foreground">Beleške</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{contact.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Istorija kontaktiranja</CardTitle>
          </CardHeader>
          <CardContent>
            <InteractionsList interactions={interactions ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
