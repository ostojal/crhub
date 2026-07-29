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

// Kategorije partnera (db/contacts-categories.sql); NULL = bez kategorije
export const CONTACT_CATEGORIES = [
  "finansijski",
  "naturalni",
  "nagradni",
] as const;

export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export const CONTACT_CATEGORY_LABELS: Record<ContactCategory, string> = {
  finansijski: "Finansijski",
  naturalni: "Naturalni",
  nagradni: "Nagradni",
};

export const NO_CATEGORY_LABEL = "Bez kategorije";

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

// Fajl ide iz pretraživača pravo u Supabase Storage (potpisani upload), pa
// Vercelov limit tela requesta od 4.5MB nije prepreka; ista vrednost stoji
// kao file_size_limit na bucketu
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

// Base64 kodiranje uveća prilog za oko trećinu, a Gmail odbija poruke preko
// 25MB — 15MB sirovih priloga daje oko 20MB poruke
export const MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export const ATTACHMENTS_BUCKET = "email-attachments";

// Slike nalepljene u telo mejla putuju kao data: URL kroz server akciju, a
// Vercel odbija telo requesta preko 4.5MB — otud ovako postavljene granice.
// Base64 uveća sliku za oko trećinu, pa slika od 1MB zauzme ~1.37M znakova;
// granice u znakovima moraju da to prate, inače se potpis sa logom preuzme
// ali ne može da se sačuva.
export const MAX_INLINE_IMAGE_BYTES = 1024 * 1024;
// Telo = poruka + potpis, pa mora da bude veće od potpisa, a ispod 4.5MB
export const MAX_BODY_CHARS = 3_500_000;
export const MAX_SIGNATURE_CHARS = 1_500_000;

// Koliko unapred sme da se zakaže slanje
export const MAX_SCHEDULE_DAYS = 60;
