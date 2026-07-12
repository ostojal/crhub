import type { MyContact } from "@/components/my-contacts/columns";
import { MyContactsView } from "@/components/my-contacts/my-contacts-view";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

export default async function MyContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number }>;
}) {
  const me = await requireRole("user");

  const { page } = await searchParams;
  const from = ((page ?? 1) - 1) * PAGE_SIZE;

  const supabase = createClient();

  const { data: assignments, error } = await supabase
    .from("assignments")
    .select(
      "assigned_at, contacts(id, first_name, last_name, company, job_title, email, phone, mobile_phone, city, contact_status(communication_status, interest_tag, updated_at))",
    )
    .eq("user_id", me.id)
    .order("assigned_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  const { count } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", me.id);

  const pagesCount = Math.ceil((count ?? 0) / PAGE_SIZE);

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-foreground">
        Moji kontakti
      </h1>
      <p className="mb-6 text-sm text-foreground/60">
        Kontakti koji su ti dodeljeni. Klikni na ime za detalje i istoriju,
        ili odmah evidentiraj kontaktiranje.
      </p>

      <MyContactsView contacts={contacts} pagesCount={pagesCount} />
    </div>
  );
}
