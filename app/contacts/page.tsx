import { ContactsTable } from "@/components/contacts-table/contacts-table";
import { createClient } from "@/lib/supabase/server";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number }>;
}) {
  const { page } = await searchParams;

  const supabase = createClient();

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("*, contact_status(communication_status, interest_tag, updated_at)")
    .order("created_at", { ascending: false })
    .range(((page ?? 1) - 1) * 25, (page ?? 1) * 25 - 1)
    .limit(25);

  const { count } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true });

  const pagesCount = Math.ceil((count ?? 0) / 25);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-red-500">
          Greška pri učitavanju kontakata: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Kontakti</h1>

      <ContactsTable contacts={contacts || []} pagesCount={pagesCount} />
    </div>
  );
}
