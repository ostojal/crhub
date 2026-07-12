const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Svi id-jevi u bazi su bigint (identity kolone), ne uuid
export function isId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isOneOf<T extends string>(
  value: string,
  allowed: readonly T[],
): value is T {
  return (allowed as readonly string[]).includes(value);
}

export function cleanText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length > 200 || !EMAIL_REGEX.test(email)) return null;
  return email;
}

export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
