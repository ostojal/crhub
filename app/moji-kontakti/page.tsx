import type { MyContact } from "@/components/my-contacts/columns";
import { MyContactsView } from "@/components/my-contacts/my-contacts-view";
import { requireRole } from "@/lib/dal";
import { getPendingEmailContactIds } from "@/lib/email/status";
import { createClient } from "@/lib/supabase/server";

// Korisnik ima desetine, ne hiljade dodeljenih kontakata, pa se učitavaju svi
// odjednom — tek tako već kontaktirani mogu da odu na dno cele liste, a ne
// samo unutar tekuće strane
const MAX_CONTACTS = 500;

export default async function MyContactsPage() {
  const me = await requireRole("user");

  const supabase = createClient();

  const { data: assignments, error } = await supabase
    .from("assignments")
    .select(
      "assigned_at, contacts(id, first_name, last_name, company, job_title, email, phone, mobile_phone, city, category, notes, contact_status(communication_status, interest_tag, updated_at))",
    )
    .eq("user_id", me.id)
    .order("assigned_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(MAX_CONTACTS);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-red-500">
          Greška pri učitavanju kontakata: {error.message}
        </p>
      </div>
    );
  }

  const contacts = (assignments ?? []).flatMap((assignment) => {
    if (!assignment.contacts) return [];
    return [{ ...assignment.contacts, assigned_at: assignment.assigned_at }];
  }) as unknown as MyContact[];

  // Kontakti sa mejlom koji čeka slanje — status im piše "Zakazano"
  const pending = await getPendingEmailContactIds(
    supabase,
    contacts.map((contact) => contact.id),
  );

  for (const contact of contacts) {
    contact.email_pending = pending.has(contact.id);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-foreground">
        Moji kontakti
      </h1>
      <p className="mb-6 text-sm text-foreground/60">
        Kontakti koji su ti dodeljeni. Klikni na ime za detalje i istoriju, ili
        odmah pošalji mejl.
      </p>

      <MyContactsView contacts={contacts} />
    </div>
  );
}
