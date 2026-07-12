export const ROLES = ["admin", "editor", "user"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  editor: "Urednik",
  user: "Korisnik",
};

export const PENDING_ROLE_LABEL = "Na čekanju";

export const INTERACTION_TYPES = [
  "poziv",
  "email",
  "sastanak",
  "drugo",
] as const;

export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  poziv: "Poziv",
  email: "Email",
  sastanak: "Sastanak",
  drugo: "Drugo",
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
