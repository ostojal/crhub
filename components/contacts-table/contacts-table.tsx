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
  type ContactEditable,
  ContactFormDialog,
} from "@/components/contacts/contact-form-dialog";
import { EditStatusDialog } from "@/components/contacts/edit-status-dialog";
import {
  type LogContact,
  LogInteractionDialog,
} from "@/components/interactions/log-interaction-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Role } from "@/lib/constants";
import {
  ChevronsLeftIcon,
  ChevronsRightIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { AssignDialog, type AssignTarget } from "./assign-dialog";
import {
  type AssigneeOption,
  buildContactColumns,
  columnIdToLabel,
  contactName,
  type ContactRow,
} from "./columns";
import { ContactBulkActions } from "./contact-bulk-actions";

type ContactsTableProps = {
  contacts: ContactRow[];
  contactsCount: number;
  viewer: Extract<Role, "admin" | "editor">;
  assignees: AssigneeOption[];
};

function toEditable(contact: ContactRow): ContactEditable {
  return {
    id: contact.id,
    first_name: contact.first_name ?? null,
    last_name: contact.last_name ?? null,
    company: contact.company,
    job_title: contact.job_title,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    mobile_phone: contact.mobile_phone ?? null,
    city: contact.city ?? null,
    notes: contact.notes ?? null,
  };
}

export function ContactsTable({
  contacts: data,
  contactsCount,
  viewer,
  assignees,
}: ContactsTableProps) {
  const router = useRouter();
  const isAdmin = viewer === "admin";
  const pagesCount = useMemo(
    () => Math.ceil(contactsCount / 25),
    [contactsCount],
  );

  // Editor podrazumevano gleda po firmi, admin po datumu dodavanja
  const defaultSort = useMemo(
    () =>
      isAdmin
        ? { id: "created_at", desc: true }
        : { id: "company", desc: false },
    [isAdmin],
  );

  const searchParams = useSearchParams();
  const page = useMemo(
    () => (searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1),
    [searchParams],
  );
  const searchQuery = searchParams.get("q") ?? "";
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [searchValue, setSearchValue] = useState(searchQuery);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [formTarget, setFormTarget] = useState<
    { mode: "create" } | { mode: "edit"; contact: ContactRow } | null
  >(null);
  const [statusTarget, setStatusTarget] = useState<ContactRow | null>(null);
  const [logTarget, setLogTarget] = useState<LogContact | null>(null);

  useEffect(() => {
    setPaginationState((prev) => ({
      ...prev,
      pageIndex: page - 1,
    }));
  }, [page]);

  useEffect(() => {
    setSortingState(urlSortingState);
  }, [urlSortingState]);

  // Sinhronizuj input iz URL-a (back/forward navigacija), ali nikad dok
  // korisnik kuca — inače odgovor servera pregazi sveže otkucana slova
  useEffect(() => {
    if (document.activeElement === searchInputRef.current) return;
    setSearchValue(searchQuery);
  }, [searchQuery]);

  const columns = useMemo(
    () =>
      buildContactColumns({
        viewer,
        handlers: {
          onAssign: (contact) =>
            setAssignTarget({ kind: "single", contact }),
          onEdit: (contact) => setFormTarget({ mode: "edit", contact }),
          onEditStatus: setStatusTarget,
          onLog: (contact) =>
            setLogTarget({ id: contact.id, name: contactName(contact) }),
        },
      }),
    [viewer],
  );

  const handlePaginationChange = (updater: Updater<PaginationState>) => {
    const newState =
      typeof updater === "function" ? updater(paginationState) : updater;

    setPaginationState(newState);

    // todo: allow selection across pages
    // todo: persist?
    setRowSelection({}); // reset row selection when page changes

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

  // Pretraga radi dok se kuca — debounce pa upis u URL (q parametar)
  useEffect(() => {
    const handle = setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      const next = searchValue.trim();
      if (next === current) return;

      const params = new URLSearchParams(searchParams);

      if (next) {
        params.set("q", next);
      } else {
        params.delete("q");
      }

      params.delete("page");
      // replace + bez skrolovanja: kucanje ne pravi istoriju niti pomera stranu
      router.replace(`?${params.toString()}`, { scroll: false });
    }, 350);

    return () => clearTimeout(handle);
  }, [searchValue, searchParams, router]);

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

    onRowSelectionChange: setRowSelection,

    state: {
      pagination: paginationState,
      sorting: sortingState,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="space-y-1 overflow-hidden">
      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Filtriraj kontakte..."
            className="pl-9"
          />
        </div>

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

        {isAdmin && (
          <Button onClick={() => setFormTarget({ mode: "create" })}>
            <PlusIcon data-icon="inline-start" />
            Novi kontakt
          </Button>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between min-h-8">
        <p className="text-end text-sm text-muted-foreground">
          Prikazano {table.getRowModel().rows.length} od {contactsCount} redova
          {table.getFilteredSelectedRowModel().rows.length > 0 &&
            ` (izabrano ${table.getFilteredSelectedRowModel().rows.length})`}
          .
        </p>

        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <ContactBulkActions
            contacts={table
              .getFilteredSelectedRowModel()
              .rows.map((x) => x.original)}
            viewer={viewer}
            onAssign={(contacts) =>
              setAssignTarget({ kind: "bulk", contacts })
            }
            onDone={() => table.resetRowSelection()}
          />
        )}
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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

      <Pagination className="mt-4">
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

      <AssignDialog
        target={assignTarget}
        assignees={assignees}
        onClose={() => setAssignTarget(null)}
        onSuccess={() => {
          setAssignTarget(null);
          table.resetRowSelection();
        }}
      />

      {formTarget && (
        <ContactFormDialog
          key={formTarget.mode === "edit" ? formTarget.contact.id : "create"}
          contact={
            formTarget.mode === "edit" ? toEditable(formTarget.contact) : null
          }
          onClose={() => setFormTarget(null)}
        />
      )}

      {logTarget && (
        <LogInteractionDialog
          key={logTarget.id}
          contacts={[logTarget]}
          onClose={() => setLogTarget(null)}
        />
      )}

      {statusTarget && (
        <EditStatusDialog
          key={statusTarget.id}
          contactId={statusTarget.id}
          contactName={contactName(statusTarget)}
          currentStatus={
            statusTarget.contact_status?.[0]?.communication_status ?? null
          }
          currentTag={statusTarget.contact_status?.[0]?.interest_tag ?? null}
          onClose={() => setStatusTarget(null)}
        />
      )}
    </div>
  );
}
