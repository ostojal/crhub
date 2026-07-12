import { Button } from "@/components/ui/button";
import { MobileCard, MobileField } from "@/components/ui/mobile-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserSummaryRow } from "@/lib/analytics";
import { format } from "date-fns";
import Link from "next/link";

export function UsersSummaryTable({ rows }: { rows: UserSummaryRow[] }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.length ? (
          rows.map((row) => (
            <MobileCard key={row.userId} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{row.name}</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/analitika?user=${row.userId}`}>Detalji</Link>
                </Button>
              </div>
              <div className="border-t pt-2">
                <MobileField label="Dodeljeno">
                  <span className="tabular-nums">{row.assigned}</span>
                </MobileField>
                <MobileField label="Kontaktirano">
                  <span className="tabular-nums">{row.contacted}</span>
                </MobileField>
                <MobileField label="Interakcije">
                  <span className="tabular-nums">{row.interactions}</span>
                </MobileField>
                <MobileField label="Poslednja aktivnost">
                  {row.lastActivity
                    ? format(row.lastActivity, "dd.MM.yyyy. HH:mm")
                    : "-"}
                </MobileField>
              </div>
            </MobileCard>
          ))
        ) : (
          <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            Nema korisnika sa ulogom Korisnik.
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-md border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Korisnik</TableHead>
            <TableHead className="px-4 text-right">Dodeljeno</TableHead>
            <TableHead className="px-4 text-right">Kontaktirano</TableHead>
            <TableHead className="px-4 text-right">Interakcije</TableHead>
            <TableHead className="px-4">Poslednja aktivnost</TableHead>
            <TableHead className="px-4 text-right">
              <span className="sr-only">Detalji</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow key={row.userId}>
                <TableCell className="px-4 font-medium">{row.name}</TableCell>
                <TableCell className="px-4 text-right tabular-nums">
                  {row.assigned}
                </TableCell>
                <TableCell className="px-4 text-right tabular-nums">
                  {row.contacted}
                </TableCell>
                <TableCell className="px-4 text-right tabular-nums">
                  {row.interactions}
                </TableCell>
                <TableCell className="px-4">
                  {row.lastActivity ? (
                    format(row.lastActivity, "dd.MM.yyyy. HH:mm")
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="px-4 text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/analitika?user=${row.userId}`}>Detalji</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                Nema korisnika sa ulogom Korisnik.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </>
  );
}
