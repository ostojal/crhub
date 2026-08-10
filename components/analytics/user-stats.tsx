import { RecentInteractionsCard } from "@/components/analytics/recent-interactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CountItem, UserStats } from "@/lib/analytics";

export function UserStatsView({ stats }: { stats: UserStats }) {
  const tiles = [
    { label: "Dodeljeni kontakti", value: stats.assignedTotal },
    { label: "Kontaktirano (različitih)", value: stats.contactedCount },
    { label: "Poslati mejlovi (iz aplikacije)", value: stats.sentEmails },
    { label: "Poslato follow-upova", value: stats.followUpsSent },
    { label: "Ručno evidentirano", value: stats.manualLogs },
    { label: "Poslednjih 30 dana", value: stats.last30Days },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {tiles.map((tile) => (
          <Card key={tile.label} size="sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-muted-foreground sm:text-sm">
                {tile.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums sm:text-3xl">
                {tile.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <BarListCard title="Interakcije po tipu" items={stats.byType} />
        <BarListCard
          title="Statusi dodeljenih kontakata"
          items={stats.byStatus}
        />
        <BarListCard
          title="Kontaktirani partneri po kategoriji"
          items={stats.byCategory}
        />
      </div>

      <RecentInteractionsCard interactions={stats.recent} />
    </div>
  );
}

// Jednobojna bar lista (magnitude → jedna nijansa); vrednosti su tekst u
// tekstualnim tokenima, boja nosi samo dužinu
function BarListCard({ title, items }: { title: string; items: CountItem[] }) {
  const max = Math.max(...items.map((item) => item.count), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {max === 0 ? (
          <p className="text-sm text-muted-foreground">Još nema podataka.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.label} title={`${item.label}: ${item.count}`}>
                <div className="mb-1 flex items-baseline justify-between gap-4 text-sm">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-primary/15">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(item.count / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
