"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecentInteraction } from "@/lib/analytics";
import { format } from "date-fns";
import Link from "next/link";
import { useState } from "react";

// Koliko se vidi pre nego što se spisak raširi
const PREVIEW_COUNT = 8;

export function RecentInteractionsCard({
  interactions,
}: {
  interactions: RecentInteraction[];
}) {
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? interactions : interactions.slice(0, PREVIEW_COUNT);
  const hidden = interactions.length - visible.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {showAll ? "Sve interakcije" : "Poslednje interakcije"}
          {interactions.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
              {interactions.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {interactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Još nema evidentiranih kontaktiranja.
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {visible.map((interaction) => (
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

            {(hidden > 0 || showAll) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Prikaži manje" : `Prikaži sve (još ${hidden})`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
