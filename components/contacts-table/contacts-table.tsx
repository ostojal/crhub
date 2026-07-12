/* eslint-disable react-hooks/incompatible-library */
"use client";

import {
  flexRender,
  getCoreRowModel,
  PaginationState,
  SortingState,
  Updater,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { columnIdToLabel, columns } from "./columns";

export type Contact = {
  id: string;
  company: string | null;
  first_name: string;
  last_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
  contact_status: {
    communication_status: string | null;
    interest_tag: string | null;
    updated_at: string;
  }[];
};

type ContactsTableProps = {
  contacts: Contact[];
  pagesCount: number;
};

export function ContactsTable({
  contacts: data,
  pagesCount,
}: ContactsTableProps) {
  const router = useRouter();

  const searchParams = useSearchParams();
  const page = searchParams.get("page")
    ? parseInt(searchParams.get("page")!)
    : 1;
  const urlSortingState = useMemo(() => {
    const sort = searchParams.get("sort");
    return sort
      ? [{ id: sort.split(":")[0], desc: sort.split(":")[1] === "desc" }]
      : [{ id: "created_at", desc: true }]; // default
  }, [searchParams]);

  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: page - 1,
    pageSize: 25,
  });
  const [sortingState, setSortingState] =
    useState<SortingState>(urlSortingState);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    setPaginationState((prev) => ({
      ...prev,
      pageIndex: page - 1,
    }));
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
      (newState[0].id === "created_at" && newState[0].desc)
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

    onColumnVisibilityChange: setColumnVisibility,

    state: {
      pagination: paginationState,
      sorting: sortingState,
      columnVisibility,
    },
  });

  return (
    <div className="space-y-1 overflow-hidden">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filtriraj kontakte..."
          className="max-w-sm"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-max">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                    className="min-w-max"
                  >
                    {columnIdToLabel(column.id)}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Table className="rounded-md border">
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
                  <TableCell key={cell.id} className="px-4 capitalize">
                    {cell.getValue() ? (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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
              <PaginationLink onClick={() => table.setPageIndex((x) => x - 5)}>
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
              <PaginationLink onClick={() => table.setPageIndex((x) => x + 5)}>
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
