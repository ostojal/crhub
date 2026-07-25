import { UserStatsView } from "@/components/analytics/user-stats";
import { UsersSummaryTable } from "@/components/analytics/users-summary-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getSentByCategory,
  getUserStats,
  getUsersSummary,
} from "@/lib/analytics";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const me = await requireRole("admin", "user");

  if (me.role === "user") {
    const stats = await getUserStats(me.id);

    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-foreground">
          Moja analitika
        </h1>
        <UserStatsView stats={stats} />
      </div>
    );
  }

  const { user: userParam } = await searchParams;
  const targetId = Number(userParam);

  if (userParam && Number.isInteger(targetId) && targetId > 0) {
    const supabase = createClient();
    const { data: target } = await supabase
      .from("users")
      .select("id, full_name, email")
      .eq("id", targetId)
      .maybeSingle();

    if (target) {
      const stats = await getUserStats(target.id);
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
          <h1 className="mb-6 text-xl font-semibold text-foreground">
            Analitika: {name}
          </h1>
          <UserStatsView stats={stats} />
        </div>
      );
    }
  }

  const [rows, byCategory] = await Promise.all([
    getUsersSummary(),
    getSentByCategory(),
  ]);

  const sentTotal = byCategory.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Analitika</h1>
      <p className="mb-6 text-sm text-foreground/60">
        Pregled kontaktiranja po korisnicima. Otvori detalje za pojedinačnu
        analitiku.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Poslati mejlovi po kategoriji partnera</CardTitle>
        </CardHeader>
        <CardContent>
          {sentTotal === 0 ? (
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

      <UsersSummaryTable rows={rows} />
    </div>
  );
}
