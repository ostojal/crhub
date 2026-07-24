// Deljeno između klijenta (pregled u kompozeru) i servera (ponovna zamena
// pre slanja), pa ovde ne sme "server-only".

export type PlaceholderContact = {
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  city: string | null;
};

const RESOLVERS: Record<string, (contact: PlaceholderContact) => string> = {
  ime: (c) => c.first_name ?? "",
  prezime: (c) => c.last_name ?? "",
  firma: (c) => c.company ?? "",
  pozicija: (c) => c.job_title ?? "",
  grad: (c) => c.city ?? "",
};

export const PLACEHOLDER_TOKENS = Object.keys(RESOLVERS);

// Prihvata i {{ime}} i {{ Ime }}. Nepoznat placeholder se namerno ostavlja
// kakav jeste — vidi se u kompozeru pre slanja, umesto da tiho nestane.
const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Zčćžšđ_]+)\s*\}\}/g;

export function applyPlaceholders(
  text: string,
  contact: PlaceholderContact,
): string {
  return text.replace(PLACEHOLDER_PATTERN, (match, token: string) => {
    const resolve = RESOLVERS[token.toLowerCase()];
    return resolve ? resolve(contact).trim() : match;
  });
}

export function hasUnknownPlaceholders(text: string): boolean {
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    if (!RESOLVERS[match[1].toLowerCase()]) return true;
  }
  return false;
}
