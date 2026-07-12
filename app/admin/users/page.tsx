import { AddUserDialog } from "@/components/admin/add-user-dialog";
import { UsersTable } from "@/components/admin/users-table";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const me = await requireRole("admin");

  const supabase = createClient();
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-red-500">
          Greška pri učitavanju korisnika: {error.message}
        </p>
      </div>
    );
  }

  // Nalozi na čekanju idu na vrh da ih admin odmah primeti
  const sorted = [...(users ?? [])].sort(
    (a, b) => Number(a.role !== null) - Number(b.role !== null),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Korisnici</h1>
        <AddUserDialog />
      </div>

      <UsersTable users={sorted} currentUserId={me.id} />
    </div>
  );
}
