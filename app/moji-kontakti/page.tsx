import type { MyContact } from "@/components/my-contacts/columns";
import { MyContactsView } from "@/components/my-contacts/my-contacts-view";
import { getContactStatuses } from "@/lib/contact-status";
import { requireRole } from "@/lib/dal";
import { getPendingEmailContactIds } from "@/lib/email/status";
import { requireActiveProject } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

// Korisnik ima desetine, ne hiljade dodeljenih kontakata, pa se učitavaju svi
// odjednom — tek tako već kontaktirani mogu da odu na dno cele liste, a ne
// samo unutar tekuće strane
const MAX_CONTACTS = 500;

export default async function MyContactsPage() {
  const me = await requireRole("user");
  const project = await requireActiveProject();

  const supabase = createClient();

  // Dodele važe po projektu: isti korisnik na GreenTour-u ima svoj spisak,
  // nezavisan od DigiHack-a
  const { data: assignments, error } = await supabase
    .from("assignments")
    .select(
      "assigned_at, contacts(id, first_name, last_name, company, job_title, email, phone, mobile_phone, city, category, notes)",
    )
    .eq("project_id", project.id)
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

  const contactIds = contacts.map((contact) => contact.id);

  // Status i mejlovi na čekanju idu posebnim upitima, oba u okviru projekta
  const [statuses, pending] = await Promise.all([
    getContactStatuses(supabase, project.id, contactIds),
    getPendingEmailContactIds(supabase, project.id, contactIds),
  ]);

  for (const contact of contacts) {
    const status = statuses.get(contact.id);
    contact.contact_status = status ? [status] : [];
    contact.email_pending = pending.has(contact.id);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-foreground">
        Moji kontakti
      </h1>
      <p className="mb-6 text-sm text-foreground/60">
        Kontakti koji su ti dodeljeni na projektu {project.name}. Klikni na ime
        za detalje i istoriju, ili odmah pošalji mejl.
      </p>

      <MyContactsView contacts={contacts} />
    </div>
  );
}
