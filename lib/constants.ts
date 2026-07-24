// Ime aplikacije mora da se poklapa sa OAuth consent screen-om u Google
// Cloud-u, inače Google odbija verifikaciju
export const APP_NAME = "CR HUB";

// Kontakt na javnoj stranici i u politici privatnosti
export const SUPPORT_EMAIL = "info@fondigital.org";

export const ROLES = ["admin", "editor", "user"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  editor: "Urednik",
  user: "Korisnik",
};

export const PENDING_ROLE_LABEL = "Na čekanju";

export const INTERACTION_TYPES = ["email", "poziv", "linkedin"] as const;

export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  email: "Email",
  poziv: "Poziv",
  linkedin: "LinkedIn",
};

// Vrednosti Postgres enuma `public.status` — moraju se poklapati sa bazom
export const COMMUNICATION_STATUSES = [
  "Nije kontaktiran",
  "Poslato",
  "Dobijen odgovor",
  "Na čekanju",
  "Prihvaćeno",
  "Odbijeno",
] as const;

// Vrednosti Postgres enuma `public.tag`
export const INTEREST_TAGS = [
  "Bili zainteresovani",
  "Za sledeći projekat",
] as const;

// --- Mejlovi (db/emails.sql) ---

export const EMAIL_STATUSES = [
  "scheduled",
  "sending",
  "sent",
  "failed",
  "cancelled",
] as const;

export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  scheduled: "Zakazan",
  sending: "Šalje se",
  sent: "Poslat",
  failed: "Neuspešan",
  cancelled: "Otkazan",
};

// Granica po fajlu prati Vercel limit tela requesta (4.5MB), pa je bucket
// ograničen na istu vrednost u db/emails.sql
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

// Gmail podnosi i mnogo više, ali veliki prilozi često padaju kod primaoca
export const MAX_TOTAL_ATTACHMENT_BYTES = 12 * 1024 * 1024;

export const ATTACHMENTS_BUCKET = "email-attachments";

// Koliko unapred sme da se zakaže slanje
export const MAX_SCHEDULE_DAYS = 60;
