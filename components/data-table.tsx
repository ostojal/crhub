/* eslint-disable react-hooks/incompatible-library */
"use client";

import {
  Column,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  PaginationState,
  Row,
  RowSelectionState,
  SortingState,
  Table as TanstackTable,
  Updater,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { Button } from "./ui/button";

export type DefaultSort = { id: string; desc: boolean };

type DataTableProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  pagesCount: number;
  defaultSort: DefaultSort;
  getRowId?: (row: TData) => string;
  enableRowSelection?: boolean;
  // Renderuje se iznad tabele (npr. dugme za dodelu izabranih redova)
  toolbar?: (table: TanstackTable<TData>) => React.ReactNode;
  // Kad je zadato, na mobilnom se umesto tabele prikazuje lista kartica
  renderMobileCard?: (row: Row<TData>) => React.ReactNode;
};

// Prazna vrednost u ćeliji — koristi se u definicijama kolona umesto ranijeg
// `cell.getValue() ? ... : "-"` pristupa koji je gutao action/checkbox kolone
export function dashValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">-</span>;
  }
  return value as React.ReactNode;
}

export function DataTable<TData>({
  columns,
  data,
  pagesCount,
  defaultSort,
  getRowId,
  enableRowSelection = false,
  toolbar,
  renderMobileCard,
}: DataTableProps<TData>) {
  const router = useRouter();

  const searchParams = useSearchParams();
  const page = searchParams.get("page")
    ? parseInt(searchParams.get("page")!)
    : 1;
  const urlSortingState = useMemo(() => {
    const sort = searchParams.get("sort");
    return sort
      ? [{ id: sort.split(":")[0], desc: sort.split(":")[1] === "desc" }]
      : [defaultSort];
  }, [searchParams, defaultSort]);

  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: page - 1,
    pageSize: 25,
  });
  const [sortingState, setSortingState] =
    useState<SortingState>(urlSortingState);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  useEffect(() => {
    setPaginationState((prev) => ({
      ...prev,
      pageIndex: page - 1,
    }));
    // Selekcija važi samo za tekuću stranicu
    setRowSelection({});
  }, [page]);

  useEffect(() => {
    setSortingState(urlSortingState);
  }, [urlSortingState]);

  const handlePaginationChange = (updater: Updater<PaginationState>) => {
    const newState =
      typeof updater === "function" ? updater(paginationState) : updater;

    setPaginationState(newState);

    const params = new URLSearchParams(searchParams);

    if (newState.pageIndex === 0) {
      params.delete("page");
    } else {
      params.set("page", (newState.pageIndex + 1).toString());
    }

    router.push(`?${params.toString()}`);
  };

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const newState = typeof updater === "function" ? updater([]) : updater;
    const params = new URLSearchParams(searchParams);

    if (
      newState.length === 0 ||
      (newState[0].id === defaultSort.id &&
        newState[0].desc === defaultSort.desc)
    ) {
      params.delete("sort");
    } else {
      params.set(
        "sort",
        `${newState[0].id}:${newState[0].desc ? "desc" : "asc"}`,
      );
    }

    params.delete("page"); // reset page to 1 when sorting changes
    router.push(`?${params.toString()}`);
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,

    pageCount: pagesCount,
    autoResetPageIndex: false,
    onPaginationChange: handlePaginationChange,

    onSortingChange: handleSortingChange,
    manualSorting: true,
    enableSorting: true,

    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    getRowId,

    state: {
      pagination: paginationState,
      sorting: sortingState,
      rowSelection,
    },
  });

  return (
    <div>
      {toolbar?.(table)}

      {renderMobileCard && (
        <div className="space-y-3 md:hidden">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <div key={row.id}>{renderMobileCard(row)}</div>
            ))
          ) : (
            <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
              Nema rezultata.
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "overflow-hidden rounded-md border",
          renderMobileCard && "hidden md:block",
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="px-4">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nema rezultata.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination className="my-4">
          <PaginationContent>
            {table.getState().pagination.pageIndex >= 1 && (
              <PaginationItem>
                <PaginationLink onClick={() => table.setPageIndex(0)}>
                  <span className="sr-only">First page</span>
                  <ChevronsLeftIcon data-icon="inline-start" />
                </PaginationLink>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationPrevious
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                text="Prev"
              />
            </PaginationItem>

            {table.getState().pagination.pageIndex - 5 >= 0 && (
              <PaginationItem>
                <PaginationLink
                  onClick={() => table.setPageIndex((x) => x - 5)}
                >
                  {table.getState().pagination.pageIndex - 4}
                </PaginationLink>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationLink isActive>
                {table.getState().pagination.pageIndex + 1}
              </PaginationLink>
            </PaginationItem>

            {table.getState().pagination.pageIndex + 5 < pagesCount && (
              <PaginationItem>
                <PaginationLink
                  onClick={() => table.setPageIndex((x) => x + 5)}
                >
                  {table.getState().pagination.pageIndex + 6}
                </PaginationLink>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              />
            </PaginationItem>

            {table.getState().pagination.pageIndex + 1 < pagesCount && (
              <PaginationItem>
                <PaginationLink
                  onClick={() => table.setPageIndex(pagesCount - 1)}
                >
                  <span className="sr-only">Last page</span>
                  <ChevronsRightIcon data-icon="inline-end" />
                </PaginationLink>
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
    </div>
  );
}

export function SortableColumnHeader<TData>({
  column,
  title,
}: {
  column: Column<TData, unknown>;
  title: string;
}) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="w-full justify-between"
    >
      {title}
      {column.getIsSorted() === "asc" ? (
        <ChevronUp className="ml-2 size-4" />
      ) : column.getIsSorted() === "desc" ? (
        <ChevronDown className="ml-2 size-4" />
      ) : (
        <ChevronsUpDown className="ml-2 size-4 text-muted-foreground/70" />
      )}
    </Button>
  );
}
