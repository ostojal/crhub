import { ContactsTable } from "@/components/contacts-table/contacts-table";
import { applyFilter, createSearchFilter } from "@/lib/create-search-filter";
import { createClient } from "@/lib/supabase/server";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number; sort?: string; q?: string }>;
}) {
  const { page, sort, q } = await searchParams;

  const supabase = createClient();

  const query = supabase
    .from("contacts")
    .select(
      "*, contact_status(communication_status, interest_tag, updated_at)",
    );

  const searchTerm = q?.trim();
  const searchFilter = createSearchFilter(searchTerm);

  if (searchFilter) {
    applyFilter(query, searchFilter);
  }

  if (sort) {
    const id = sort.split(":")[0];
    const order = sort.split(":")[1] === "desc" ? "desc" : "asc";
    const asc = order === "asc";

    switch (id) {
      case "name":
        query
          .order("first_name", { ascending: asc })
          .order("last_name", { ascending: asc });
        break;

      case "company":
      case "job_title":
      case "city":
        query.order(id, { ascending: asc });
        break;

      case "created_at":
        query.order("created_at", { ascending: asc });
        break;
    }
  } else {
    query.order("created_at", { ascending: false });
  }

  query.range(((page ?? 1) - 1) * 25, (page ?? 1) * 25 - 1).limit(25);

  const { data: contacts, error } = await query;

  const countQuery = supabase.from("contacts").select("id", {
    count: "exact",
    head: true,
  });

  if (searchFilter) {
    applyFilter(countQuery, searchFilter);
  }

  const { count } = await countQuery;

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
    <div className="mx-auto w-6xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Kontakti</h1>

      <ContactsTable contacts={contacts || []} pagesCount={pagesCount} />
    </div>
  );
}
