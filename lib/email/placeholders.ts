// Deljeno između klijenta (pregled u kompozeru) i servera (ponovna zamena
// pre slanja), pa ovde ne sme "server-only".

export type PlaceholderContact = {
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  city: string | null;
};

// Osoba koja šalje mejl — onaj ko je prijavljen i sa čijeg Gmail naloga
// poruka odlazi
export type PlaceholderSender = {
  full_name: string | null;
  email: string;
};

// Google vraća jedno polje sa punim imenom, pa se ime i prezime razdvajaju
// na prvom razmaku
function firstName(fullName: string | null): string {
  return fullName?.trim().split(/\s+/)[0] ?? "";
}

function lastName(fullName: string | null): string {
  const parts = fullName?.trim().split(/\s+/) ?? [];
  return parts.slice(1).join(" ");
}

const CONTACT_RESOLVERS: Record<
  string,
  (contact: PlaceholderContact) => string
> = {
  ime: (c) => c.first_name ?? "",
  prezime: (c) => c.last_name ?? "",
  firma: (c) => c.company ?? "",
  pozicija: (c) => c.job_title ?? "",
  grad: (c) => c.city ?? "",
};

const SENDER_RESOLVERS: Record<string, (sender: PlaceholderSender) => string> =
  {
    moje_ime: (s) => firstName(s.full_name),
    moje_prezime: (s) => lastName(s.full_name),
    moje_ime_i_prezime: (s) => s.full_name ?? "",
    moj_email: (s) => s.email,
  };

export const CONTACT_PLACEHOLDERS = Object.keys(CONTACT_RESOLVERS);
export const SENDER_PLACEHOLDERS = Object.keys(SENDER_RESOLVERS);
export const PLACEHOLDER_TOKENS = [
  ...CONTACT_PLACEHOLDERS,
  ...SENDER_PLACEHOLDERS,
];

// Prihvata i {{ime}} i {{ Ime }}. Nepoznat placeholder se namerno ostavlja
// kakav jeste — vidi se u kompozeru pre slanja, umesto da tiho nestane.
const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Zčćžšđ_]+)\s*\}\}/g;

export function applyPlaceholders(
  text: string,
  contact: PlaceholderContact,
  sender?: PlaceholderSender | null,
): string {
  return text.replace(PLACEHOLDER_PATTERN, (match, token: string) => {
    const key = token.toLowerCase();

    const resolveContact = CONTACT_RESOLVERS[key];
    if (resolveContact) return resolveContact(contact).trim();

    const resolveSender = SENDER_RESOLVERS[key];
    if (resolveSender && sender) return resolveSender(sender).trim();

    return match;
  });
}

export function hasUnknownPlaceholders(text: string): boolean {
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    const key = match[1].toLowerCase();
    if (!CONTACT_RESOLVERS[key] && !SENDER_RESOLVERS[key]) return true;
  }
  return false;
}
