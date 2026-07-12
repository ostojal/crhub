import { Button } from "@/components/ui/button";
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
    <div className="overflow-hidden rounded-md border">
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
  );
}
