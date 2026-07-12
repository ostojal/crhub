import { PostgrestFilterBuilder } from "@supabase/supabase-js";

function escapeSearchTerm(searchTerm: string) {
  return searchTerm.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

type BinaryFilter = {
  kind: "binary";
  column: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "ilike"
    | "not.ilike"
    | "like"
    | "not.like";
  value: unknown;
};

type UnaryFilter = {
  kind: "unary";
  column: string;
  operator: "is-null" | "is-not-null";
};

type ColumnFilter = BinaryFilter | UnaryFilter;

type SearchFilter = {
  type: "or" | "and";
  filters: (ColumnFilter | SearchFilter)[];
};

function formatPostgrestValue(value: unknown) {
  if (typeof value === "string") {
    return /[,()]/.test(value) ? `"${value}"` : value;
  }

  return `${value}`;
}

function toPostgrestExpression(filter: ColumnFilter | SearchFilter): string {
  if ("kind" in filter) {
    if (filter.kind === "unary") {
      return `${filter.column}.${
        filter.operator === "is-null" ? "is.null" : "not.is.null"
      }`;
    }

    return `${filter.column}.${filter.operator}.${formatPostgrestValue(
      filter.value,
    )}`;
  }

  return `${filter.type}(${filter.filters.map(toPostgrestExpression).join(",")})`;
}

// todo: keep the docs up-to-date
/**
 * Parse the free-text search syntax used by the contacts page.
 *
 * Supported forms:
 * - Plain text: `term` matches `first_name`, `last_name`, `company`, `job_title`, and `city` with `ilike`.
 * - Field filters: `field=value`
 * - Negated field filters: `field!=value`
 * - Unary presence filters: bare keywords like `kontakt`, `notes`
 * - Grouping: `?` for `or` groups and `??` for `and` groups
 * - Multiple filters: comma-separated values inside a grouped query
 *
 * Field aliases:
 * - `ime` -> `first_name`
 * - `prezime`, `prez` -> `last_name`
 * - `kompanija`, `komp`, `firma` -> `company`
 * - `pozicija`, `poz` -> `job_title`
 * - `grad` -> `city`
 * - `email` -> `email`
 * - `telefon` -> `phone` or `mobile_phone`
 * - `status` -> `contact_status.communication_status`
 *
 * Unary keywords:
 * - Phone present: `imabroj`, `imatelefon`, `imafon`, `fon`, `broj`, `telefon`
 * - Phone missing: `nemabroj`, `nematelefon`, `nemafon`
 * - Email present: `imaemail`, `imamail`, `imamejl`, `mail`, `email`, `mejl`
 * - Email missing: `nemaemail`, `nemamail`, `nemamejl`
 * - Any contact present: `imakontakt`, `kontakt`
 * - No contact information: `nemakontakt`
 * - Notes present: `imanote`, `imanotes`, `note`, `notes`
 * - Notes missing: `nemanote`, `nemanotes`
 *
 * Examples:
 * - `q=marko` searches across the default text columns.
 * - `q=?ime=marko,grad=beograd` matches either name or city.
 * - `q=??telefon,email` requires both a phone number and an email address.
 * - `q=?ime!=petar` excludes rows where `first_name` matches `petar`.
 */
export function createSearchFilter(
  searchTerm?: string | null,
): SearchFilter | null {
  searchTerm = searchTerm?.trim();
  if (!searchTerm) {
    return null;
  }

  if (searchTerm.startsWith("?")) {
    const and = searchTerm.startsWith("??");

    const filters: (ColumnFilter | SearchFilter)[] = searchTerm
      .substring(searchTerm.lastIndexOf("?") + 1)
      .split(",")
      .map<ColumnFilter | SearchFilter | null>((filter) => {
        filter = filter.trim();

        if (filter.includes("=")) {
          const [field, value] = filter.split("=", 2);
          const reverseQuery = field.endsWith("!");

          const escapedField = reverseQuery
            ? field
                .substring(0, field.length - 1)
                .trim()
                .toLowerCase()
            : field.trim().toLowerCase();
          const escapedValue = escapeSearchTerm(value.trim().toLowerCase());
          const operator = reverseQuery ? "not.ilike" : "ilike";

          switch (escapedField) {
            case "ime":
              return {
                kind: "binary",
                column: "first_name",
                operator,
                value: `%${escapedValue}%`,
              };

            case "prezime":
            case "prez":
              return {
                kind: "binary",
                column: "last_name",
                operator,
                value: `%${escapedValue}%`,
              };

            case "kompanija":
            case "komp":
            case "firma":
              return {
                kind: "binary",
                column: "company",
                operator,
                value: `%${escapedValue}%`,
              };

            case "pozicija":
            case "poz":
              return {
                kind: "binary",
                column: "job_title",
                operator,
                value: `%${escapedValue}%`,
              };

            case "grad":
              return {
                kind: "binary",
                column: "city",
                operator,
                value: `%${escapedValue}%`,
              };

            case "email":
              return {
                kind: "binary",
                column: "email",
                operator,
                value: `%${escapedValue}%`,
              };

            case "telefon":
              return {
                type: "or",
                filters: [
                  {
                    kind: "binary",
                    column: "phone",
                    operator,
                    value: `%${escapedValue}%`,
                  },
                  {
                    kind: "binary",
                    column: "mobile_phone",
                    operator,
                    value: `%${escapedValue}%`,
                  },
                ],
              };

            case "status":
              return {
                kind: "binary",
                column: "contact_status.communication_status",
                operator,
                value: `%${escapedValue}%`,
              };

            default:
              return null;
          }
        } else {
          switch (filter) {
            case "imabroj":
            case "imatelefon":
            case "imafon":
            case "fon":
            case "broj":
            case "telefon":
              return {
                type: "or",
                filters: [
                  { kind: "unary", column: "phone", operator: "is-not-null" },
                  {
                    kind: "unary",
                    column: "mobile_phone",
                    operator: "is-not-null",
                  },
                ],
              };

            case "nemabroj":
            case "nematelefon":
            case "nemafon":
              return {
                type: "and",
                filters: [
                  { kind: "unary", column: "phone", operator: "is-null" },
                  {
                    kind: "unary",
                    column: "mobile_phone",
                    operator: "is-null",
                  },
                ],
              };

            case "imafiksni":
            case "fiksni":
              return {
                kind: "unary",
                column: "phone",
                operator: "is-not-null",
              };

            case "nemafiksni":
              return {
                kind: "unary",
                column: "phone",
                operator: "is-null",
              };

            case "imamobilni":
            case "mobilni":
              return {
                kind: "unary",
                column: "mobile_phone",
                operator: "is-not-null",
              };

            case "nemamobilni":
              return {
                kind: "unary",
                column: "mobile_phone",
                operator: "is-null",
              };

            case "imaemail":
            case "imamail":
            case "imamejl":
            case "mail":
            case "email":
            case "mejl":
              return {
                kind: "unary",
                column: "email",
                operator: "is-not-null",
              };

            case "nemaemail":
            case "nemamail":
            case "nemamejl":
              return {
                kind: "unary",
                column: "email",
                operator: "is-null",
              };

            case "imakontakt":
            case "kontakt":
              return {
                type: "or",
                filters: [
                  { kind: "unary", column: "phone", operator: "is-not-null" },
                  {
                    kind: "unary",
                    column: "mobile_phone",
                    operator: "is-not-null",
                  },
                  { kind: "unary", column: "email", operator: "is-not-null" },
                ],
              };

            case "nemakontakt":
              return {
                type: "and",
                filters: [
                  { kind: "unary", column: "phone", operator: "is-null" },
                  {
                    kind: "unary",
                    column: "mobile_phone",
                    operator: "is-null",
                  },
                  { kind: "unary", column: "email", operator: "is-null" },
                ],
              };

            case "imanote":
            case "imanotes":
            case "note":
            case "notes":
              return {
                kind: "unary",
                column: "notes",
                operator: "is-not-null",
              };

            case "nemanote":
            case "nemanotes":
              return {
                kind: "unary",
                column: "notes",
                operator: "is-null",
              };

            default:
              return null;
          }
        }
      })
      .filter((filter) => filter !== null);

    if (filters.length === 0) {
      return null;
    }

    return {
      type: and ? "and" : "or",
      filters,
    };
  }

  const escapedSearchTerm = escapeSearchTerm(searchTerm);
  // default search filter
  return {
    type: "or",
    filters: [
      ...[
        "first_name",
        "last_name",
        "company",
        "job_title",
        "city",
      ].map<ColumnFilter>((col) => ({
        kind: "binary",
        column: col,
        operator: "ilike",
        value: `%${escapedSearchTerm}%`,
      })),
    ],
  };
}

export function applyFilter<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends PostgrestFilterBuilder<any, any, any, any>,
>(query: T, searchFilter: SearchFilter): T {
  return query.or(toPostgrestExpression(searchFilter));
}
