import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CountItem, UserStats } from "@/lib/analytics";
import { format } from "date-fns";
import Link from "next/link";

export function UserStatsView({ stats }: { stats: UserStats }) {
  const tiles = [
    { label: "Dodeljeni kontakti", value: stats.assignedTotal },
    { label: "Kontaktirano (različitih)", value: stats.contactedCount },
    { label: "Ukupno interakcija", value: stats.interactionsTotal },
    { label: "Poslednjih 30 dana", value: stats.last30Days },
  ];

  return (
    <div className="space-y-6">
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

      <div className="grid gap-6 md:grid-cols-2">
        <BarListCard title="Interakcije po tipu" items={stats.byType} />
        <BarListCard
          title="Statusi dodeljenih kontakata"
          items={stats.byStatus}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Poslednje interakcije</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Još nema evidentiranih kontaktiranja.
            </p>
          ) : (
            <ul className="space-y-3">
              {stats.recent.map((interaction) => (
                <li
                  key={interaction.id}
                  className="flex flex-wrap items-baseline gap-2 text-sm"
                >
                  <span className="text-muted-foreground tabular-nums">
                    {format(interaction.created_at, "dd.MM.yyyy. HH:mm")}
                  </span>
                  {interaction.contactId ? (
                    <Link
                      href={`/contacts/${interaction.contactId}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {interaction.contactName}
                    </Link>
                  ) : (
                    <span className="font-medium">
                      {interaction.contactName}
                    </span>
                  )}
                  {interaction.company && (
                    <span className="text-muted-foreground">
                      ({interaction.company})
                    </span>
                  )}
                  <Badge variant="secondary">
                    {interaction.type || "Nepoznato"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
