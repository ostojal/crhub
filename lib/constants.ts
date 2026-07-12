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

export const COMMUNICATION_STATUSES = [
  "Nije kontaktiran",
  "Kontaktiran",
  "Zainteresovan",
  "Nije zainteresovan",
  "Za praćenje",
] as const;
