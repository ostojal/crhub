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
  ],
  editor: [],
  user: [],
};
