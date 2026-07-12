import type { Role } from "@/lib/constants";

export type NavLink = {
  href: string;
  label: string;
  description: string;
};

export const NAV_LINKS: Record<Role, NavLink[]> = {
  admin: [
    {
      href: "/contacts",
      label: "Kontakti",
      description: "Svi kontakti, dodele i izmene",
    },
    {
      href: "/admin/users",
      label: "Korisnici",
      description: "Uloge i pristup članova tima",
    },
    {
      href: "/analitika",
      label: "Analitika",
      description: "Kontaktiranja po korisnicima",
    },
  ],
  editor: [
    {
      href: "/contacts",
      label: "Kontakti",
      description: "Pregled firmi i dodela kontakata timu",
    },
  ],
  user: [
    {
      href: "/moji-kontakti",
      label: "Moji kontakti",
      description: "Kontakti dodeljeni tebi",
    },
    {
      href: "/analitika",
      label: "Analitika",
      description: "Tvoja kontaktiranja i ishodi",
    },
  ],
};
