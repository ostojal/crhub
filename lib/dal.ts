import "server-only";

import { auth } from "@/auth";
import { ROLES, type Role } from "@/lib/constants";
import {
  getActiveProject,
  NO_PROJECT_ERROR,
  type Project,
} from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { escapeLike, isOneOf } from "@/lib/validate";
import { redirect } from "next/navigation";
import { cache } from "react";

export type CurrentUser = {
  // users.id (bigint) — koristi se za sve upise u bazu, nikad Google sub
  id: number;
  email: string;
  fullName: string | null;
  role: Role;
};

// auth() dekodira/verifikuje JWT iz cookie-ja; cache() ga dedupira u okviru
// istog requesta (getCurrentUser i requireUser bi ga inače zvali odvojeno).
export const getSession = cache(() => auth());

// Uloga se čita iz baze pri svakom requestu (ne iz JWT-a), pa izmena ili
// ukidanje uloge važi odmah. cache() dedupira pozive unutar istog requesta.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;

  const supabase = createClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .ilike("email", escapeLike(email))
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!user?.role || !isOneOf(user.role, ROLES)) return null;

  return {
    id: user.id,
    email: user.email ?? email,
    fullName: user.full_name || null,
    role: user.role,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/");

  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");

  return user;
}

// Za server akcije: bez redirecta, null kad pristup ne postoji
export async function checkRole(...roles: Role[]): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) return null;

  return user;
}

export type ProjectAccess =
  | { ok: true; user: CurrentUser; project: Project }
  | { ok: false; error: string };

// Za server akcije: uloga i projekat na kom se radi, u jednoj proveri.
// Dodele, kontaktiranja, statusi i mejlovi pripadaju projektu, pa svaka
// akcija koja ih dira mora da zna koji je aktivan.
export async function checkProjectRole(
  ...roles: Role[]
): Promise<ProjectAccess> {
  const user = await checkRole(...roles);
  if (!user) return { ok: false, error: "Nemaš dozvolu za ovu akciju." };

  const project = await getActiveProject();
  if (!project) return { ok: false, error: NO_PROJECT_ERROR };

  return { ok: true, user, project };
}

// Isto pravilo kao requireContactAccess, ali bez redirecta — za server akcije,
// koje odgovaraju porukom umesto da preusmeravaju. Za više kontakata odjednom
// vidi grupnu proveru u lib/actions/interactions.ts (jedan upit umesto N).
//
// Admin i urednik rade sa svim kontaktima. Urednik se ne može ni dodeliti
// (dodela ide isključivo na ulogu "user"), pa bi provera dodele za njega uvek
// pala i ne bi mogao da pošalje nijedan mejl.
//
// Korisniku dodela važi za jedan projekat: kontakt dodeljen na DigiHack-u ne
// otvara pristup istom kontaktu na GreenTour-u.
export async function hasContactAccess(
  user: CurrentUser,
  contactId: number,
  projectId: number,
): Promise<boolean> {
  if (user.role === "admin" || user.role === "editor") return true;

  const supabase = createClient();
  const { data } = await supabase
    .from("assignments")
    .select("id")
    .eq("project_id", projectId)
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return !!data;
}

// Admin i urednik smeju svaki kontakt; user samo kontakt koji mu je dodeljen
// na aktivnom projektu
export async function requireContactAccess(
  contactId: number,
  projectId: number,
): Promise<CurrentUser> {
  const user = await requireUser();
  if (await hasContactAccess(user, contactId, projectId)) return user;

  redirect("/");
}
