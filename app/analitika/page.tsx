import { UserStatsView } from "@/components/analytics/user-stats";
import { UsersSummaryTable } from "@/components/analytics/users-summary-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getContactedByCategory,
  getUserStats,
  getUsersSummary,
} from "@/lib/analytics";
import { requireRole } from "@/lib/dal";
import { requireActiveProject } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const me = await requireRole("admin", "editor", "user");
  const project = await requireActiveProject();

  if (me.role === "user") {
    const stats = await getUserStats(project.id, me.id);

    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="text-xl font-semibold text-foreground">
          Moja analitika
        </h1>
        <p className="mb-6 text-sm text-foreground/60">
          Projekat {project.name}
        </p>
        <UserStatsView stats={stats} />
      </div>
    );
  }

  const { user: userParam } = await searchParams;
  const targetId = Number(userParam);

  if (userParam && Number.isInteger(targetId) && targetId > 0) {
    const supabase = createClient();

    // Statistika zavisi samo od id-ja iz URL-a, pa ne mora da čeka ime
    const [{ data: target }, stats] = await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, email")
        .eq("id", targetId)
        .maybeSingle(),
      getUserStats(project.id, targetId),
    ]);

    if (target) {
      const name = target.full_name || target.email || `Korisnik #${target.id}`;

      return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <Link
            href="/analitika"
            className="mb-4 inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Svi korisnici
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Analitika: {name}
          </h1>
          <p className="mb-6 text-sm text-foreground/60">
            Projekat {project.name}
          </p>
          <UserStatsView stats={stats} />
        </div>
      );
    }
  }

  // Urednik i sam šalje mejlove, pa uz pregled tima dobija i svoje brojke.
  // Zbirna tabela ispod prikazuje naloge sa ulogom korisnika, u kojoj on nije.
  const [rows, byCategory, myStats] = await Promise.all([
    getUsersSummary(project.id),
    getContactedByCategory(project.id),
    me.role === "editor" ? getUserStats(project.id, me.id) : null,
  ]);

  const contactedTotal = byCategory.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Analitika</h1>
      <p className="mb-6 text-sm text-foreground/60">
        Pregled kontaktiranja po korisnicima na projektu {project.name}. Otvori
        detalje za pojedinačnu analitiku.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Kontaktirani partneri po kategoriji</CardTitle>
        </CardHeader>
        <CardContent>
          {contactedTotal === 0 ? (
            <p className="text-sm text-muted-foreground">
              Još nije poslat nijedan mejl iz aplikacije.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {byCategory.map((item) => (
                <div key={item.label}>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {item.count}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {myStats && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Moja analitika
          </h2>
          <UserStatsView stats={myStats} />
        </section>
      )}

      <h2 className="mb-4 text-lg font-semibold text-foreground">
        Analitika korisnika
      </h2>
      <UsersSummaryTable rows={rows} />
    </div>
  );
}
