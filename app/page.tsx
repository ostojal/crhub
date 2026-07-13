import { UserStatsView } from "@/components/analytics/user-stats";
import { UsersSummaryTable } from "@/components/analytics/users-summary-table";
import { PendingAccess } from "@/components/pending-access";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUserStats, getUsersSummary } from "@/lib/analytics";
import { ROLE_LABELS } from "@/lib/constants";
import { getCurrentUser, getSession } from "@/lib/dal";
import { NAV_LINKS } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    const session = await getSession();

    return (
      <div className="flex flex-1 items-center justify-center bg-background px-4">
        <PendingAccess email={session?.user?.email ?? ""} />
      </div>
    );
  }

  const links = NAV_LINKS[user.role];
  const firstName = user.fullName?.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">
        Zdravo{firstName ? `, ${firstName}` : ""}!
      </h1>
      <p className="mt-1 text-sm text-foreground/60">
        Uloga: {ROLE_LABELS[user.role]}
      </p>

      {links.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="h-full transition-colors hover:bg-foreground/5">
                <CardHeader>
                  <CardTitle>{link.label}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-foreground/60">
          Trenutno nema stranica dostupnih za tvoju ulogu.
        </p>
      )}

      {user.role === "user" && <UserDashboard userId={user.id} />}
      {user.role === "admin" && <AdminDashboard />}
    </div>
  );
}

async function UserDashboard({ userId }: { userId: number }) {
  const stats = await getUserStats(userId);

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        Moja analitika
      </h2>
      <UserStatsView stats={stats} />
    </section>
  );
}

async function AdminDashboard() {
  const supabase = createClient();

  const [rows, contactsRes, assignedRes] = await Promise.all([
    getUsersSummary(),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("assignments").select("id", { count: "exact", head: true }),
  ]);

  const interactionsTotal = rows.reduce(
    (sum, row) => sum + row.interactions,
    0,
  );

  const tiles = [
    { label: "Ukupno kontakata", value: contactsRes.count ?? 0 },
    { label: "Dodeljeno kontakata", value: assignedRes.count ?? 0 },
    { label: "Ukupno interakcija", value: interactionsTotal },
    { label: "Korisnika u timu", value: rows.length },
  ];

  return (
    <section className="mt-10 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Analitika</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">
                {tile.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">
                {tile.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <UsersSummaryTable rows={rows} />
    </section>
  );
}
