import { ContactsView } from "@/components/contacts-table/contacts-view";
import type {
  AssigneeOption,
  ContactRow,
} from "@/components/contacts-table/columns";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

// PII (ime, email, telefon...) sme da bude samo u adminovom SELECT-u —
// editor dobija isključivo firmu, poziciju i dodelu
const ADMIN_SELECT =
  "*, contact_status(communication_status, interest_tag, updated_at), assignments(user_id, users(id, full_name))";
const EDITOR_SELECT =
  "id, company, job_title, assignments(user_id, users(id, full_name))";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number; sort?: string }>;
}) {
  const me = await requireRole("admin", "editor");
  const isAdmin = me.role === "admin";

  const { page, sort } = await searchParams;

  const supabase = createClient();

  const query = supabase
    .from("contacts")
    .select(isAdmin ? ADMIN_SELECT : EDITOR_SELECT);

  if (isAdmin) {
    // Najnoviji status prvi, da [0] uvek bude aktuelan red
    query.order("updated_at", {
      referencedTable: "contact_status",
      ascending: false,
    });
  }

  const [sortId, sortOrder] = (sort ?? "").split(":");
  const asc = sortOrder !== "desc";
  const editorSortable = ["company", "job_title"];
  const adminSortable = ["name", "company", "job_title", "city", "created_at"];
  const sortable = isAdmin ? adminSortable : editorSortable;

  if (sortId && sortable.includes(sortId)) {
    if (sortId === "name") {
      query
        .order("first_name", { ascending: asc })
        .order("last_name", { ascending: asc });
    } else {
      query.order(sortId, { ascending: asc });
    }
  } else if (isAdmin) {
    query.order("created_at", { ascending: false });
  } else {
    query.order("company", { ascending: true });
  }

  // Stabilna paginacija kad primarna kolona ima ponovljene vrednosti
  query.order("id", { ascending: true });

  query.range(((page ?? 1) - 1) * PAGE_SIZE, (page ?? 1) * PAGE_SIZE - 1);

  const { data: contacts, error } = await query;

  const { count } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true });

  const pagesCount = Math.ceil((count ?? 0) / PAGE_SIZE);

  const { data: assignees } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("role", "user")
    .order("full_name", { ascending: true });

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

      <ContactsView
        viewer={me.role as "admin" | "editor"}
        contacts={(contacts ?? []) as unknown as ContactRow[]}
        assignees={(assignees ?? []) as AssigneeOption[]}
        pagesCount={pagesCount}
      />
    </div>
  );
}
